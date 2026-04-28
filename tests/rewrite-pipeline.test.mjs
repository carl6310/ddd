import test from "node:test";
import assert from "node:assert/strict";

const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { runStructuredTask } = await import("../lib/llm.ts");
const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");
const { stitchNarrativeFlow } = await import("../lib/services/steps/generate-draft.ts");

function projectFixture(patch = {}) {
  const base = {
    topic: "塘桥为什么涨不动",
    thesis: "真正的问题不是位置，而是结构。",
    articleType: "价值重估型",
  };
  const cards = buildCardsFromLegacy(base);
  return {
    ...base,
    ...cards,
    ...patch,
  };
}

test("rewrite task prompts include local rewrite context", () => {
  const prompt = buildPromptTask("evidence_weaver", {
    project: projectFixture(),
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

test("draft writer prompt uses continuity ledger without requiring it", () => {
  const prompt = buildPromptTask("draft_writer", {
    project: projectFixture(),
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: ["sc_a"],
    },
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心问题",
          openingMisread: "误读",
          realProblem: "真实问题",
          readerPromise: "判断工具",
          finalReturn: "回到开头",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "先把误解拨开",
            role: "raise_misread",
            inheritedQuestion: "为什么会误读",
            answerThisSection: "不是位置，而是结构",
            newInformation: "结构差异",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "结构是什么",
            nextSectionNecessity: "必须解释机制",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
  });

  assert.match(prompt.system, /沿着 ContinuityLedger/);
  assert.match(prompt.system, /不像 5 张独立卡片/);
  assert.match(prompt.system, /节奏、短句、疑问句、口语化、文化升维、代价感和谦逊铺垫都是软建议/);
  assert.match(prompt.system, /回应 inheritedQuestion，回答 answerThisSection，写出 newInformation/);
  assert.match(prompt.user, /ContinuityLedger/);
  assert.match(prompt.user, /为什么会误读/);
  assert.doesNotMatch(prompt.system, /全文整体至少落一个具体人物\/生活场景、一处文化升维、一处现实代价、一句短促断裂句/);
  assert.doesNotMatch(prompt.system, /全文至少用 5 个|至少 3 处短句|至少 2 处疑问句|至少有 1 处谦逊铺垫/);
  assert.doesNotMatch(prompt.user, /口语化要求：全文至少|节奏要求：全文至少|谦逊要求：/);

  const fallback = buildPromptTask("draft_writer", {
    project: projectFixture({ topic: "塘桥", thesis: "主判断" }),
    outlineDraft: { hook: "开头", sections: [], closing: "结尾" },
  });
  assert.match(fallback.user, /暂无。没有 continuityLedger/);
});

test("draft polisher rejects standalone bridge insertion", () => {
  const prompt = buildPromptTask("draft_polisher", {
    project: projectFixture(),
    narrativeMarkdown: "# 标题\n\n第一节。\n\n第二节。",
  });

  assert.match(prompt.system, /不要补独立转场句/);
  assert.match(prompt.system, /上一节结尾和下一节开头/);
  assert.doesNotMatch(prompt.system, /中段必须补转场句/);
});

test("stitchNarrativeFlow does not inject formula bridges when continuity ledger exists", () => {
  const stitched = stitchNarrativeFlow(
    [
      "# 标题",
      "",
      "开头判断。[SC:sc_a]",
      "",
      "## 第一节",
      "第一节正文。[SC:sc_a]",
      "",
      "## 第二节",
      "第二节正文。[SC:sc_b]",
    ].join("\n"),
    {
      continuityLedger: {
        beats: [],
      },
      sections: [
        { heading: "第一节", bridge: "引出问题：这会影响后面的选择" },
        { heading: "第二节", bridge: "自然过渡到成本" },
      ],
      closing: "结尾",
    },
    "真正的问题不是位置，而是结构。",
    "结构",
  );

  assert.doesNotMatch(stitched, /问题在于，/);
  assert.doesNotMatch(stitched, /再往下看，/);
  assert.doesNotMatch(stitched, /这会影响后面的选择/);
  assert.match(stitched, /\[SC:sc_a\]/);
  assert.match(stitched, /## 第二节/);
});

test("structural rewriter prompt includes continuity flags and ledger", () => {
  const prompt = buildPromptTask("structural_rewriter", {
    project: projectFixture(),
    narrativeMarkdown: "# 标题\n\n## 第一节\n重复判断。[SC:sc_a]",
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心问题",
          openingMisread: "误读",
          realProblem: "真实问题",
          readerPromise: "判断工具",
          finalReturn: "回到开头",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "第一节",
            role: "show_difference",
            inheritedQuestion: "上一节问什么",
            answerThisSection: "回答什么",
            newInformation: "新增什么",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "下一节问什么",
            nextSectionNecessity: "为什么下一节必要",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    deterministicReview: {
      continuityFlags: [
        {
          type: "repeated_claim",
          severity: "fail",
          sectionIds: ["s1", "s2"],
          reason: "重复前文",
          suggestedAction: "合并",
        },
      ],
    },
    structuralRewriteIntent: {
      issueTypes: ["repeated_claim"],
      affectedSectionIds: ["s1", "s2"],
      whyItFails: "重复前文",
      suggestedRewriteMode: "merge_sections",
    },
    sourceCards: [{ id: "sc_a", title: "资料卡", summary: "摘要", evidence: "证据" }],
  });

  assert.match(prompt.system, /结构性重写/);
  assert.match(prompt.system, /不要只补一句/);
  assert.match(prompt.user, /ContinuityLedger/);
  assert.match(prompt.user, /repeated_claim/);
});

test("mock structural rewriter returns full markdown and preserves citations", async () => {
  const output = await runStructuredTask("structural_rewriter", {
    narrativeMarkdown: "# 标题\n\n原文。[SC:sc_a]",
    structuralRewriteIntent: {
      issueTypes: ["can_be_swapped"],
      affectedSectionIds: ["s1", "s2"],
      whyItFails: "两节可交换",
      suggestedRewriteMode: "rewrite_section_roles",
    },
    sourceCards: [{ id: "sc_a", title: "资料卡", summary: "摘要", evidence: "证据" }],
  });

  assert.match(output.narrativeMarkdown, /^# 标题/);
  assert.match(output.narrativeMarkdown, /\[SC:sc_a\]/);
  assert.match(output.narrativeMarkdown, /can_be_swapped/);
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
