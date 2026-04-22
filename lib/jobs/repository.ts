import { getDb } from "@/lib/db";
import { createId, nowIso, parseJson, stringifyJson, toNumber } from "@/lib/utils";
import type { EnqueueJobResult, JobLog, JobLogLevel, JobPayload, JobRun, JobStatus, JobStep, LLMCallAuditRecord } from "./types";

type RawJobRun = Record<string, unknown>;
type RawJobLog = Record<string, unknown>;

function mapJobRun(row: RawJobRun): JobRun {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    step: String(row.step) as JobStep,
    status: String(row.status) as JobStatus,
    parentJobId: row.parent_job_id ? String(row.parent_job_id) : null,
    dedupeKey: String(row.dedupe_key),
    payload: parseJson<JobPayload>(String(row.payload_json ?? "{}"), {}),
    attemptCount: toNumber(row.attempt_count, 0),
    maxAttempts: toNumber(row.max_attempts, 2),
    progressStage: row.progress_stage ? String(row.progress_stage) : null,
    progressMessage: row.progress_message ? String(row.progress_message) : null,
    result: parseJson<Record<string, unknown> | null>(String(row.result_json ?? "null"), null),
    errorCode: row.error_code ? String(row.error_code) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
    startedAt: row.started_at ? String(row.started_at) : null,
    heartbeatAt: row.heartbeat_at ? String(row.heartbeat_at) : null,
    finishedAt: row.finished_at ? String(row.finished_at) : null,
  };
}

function mapJobLog(row: RawJobLog): JobLog {
  return {
    id: toNumber(row.id, 0),
    jobId: String(row.job_id),
    level: String(row.level) as JobLogLevel,
    code: String(row.code),
    message: String(row.message),
    detail: parseJson<Record<string, unknown>>(String(row.detail_json ?? "{}"), {}),
    createdAt: String(row.created_at),
  };
}

function withImmediateTransaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function createJobDedupeKey(projectId: string, step: JobStep) {
  return `project:${projectId}:step:${step}`;
}

export function getJobRun(jobId: string): JobRun | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM job_runs WHERE id = ?").get(jobId) as RawJobRun | undefined;
  return row ? mapJobRun(row) : null;
}

export function listProjectJobs(projectId: string, limit = 12): JobRun[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM job_runs WHERE project_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(projectId, limit)
    .map((row) => mapJobRun(row as RawJobRun));
}

export function listJobLogs(jobId: string, limit = 20): JobLog[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM job_logs WHERE job_id = ? ORDER BY id DESC LIMIT ?")
    .all(jobId, limit)
    .map((row) => mapJobLog(row as RawJobLog));
  return rows.reverse();
}

export function appendJobLog(jobId: string, level: JobLogLevel, code: string, message: string, detail: Record<string, unknown> = {}) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO job_logs (job_id, level, code, message, detail_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(jobId, level, code, message, stringifyJson(detail), nowIso());
}

export function enqueueJob(input: {
  projectId: string;
  step: JobStep;
  payload?: JobPayload;
  maxAttempts?: number;
  parentJobId?: string | null;
  dedupeKey?: string;
}): EnqueueJobResult {
  return withImmediateTransaction(() => {
    const db = getDb();
    const dedupeKey = input.dedupeKey ?? createJobDedupeKey(input.projectId, input.step);
    const existingRow = db
      .prepare("SELECT * FROM job_runs WHERE dedupe_key = ? AND status IN ('queued', 'running') LIMIT 1")
      .get(dedupeKey) as RawJobRun | undefined;

    if (existingRow) {
      return {
        job: mapJobRun(existingRow),
        deduped: true,
      };
    }

    const jobId = createId("job");
    const createdAt = nowIso();
    db.prepare(
      `
        INSERT INTO job_runs (
          id, project_id, step, status, parent_job_id, dedupe_key, payload_json,
          attempt_count, max_attempts, progress_stage, progress_message, result_json, error_code,
          error_message, created_at, started_at, heartbeat_at, finished_at
        ) VALUES (?, ?, ?, 'queued', ?, ?, ?, 0, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL, NULL)
      `,
    ).run(jobId, input.projectId, input.step, input.parentJobId ?? null, dedupeKey, stringifyJson(input.payload ?? {}), input.maxAttempts ?? 2, createdAt);
    appendJobLog(jobId, "info", "job_enqueued", "任务已入队。", { step: input.step });
    const job = getJobRun(jobId);
    if (!job) {
      throw new Error("任务创建后读取失败。");
    }
    return { job, deduped: false };
  });
}

