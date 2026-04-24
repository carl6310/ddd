import test from "node:test";
import assert from "node:assert/strict";

const { buildActiveQueueSummary, buildJobQueueMetrics } = await import("../lib/jobs/queue-summary.ts");

test("queue summary counts running and queued jobs", () => {
  const activeJobs = [
    { id: "job_1", status: "running", createdAt: "2026-04-23T00:00:00.000Z" },
    { id: "job_2", status: "queued", createdAt: "2026-04-23T00:01:00.000Z" },
    { id: "job_3", status: "queued", createdAt: "2026-04-23T00:02:00.000Z" },
  ];

  assert.deepEqual(buildActiveQueueSummary(activeJobs), {
    activeCount: 3,
    runningCount: 1,
    queuedCount: 2,
  });
});

test("queue metrics expose ahead count and position for queued jobs", () => {
  const activeJobs = [
    { id: "job_1", status: "running", createdAt: "2026-04-23T00:00:00.000Z" },
    { id: "job_2", status: "queued", createdAt: "2026-04-23T00:01:00.000Z" },
    { id: "job_3", status: "queued", createdAt: "2026-04-23T00:02:00.000Z" },
  ];

  assert.deepEqual(buildJobQueueMetrics(activeJobs, "job_3"), {
    activeCount: 3,
    runningCount: 1,
    queuedCount: 2,
    aheadCount: 2,
    position: 3,
  });
});
