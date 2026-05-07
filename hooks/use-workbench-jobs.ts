"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useJobAction } from "@/hooks/use-job-action";
import { useJobPolling, type JobDetail, type ProjectJobSummary } from "@/hooks/use-job-polling";
import type { JobStatus, JobStep } from "@/lib/jobs/types";
import type { ActiveTab, StaleArtifact, WorkbenchStepPath, WorkspaceSection } from "@/components/workbench/workflow-state";

type MessageKind = "success" | "error" | "info";

export function useWorkbenchJobs({
  selectedProjectId,
  refreshProjectsAndBundle,
  markArtifactsStale,
  clearArtifacts,
  navigateWorkbench,
  showFeedback,
}: {
  selectedProjectId: string;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  markArtifactsStale: (artifacts: StaleArtifact[], projectId?: string) => void;
  clearArtifacts: (artifacts: StaleArtifact[], projectId?: string) => void;
  navigateWorkbench: (tab: ActiveTab, section: WorkspaceSection) => void;
  showFeedback: (text: string, forcedKind?: MessageKind) => void;
}) {
  const [jobDetail, setJobDetail] = useState<JobDetail | null>(null);
  const [isRetryingJob, setIsRetryingJob] = useState(false);
  const previousJobStatuses = useRef(new Map<string, JobStatus>());
  const handledTerminalJobs = useRef(new Set<string>());
  const { jobs, queueSummary, refresh: refreshJobs, loadJobDetail } = useJobPolling(selectedProjectId);
  const stepJobAction = useJobAction({ trackDetail: false });
  const publishPrepJobAction = useJobAction({ trackDetail: false });

  useEffect(() => {
    previousJobStatuses.current.clear();
    handledTerminalJobs.current.clear();
    setJobDetail(null);
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }

    const completedJobs: ProjectJobSummary[] = [];
    const failedJobs: ProjectJobSummary[] = [];

    for (const job of jobs) {
      const previousStatus = previousJobStatuses.current.get(job.id);
      previousJobStatuses.current.set(job.id, job.status);

      if (handledTerminalJobs.current.has(job.id)) {
        continue;
      }

      if ((previousStatus === "queued" || previousStatus === "running") && job.status === "succeeded") {
        handledTerminalJobs.current.add(job.id);
        completedJobs.push(job);
        reconcileStaleArtifactsForCompletedJob(job.step, selectedProjectId, clearArtifacts, markArtifactsStale);
      }

      if ((previousStatus === "queued" || previousStatus === "running") && job.status === "failed") {
        handledTerminalJobs.current.add(job.id);
        failedJobs.push(job);
      }
    }

    if (completedJobs.length > 0) {
      const latestCompletedJob = completedJobs[0];
      setJobDetail(null);
      navigateWorkbench(getResultTabForJobStep(latestCompletedJob.step), getResultSectionForJobStep(latestCompletedJob.step));
      showFeedback(getSuccessMessageForJobStep(latestCompletedJob.step), "success");
      void refreshProjectsAndBundle(selectedProjectId).catch((error) => {
        showFeedback(error instanceof Error ? error.message : "刷新项目详情失败。");
      });
    }

    if (failedJobs.length > 0) {
      const latestFailedJob = failedJobs[0];
      showFeedback(latestFailedJob.errorMessage || getFailureMessageForJobStep(latestFailedJob.step), "error");
      void loadJobDetail(latestFailedJob.id)
        .then((detail) => {
          setJobDetail(detail);
        })
        .catch((error) => {
          showFeedback(error instanceof Error ? error.message : "读取任务详情失败。");
        });
    }
  }, [clearArtifacts, jobs, loadJobDetail, markArtifactsStale, navigateWorkbench, refreshProjectsAndBundle, selectedProjectId, showFeedback]);

  const runProjectStep = useCallback(
    async (path: WorkbenchStepPath, _successMessage?: string, forceProceed = false) => {
      if (!selectedProjectId) {
        return;
      }

      try {
        showFeedback(path === "drafts" ? "正在生成双稿，真实模型可能需要 20-60 秒，请稍等。" : "", "info");
        const submission = await stepJobAction.submitJob({
          url: `/api/projects/${selectedProjectId}/${path}`,
          body: forceProceed ? { forceProceed: true } : {},
          onNeedsConfirmation(payload) {
            const confirmed = window.confirm((payload.error as string) || "这一步有风险提醒，是否仍然继续？");
            return {
              retry: confirmed,
              body: { forceProceed: true },
            };
          },
        });
        navigateWorkbench(getResultTabForStep(path), getResultSectionForStep(path));
        await refreshJobs();
        showFeedback(
          submission.deduped ? "同一步骤已经有后台任务在执行，已继续跟踪这条任务。" : getQueuedMessageForStep(path),
          "info",
        );
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "执行步骤失败。");
      }
    },
    [navigateWorkbench, refreshJobs, selectedProjectId, showFeedback, stepJobAction],
  );

  const generatePublishPrep = useCallback(async () => {
    if (!selectedProjectId) {
      return;
    }

    try {
      showFeedback("", "info");
      const submission = await publishPrepJobAction.submitJob({
        url: `/api/projects/${selectedProjectId}/publish-prep`,
        onQueued(_jobId, deduped) {
          showFeedback(
            deduped ? "发布前整理任务已经在后台执行，已继续跟踪这条任务。" : "发布前整理任务已入队，正在后台执行。",
            "info",
          );
        },
      });
      navigateWorkbench("publish", "publish-prep");
      await refreshJobs();
      if (submission.deduped) {
        showFeedback("发布前整理任务已经在后台执行，已继续跟踪这条任务。", "info");
      }
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "生成发布前整理稿失败。");
    }
  }, [navigateWorkbench, publishPrepJobAction, refreshJobs, selectedProjectId, showFeedback]);

  const retryFailedJob = useCallback(
    async (jobId: string) => {
      setIsRetryingJob(true);
      try {
        const response = await fetch(`/api/jobs/${jobId}/retry`, {
          method: "POST",
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error || "任务重试失败。");
        }
        await refreshJobs();
        setJobDetail(null);
        showFeedback(payload.job?.deduped ? "已有同类任务在后台执行，已继续跟踪。" : "失败任务已重新入队。", "info");
      } catch (error) {
        showFeedback(error instanceof Error ? error.message : "任务重试失败。");
      } finally {
        setIsRetryingJob(false);
      }
    },
    [refreshJobs, showFeedback],
  );

  const visibleJob = jobDetail?.job ?? null;

  return {
    jobs,
    queueSummary,
    refreshJobs,
    jobDetail,
    visibleJob,
    isRetryingJob,
    isSubmitting: stepJobAction.isSubmitting || publishPrepJobAction.isSubmitting,
    runProjectStep,
    retryFailedJob,
    generatePublishPrep,
  };
}

