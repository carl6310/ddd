import test from "node:test";
import assert from "node:assert/strict";

const { buildWritingQualityGate } = await import("../lib/writing-quality/gate.ts");

test("writing quality gate emits warn-only buckets", () => {
  const gate = buildWritingQualityGate({
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
    reviewReport: {
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
    publishPackage: null,
  });

  assert.equal(gate.mode, "warn-only");
  assert.equal(gate.overallStatus, "warn");
  assert.ok(gate.mustFix.length >= 1);
  assert.ok(gate.shouldFix.length >= 1);
});
