import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const { GET, POST } = await import("../app/api/topic-cocreate/route.ts");

test("topic cocreate route returns recommended list, longlist, coverage summary, and compatibility aliases", async () => {
  const request = new Request("http://localhost:3000/api/topic-cocreate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sector: "唐镇",
      currentIntuition: "感觉规划和新盘热度很强，但内部结构和兑现节奏可能没那么顺。",
      rawMaterials: "地铁、供地、学校、次新房和界面体验都有分化，很多人对它的判断还是停在旧标签上。",
      avoidAngles: "不要写成泛板块介绍。",
      signalMode: "input_only",
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);

  const payload = await response.json();
  const { result } = payload;

  assert.equal(payload.signalMode, "input_only");
  assert.equal(typeof payload.signalBrief.freshnessNote, "string");
  assert.ok(Array.isArray(payload.signalBrief.signals));
  assert.ok(payload.signalBrief.signals.length > 0);
  assert.equal(result.sector, "唐镇");
  assert.ok(Array.isArray(result.recommendedAngles));
  assert.ok(Array.isArray(result.angleLonglist));
  assert.ok(Array.isArray(result.angles));
  assert.ok(Array.isArray(result.candidateAngles));
  assert.ok(result.recommendedAngles.length >= 4 && result.recommendedAngles.length <= 6);
  assert.ok(result.angleLonglist.length >= 12 && result.angleLonglist.length <= 16);
  assert.equal(result.angles.length, result.recommendedAngles.length);
  assert.equal(result.candidateAngles.length, result.recommendedAngles.length);
  assert.ok(Array.isArray(result.coverageSummary.includedTypes));
  assert.ok(Array.isArray(result.coverageSummary.missingTypes));
  assert.equal(typeof result.coverageSummary.duplicatesMerged, "number");

  const sampleAngle = result.recommendedAngles[0];
  assert.equal(typeof sampleAngle.id, "string");
  assert.equal(typeof sampleAngle.title, "string");
  assert.equal(typeof sampleAngle.angleType, "string");
  assert.equal(typeof sampleAngle.angleTypeLabel, "string");
  assert.equal(typeof sampleAngle.articlePrototype, "string");
  assert.equal(typeof sampleAngle.targetReaderPersona, "string");
  assert.equal(typeof sampleAngle.creativeAnchor, "string");
  assert.equal(typeof sampleAngle.coreJudgement, "string");
  assert.equal(typeof sampleAngle.counterIntuition, "string");
  assert.equal(typeof sampleAngle.readerValue, "string");
  assert.equal(typeof sampleAngle.whyNow, "string");
  assert.equal(typeof sampleAngle.hkr.total, "number");
  assert.ok(Array.isArray(sampleAngle.readerLens) && sampleAngle.readerLens.length > 0);
  assert.ok(Array.isArray(sampleAngle.signalRefs));
  assert.equal(typeof sampleAngle.topicScorecard.status, "string");
  assert.ok(Array.isArray(sampleAngle.neededEvidence) && sampleAngle.neededEvidence.length > 0);
  assert.equal(typeof sampleAngle.riskOfMisfire, "string");
  assert.equal(typeof sampleAngle.recommendedNextStep, "string");
});

test("topic cocreate route persists and returns latest run", async () => {
  const request = new Request("http://localhost:3000/api/topic-cocreate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sector: "塘桥",
      currentIntuition: "感觉这里一直卡在夹心层位置。",
      rawMaterials: "规划、生活感和市场定价存在反差。",
      avoidAngles: "不要泛泛聊规划。",
      signalMode: "input_only",
    }),
  });

  const postResponse = await POST(request);
  assert.equal(postResponse.status, 200);

  const getResponse = await GET();
  assert.equal(getResponse.status, 200);
  const payload = await getResponse.json();

  assert.equal(payload.latestRun.input.sector, "塘桥");
  assert.equal(payload.latestRun.input.signalMode, "input_only");
  assert.equal(payload.latestRun.response.result.sector, "塘桥");
  assert.ok(Array.isArray(payload.latestRun.response.result.recommendedAngles));
});
