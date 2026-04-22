export const JOB_STEPS = ["research-brief", "sector-model", "outline", "drafts", "review", "publish-prep", "source-card-extract", "source-card-summarize"] as const;
export const JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export const JOB_LOG_LEVELS = ["info", "warn", "error"] as const;

export type JobStep = (typeof JOB_STEPS)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];
export type JobLogLevel = (typeof JOB_LOG_LEVELS)[number];

export interface JobPayload {
  forceProceed?: boolean;
  url?: string;
  rawText?: string;
  title?: string;
}

export interface JobRun {
  id: string;
  projectId: string;
  step: JobStep;
  status: JobStatus;
  parentJobId: string | null;
  dedupeKey: string;
  payload: JobPayload;
  attemptCount: number;
  maxAttempts: number;
  progressStage: string | null;
  progressMessage: string | null;
  result: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
}

export interface JobLog {
  id: number;
  jobId: string;
  level: JobLogLevel;
  code: string;
  message: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface LLMCallAuditRecord {
  id: string;
  jobId: string | null;
  projectId: string | null;
  taskType: string;
  modelMode: string;
  modelName: string;
  promptVersion: string;
  timeoutMs: number;
  maxTokens: number;
  temperature: number;
  inputHash: string;
  outputHash: string;
  latencyMs: number;
  tokenUsage: Record<string, unknown>;
  status: "ok" | "timeout" | "parse_error" | "api_error";
  errorMessage: string | null;
  createdAt: string;
}

export interface EnqueueJobResult {
  job: JobRun;
  deduped: boolean;
}

export interface JobExecutionContext {
  job: JobRun;
  setProgress: (stage: string, message: string) => void;
  setResult: (result: Record<string, unknown>) => void;
  log: (level: JobLogLevel, code: string, message: string, detail?: Record<string, unknown>) => void;
}

export class JobError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "JobError";
    this.code = code;
  }
}
