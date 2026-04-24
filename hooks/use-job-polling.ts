"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobLog, JobRun } from "@/lib/jobs/types";

export type ProjectJobSummary = Pick<
  JobRun,
  "id" | "projectId" | "step" | "status" | "progressStage" | "progressMessage" | "result" | "errorCode" | "errorMessage" | "createdAt" | "startedAt" | "finishedAt"
> & {
  queuePosition: number | null;
  queueAheadCount: number | null;
  queueActiveCount: number;
  queueRunningCount: number;
  queueQueuedCount: number;
};

export interface ProjectQueueSummary {
  activeCount: number;
  runningCount: number;
  queuedCount: number;
}

export interface JobDetail {
  job: ProjectJobSummary;
  logsTail: JobLog[];
}

export function useJobPolling(projectId: string) {
  const [jobs, setJobs] = useState<ProjectJobSummary[]>([]);
  const [queueSummary, setQueueSummary] = useState<ProjectQueueSummary>({ activeCount: 0, runningCount: 0, queuedCount: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setJobs([]);
      setQueueSummary({ activeCount: 0, runningCount: 0, queuedCount: 0 });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/jobs`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "读取任务列表失败。");
      }
      setJobs(payload.items ?? []);
      setQueueSummary(payload.queueSummary ?? { activeCount: 0, runningCount: 0, queuedCount: 0 });
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const loadJobDetail = useCallback(async (jobId: string): Promise<JobDetail | null> => {
    if (!jobId) {
      return null;
    }

    const response = await fetch(`/api/jobs/${jobId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "读取任务详情失败。");
    }
    return payload as JobDetail;
  }, []);

  useEffect(() => {
    if (!projectId) {
      setJobs([]);
      setQueueSummary({ activeCount: 0, runningCount: 0, queuedCount: 0 });
      return;
    }

    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [projectId, refresh]);

  return {
    jobs,
    queueSummary,
    isLoading,
    refresh,
    loadJobDetail,
  };
}
