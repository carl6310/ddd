import test from "node:test";
import assert from "node:assert/strict";

const {
  buildWritingQualityScorecard,
  computeHumanEditDelta,
} = await import("../lib/writing-quality/scorecard.ts");
const { extractCitationIds } = await import("../lib/evidence/coverage.ts");

test("extractCitationIds deduplicates citations", () => {
  assert.deepEqual(extractCitationIds("A [SC:one] B [SC:one] C [SC:two]"), ["one", "two"]);
});

test("computeHumanEditDelta detects heavier edits", () => {
  const small = computeHumanEditDelta("上海很好。", "上海很好。");
  const large = computeHumanEditDelta("上海很好。", "塘桥的问题不是位置，而是结构。");

  assert.equal(small, 0);
  assert.ok((large ?? 0) > 0.5);
});

test("writing scorecard reports broken citations and evidence coverage", () => {
  const bundle = {
    project: {
      id: "proj_test",
      topic: "测试项目",
      thesis: "塘桥真正的问题不是位置，而是结构。",
      stage: "发布前整理",
      vitalityCheck: {
        overallStatus: "pass",
        overallVerdict: "ok",
        semiBlocked: false,
        hardBlocked: false,
        entries: [],
      },
    },
    sourceCards: [
      { id: "sc_a" },
      { id: "sc_b" },
    ],
    outlineDraft: {
      hook: "",
      sections: [
        { heading: "第一段", evidenceIds: ["sc_a"], keyPoints: ["主判断"], purpose: "立判断" },
        { heading: "第二段", evidenceIds: ["sc_b"], keyPoints: ["拆结构"], purpose: "拆结构" },
      ],
      closing: "",
    },
    articleDraft: {
      narrativeMarkdown: "## 第一段\n内容[SC:sc_a]\n\n## 第二段\n内容[SC:missing]",
      editedMarkdown: "",
    },
    reviewReport: {
      checks: [
        { key: "opening", status: "pass" },
        { key: "hook", status: "warn" },
        { key: "anchor", status: "pass" },
        { key: "echo", status: "fail" },
        { key: "transitions", status: "warn" },
      ],
    },
  };

  const scorecard = buildWritingQualityScorecard({
    fixture: {
      id: "fixture",
      label: "Fixture",
      projectId: "proj_test",
      expectation: "standard_flow",
    },
    bundle,
    llmStats: {
      draftWriterCalls: 1,
      draftPolisherCalls: 1,
    },
  });

  assert.equal(scorecard.metrics?.brokenCitationCount, 1);
  assert.equal(scorecard.metrics?.citationCoverage, 0.5);
  assert.equal(scorecard.metrics?.sectionEvidenceCoverage, 0.5);
  assert.equal(scorecard.keyPointCoverage[1].covered, false);
  assert.equal(scorecard.criticalJudgementAlerts[0].label, "第二段");
  assert.equal(scorecard.metrics?.vitalityPassRate, 1);
  assert.equal(scorecard.metrics?.polisherTriggerRate, 1);
});
