import { markJobFailed, listStaleRunningJobs } from "./repository";

export function reapStaleJobs(staleAfterMs = 2 * 60 * 1000) {
  const cutoffIso = new Date(Date.now() - staleAfterMs).toISOString();
  const staleJobs = listStaleRunningJobs(cutoffIso);

  for (const job of staleJobs) {
    markJobFailed(job.id, {
      code: "timeout",
      message: "任务长时间未上报心跳，系统已将其标记为失败。",
    });
  }

  return staleJobs;
}
