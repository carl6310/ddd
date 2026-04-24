import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const projectsRoute = await import("../app/api/projects/route.ts");
const researchBriefRoute = await import("../app/api/projects/[id]/research-brief/route.ts");
const jobsRoute = await import("../app/api/jobs/route.ts");
const jobRoute = await import("../app/api/jobs/[jobId]/route.ts");
const { getJobRun } = await import("../lib/jobs/repository.ts");

async function createProjectId() {
  const response = await projectsRoute.POST(
    new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "任务中心测试项目",
        audience: "关注上海板块和买房决策的读者",
        targetWords: 1800,
        notes: "用于验证任务中心。",
      }),
    }),
  );
  assert.equal(response.status, 201);
  const payload = await response.json();
  return payload.project.id;
}

test("task center lists and deletes queued jobs", async () => {
  const projectId = await createProjectId();
  const enqueueResponse = await researchBriefRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/research-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ id: projectId }) },
  );
  assert.equal(enqueueResponse.status, 202);
  const enqueuePayload = await enqueueResponse.json();
  const jobId = enqueuePayload.job.id;

  const listResponse = await jobsRoute.GET(new Request("http://localhost:3000/api/jobs?limit=20"));
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json();
  assert.ok(listPayload.items.some((job) => job.id === jobId && job.status === "queued"));
  assert.ok(listPayload.queueSummary.queuedCount >= 1);

  const deleteResponse = await jobRoute.DELETE(new Request(`http://localhost:3000/api/jobs/${jobId}`, { method: "DELETE" }), {
    params: Promise.resolve({ jobId }),
  });
  assert.equal(deleteResponse.status, 200);
  assert.equal(getJobRun(jobId), null);
});
