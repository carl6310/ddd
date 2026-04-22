"use client";

import { useCallback, useEffect, useState } from "react";
import type { JobLog, JobRun } from "@/lib/jobs/types";

export type ProjectJobSummary = Pick<
  JobRun,
  "id" | "projectId" | "step" | "status" | "progressStage" | "progressMessage" | "result" | "errorCode" | "errorMessage" | "createdAt" | "startedAt" | "finishedAt"
>;

export interface JobDetail {
  job: ProjectJobSummary;
  logsTail: JobLog[];
}

export function useJobPolling(projectId: string) {
  const [jobs, setJobs] = useState<ProjectJobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setJobs([]);
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
    isLoading,
    refresh,
    loadJobDetail,
  };
}
