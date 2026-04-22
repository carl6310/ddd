import { appendJobLog, claimNextQueuedJob, markJobFailed, markJobHeartbeat, markJobProgress, markJobResult, markJobSucceeded } from "./repository";
import { jobRegistry } from "./registry";
import { JobError, type JobExecutionContext } from "./types";

function toJobFailure(error: unknown) {
  if (error instanceof JobError) {
    return {
      code: error.code,
      message: error.message,
    };
  }

  return {
    code: "job_failed",
    message: error instanceof Error ? error.message : "任务执行失败。",
  };
}

export async function runNextQueuedJob() {
  const job = claimNextQueuedJob();
  if (!job) {
    return null;
  }

  const context: JobExecutionContext = {
    job,
    setProgress(stage, message) {
      markJobProgress(job.id, stage, message);
    },
    setResult(result) {
      markJobResult(job.id, result);
    },
    log(level, code, message, detail = {}) {
      appendJobLog(job.id, level, code, message, detail);
    },
  };

  const handler = jobRegistry[job.step];
  if (!handler) {
    markJobFailed(job.id, {
      code: "missing_handler",
      message: `未找到步骤 ${job.step} 的执行器。`,
    });
    return job;
  }

  const heartbeatTimer = setInterval(() => {
    markJobHeartbeat(job.id);
  }, 5000);

  try {
    await handler(context);
    markJobSucceeded(job.id);
  } catch (error) {
    const failure = toJobFailure(error);
    context.log("error", "job_failed", failure.message, { errorCode: failure.code });
    markJobFailed(job.id, failure);
  } finally {
    clearInterval(heartbeatTimer);
  }

  return job;
}
