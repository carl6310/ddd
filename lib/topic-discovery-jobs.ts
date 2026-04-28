import { getDb } from "@/lib/db";
import { updateTopicDiscoverySession } from "@/lib/repository";
import { createId, nowIso, parseJson, stringifyJson } from "@/lib/utils";
import {
  extractPreSourceCardsForSession,
  generateSignalBriefForSession,
  generateTopicAnglesForSession,
} from "@/lib/topic-discovery";
import type { TopicDiscoveryDepth, TopicDiscoveryJobLog, TopicDiscoveryJobRun, TopicDiscoveryJobStatus, TopicDiscoveryJobStep } from "@/lib/types";

function mapJob(row: Record<string, unknown>): TopicDiscoveryJobRun {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    step: String(row.step) as TopicDiscoveryJobStep,
    status: String(row.status) as TopicDiscoveryJobStatus,
    dedupeKey: String(row.dedupe_key),
    payload: parseJson<Record<string, unknown>>(String(row.payload_json ?? "{}"), {}),
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

function mapJobLog(row: Record<string, unknown>): TopicDiscoveryJobLog {
  return {
    id: Number(row.id),
    jobId: String(row.job_id),
    level: String(row.level) as TopicDiscoveryJobLog["level"],
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

export function enqueueTopicDiscoveryJob(input: {
  sessionId: string;
  step: TopicDiscoveryJobStep;
  payload?: Record<string, unknown>;
}): { job: TopicDiscoveryJobRun; deduped: boolean } {
  return withImmediateTransaction(() => {
    const db = getDb();
    const depth = input.step === "topic-discovery-cocreate" ? normalizeTopicDiscoveryDepth(input.payload?.depth) : null;
    const dedupeKey = depth ? `session:${input.sessionId}:step:${input.step}:depth:${depth}` : `session:${input.sessionId}:step:${input.step}`;
    const existing = db
      .prepare("SELECT * FROM topic_discovery_job_runs WHERE dedupe_key = ? AND status IN ('queued', 'running') LIMIT 1")
      .get(dedupeKey) as Record<string, unknown> | undefined;

    if (existing) {
      return { job: mapJob(existing), deduped: true };
    }

    const now = nowIso();
    const id = createId("tdjob");
    db.prepare(
      `
        INSERT INTO topic_discovery_job_runs (
          id, session_id, step, status, dedupe_key, payload_json,
          progress_stage, progress_message, result_json, error_code, error_message,
          created_at, started_at, heartbeat_at, finished_at
        ) VALUES (?, ?, ?, 'queued', ?, ?, NULL, NULL, NULL, NULL, NULL, ?, NULL, NULL, NULL)
      `,
    ).run(id, input.sessionId, input.step, dedupeKey, stringifyJson(depth ? { ...(input.payload ?? {}), depth } : (input.payload ?? {})), now);

    appendTopicDiscoveryJobLog(id, "info", "job_enqueued", "任务已入队。");
    const job = getTopicDiscoveryJob(id);
    if (!job) {
      throw new Error("创建选题发现任务失败。");
    }
    return { job, deduped: false };
  });
}

export function getTopicDiscoveryJob(jobId: string): TopicDiscoveryJobRun | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM topic_discovery_job_runs WHERE id = ?").get(jobId) as Record<string, unknown> | undefined;
  return row ? mapJob(row) : null;
}

export function listTopicDiscoveryJobs(sessionId: string): TopicDiscoveryJobRun[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM topic_discovery_job_runs WHERE session_id = ? ORDER BY created_at DESC")
    .all(sessionId)
    .map((row) => mapJob(row as Record<string, unknown>));
}

export function listTopicDiscoveryJobLogs(jobId: string): TopicDiscoveryJobLog[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM topic_discovery_job_logs WHERE job_id = ? ORDER BY id ASC")
    .all(jobId)
    .map((row) => mapJobLog(row as Record<string, unknown>));
}

export function appendTopicDiscoveryJobLog(jobId: string, level: TopicDiscoveryJobLog["level"], code: string, message: string, detail: Record<string, unknown> = {}) {
  const db = getDb();
  db.prepare(
    `
      INSERT INTO topic_discovery_job_logs (job_id, level, code, message, detail_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
  ).run(jobId, level, code, message, stringifyJson(detail), nowIso());
}

export function listStaleTopicDiscoveryJobs(cutoffIso: string): TopicDiscoveryJobRun[] {
  const db = getDb();
  return db
    .prepare(
      `
        SELECT *
        FROM topic_discovery_job_runs
        WHERE status = 'running'
          AND heartbeat_at IS NOT NULL
          AND heartbeat_at < ?
        ORDER BY heartbeat_at ASC
      `,
    )
    .all(cutoffIso)
    .map((row) => mapJob(row as Record<string, unknown>));
}

export function reapStaleTopicDiscoveryJobs(staleAfterMs = 2 * 60 * 1000) {
  const cutoffIso = new Date(Date.now() - staleAfterMs).toISOString();
  const staleJobs = listStaleTopicDiscoveryJobs(cutoffIso);

  for (const job of staleJobs) {
    markTopicDiscoveryJobStatus(job.id, "failed", {
      code: "timeout",
      message: "任务长时间未上报心跳，系统已将其标记为失败。",
    });
    appendTopicDiscoveryJobLog(job.id, "error", "job_timeout", "任务长时间未上报心跳，系统已将其标记为失败。");
  }

  return staleJobs;
}

function markTopicDiscoveryJobProgress(jobId: string, stage: string, message: string) {
  const db = getDb();
  db.prepare(
    `
      UPDATE topic_discovery_job_runs
      SET progress_stage = ?, progress_message = ?, heartbeat_at = ?
      WHERE id = ?
    `,
  ).run(stage, message, nowIso(), jobId);
}

function markTopicDiscoveryJobHeartbeat(jobId: string) {
  const db = getDb();
  db.prepare("UPDATE topic_discovery_job_runs SET heartbeat_at = ? WHERE id = ?").run(nowIso(), jobId);
}

function markTopicDiscoveryJobResult(jobId: string, result: Record<string, unknown>) {
  const db = getDb();
  db.prepare(
    `
      UPDATE topic_discovery_job_runs
      SET result_json = ?, heartbeat_at = ?
      WHERE id = ?
    `,
  ).run(stringifyJson(result), nowIso(), jobId);
}

function markTopicDiscoveryJobStatus(jobId: string, status: TopicDiscoveryJobStatus, error?: { code: string; message: string }) {
  const db = getDb();
  const finishedAt = status === "succeeded" || status === "failed" ? nowIso() : null;
  db.prepare(
    `
      UPDATE topic_discovery_job_runs
      SET status = ?,
          error_code = ?,
          error_message = ?,
          finished_at = ?,
          heartbeat_at = ?
      WHERE id = ?
    `,
  ).run(status, error?.code ?? null, error?.message ?? null, finishedAt, nowIso(), jobId);
}

function claimTopicDiscoveryJob(jobId: string): TopicDiscoveryJobRun | null {
  return withImmediateTransaction(() => {
    const db = getDb();
    const row = db.prepare("SELECT * FROM topic_discovery_job_runs WHERE id = ?").get(jobId) as Record<string, unknown> | undefined;
    if (!row || String(row.status) !== "queued") {
      return null;
    }

    const now = nowIso();
    db.prepare(
      `
        UPDATE topic_discovery_job_runs
        SET status = 'running',
            started_at = COALESCE(started_at, ?),
            heartbeat_at = ?,
            finished_at = NULL,
            result_json = NULL,
            error_code = NULL,
            error_message = NULL
        WHERE id = ? AND status = 'queued'
      `,
    ).run(now, now, jobId);
    appendTopicDiscoveryJobLog(jobId, "info", "job_claimed", "任务开始执行。", { step: String(row.step) });
    return getTopicDiscoveryJob(jobId);
  });
}

export async function runTopicDiscoveryJobNow(jobId: string) {
  const job = claimTopicDiscoveryJob(jobId);
  if (!job) {
    return getTopicDiscoveryJob(jobId);
  }

  const heartbeatTimer = setInterval(() => {
    markTopicDiscoveryJobHeartbeat(jobId);
  }, 5000);

  try {
    markTopicDiscoveryJobProgress(jobId, "running", formatTopicDiscoveryProgress(job.step));

    let result: Record<string, unknown>;
    switch (job.step) {
      case "pre-source-extract":
        result = { items: await extractPreSourceCardsForSession(job.sessionId) };
        break;
      case "signal-brief":
        result = { signalBrief: await generateSignalBriefForSession(job.sessionId) };
        break;
      case "topic-discovery-cocreate":
        result = { result: await generateTopicAnglesForSession(job.sessionId, { depth: normalizeTopicDiscoveryDepth(job.payload.depth) }) };
        break;
    }

    markTopicDiscoveryJobResult(jobId, result);
    markTopicDiscoveryJobStatus(jobId, "succeeded");
    appendTopicDiscoveryJobLog(jobId, "info", "job_succeeded", "任务执行成功。", { step: job.step });
    return getTopicDiscoveryJob(jobId);
  } catch (error) {
    const message = normalizeTopicDiscoveryJobError(error, job.step);
    updateTopicDiscoverySession(job.sessionId, { status: "failed" });
    markTopicDiscoveryJobStatus(jobId, "failed", { code: "job_failed", message });
    appendTopicDiscoveryJobLog(jobId, "error", "job_failed", message);
    return getTopicDiscoveryJob(jobId);
  } finally {
    clearInterval(heartbeatTimer);
  }
}

function normalizeTopicDiscoveryDepth(value: unknown): TopicDiscoveryDepth {
  return value === "full" ? "full" : "fast";
}

function formatTopicDiscoveryProgress(step: TopicDiscoveryJobStep) {
  switch (step) {
    case "pre-source-extract":
      return "正在抓取并整理文章链接。";
    case "signal-brief":
      return "正在整理信号简报。";
    case "topic-discovery-cocreate":
      return "正在生成选题候选池，DeepSeek V4 Pro 可能需要较长思考时间。";
  }
}

function normalizeTopicDiscoveryJobError(error: unknown, step: TopicDiscoveryJobStep) {
  const message = error instanceof Error ? error.message : "任务执行失败。";
  if (message.includes("aborted due to timeout") || message.includes("超时") || message.includes("timed out")) {
    return step === "topic-discovery-cocreate"
      ? "选题候选池生成超时。DeepSeek V4 Pro 思考较慢，我已经把后续超时时间加长；这次可以直接重试。"
      : `${formatTopicDiscoveryStepLabel(step)}超时，请重试一次。`;
  }
  return message;
}

function formatTopicDiscoveryStepLabel(step: TopicDiscoveryJobStep) {
  switch (step) {
    case "pre-source-extract":
      return "链接抓取";
    case "signal-brief":
      return "信号简报";
    case "topic-discovery-cocreate":
      return "选题候选池生成";
  }
}