function reconcileStaleArtifactsForCompletedJob(
  step: JobStep,
  projectId: string,
  clearArtifacts: (artifacts: StaleArtifact[], projectId?: string) => void,
  markArtifactsStale: (artifacts: StaleArtifact[], projectId?: string) => void,
) {
  switch (step) {
    case "research-brief":
      clearArtifacts(["research-brief"], projectId);
      markArtifactsStale(["sector-model", "outline", "drafts", "review", "publish-prep"], projectId);
      return;
    case "sector-model":
      clearArtifacts(["sector-model"], projectId);
      markArtifactsStale(["outline", "drafts", "review", "publish-prep"], projectId);
      return;
    case "outline":
      clearArtifacts(["outline"], projectId);
      markArtifactsStale(["drafts", "review", "publish-prep"], projectId);
      return;
    case "drafts":
      clearArtifacts(["drafts"], projectId);
      markArtifactsStale(["review", "publish-prep"], projectId);
      return;
    case "review":
      clearArtifacts(["review"], projectId);
      markArtifactsStale(["publish-prep"], projectId);
      return;
    case "publish-prep":
      clearArtifacts(["publish-prep"], projectId);
      return;
    default:
      return;
  }
}

function getResultTabForStep(path: WorkbenchStepPath): ActiveTab {
  switch (path) {
    case "research-brief":
      return "research";
    case "sector-model":
    case "outline":
      return "structure";
    case "drafts":
      return "drafts";
    case "review":
    default:
      return "publish";
  }
}

function getResultSectionForStep(path: WorkbenchStepPath): WorkspaceSection {
  switch (path) {
    case "research-brief":
      return "research-brief";
    case "sector-model":
      return "sector-model";
    case "outline":
      return "outline";
    case "drafts":
      return "drafts";
    case "review":
      return "publish-prep";
    default:
      return null;
  }
}

function getResultTabForJobStep(step: JobStep): ActiveTab {
  switch (step) {
    case "research-brief":
    case "source-card-extract":
    case "source-card-summarize":
      return "research";
    case "sector-model":
    case "outline":
      return "structure";
    case "drafts":
      return "drafts";
    case "publish-prep":
    case "review":
    default:
      return "publish";
  }
}

function getResultSectionForJobStep(step: JobStep): WorkspaceSection {
  switch (step) {
    case "research-brief":
      return "research-brief";
    case "source-card-extract":
    case "source-card-summarize":
      return "source-form";
    case "sector-model":
      return "sector-model";
    case "outline":
      return "outline";
    case "drafts":
      return "drafts";
    case "publish-prep":
    case "review":
    default:
      return "publish-prep";
  }
}

function getSuccessMessageForJobStep(step: JobStep) {
  switch (step) {
    case "research-brief":
      return "研究清单已生成。";
    case "source-card-extract":
      return "链接正文已抓取完成。";
    case "source-card-summarize":
      return "资料摘要已生成。";
    case "sector-model":
      return "板块建模已生成。";
    case "outline":
      return "提纲已生成。";
    case "drafts":
      return "双稿初稿已生成。";
    case "publish-prep":
      return "发布前整理稿已生成。";
    case "review":
    default:
      return "质检报告已更新。";
  }
}

function getFailureMessageForJobStep(step: JobStep) {
  switch (step) {
    case "research-brief":
      return "生成研究清单失败。";
    case "source-card-extract":
      return "从链接抓正文失败。";
    case "source-card-summarize":
      return "生成资料摘要失败。";
    case "sector-model":
      return "生成板块建模失败。";
    case "outline":
      return "生成提纲失败。";
    case "drafts":
      return "生成双稿失败。";
    case "publish-prep":
      return "生成发布前整理稿失败。";
    case "review":
    default:
      return "运行质检失败。";
  }
}

function getQueuedMessageForStep(step: WorkbenchStepPath) {
  switch (step) {
    case "research-brief":
      return "研究清单任务已入队，正在后台执行。";
    case "sector-model":
      return "板块建模任务已入队，正在后台执行。";
    case "outline":
      return "提纲任务已入队，正在后台执行。";
    case "drafts":
      return "双稿任务已入队，正在后台执行。";
    case "review":
      return "质检任务已入队，正在后台执行。";
    default:
      return "任务已入队，正在后台执行。";
  }
}
