import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const sessionsRoute = await import("../app/api/topic-discovery/sessions/route.ts");
const latestRoute = await import("../app/api/topic-discovery/sessions/latest/route.ts");
const sessionRoute = await import("../app/api/topic-discovery/sessions/[id]/route.ts");
const linksRoute = await import("../app/api/topic-discovery/sessions/[id]/links/route.ts");
const preSourceExtractRoute = await import("../app/api/topic-discovery/sessions/[id]/pre-source-cards/extract/route.ts");
const signalRoute = await import("../app/api/topic-discovery/sessions/[id]/signals/route.ts");
const topicCocreateRoute = await import("../app/api/topic-discovery/sessions/[id]/topic-cocreate/route.ts");
const topicAnglesRoute = await import("../app/api/topic-discovery/sessions/[id]/topic-angles/route.ts");
const createProjectRoute = await import("../app/api/topic-discovery/sessions/[id]/create-project/route.ts");
const topicDiscoveryJobs = await import("../lib/topic-discovery-jobs.ts");
const repository = await import("../lib/repository.ts");

test("topic discovery session flow creates session, candidates, and project", async () => {
  const createSessionResponse = await sessionsRoute.POST(
    new Request("http://localhost:3000/api/topic-discovery/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: "唐镇",
        intuition: "感觉这里更像被高估的规划承接区。",
        focusPoints: ["规划兑现", "成交承接", "生活体感"],
        searchMode: "input_only",
      }),
    }),
  );
  assert.equal(createSessionResponse.status, 201);
  const createSessionPayload = await createSessionResponse.json();
  const sessionId = createSessionPayload.session.id;
  const context = { params: Promise.resolve({ id: sessionId }) };

  const linksResponse = await linksRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [] }),
    }),
    context,
  );
  assert.equal(linksResponse.status, 200);

  const preSourceResponse = await preSourceExtractRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/pre-source-cards/extract`, {
      method: "POST",
    }),
    context,
  );
  assert.equal(preSourceResponse.status, 200);

  const signalResponse = await signalRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/signals`, {
      method: "POST",
    }),
    context,
  );
  assert.equal(signalResponse.status, 200);

  const cocreateResponse = await topicCocreateRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/topic-cocreate`, {
      method: "POST",
    }),
    context,
  );
  assert.equal(cocreateResponse.status, 200);
  const cocreatePayload = await cocreateResponse.json();
  assert.ok(Array.isArray(cocreatePayload.result.recommendedAngles));
  assert.ok(cocreatePayload.result.recommendedAngles.length > 0);

  const topicAnglesResponse = await topicAnglesRoute.GET(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/topic-angles`),
    context,
  );
  assert.equal(topicAnglesResponse.status, 200);
  const topicAnglesPayload = await topicAnglesResponse.json();
  assert.ok(topicAnglesPayload.result.recommendedAngles.length > 0);

  const bundleResponse = await sessionRoute.GET(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}`),
    context,
  );
  assert.equal(bundleResponse.status, 200);
  const bundlePayload = await bundleResponse.json();
  assert.equal(bundlePayload.bundle.session.id, sessionId);

  const latestResponse = await latestRoute.GET();
  assert.equal(latestResponse.status, 200);
  const latestPayload = await latestResponse.json();
  assert.equal(latestPayload.session.id, sessionId);

  const candidateId = topicAnglesPayload.result.recommendedAngles[0].id;
  const now = new Date().toISOString();
  const readyPreSourceCard = {
    id: `psc_test_ready_import_${sessionId}`,
    sessionId,
    linkId: null,
    url: "https://example.com/ready-article",
    sourceTitle: "可导入的共创文章",
    sourceType: "media",
    publishedAt: "2026-04-24",
    summary: "这是一条应该进入正式项目资料索引的共创资料。",
    keyClaims: ["共创阶段抓到的关键判断"],
    signalTags: ["规划", "成交"],
    suggestedAngles: ["结构性错位"],
    riskHints: ["需要复核发布时间"],
    extractStatus: "ready",
    rawContentRef: "共创阶段抓取到的原文片段。",
    createdAt: now,
    updatedAt: now,
  };
  const failedPreSourceCard = {
    ...readyPreSourceCard,
    id: `psc_test_failed_import_${sessionId}`,
    url: "https://example.com/failed-article",
    sourceTitle: "不应导入的失败文章",
    summary: "",
    keyClaims: [],
    signalTags: [],
    extractStatus: "failed",
    rawContentRef: "",
  };
  repository.replacePreSourceCards(sessionId, [readyPreSourceCard, failedPreSourceCard]);

  const createProjectResponse = await createProjectRoute.POST(
    new Request(`http://localhost:3000/api/topic-discovery/sessions/${sessionId}/create-project`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        candidateId,
        selectedPreSourceCardIds: [readyPreSourceCard.id, failedPreSourceCard.id],
      }),
    }),
    context,
  );
  assert.equal(createProjectResponse.status, 201);
  const createProjectPayload = await createProjectResponse.json();
  assert.equal(typeof createProjectPayload.project.id, "string");
  assert.equal(createProjectPayload.project.topicMeta.selectedAngleId, candidateId);
  assert.equal(createProjectPayload.importedSourceCardCount, 1);
  const sourceCards = repository.listSourceCards(createProjectPayload.project.id);
  assert.equal(sourceCards.length, 1);
  assert.equal(sourceCards[0].title, readyPreSourceCard.sourceTitle);
  assert.equal(sourceCards[0].summary, readyPreSourceCard.summary);
  assert.equal(sourceCards[0].url, readyPreSourceCard.url);
  assert.equal(sourceCards[0].rawText, readyPreSourceCard.rawContentRef);
});

test("topic discovery job runner only claims a queued job once", async () => {
  const createSessionResponse = await sessionsRoute.POST(
    new Request("http://localhost:3000/api/topic-discovery/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sector: "前滩",
        intuition: "只用于验证选题发现任务去重。",
        focusPoints: [],
        searchMode: "input_only",
      }),
    }),
  );
  assert.equal(createSessionResponse.status, 201);
  const createSessionPayload = await createSessionResponse.json();
  const sessionId = createSessionPayload.session.id;

  const { job } = topicDiscoveryJobs.enqueueTopicDiscoveryJob({
    sessionId,
    step: "pre-source-extract",
  });

  await Promise.all([
    topicDiscoveryJobs.runTopicDiscoveryJobNow(job.id),
    topicDiscoveryJobs.runTopicDiscoveryJobNow(job.id),
  ]);

  const logs = topicDiscoveryJobs.listTopicDiscoveryJobLogs(job.id);
  assert.equal(logs.filter((log) => log.code === "job_claimed").length, 1);
  assert.equal(topicDiscoveryJobs.getTopicDiscoveryJob(job.id).status, "succeeded");
});
