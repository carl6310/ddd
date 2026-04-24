import { reapStaleJobs } from "@/lib/jobs/reaper";
import { claimNextQueuedJob } from "@/lib/jobs/repository";
import { runClaimedJob } from "@/lib/jobs/runner";

const pollIntervalMs = Number(process.env.JOB_WORKER_POLL_INTERVAL_MS ?? 2000);
const staleAfterMs = Number(process.env.JOB_WORKER_STALE_AFTER_MS ?? 120000);
const workerConcurrency = normalizeConcurrency(process.env.JOB_WORKER_CONCURRENCY);
const once = process.argv.includes("--once");

let shouldStop = false;
const runningJobs = new Set<Promise<void>>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeConcurrency(value: string | undefined) {
  const parsed = Number(value ?? 2);
  if (!Number.isFinite(parsed)) {
    return 2;
  }
  return Math.max(1, Math.min(8, Math.floor(parsed)));
}

function startNextRunnableJob() {
  const job = claimNextQueuedJob();
  if (!job) {
    return false;
  }

  console.log(`[worker] running job=${job.id} step=${job.step} project=${job.projectId}`);

  const task = runClaimedJob(job)
    .then(() => {
      console.log(`[worker] finished job=${job.id}`);
    })
    .catch((error) => {
      console.error(`[worker] failed job=${job.id}`, error);
    })
    .finally(() => {
      runningJobs.delete(task);
    });

  runningJobs.add(task);
  return true;
}

function fillWorkerSlots() {
  const targetConcurrency = once ? 1 : workerConcurrency;
  let started = 0;
  while (runningJobs.size < targetConcurrency && startNextRunnableJob()) {
    started += 1;
  }
  return started;
}

async function main() {
  process.on("SIGINT", () => {
    shouldStop = true;
  });
  process.on("SIGTERM", () => {
    shouldStop = true;
  });

  console.log(`[worker] started pollInterval=${pollIntervalMs} staleAfter=${staleAfterMs} concurrency=${workerConcurrency}`);

  do {
    const reaped = reapStaleJobs(staleAfterMs);
    if (reaped.length > 0) {
      console.log(`[worker] reaped ${reaped.length} stale jobs`);
    }

    const started = fillWorkerSlots();

    if (once) {
      break;
    }

    if (runningJobs.size > 0) {
      await Promise.race(runningJobs);
    } else if (started === 0) {
      await sleep(pollIntervalMs);
    }
  } while (!shouldStop);

  if (runningJobs.size > 0) {
    console.log(`[worker] waiting for ${runningJobs.size} running jobs to finish`);
    await Promise.allSettled(runningJobs);
  }

  console.log("[worker] stopped");
}

void main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exitCode = 1;
});
