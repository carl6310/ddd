import test from "node:test";
import assert from "node:assert/strict";

const { buildWritingQualitySummaryLines, buildWritingQualitySnapshot } = await import("../lib/writing-quality/summary.ts");

test("writing quality summary builds exportable lines and dashboard snapshot", () => {
  const bundle = {
    project: {
      id: "proj_test",
      topic: "测试项目",
      stage: "发布前整理",
      thesis: "塘桥真正的问题不是位置，而是结构。",
      vitalityCheck: {
        overallStatus: "warn",
        overallVerdict: "待修",
        semiBlocked: false,
        hardBlocked: false,
        entries: [],
      },
    },
    researchBrief: null,
    sourceCards: [{ id: "sc_a" }],
    sectorModel: { evidenceIds: ["sc_a"] },
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
      narrativeMarkdown: "## 第一段\n判断。[SC:sc_a]",
      editedMarkdown: "## 第一段\n判断。[SC:sc_a] 但代价也摆在这里。",
    },
    reviewReport: {
      checks: [],
      paragraphFlags: [],
      rewriteIntents: [],
    },
    publishPackage: null,
  };

  const snapshot = buildWritingQualitySnapshot(bundle);
  const lines = buildWritingQualitySummaryLines(bundle);

  assert.ok(typeof snapshot.editorialEventCount === "number");
  assert.ok(lines.some((line) => line.includes("总体质量分")));
  assert.ok(lines.some((line) => line.includes("Quality gate")));
});
