"use client";

import { useState } from "react";
import type { JobLog } from "@/lib/jobs/types";
import type { ProjectJobSummary, ProjectQueueSummary } from "@/hooks/use-job-polling";
import { JobStatusChip } from "./job-status-chip";

export function JobLogPanel({
  job,
  logs,
  queueSummary,
  onRetry,
  isRetrying,
}: {
  job: ProjectJobSummary | null;
  logs: JobLog[];
  queueSummary: ProjectQueueSummary;
  onRetry: (() => void) | null;
  isRetrying: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!job) {
    return null;
  }

  const statusTone =
    job.status === "failed"
      ? "error"
      : job.status === "succeeded"
        ? "success"
        : job.status === "running"
          ? "running"
          : "info";
  const detailId = `job-toast-detail-${job.id}`;
  const toggleExpanded = () => setExpanded((value) => !value);

  return (
    <section className={`job-toast job-toast-${statusTone}`}>
      <div
        className="job-toast-bar"
        onClick={toggleExpanded}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleExpanded();
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls={detailId}
        aria-label={`${getStepLabel(job.step)}：${job.progressMessage || getStatusCopy(job)}`}
      >
        <div className="job-toast-icon">
          {statusTone === "error" ? "✕" : statusTone === "success" ? "✓" : statusTone === "running" ? "⟳" : "◷"}
        </div>
        <div className="job-toast-summary">
          <span className="job-toast-step">{getStepLabel(job.step)}</span>
          <span className="job-toast-msg">{job.progressMessage || getStatusCopy(job)}</span>
        </div>
        <div className="job-toast-actions">
          <JobStatusChip status={job.status} />
          {onRetry ? (
            <button
              type="button"
              className="job-toast-retry-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              disabled={isRetrying}
            >
              {isRetrying ? "重试中…" : "重试"}
            </button>
          ) : null}
          <button type="button" className="job-toast-expand-btn" aria-label={expanded ? "收起任务详情" : "展开任务详情"}>
            {expanded ? "▴" : "▾"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="job-toast-detail" id={detailId}>
          {job.status === "queued" ? (
            <p className="job-toast-queue-meta">
              前面还有 {job.queueAheadCount ?? 0} 个任务，当前全局队列共 {queueSummary.activeCount} 个任务
              {queueSummary.runningCount > 0 ? `，其中 ${queueSummary.runningCount} 个正在执行` : ""}。
            </p>
          ) : null}
          {job.status === "running" ? (
            <p className="job-toast-queue-meta">
              当前正在执行。全局还有 {queueSummary.queuedCount} 个任务在排队。
            </p>
          ) : null}
          {job.errorMessage ? <p className="job-toast-error">{job.errorMessage}</p> : null}
          {logs.length > 0 ? (
            <ul className="job-toast-log-list">
              {logs.map((log) => (
                <li key={log.id} className={`job-toast-log-item job-toast-log-${log.level}`}>
                  <span className="job-toast-log-tag">[{log.level}] {log.code}</span>
                  <span className="job-toast-log-text">{log.message}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="job-toast-empty">任务日志会随着运行逐步出现。</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function getStepLabel(step: ProjectJobSummary["step"]) {
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

function getStatusCopy(job: ProjectJobSummary) {
  switch (job.status) {
    case "queued":
      return `任务已排队，前面还有 ${job.queueAheadCount ?? 0} 个。`;
    case "running":
      return "任务正在后台执行。";
    case "succeeded":
      return "任务已完成。";
    case "failed":
      return "任务执行失败。";
    default:
      return job.status;
  }
}
