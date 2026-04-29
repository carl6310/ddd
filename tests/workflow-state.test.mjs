import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkbenchWorkflow } from "@/components/workbench/workflow-state";

function bundle(overrides = {}) {
  return {
    project: {
      id: "p1",
      stage: "选题定义",
      vitalityCheck: {
        hardBlocked: false,
        overallStatus: "pass",
        overallVerdict: "",
        entries: [],
      },
    },
    researchBrief: null,
    sourceCards: [],
    sectorModel: null,
    outlineDraft: null,
    articleDraft: null,
    reviewReport: null,
    publishPackage: null,
    ...overrides,
  };
}

function workflow(input) {
  return buildWorkbenchWorkflow({
    selectedBundle: input,
    staleArtifacts: [],
    activeTab: "overview",
    focusedSection: null,
  });
}

test("workflow starts with research as the first action after topic exists", () => {
  const result = workflow(bundle());

  assert.equal(result.steps.length, 8);
  assert.equal(result.steps[0].label, "选题");
  assert.equal(result.nextAction.stepId, "research");
  assert.equal(result.nextAction.executeStep, "research-brief");
  assert.equal(result.steps.find((step) => step.id === "research")?.status, "current");
});

test("workflow marks stale generated artifacts before complete", () => {
  const result = buildWorkbenchWorkflow({
    selectedBundle: bundle({
      researchBrief: { mustResearch: [] },
      sourceCards: [{ id: "sc_1" }],
      sectorModel: { zones: [] },
      outlineDraft: { sections: [{ id: "s1" }] },
      articleDraft: { narrativeMarkdown: "正文" },
    }),
    staleArtifacts: ["drafts"],
    activeTab: "drafts",
    focusedSection: "drafts",
  });

  assert.equal(result.steps.find((step) => step.id === "draft")?.status, "stale");
});

test("workflow uses pending state for active queued jobs", () => {
  const result = buildWorkbenchWorkflow({
    selectedBundle: bundle({
      researchBrief: { mustResearch: [] },
      sourceCards: [{ id: "sc_1" }],
      sectorModel: { zones: [] },
    }),
    staleArtifacts: [],
    activeTab: "structure",
    focusedSection: "outline",
    jobs: [{ step: "outline", status: "running" }],
  });

  assert.equal(result.steps.find((step) => step.id === "argument")?.status, "pending");
  assert.equal(result.steps.find((step) => step.id === "outline")?.status, "pending");
});

test("publish is blocked when review exists but vitality is hard blocked", () => {
  const result = workflow(
    bundle({
      researchBrief: { mustResearch: [] },
      sourceCards: [{ id: "sc_1" }],
      sectorModel: { zones: [] },
      outlineDraft: { sections: [{ id: "s1" }] },
      articleDraft: { narrativeMarkdown: "正文" },
      reviewReport: { qualityPyramid: [] },
      project: {
        id: "p1",
        stage: "VitalityCheck",
        vitalityCheck: {
          hardBlocked: true,
          overallStatus: "fail",
          overallVerdict: "L1 未过",
          entries: [],
        },
      },
    }),
  );

  assert.equal(result.nextAction.stepId, "review");
  assert.equal(result.steps.find((step) => step.id === "publish")?.status, "blocked");
});
