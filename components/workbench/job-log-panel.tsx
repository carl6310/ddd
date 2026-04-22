"use client";

import type { JobLog } from "@/lib/jobs/types";
import type { ProjectJobSummary } from "@/hooks/use-job-polling";
import { JobStatusChip } from "./job-status-chip";

export function JobLogPanel({
  job,
  logs,
  onRetry,
  isRetrying,
}: {
  job: ProjectJobSummary | null;
  logs: JobLog[];
  onRetry: (() => void) | null;
  isRetrying: boolean;
}) {
  if (!job) {
    return null;
  }

  return (
    <section className="card stack">
      <div className="card-header">
        <div>
          <h2>后台任务</h2>
          <p className="subtle">
            {getStepLabel(job.step)} · {job.progressMessage || getStatusCopy(job.status)}
          </p>
        </div>
        <JobStatusChip status={job.status} />
      </div>

      {job.errorMessage ? <p className="subtle">{job.errorMessage}</p> : null}

      {logs.length > 0 ? (
        <ul className="compact-list">
          {logs.map((log) => (
            <li key={log.id}>
              <strong>[{log.level}] {log.code}</strong>
              <span>{log.message}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="subtle">任务日志会随着运行逐步出现。</p>
      )}

      {onRetry ? (
        <div className="action-row">
          <button type="button" className="secondary-button" onClick={onRetry} disabled={isRetrying}>
            {isRetrying ? "正在重试..." : "重试任务"}
          </button>
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

function getStatusCopy(status: ProjectJobSummary["status"]) {
  switch (status) {
    case "queued":
      return "任务已排队，等待 worker 处理。";
    case "running":
      return "任务正在后台执行。";
    case "succeeded":
      return "任务已完成。";
    case "failed":
      return "任务执行失败。";
    default:
      return status;
  }
}
