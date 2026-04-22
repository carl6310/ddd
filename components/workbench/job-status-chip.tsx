"use client";

import type { JobStatus } from "@/lib/jobs/types";

export function JobStatusChip({ status }: { status: JobStatus }) {
  return <span className={`badge job-status-chip job-status-chip-${status}`}>{getStatusLabel(status)}</span>;
}

function getStatusLabel(status: JobStatus) {
  switch (status) {
    case "queued":
      return "排队中";
    case "running":
      return "运行中";
    case "succeeded":
      return "已完成";
    case "failed":
      return "失败";
    default:
      return status;
  }
}
