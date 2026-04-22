import test from "node:test";
import assert from "node:assert/strict";

const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { runStructuredTask } = await import("../lib/llm.ts");

test("rewrite task prompts include local rewrite context", () => {
  const prompt = buildPromptTask("evidence_weaver", {
    project: {
      topic: "塘桥为什么涨不动",
      thesis: "真正的问题不是位置，而是结构。",
      articleType: "价值重估型",
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
    paragraphText: "这一段判断很虚。",
    sectionHeading: "先把误解拨开",
    paragraphIndex: 0,
    rewriteIntent: {
      issueType: "evidence_not_integrated",
      targetRange: "section:先把误解拨开#paragraph:1",
      whyItFails: "判断和证据没有真正缝合",
      suggestedRewriteMode: "把证据直接织入论证",
    },
    sourceCards: [
      {
        id: "sc_a",
        title: "资料卡",
        summary: "摘要",
        evidence: "证据片段",
      },
    ],
    outlineDraft: {
      hook: "",
      sections: [
        {
          heading: "先把误解拨开",
          purpose: "纠偏",
          sectionThesis: "不是位置问题",
          singlePurpose: "先纠偏",
          mustLandDetail: "把主判断立住",
          sceneOrCost: "落一个误判场景",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
          tone: "快",
          move: "纠偏",
          break: "短句",
          bridge: "转骨架",
          transitionTarget: "空间骨架",
          counterPoint: "回应位置误判",
          styleObjective: "判断力",
          keyPoints: ["误解", "主判断"],
          expectedTakeaway: "知道不是看标签",
          id: "s1",
        },
      ],
      closing: "",
    },
  });

  assert.match(prompt.user, /当前段落/);
  assert.match(prompt.user, /为什么失败/);
  assert.match(prompt.user, /建议改法/);
  assert.match(prompt.user, /强约束证据/);
});

test("mock rewrite tasks return markdown content", async () => {
  const output = await runStructuredTask(
    "ending_echo_rewriter",
    {
      paragraphText: "这段收得很平。",
      rewriteIntent: {
        issueType: "weak_ending_echo",
        targetRange: "paragraph:3",
        whyItFails: "结尾没有回扣开头",
        suggestedRewriteMode: "重写结尾，让它回扣开头判断。",
      },
      sourceCards: [{ id: "sc_a", title: "资料卡", summary: "摘要", evidence: "证据" }],
    },
  );

  assert.ok(typeof output.narrativeMarkdown === "string");
  assert.match(output.narrativeMarkdown, /结构|回到开头|SC:/);
});
