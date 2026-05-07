import assert from "node:assert/strict";
import test from "node:test";

const { buildProjectMarkdown } = await import("../lib/markdown.ts");

test("project markdown export uses user-facing labels and readable citations", () => {
  const markdown = buildProjectMarkdown(buildBundle());

  assert.match(markdown, /## 选题判断/);
  assert.match(markdown, /## 表达策略/);
  assert.match(markdown, /## 质量检查/);
  assert.match(markdown, /## 资料覆盖摘要/);
  assert.match(markdown, /【资料：交通资料卡】/);
  assert.match(markdown, /强约束证据：交通资料卡/);
  assert.match(markdown, /文章原型：价值重估/);
  assert.match(markdown, /目标读者画像：改善型购房读者/);
  assert.match(markdown, /可信度：中/);
  assert.doesNotMatch(markdown, /## ThinkCard/);
  assert.doesNotMatch(markdown, /## StyleCore/);
  assert.doesNotMatch(markdown, /## VitalityCheck/);
  assert.doesNotMatch(markdown, /\[SC:/);
  assert.doesNotMatch(markdown, /WritingLint/);
  assert.doesNotMatch(markdown, /value_reassessment|improver_buyer|unsupported scene/);
});

function buildBundle() {
  return {
    project: {
      id: "proj_export",
      topic: "导出验证",
      articleType: "价值重估型",
      audience: "本地读者",
      stage: "发布前整理",
      thesis: "导出应该面向人读。",
      coreQuestion: "导出是否干净？",
      topicMeta: {},
      thinkCard: {
        materialDigest: "已有资料。",
        topicVerdict: "strong",
        verdictReason: "有反差。",
        articlePrototype: "value_reassessment",
        targetReaderPersona: "improver_buyer",
        creativeAnchor: "反环线逻辑。",
        hkr: {
          happy: "认知反转",
          knowledge: "结构判断",
          resonance: "买房困惑",
        },
        rewriteSuggestion: "",
        alternativeAngles: ["替代角度"],
        aiRole: "只做整理。",
      },
      styleCore: {
        rhythm: "先判断再解释。",
        breakPattern: "短句打断。",
        openingMoves: ["直接抛判断"],
        transitionMoves: ["这就引出问题"],
        endingEchoMoves: ["回扣开头"],
        knowledgeDrop: "顺手解释。",
        personalView: "承认不确定。",
        judgement: "有保留判断。",
        counterView: "理解反方。",
        emotionCurve: "困惑到判断。",
        personalStake: "亲自下场。",
        characterPortrait: "购房者画像。",
        culturalLift: "城市结构。",
        sentenceBreak: "短句。",
        echo: "回环。",
        humbleSetup: "先铺垫。",
        costSense: "代价明确。",
        forbiddenFabrications: ["具体成交价"],
        genericLanguageBlackList: ["值得注意的是"],
        unsupportedSceneDetector: "无证据场景不写。",
      },
      vitalityCheck: {
        overallVerdict: "WritingLint 已通过。",
        overallStatus: "pass",
        entries: [
          {
            key: "writing-lint",
            title: "WritingLint",
            detail: "WritingLint 已通过。",
            status: "pass",
          },
        ],
      },
    },
    researchBrief: null,
    sectorModel: null,
    outlineDraft: {
      sections: [
        {
          heading: "第一节",
          purpose: "说明判断。",
          sectionThesis: "判断成立。",
          singlePurpose: "解释原因。",
          mainlineSentence: "",
          callbackTarget: "",
          microStoryNeed: "",
          discoveryTurn: "",
          mustLandDetail: "",
          sceneOrCost: "",
          opposingView: "",
          readerUsefulness: "",
          move: "纠偏",
          break: "",
          bridge: "",
          transitionTarget: "",
          counterPoint: "",
          styleObjective: "",
          mustUseEvidenceIds: ["sc_a"],
          evidenceIds: ["sc_a"],
          keyPoints: ["判断成立"],
          tone: "",
        },
      ],
    },
    articleDraft: {
      analysisMarkdown: "",
      narrativeMarkdown: "# 标题\n\n正文判断。[SC:sc_a]",
      editedMarkdown: "",
    },
    sourceCards: [
      {
        id: "sc_a",
        title: "交通资料卡",
        url: "",
        note: "本地资料",
        credibility: "medium",
        sourceType: "manual",
        supportLevel: "direct",
        claimType: "fact",
        intendedSection: "第一节",
      },
    ],
    reviewReport: {
      overallVerdict: "WritingLint 已通过。",
      completionScore: 90,
      checks: [],
      qualityPyramid: [
        {
          level: "L1",
          title: "WritingLint",
          status: "pass",
          summary: "WritingLint 已过线。",
          mustFix: [],
          shouldFix: [],
          optionalPolish: [],
        },
      ],
    },
    editorialFeedbackEvents: [],
    publishPackage: null,
  };
}
