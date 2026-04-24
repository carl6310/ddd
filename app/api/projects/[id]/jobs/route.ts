import { fail, ok } from "@/lib/api";
import { listActiveJobs, listProjectJobs } from "@/lib/jobs/repository";
import { buildActiveQueueSummary, buildJobQueueMetrics } from "@/lib/jobs/queue-summary";
import { getProject } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) {
    return fail("项目不存在。", 404);
  }

  const activeJobs = listActiveJobs();
  const queueSummary = buildActiveQueueSummary(activeJobs);
  const jobs = listProjectJobs(id).map((job) => {
    const metrics = buildJobQueueMetrics(activeJobs, job.id);
    return {
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
      queuePosition: metrics.position,
      queueAheadCount: metrics.position ? metrics.aheadCount : null,
      queueActiveCount: metrics.activeCount,
      queueRunningCount: metrics.runningCount,
      queueQueuedCount: metrics.queuedCount,
    };
  });

  return ok({ items: jobs, queueSummary });
}
