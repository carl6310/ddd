import test from "node:test";
import assert from "node:assert/strict";

const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { buildProjectMarkdown } = await import("../lib/markdown.ts");

test("outline writer prompt requires directive-style section fields", () => {
  const task = buildPromptTask("outline_writer", {
    project: {
      topic: "塘桥为什么涨不动",
      thesis: "主判断",
      articleType: "价值重估型",
      hkrr: {},
      thinkCard: {
        materialDigest: "",
        topicVerdict: "strong",
        verdictReason: "",
        coreJudgement: "",
        counterIntuition: "",
        readerPayoff: "",
        decisionImplication: "",
        excludedTakeaways: [],
        hkr: { happy: "", knowledge: "", resonance: "", summary: "" },
        rewriteSuggestion: "",
        alternativeAngles: [],
        aiRole: "",
      },
      styleCore: {
        rhythm: "",
        breakPattern: "",
        knowledgeDrop: "",
        personalView: "",
        judgement: "",
        counterView: "",
        allowedMoves: [],
        forbiddenMoves: [],
        allowedMetaphors: [],
        emotionCurve: "",
        personalStake: "",
        characterPortrait: "",
        culturalLift: "",
        sentenceBreak: "",
        echo: "",
        humbleSetup: "",
        toneCeiling: "",
        concretenessRequirement: "",
        costSense: "",
      },
    },
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

test("markdown export remains compatible with old outline sections missing new fields", () => {
  const markdown = buildProjectMarkdown({
    project: {
      topic: "测试项目",
      articleType: "价值重估型",
      audience: "购房者",
      stage: "提纲生成",
      thesis: "主判断",
      coreQuestion: "核心问题",
      thinkCard: {
        materialDigest: "",
        topicVerdict: "strong",
        verdictReason: "",
        coreJudgement: "",
        counterIntuition: "",
        readerPayoff: "",
        decisionImplication: "",
        excludedTakeaways: [],
        hkr: { happy: "", knowledge: "", resonance: "", summary: "" },
        rewriteSuggestion: "",
        alternativeAngles: [],
        aiRole: "",
      },
      styleCore: {
        rhythm: "",
        breakPattern: "",
        knowledgeDrop: "",
        personalView: "",
        judgement: "",
        counterView: "",
        allowedMoves: [],
        forbiddenMoves: [],
        allowedMetaphors: [],
        emotionCurve: "",
        personalStake: "",
        characterPortrait: "",
        culturalLift: "",
        sentenceBreak: "",
        echo: "",
        humbleSetup: "",
        toneCeiling: "",
        concretenessRequirement: "",
        costSense: "",
      },
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
    reviewReport: null,
    publishPackage: null,
  });

  assert.match(markdown, /第一段/);
  assert.match(markdown, /待补/);
});
