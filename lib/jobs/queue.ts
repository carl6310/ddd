import { createHash } from "node:crypto";
import { createRetryJob, enqueueJob } from "./repository";
import type { EnqueueJobResult, JobPayload, JobStep } from "./types";

function buildScopedDedupeKey(projectId: string, step: JobStep, dedupeScope?: string) {
  if (!dedupeScope) {
    return undefined;
  }
  const digest = createHash("sha256").update(dedupeScope).digest("hex").slice(0, 12);
  return `project:${projectId}:step:${step}:scope:${digest}`;
}

export function enqueueProjectJob(input: {
  projectId: string;
  step: JobStep;
  payload?: JobPayload;
  maxAttempts?: number;
  dedupeScope?: string;
}): EnqueueJobResult {
  return enqueueJob({
    ...input,
    dedupeKey: buildScopedDedupeKey(input.projectId, input.step, input.dedupeScope),
  });
}

export function retryJob(jobId: string): EnqueueJobResult {
  return createRetryJob(jobId);
}