export function claimNextQueuedJob(): JobRun | null {
  return withImmediateTransaction(() => {
    const db = getDb();
    const row = db
      .prepare("SELECT * FROM job_runs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1")
      .get() as RawJobRun | undefined;

    if (!row) {
      return null;
    }

    const now = nowIso();
    const nextAttempt = toNumber(row.attempt_count, 0) + 1;
    db.prepare(
      `
        UPDATE job_runs
        SET status = 'running',
            attempt_count = ?,
            started_at = COALESCE(started_at, ?),
            heartbeat_at = ?,
            finished_at = NULL,
            result_json = NULL,
            error_code = NULL,
            error_message = NULL
        WHERE id = ? AND status = 'queued'
      `,
    ).run(nextAttempt, now, now, String(row.id));
    appendJobLog(String(row.id), "info", "job_claimed", "任务已被 worker 领取。", { attemptCount: nextAttempt });
    const job = getJobRun(String(row.id));
    if (!job) {
      throw new Error("领取任务后读取失败。");
    }
    return job;
  });
}

export function markJobProgress(jobId: string, stage: string, message: string) {
  const db = getDb();
  db.prepare(
    `
      UPDATE job_runs
      SET progress_stage = ?, progress_message = ?, heartbeat_at = ?
      WHERE id = ?
    `,
  ).run(stage, message, nowIso(), jobId);
}

export function markJobResult(jobId: string, result: Record<string, unknown>) {
  const db = getDb();
  db.prepare(
    `
      UPDATE job_runs
      SET result_json = ?, heartbeat_at = ?
      WHERE id = ?
    `,
  ).run(stringifyJson(result), nowIso(), jobId);
}

export function markJobHeartbeat(jobId: string) {
  const db = getDb();
  db.prepare("UPDATE job_runs SET heartbeat_at = ? WHERE id = ?").run(nowIso(), jobId);
}

export function markJobSucceeded(jobId: string) {
  const db = getDb();
  const finishedAt = nowIso();
  db.prepare(
    `
      UPDATE job_runs
      SET status = 'succeeded',
          finished_at = ?,
          heartbeat_at = ?,
          error_code = NULL,
          error_message = NULL
      WHERE id = ?
    `,
  ).run(finishedAt, finishedAt, jobId);
  appendJobLog(jobId, "info", "job_succeeded", "任务执行成功。");
}

export function markJobFailed(jobId: string, input: { code: string; message: string }) {
  const db = getDb();
  const finishedAt = nowIso();
  db.prepare(
    `
      UPDATE job_runs
      SET status = 'failed',
          finished_at = ?,
          heartbeat_at = ?,
          error_code = ?,
          error_message = ?
      WHERE id = ?
    `,
  ).run(finishedAt, finishedAt, input.code, input.message, jobId);
  appendJobLog(jobId, "error", "job_failed", input.message, { errorCode: input.code });
}

export function listStaleRunningJobs(cutoffIso: string): JobRun[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT *
        FROM job_runs
        WHERE status = 'running'
          AND heartbeat_at IS NOT NULL
          AND heartbeat_at < ?
        ORDER BY heartbeat_at ASC
      `,
    )
    .all(cutoffIso)
    .map((row) => mapJobRun(row as RawJobRun));
}

export function createRetryJob(jobId: string): EnqueueJobResult {
  const source = getJobRun(jobId);
  if (!source) {
    throw new Error("任务不存在。");
  }
  if (source.status !== "failed") {
    throw new Error("只有失败任务才能重试。");
  }
  return enqueueJob({
    projectId: source.projectId,
    step: source.step,
    payload: source.payload,
    maxAttempts: source.maxAttempts,
    parentJobId: source.id,
    dedupeKey: source.dedupeKey,
  });
}

export function insertLLMCall(record: LLMCallAuditRecord) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO llm_calls (
        id, job_id, project_id, task_type, model_mode, model_name, prompt_version,
        timeout_ms, max_tokens, temperature, input_hash, output_hash, latency_ms,
        token_usage_json, status, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  ).run(
    record.id,
    record.jobId,
    record.projectId,
    record.taskType,
    record.modelMode,
    record.modelName,
    record.promptVersion,
    record.timeoutMs,
    record.maxTokens,
    record.temperature,
    record.inputHash,
    record.outputHash,
    record.latencyMs,
    stringifyJson(record.tokenUsage),
    record.status,
    record.errorMessage,
    record.createdAt,
  );
}
