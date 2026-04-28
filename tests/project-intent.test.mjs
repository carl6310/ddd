import test from "node:test";
import assert from "node:assert/strict";

const { normalizeProjectIntent } = await import("../lib/project-intent.ts");
const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");

const longSelectedAngle =
  "莘庄房价高估了吗？｜为什么新房认购冷、商业兑现慢，但莘庄二手核心资产仍能撑住高价？｜coreJudgement: 莘庄不是典型泡沫，但也不是成长型板块｜readerValue: 判断哪些资产值得为确定性付费";

function projectFixture(patch = {}) {
  const base = {
    topic: longSelectedAngle,
    thesis: "莘庄房价高估了吗？｜核心判断：莘庄不是典型泡沫，但也不是成长型板块；它靠成熟确定性支撑价格，代价是旧、慢和上限感。",
    coreQuestion: longSelectedAngle,
    articleType: "价值重估型",
    audience: "买房人",
    notes: "",
    topicMeta: {
      signalMode: null,
      signalBrief: null,
      topicScorecard: {
        status: "ready_to_open",
        hkr: { h: 4, k: 4, r: 4, total: 12 },
        readerValueSummary: "读者能判断哪些莘庄资产值得为确定性付费，哪些只是借板块名义卖高价。",
        signalCoverageSummary: "",
        evidenceRisk: "",
        recommendation: "",
        canForceProceed: false,
      },
      readerLens: [],
      selectedAngleId: "angle-1",
      selectedAngleTitle: longSelectedAngle,
    },
  };
  return {
    ...base,
    ...buildCardsFromLegacy(base),
    ...patch,
  };
}

test("normalizeProjectIntent keeps selectedAngleTitle out of cleanQuestion", () => {
  const intent = normalizeProjectIntent(projectFixture());

  assert.ok(intent.forbiddenInternalPhrases.includes(longSelectedAngle));
  assert.equal(intent.cleanTitle, "莘庄房价高估了吗？");
  assert.notEqual(intent.cleanQuestion, longSelectedAngle);
  assert.doesNotMatch(intent.cleanQuestion, /coreJudgement|readerValue|selectedAngleTitle/);
  assert.match(intent.cleanQuestion, /为什么新房认购冷、商业兑现慢/);
});

test("normalizeProjectIntent keeps cleanQuestion within a reasonable limit", () => {
  const intent = normalizeProjectIntent(projectFixture());

  assert.ok(intent.cleanQuestion.length <= 90, `cleanQuestion too long: ${intent.cleanQuestion.length}`);
  assert.match(intent.cleanQuestion, /？$/);
});

test("normalizeProjectIntent removes title punctuation chains from cleanThesis", () => {
  const intent = normalizeProjectIntent(projectFixture());

  assert.doesNotMatch(intent.cleanThesis, /[｜|]/);
  assert.doesNotMatch(intent.cleanThesis, /核心判断：/);
  assert.match(intent.cleanThesis, /莘庄不是典型泡沫/);
});

test("prompt-engine exposes ProjectIntent and forbidden internal phrases", () => {
  const project = projectFixture();
  const task = buildPromptTask("argument_framer", {
    project,
    sectorModel: {
      summaryJudgement: "莘庄房价有支撑，但安全边际不厚。",
      misconception: "只看新房认购。",
      spatialBackbone: "南北广场、商务区和春申共同构成价格支撑。",
      cutLines: ["铁路"],
      zones: [],
      supplyObservation: "新增供应有限。",
      futureWatchpoints: [],
      evidenceIds: [],
    },
    sourceCards: [],
  });

  assert.match(task.user, /ProjectIntent/);
  assert.match(task.user, /cleanQuestion/);
  assert.match(task.user, /forbiddenInternalPhrases/);
  assert.match(task.system, /ProjectIntent\.cleanQuestion/);
});
