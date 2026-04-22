import test from "node:test";
import assert from "node:assert/strict";

const { JOB_STEPS } = await import("../lib/jobs/types.ts");
const { jobRegistry } = await import("../lib/jobs/registry.ts");

test("phase 2 job system covers remaining long-running steps", () => {
  const expectedSteps = [
    "research-brief",
    "sector-model",
    "outline",
    "drafts",
    "review",
    "publish-prep",
    "source-card-extract",
    "source-card-summarize",
  ];

  assert.deepEqual(JOB_STEPS, expectedSteps);
  for (const step of expectedSteps) {
    assert.equal(typeof jobRegistry[step], "function", `Expected handler for ${step}`);
  }
});
