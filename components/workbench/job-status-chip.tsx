"use client";

import type { JobStatus } from "@/lib/jobs/types";
import { Chip } from "@/components/ui/chip";

export function JobStatusChip({ status }: { status: JobStatus }) {
  return <Chip className={`job-status-chip job-status-chip-${status}`}>{getStatusLabel(status)}</Chip>;
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
