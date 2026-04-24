import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const sessionsRoute = await import("../app/api/topic-discovery/sessions/route.ts");
const linksRoute = await import("../app/api/topic-discovery/sessions/[id]/links/route.ts");
const topicCocreateRoute = await import("../app/api/topic-discovery/sessions/[id]/topic-cocreate/route.ts");
const createProjectRoute = await import("../app/api/topic-discovery/sessions/[id]/create-project/route.ts");
const researchBriefRoute = await import("../app/api/projects/[id]/research-brief/route.ts");
const { runQueuedJob } = await import("../lib/jobs/runner.ts");
const { getJobRun } = await import("../lib/jobs/repository.ts");
const { getProjectBundle } = await import("../lib/repository.ts");

test("topic discovery can create a project and complete the first queued writing step", async () => {
  const createSessionResponse = await sessionsRoute.POST(
    new Request("http://localhost:3000/api/topic-discovery/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: "唐镇",
        intuition: "测试完整流程：从选题发现进入正式项目，再跑第一步研究清单。",
        focusPoints: ["规划兑现", "成交承接"],
        searchMode: "input_only",
      }),
    }),
  );
  assert.equal(createSessionResponse.status, 201);
  const createSessionPayload = await createSessionResponse.json();
  const sessionId = createSessionPayload.session.id;
  const discoveryContext = { params: Promise.resolve({ id: sessionId }) };

  const linksResponse = await linksRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [] }),
    }),
    discoveryContext,
  );
  assert.equal(linksResponse.status, 200);

  const cocreateResponse = await topicCocreateRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/topic-cocreate`, {
      method: "POST",
    }),
    discoveryContext,
  );
  assert.equal(cocreateResponse.status, 200);
  const cocreatePayload = await cocreateResponse.json();
  const candidateId = cocreatePayload.result.recommendedAngles[0]?.id;
  assert.equal(typeof candidateId, "string");

  const createProjectResponse = await createProjectRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/create-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        selectedPreSourceCardIds: [],
      }),
    }),
    discoveryContext,
  );
  assert.equal(createProjectResponse.status, 201);
  const createProjectPayload = await createProjectResponse.json();
  const projectId = createProjectPayload.project.id;

  const enqueueResearchResponse = await researchBriefRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/research-brief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
    { params: Promise.resolve({ id: projectId }) },
  );
  assert.equal(enqueueResearchResponse.status, 202);
  const enqueueResearchPayload = await enqueueResearchResponse.json();
  assert.equal(enqueueResearchPayload.job.step, "research-brief");
  assert.equal(enqueueResearchPayload.job.status, "queued");

  await runQueuedJob(enqueueResearchPayload.job.id);

  const job = getJobRun(enqueueResearchPayload.job.id);
  assert.equal(job.status, "succeeded");

  const bundle = getProjectBundle(projectId);
  assert.ok(bundle);
  assert.equal(bundle.project.stage, "研究清单");
  assert.ok(bundle.researchBrief);
  assert.ok(Array.isArray(bundle.researchBrief.mustResearch));
  assert.ok(bundle.researchBrief.mustResearch.length > 0);
});
