import test from "node:test";
import assert from "node:assert/strict";

const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { buildProjectMarkdown } = await import("../lib/markdown.ts");
const { runStructuredTask } = await import("../lib/llm.ts");
const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");

function projectFixture(patch = {}) {
  const base = {
    topic: "塘桥为什么涨不动",
    thesis: "主判断",
    articleType: "价值重估型",
    topicMeta: {
      signalMode: null,
      signalBrief: null,
      topicScorecard: null,
      readerLens: [],
      selectedAngleId: null,
      selectedAngleTitle: null,
    },
  };
  const cards = buildCardsFromLegacy(base);
  return {
    ...base,
    ...cards,
    ...patch,
  };
}

test("outline writer prompt requires directive-style section fields", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture({ hkrr: {} }),
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解点",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: [],
    },
  });

  assert.match(task.system, /sectionThesis/);
  assert.match(task.system, /singlePurpose/);
  assert.match(task.system, /mustLandDetail/);
  assert.match(task.system, /sceneOrCost/);
  assert.match(task.system, /transitionTarget/);
  assert.match(task.system, /counterPoint/);
  assert.match(task.system, /mustUseEvidenceIds/);
});

test("outline writer prompt requires continuity ledger relay-card rules", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture({ hkrr: {} }),
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解点",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: [],
    },
  });

  assert.match(task.system, /continuityLedger/);
  assert.match(task.system, /读者问题链/);
  assert.match(task.system, /交换顺序/);
  assert.match(task.system, /删掉某一节/);
  assert.match(task.system, /不是彼此独立的任务卡/);
});

test("outline writer downgrades style action fields to optional suggestions", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture({ hkrr: {} }),
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解点",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: [],
    },
  });

  assert.match(task.system, /ContinuityLedger|continuityLedger/);
  assert.match(task.user, /move \/ break \/ bridge \/ styleObjective \/ discoveryTurn \/ counterView \/ callbackTarget 只是编辑建议，可以留空/);
  assert.match(task.system, /可选：这一段可参考的写作动作/);
  assert.doesNotMatch(task.user, /每个 section 的 move \/ break \/ bridge \/ styleObjective \/ singlePurpose \/ transitionTarget \/ discoveryTurn 都必须可执行/);
  assert.doesNotMatch(task.user, /不能写空词/);
});

test("mock outline output includes optional continuity ledger while old outlines remain compatible", async () => {
  const outline = await runStructuredTask("outline_writer", {
    project: {
      topic: "塘桥为什么涨不动",
      thesis: "主判断",
      articleType: "价值重估型",
    },
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解点",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: ["sc_a"],
    },
  });

  assert.equal(typeof outline.continuityLedger.articleQuestion, "string");
  assert.ok(outline.continuityLedger.beats.length >= 3);
  assert.equal(outline.continuityLedger.beats[0].sectionId, outline.sections[0].id);
});

test("markdown export remains compatible with old outline sections missing new fields", () => {
  const markdown = buildProjectMarkdown({
    project: {
      ...projectFixture({
      topic: "测试项目",
      articleType: "价值重估型",
      audience: "购房者",
      stage: "提纲生成",
      thesis: "主判断",
      coreQuestion: "核心问题",
      }),
      vitalityCheck: {
        overallStatus: "warn",
        overallVerdict: "",
        semiBlocked: false,
        hardBlocked: false,
        entries: [],
      },
    },
    researchBrief: null,
    sourceCards: [],
    sectorModel: null,
    outlineDraft: {
      hook: "开头",
      sections: [
        {
          id: "s1",
          heading: "第一段",
          purpose: "目标",
          evidenceIds: ["sc_1"],
          tone: "节奏",
          move: "动作",
          break: "打破",
          bridge: "承接",
          styleObjective: "风格目标",
          keyPoints: ["重点"],
          expectedTakeaway: "收获",
        },
      ],
      closing: "结尾",
    },
    articleDraft: null,
    editorialFeedbackEvents: [],
    reviewReport: null,
    publishPackage: null,
  });

  assert.match(markdown, /第一段/);
  assert.match(markdown, /待补/);
});
