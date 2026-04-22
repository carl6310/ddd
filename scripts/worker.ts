import { reapStaleJobs } from "@/lib/jobs/reaper";
import { runNextQueuedJob } from "@/lib/jobs/runner";

const pollIntervalMs = Number(process.env.JOB_WORKER_POLL_INTERVAL_MS ?? 2000);
const staleAfterMs = Number(process.env.JOB_WORKER_STALE_AFTER_MS ?? 120000);
const once = process.argv.includes("--once");

let shouldStop = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  process.on("SIGINT", () => {
    shouldStop = true;
  });
  process.on("SIGTERM", () => {
    shouldStop = true;
  });

  console.log(`[worker] started pollInterval=${pollIntervalMs} staleAfter=${staleAfterMs}`);

  do {
    const reaped = reapStaleJobs(staleAfterMs);
    if (reaped.length > 0) {
      console.log(`[worker] reaped ${reaped.length} stale jobs`);
    }

    const job = await runNextQueuedJob();
    if (!job && !once) {
      await sleep(pollIntervalMs);
    }
    if (once) {
      break;
    }
  } while (!shouldStop);

  console.log("[worker] stopped");
}

void main().catch((error) => {
  console.error("[worker] fatal", error);
  process.exitCode = 1;
});
