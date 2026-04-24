import { ok } from "@/lib/api";
import { listActiveJobs, listRecentJobsWithProjects } from "@/lib/jobs/repository";
import { buildActiveQueueSummary, buildJobQueueMetrics } from "@/lib/jobs/queue-summary";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
  const activeJobs = listActiveJobs();
  const queueSummary = buildActiveQueueSummary(activeJobs);
  const items = listRecentJobsWithProjects(limit).map((job) => {
    const metrics = buildJobQueueMetrics(activeJobs, job.id);
    return {
      id: job.id,
      projectId: job.projectId,
      projectTopic: job.projectTopic,
      projectStage: job.projectStage,
      step: job.step,
      status: job.status,
      progressStage: job.progressStage,
      progressMessage: job.progressMessage,
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

  return ok({ items, queueSummary });
}
