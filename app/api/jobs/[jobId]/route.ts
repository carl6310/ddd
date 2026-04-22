import { fail, ok } from "@/lib/api";
import { getJobRun, listJobLogs } from "@/lib/jobs/repository";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getJobRun(jobId);
  if (!job) {
    return fail("任务不存在。", 404);
  }

  return ok({
    job: {
      id: job.id,
      projectId: job.projectId,
      step: job.step,
      status: job.status,
      progressStage: job.progressStage,
      progressMessage: job.progressMessage,
      result: job.result,
      errorCode: job.errorCode,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    },
    logsTail: listJobLogs(jobId),
  });
}
