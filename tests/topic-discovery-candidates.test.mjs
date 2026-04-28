import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const repository = await import("../lib/repository.ts");
const topicDiscovery = await import("../lib/topic-discovery.ts");

function makeAngle(id, title) {
  return {
    id,
    title,
    angleType: "counterintuitive",
    angleTypeLabel: "反常识型",
    articleType: "误解纠偏型",
    articlePrototype: "risk_deconstruction",
    targetReaderPersona: "risk_aware_reader",
    creativeAnchor: "风险拆解",
    coreJudgement: `${title} 的核心判断`,
    counterIntuition: "旧标签不等于真实价值。",
    readerValue: "帮助读者避开误判。",
    whyNow: "市场需要重新定价。",
    hkr: { h: 4, k: 4, r: 4, total: 12 },
    readerLens: ["risk_aware_reader"],
    signalRefs: [],
    sourceBasis: [],
    neededEvidence: ["成交样本", "规划进度"],
    riskOfMisfire: "证据不足会显得空泛。",
    recommendedNextStep: "先补成交和规划证据。",
    topicScorecard: {
      status: "ready_to_open",
      hkr: { h: 4, k: 4, r: 4, total: 12 },
      readerValueSummary: "帮助读者避开误判。",
      signalCoverageSummary: "已有基础信号。",
      evidenceRisk: "仍需补证据。",
      recommendation: "可以推进。",
      canForceProceed: false,
    },
  };
}

test("topic angle candidate ids are scoped to each discovery session", () => {
  const firstSession = repository.createTopicDiscoverySession({
    sector: "候选ID测试A",
    searchMode: "input_only",
  });
  const secondSession = repository.createTopicDiscoverySession({
    sector: "候选ID测试B",
    searchMode: "input_only",
  });
  const duplicateModelId = "angle-1";

  const firstAngles = repository.replaceTopicAngleCandidates(firstSession.id, [makeAngle(duplicateModelId, "第一组候选")]);
  const secondAngles = repository.replaceTopicAngleCandidates(secondSession.id, [makeAngle(duplicateModelId, "第二组候选")]);

  assert.equal(firstAngles[0].id, `${firstSession.id}_angle_1`);
  assert.equal(secondAngles[0].id, `${secondSession.id}_angle_1`);
  assert.notEqual(firstAngles[0].id, secondAngles[0].id);

  const persistedFirst = repository.listTopicAngleCandidates(firstSession.id);
  const persistedSecond = repository.listTopicAngleCandidates(secondSession.id);
  assert.equal(persistedFirst[0].id, firstAngles[0].id);
  assert.equal(persistedSecond[0].id, secondAngles[0].id);
});

test("rerunning candidate persistence for the same session replaces rows without id conflicts", () => {
  const session = repository.createTopicDiscoverySession({
    sector: "候选ID重跑测试",
    searchMode: "input_only",
  });

  const first = repository.replaceTopicAngleCandidates(session.id, [
    makeAngle("angle-1", "第一轮候选一"),
    makeAngle("angle-2", "第一轮候选二"),
  ]);
  const second = repository.replaceTopicAngleCandidates(session.id, [
    makeAngle("angle-1", "第二轮候选一"),
    makeAngle("angle-2", "第二轮候选二"),
  ]);

  assert.deepEqual(first.map((angle) => angle.id), [`${session.id}_angle_1`, `${session.id}_angle_2`]);
  assert.deepEqual(second.map((angle) => angle.id), [`${session.id}_angle_1`, `${session.id}_angle_2`]);

  const persisted = repository.listTopicAngleCandidates(session.id);
  assert.equal(persisted.length, 2);
  assert.equal(persisted[0].title, "第二轮候选一");
  assert.equal(persisted[1].title, "第二轮候选二");
});

test("signal brief generation reuses cached result when inputs have not changed", async () => {
  const session = repository.createTopicDiscoverySession({
    sector: "Signal缓存测试",
    intuition: "只用于验证缓存。",
    searchMode: "input_only",
  });

  const first = await topicDiscovery.generateSignalBriefForSession(session.id);
  const second = await topicDiscovery.generateSignalBriefForSession(session.id);

  assert.equal(first.inputHash, second.inputHash);
  assert.equal(first.generatedAt, second.generatedAt);
});

test("topic discovery fast mode returns a lightweight longlist", async () => {
  const session = repository.createTopicDiscoverySession({
    sector: "Fast模式测试",
    intuition: "希望快速看到候选方向。",
    searchMode: "search_enabled",
  });

  const result = await topicDiscovery.generateTopicAnglesForSession(session.id, { depth: "fast" });

  assert.ok(result.angleLonglist.length <= 8);
  assert.ok(result.recommendedAngles.length <= 6);
});
