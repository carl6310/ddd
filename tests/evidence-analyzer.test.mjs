import test from "node:test";
import assert from "node:assert/strict";

const { analyzeEvidenceCoverage } = await import("../lib/evidence/coverage.ts");

test("evidence analyzer reports broken citations, orphan cards, and missing section evidence", () => {
  const bundle = {
    project: {
      thesis: "塘桥真正的问题不是位置，而是结构。",
    },
    sourceCards: [{ id: "sc_a" }, { id: "sc_b" }, { id: "sc_orphan" }],
    sectorModel: {
      evidenceIds: ["sc_a"],
    },
    outlineDraft: {
      sections: [
        { heading: "第一段", evidenceIds: ["sc_a"], keyPoints: ["先立主判断"], purpose: "立判断" },
        { heading: "第二段", evidenceIds: ["sc_b"], keyPoints: ["再拆结构"], purpose: "拆结构" },
      ],
    },
    articleDraft: {
      narrativeMarkdown: "## 第一段\n内容[SC:sc_a]\n\n## 第二段\n内容[SC:missing]",
      editedMarkdown: "",
    },
  };

  const result = analyzeEvidenceCoverage(bundle);

  assert.deepEqual(result.brokenCitationIds, ["missing"]);
  assert.deepEqual(result.orphanSourceCardIds, ["sc_orphan"]);
  assert.equal(result.summary.citationCoverage, 0.5);
  assert.equal(result.summary.sectionEvidenceCoverage, 0.5);
  assert.equal(result.summary.keyPointCoverage, 0.5);
  assert.equal(result.sectionCoverage[1].missingEvidenceIds[0], "sc_b");
  assert.equal(result.criticalJudgementAlerts.length, 1);
});
