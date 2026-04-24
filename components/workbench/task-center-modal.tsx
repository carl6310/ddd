"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { JobStatus, JobStep } from "@/lib/jobs/types";
import type { ProjectQueueSummary } from "@/hooks/use-job-polling";
import { JobStatusChip } from "./job-status-chip";

type TaskCenterJob = {
  id: string;
  projectId: string;
  projectTopic: string;
  projectStage: string;
  step: JobStep;
  status: JobStatus;
  progressMessage: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  queuePosition: number | null;
  queueAheadCount: number | null;
};

type TaskCenterPayload = {
  items: TaskCenterJob[];
  queueSummary: ProjectQueueSummary;
};

export function TaskCenterModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [jobs, setJobs] = useState<TaskCenterJob[]>([]);
  const [queueSummary, setQueueSummary] = useState<ProjectQueueSummary>({ activeCount: 0, runningCount: 0, queuedCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [retryingJobId, setRetryingJobId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const failedCount = jobs.filter((job) => job.status === "failed").length;
  const runningCount = jobs.filter((job) => job.status === "running").length;

  const loadJobs = useCallback(async () => {
    if (!open) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/jobs?limit=60");
      const payload = (await response.json()) as TaskCenterPayload & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "读取任务中心失败。");
      }
      setJobs(payload.items ?? []);
      setQueueSummary(payload.queueSummary ?? { activeCount: 0, runningCount: 0, queuedCount: 0 });
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "读取任务中心失败。");
    } finally {
      setIsLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadJobs();
    const timer = window.setInterval(() => {
      void loadJobs();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [loadJobs, open]);

  async function deleteQueuedJob(job: TaskCenterJob) {
    const confirmed = window.confirm(`删除这个排队任务？\n\n${getStepLabel(job.step)}\n${job.projectTopic}`);
    if (!confirmed) {
      return;
    }

    setDeletingJobId(job.id);
    try {
      const response = await fetch(`/api/jobs/${job.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "删除任务失败。");
      }
      await loadJobs();
      await onChanged();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除任务失败。");
    } finally {
      setDeletingJobId(null);
    }
  }

  async function retryFailedJob(job: TaskCenterJob) {
    setRetryingJobId(job.id);
    try {
      const response = await fetch(`/api/jobs/${job.id}/retry`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "任务重试失败。");
      }
      await loadJobs();
      await onChanged();
      setError(payload.job?.deduped ? "已有同类任务在后台执行，已继续跟踪。" : "");
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "任务重试失败。");
    } finally {
      setRetryingJobId(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="任务中心" description="查看后台任务队列；排队中的任务可以删除。" size="lg">
      <div className="task-center stack">
        <div className="task-center-summary">
          <div>
            <strong>{queueSummary.runningCount}</strong>
            <span>运行中</span>
          </div>
          <div>
            <strong>{queueSummary.queuedCount}</strong>
            <span>排队中</span>
          </div>
          <div>
            <strong>{queueSummary.activeCount}</strong>
            <span>活跃任务</span>
          </div>
        </div>

        {error ? <p className="task-center-error">{error}</p> : null}
        {failedCount > 0 || runningCount > 0 ? (
          <div className="task-center-guidance">
            {failedCount > 0 ? <p>{failedCount} 个任务失败。失败任务可以直接重试；如果仍失败，先看任务卡片里的处理建议。</p> : null}
            {runningCount > 0 ? <p>{runningCount} 个任务运行中。长时间没有进度变化时，优先确认后台 worker 是否还在执行。</p> : null}
          </div>
        ) : null}

        <div className="task-center-head">
          <h3>最近任务</h3>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadJobs()} disabled={isLoading}>
            {isLoading ? "刷新中…" : "刷新"}
          </Button>
        </div>

        <div className="task-center-list">
          {jobs.length === 0 ? (
            <p className="empty-inline">暂无任务。</p>
          ) : (
            jobs.map((job) => (
              <article className="task-center-item" key={job.id}>
                <div className="task-center-item-main">
                  <div className="task-center-item-title">
                    <strong>{getStepLabel(job.step)}</strong>
                    <JobStatusChip status={job.status} />
                  </div>
                  <p>{job.projectTopic}</p>
                  <small>
                    {[job.projectStage, formatQueueMeta(job), formatTime(job.createdAt)].filter(Boolean).join(" · ")}
                  </small>
                  {job.progressMessage ? <small>{job.progressMessage}</small> : null}
                  {job.errorMessage ? <small className="task-center-error-text">{job.errorMessage}</small> : null}
                  {getJobRecoveryHint(job) ? <small className="task-center-recovery">{getJobRecoveryHint(job)}</small> : null}
                </div>
                <div className="task-center-item-actions">
                  {job.status === "queued" ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void deleteQueuedJob(job)}
                      disabled={deletingJobId === job.id}
                    >
                      {deletingJobId === job.id ? "删除中…" : "删除"}
                    </Button>
                  ) : job.status === "failed" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void retryFailedJob(job)}
                      disabled={retryingJobId === job.id}
                    >
                      {retryingJobId === job.id ? "重试中…" : "重试"}
                    </Button>
                  ) : (
                    <span className="task-center-action-note">{job.status === "running" ? "运行中不可删除" : "历史记录"}</span>
                  )}
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

function getJobRecoveryHint(job: TaskCenterJob) {
  if (job.status === "queued") {
    return job.queueAheadCount ? `前面还有 ${job.queueAheadCount} 个任务，暂时不需要重复点击生成。` : "已进入队列，等待 worker 接手。";
  }
  if (job.status === "running") {
    return "刷新后进度会自动更新；若长时间停住，检查后台 worker。";
  }
  if (job.status !== "failed") {
    return "";
  }
  const error = (job.errorMessage || "").toLowerCase();
  if (error.includes("output") || error.includes("token") || error.includes("too long") || error.includes("过长")) {
    return "模型输出过长。重试前最好压缩输入材料，或先拆小资料/段落。";
  }
  if (error.includes("wechat") || error.includes("mp.weixin") || error.includes("保护") || error.includes("环境异常")) {
    return "公众号链接被保护。建议复制原文到资料录入，再生成资料摘要。";
  }
  if (error.includes("executor") || error.includes("worker") || error.includes("missing")) {
    return "后台执行器没有接住任务。先启动 worker，再点重试。";
  }
  if (job.step === "source-card-extract") {
    return "链接抓取失败时，可改用手动粘贴原文。";
  }
  return "可以先点重试；连续失败时再查看后台日志定位。";
}

function getStepLabel(step: JobStep) {
  switch (step) {
    case "research-brief":
      return "生成研究清单";
    case "source-card-extract":
      return "抓取链接正文";
    case "source-card-summarize":
      return "生成资料摘要";
    case "sector-model":
      return "生成板块建模";
    case "outline":
      return "生成提纲";
    case "drafts":
      return "生成双稿";
    case "review":
      return "运行 VitalityCheck";
    case "publish-prep":
      return "生成发布前整理";
    default:
      return step;
  }
}

function formatQueueMeta(job: TaskCenterJob) {
  if (job.status === "queued") {
    return job.queuePosition ? `队列第 ${job.queuePosition} 位` : "排队中";
  }
  if (job.status === "running") {
    return "正在执行";
  }
  return job.finishedAt ? `完成于 ${formatTime(job.finishedAt)}` : "";
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
