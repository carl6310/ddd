import test from "node:test";
import assert from "node:assert/strict";

const { buildWritingQualityGate } = await import("../lib/writing-quality/gate.ts");

function baseBundle(patch = {}) {
  return {
    project: {
      thesis: "塘桥真正的问题不是位置，而是结构。",
    },
    researchBrief: null,
    sourceCards: [{ id: "sc_a" }],
    sectorModel: {
      evidenceIds: ["sc_a"],
    },
    outlineDraft: {
      sections: [
        {
          heading: "第一段",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
          keyPoints: ["重点"],
          purpose: "纠偏",
        },
      ],
    },
    articleDraft: {
      narrativeMarkdown: "## 第一段\n这里只是讲了一句，没有引用。",
      editedMarkdown: "",
    },
    reviewReport: null,
    publishPackage: null,
    ...patch,
  };
}

test("writing quality gate emits layered gate buckets", () => {
  const gate = buildWritingQualityGate(baseBundle({
    reviewReport: {
      qualityPyramid: [
        { level: "L2", title: "StructureFlow", status: "warn", summary: "需要继续优化", mustFix: [], shouldFix: ["转场偏弱"], optionalPolish: [] },
      ],
      checks: [],
      rewriteIntents: [
        {
          targetRange: "paragraph:1",
          issueType: "weak_ending_echo",
          whyItFails: "结尾没有回扣开头",
          suggestedRewriteMode: "重写结尾",
        },
        {
          targetRange: "paragraph:1",
          issueType: "missing_cost",
          whyItFails: "缺少代价",
          suggestedRewriteMode: "补代价",
        },
      ],
      paragraphFlags: [],
    },
  }));

  assert.equal(gate.mode, "soft-block");
  assert.equal(gate.overallStatus, "fail");
  assert.ok(gate.mustFix.length >= 1);
  assert.ok(gate.shouldFix.length >= 1);
});

test("writing quality gate does not duplicate missing-scene warning after scene check passes", () => {
  const gate = buildWritingQualityGate(baseBundle({
    articleDraft: {
      narrativeMarkdown: "## 第一段\n这里有正文。[SC:sc_a]",
      editedMarkdown: "",
    },
    reviewReport: {
      qualityPyramid: [
        { level: "L4", title: "HumanFeel", status: "pass", summary: "已过线", mustFix: [], shouldFix: [], optionalPolish: [] },
      ],
      checks: [{ key: "character-scene", title: "人物 / 生活场景", status: "pass", detail: "已过线", evidenceIds: [] }],
      rewriteIntents: [
        {
          targetRange: "paragraph:1",
          issueType: "missing_scene",
          whyItFails: "旧段落级提示",
          suggestedRewriteMode: "补场景",
        },
      ],
      paragraphFlags: [],
    },
  }));

  assert.equal(gate.shouldFix.some((item) => item.code === "missing_scene"), false);
});
