import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const {
  GET,
  POST,
  buildTopicCoCreateModelInput,
  getTopicCoCreateTaskName,
  resolveTopicCoCreateSignalMode,
} = await import("../app/api/topic-cocreate/route.ts");
const { buildPromptTask } = await import("../lib/prompt-engine.ts");

test("topic cocreate route defaults to fast mode with timings and compatibility aliases", async () => {
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

  assert.equal(payload.depth, "fast");
  assert.equal(payload.signalMode, "input_only");
  assert.equal(typeof payload.timings.signalMs, "number");
  assert.equal(typeof payload.timings.modelMs, "number");
  assert.equal(typeof payload.timings.postprocessMs, "number");
  assert.equal(typeof payload.timings.totalMs, "number");
  assert.equal(typeof payload.signalBrief.freshnessNote, "string");
  assert.ok(Array.isArray(payload.signalBrief.signals));
  assert.ok(payload.signalBrief.signals.length > 0);
  assert.equal(result.sector, "唐镇");
  assert.ok(Array.isArray(result.recommendedAngles));
  assert.ok(Array.isArray(result.angleLonglist));
  assert.ok(Array.isArray(result.angles));
  assert.ok(Array.isArray(result.candidateAngles));
  assert.ok(result.recommendedAngles.length >= 4 && result.recommendedAngles.length <= 6);
  assert.ok(result.angleLonglist.length >= 6 && result.angleLonglist.length <= 8);
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

test("fast mode does not auto-enrich URLs and uses fast task", async () => {
  const request = new Request("http://localhost:3000/api/topic-cocreate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sector: "唐镇",
      currentIntuition: "链接里可能有材料，但默认要先快出角度。",
      rawMaterials: "这是一条链接：https://example.com/article",
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  const payload = await response.json();

  assert.equal(payload.depth, "fast");
  assert.equal(payload.signalMode, "input_only");
  assert.deepEqual(payload.sourceDigests, []);
  assert.equal(getTopicCoCreateTaskName("fast"), "topic_cocreate_fast");
});

test("full mode may still resolve URL material to url_enriched", () => {
  assert.equal(
    resolveTopicCoCreateSignalMode({
      depth: "full",
      rawMaterials: "https://example.com/source",
    }),
    "url_enriched",
  );
  assert.equal(getTopicCoCreateTaskName("full"), "topic_cocreate");
});

test("topic_cocreate_fast prompt requires only lightweight angle fields", () => {
  const prompt = buildPromptTask("topic_cocreate_fast", {
    sector: "唐镇",
    currentIntuition: "规划强但兑现慢",
    rawMaterials: "材料",
    signalBrief: {
      queries: [],
      signals: [],
      gaps: [],
      freshnessNote: "当前只根据用户输入整理信号。",
    },
  });

  assert.match(prompt.system, /输出 6-8 个 candidateAngles/);
  assert.match(prompt.system, /id \/ title \/ angleType \/ articleType \/ coreJudgement \/ readerValue \/ neededEvidence \/ riskOfMisfire/);
  assert.match(prompt.system, /不要输出 hkr、readerLens、signalRefs、recommendedNextStep、articlePrototype、targetReaderPersona、creativeAnchor、whyNow/);
});

test("topic_cocreate full prompt keeps deep candidate requirements", () => {
  const prompt = buildPromptTask("topic_cocreate", {
    sector: "唐镇",
    currentIntuition: "规划强但兑现慢",
    rawMaterials: "材料",
  });

  assert.match(prompt.system, /候选角度总数输出 12-16 个/);
  assert.match(prompt.system, /articlePrototype/);
  assert.match(prompt.system, /targetReaderPersona/);
  assert.match(prompt.system, /recommendedNextStep/);
});

test("topic cocreate model input does not duplicate formatted SignalBrief in rawMaterials", () => {
  const modelInput = buildTopicCoCreateModelInput({
    sector: "唐镇",
    currentIntuition: "直觉",
    rawMaterials: "用户原始材料",
    avoidAngles: "不要泛泛写",
    signalBrief: {
      queries: ["唐镇 成交"],
      signals: [
        {
          title: "成交信号",
          source: "input",
          signalType: "transaction",
          summary: "摘要",
          whyItMatters: "重要",
        },
      ],
      gaps: ["缺口"],
      freshnessNote: "新鲜度",
    },
    styleReference: "样本",
  });

  assert.equal(modelInput.rawMaterials, "用户原始材料");
  assert.doesNotMatch(modelInput.rawMaterials, /Signal Brief 查询|成交信号|新鲜度/);
  assert.equal(modelInput.signalBrief.signals[0].title, "成交信号");
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
  assert.equal(payload.latestRun.input.depth, "fast");
  assert.equal(payload.latestRun.response.depth, "fast");
  assert.equal(payload.latestRun.response.result.sector, "塘桥");
  assert.ok(Array.isArray(payload.latestRun.response.result.recommendedAngles));
});
