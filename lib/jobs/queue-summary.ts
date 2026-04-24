import type { JobStatus } from "./types";

type ActiveJobLike = {
  id: string;
  status: JobStatus;
  createdAt: string;
};

export interface ActiveQueueSummary {
  activeCount: number;
  runningCount: number;
  queuedCount: number;
}

export interface JobQueueMetrics extends ActiveQueueSummary {
  aheadCount: number;
  position: number | null;
}

export function buildActiveQueueSummary(activeJobs: ActiveJobLike[]): ActiveQueueSummary {
  const runningCount = activeJobs.filter((job) => job.status === "running").length;
  const queuedCount = activeJobs.filter((job) => job.status === "queued").length;
  return {
    activeCount: activeJobs.length,
    runningCount,
    queuedCount,
  };
}

export function buildJobQueueMetrics(activeJobs: ActiveJobLike[], jobId: string): JobQueueMetrics {
  const summary = buildActiveQueueSummary(activeJobs);
  const index = activeJobs.findIndex((job) => job.id === jobId);

  return {
    ...summary,
    aheadCount: index >= 0 ? index : 0,
    position: index >= 0 ? index + 1 : null,
  };
}
