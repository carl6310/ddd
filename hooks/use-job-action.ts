"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobDetail } from "./use-job-polling";

type JobActionOptions = {
  trackDetail?: boolean;
};

type ConfirmationResolution = {
  retry: boolean;
  body?: unknown;
};

type SubmitJobOptions = {
  url: string;
  method?: "POST";
  body?: unknown;
  onQueued?: (jobId: string, deduped: boolean) => void;
  onSucceeded?: (detail: JobDetail) => void;
  onFailed?: (detail: JobDetail) => void;
  onNeedsConfirmation?: (payload: Record<string, unknown>) => Promise<ConfirmationResolution> | ConfirmationResolution;
};

export function useJobAction(options: JobActionOptions = {}) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const terminalHandledRef = useRef<string | null>(null);
  const trackDetail = options.trackDetail ?? true;

  const loadDetail = useCallback(async (targetJobId: string) => {
    const response = await fetch(`/api/jobs/${targetJobId}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "读取任务详情失败。");
    }
    return payload as JobDetail;
  }, []);

  const submitJob = useCallback(async (jobOptions: SubmitJobOptions) => {
    setIsSubmitting(true);
    terminalHandledRef.current = null;
    try {
      const response = await fetch(jobOptions.url, {
        method: jobOptions.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: jobOptions.body === undefined ? undefined : JSON.stringify(jobOptions.body),
      });
      const payload = await response.json();
      if (response.status === 409 && payload.needsConfirmation && jobOptions.onNeedsConfirmation) {
        const resolution = await jobOptions.onNeedsConfirmation(payload as Record<string, unknown>);
        if (!resolution.retry) {
          throw new Error(payload.error || "已取消继续执行。");
        }
        return await submitJob({
          ...jobOptions,
          body: resolution.body ?? jobOptions.body,
          onNeedsConfirmation: undefined,
        });
      }
      if (!response.ok) {
        throw new Error(payload.error || "任务提交失败。");
      }

      const nextJobId = payload.job?.id as string | undefined;
      if (!nextJobId) {
        throw new Error("任务已提交，但没有返回 job id。");
      }

      setJobId(nextJobId);
      jobOptions.onQueued?.(nextJobId, Boolean(payload.job?.deduped));
      return {
        jobId: nextJobId,
        deduped: Boolean(payload.job?.deduped),
        payload,
      };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  useEffect(() => {
    if (!trackDetail) {
      return;
    }

    if (!jobId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      const nextDetail = await loadDetail(jobId);
      if (cancelled) {
        return;
      }
      setDetail(nextDetail);
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId, loadDetail, trackDetail]);

  const bindTerminalHandlers = useCallback(
    (handlers: { onSucceeded?: (detail: JobDetail) => void; onFailed?: (detail: JobDetail) => void }) => {
      if (!detail || terminalHandledRef.current === detail.job.id) {
        return;
      }

      if (detail.job.status === "succeeded") {
        terminalHandledRef.current = detail.job.id;
        handlers.onSucceeded?.(detail);
      }

      if (detail.job.status === "failed") {
        terminalHandledRef.current = detail.job.id;
        handlers.onFailed?.(detail);
      }
    },
    [detail],
  );

  return {
    jobId,
    detail,
    isSubmitting,
    submitJob,
    bindTerminalHandlers,
  };
}
