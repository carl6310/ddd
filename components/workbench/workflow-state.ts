"use client";

import type { ProjectBundle, ReviewSeverity } from "@/lib/types";
import { canPreparePublish } from "@/lib/workflow";
import { WORKBENCH_FLOW, type WorkbenchFlowId } from "@/lib/workbench/flow-definition";
import { isStyleCoreComplete, isThinkCardComplete } from "@/lib/author-cards";

export type ActiveTab = "overview" | "research" | "structure" | "drafts" | "publish";
export type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
export type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";
export type WorkspaceSection =
  | "workbench-dashboard"
  | "overview-think-card"
  | "overview-style-core"
  | "overview-compatibility"
  | "overview-vitality"
  | "research-brief"
  | "source-form"
  | "source-library"
  | "sector-model"
  | "outline"
  | "drafts"
  | "publish-prep"
  | null;

export type WorkbenchWorkflowStepId = WorkbenchFlowId;
export type WorkbenchWorkflowStepStatus = "complete" | "current" | "blocked" | "stale" | "pending";

export interface WorkbenchNextAction {
  stepId: WorkbenchWorkflowStepId;
  title: string;
  reason: string;
  targetLabel: string;
  targetView: WorkbenchWorkflowStepId;
  targetTab: ActiveTab;
  targetSection: WorkspaceSection;
  executeStep?: WorkbenchStepPath;
  ctaLabel: string;
  tone: ReviewSeverity;
}

export interface WorkbenchWorkflowStep {
  id: WorkbenchWorkflowStepId;
  label: string;
  shortLabel: string;
  status: WorkbenchWorkflowStepStatus;
  targetTab: ActiveTab;
  targetSection: WorkspaceSection;
  hint: string;
}

type ActiveJobSummary = {
  step: string;
  status: string;
};

export function buildWorkbenchWorkflow({
  selectedBundle,
  staleArtifacts,
  activeTab,
  focusedSection,
  jobs = [],
}: {
  selectedBundle: ProjectBundle;
  staleArtifacts: StaleArtifact[];
  activeTab: ActiveTab;
  focusedSection: WorkspaceSection;
  jobs?: ActiveJobSummary[];
}) {
  const activeViewLabel = getActiveViewLabel(activeTab, focusedSection);
  const nextAction = getWorkbenchNextAction(selectedBundle, activeViewLabel);
  const activeJobSteps = new Set(jobs.filter((job) => job.status === "queued" || job.status === "running").map((job) => job.step));
  const steps = WORKBENCH_WORKFLOW_DEFS.map((definition) => {
    const status = resolveStepStatus({
      id: definition.id,
      selectedBundle,
      staleArtifacts,
      nextAction,
      activeJobSteps,
    });
    return {
      ...definition,
      status,
      hint: getStepHint(definition.id, status, selectedBundle),
    };
  });

  return {
    activeViewLabel,
    nextAction,
    steps,
    completedCount: steps.filter((step) => step.status === "complete").length,
  };
}

export function getWorkbenchNextAction(selectedBundle: ProjectBundle, activeViewLabel: string): WorkbenchNextAction {
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  const vitality = selectedBundle.project.vitalityCheck;

  if (!isJudgementComplete(selectedBundle)) {
    return {
      stepId: "judgement",
      title: "先完成选题判断",
      reason: "先判断题值、读者收益和表达策略，否则后面的研究和写作会发散。",
      targetLabel: "选题判断",
      targetView: "judgement",
      targetTab: "overview",
      targetSection: "overview-think-card",
      ctaLabel: "完善选题判断",
      tone: "warn",
    };
  }

  if (!selectedBundle.researchBrief) {
    return {
      stepId: "evidence",
      title: "先生成研究清单",
      reason: "先把必须验证的问题列出来，资料卡才不会变成资料堆积。",
      targetLabel: "资料沉淀",
      targetView: "evidence",
      targetTab: "research",
      targetSection: "research-brief",
      executeStep: "research-brief",
      ctaLabel: "生成研究清单",
      tone: "warn",
    };
  }

  if (selectedBundle.sourceCards.length === 0) {
    return {
      stepId: "evidence",
      title: "先补第一张资料卡",
      reason: "没有资料卡时，板块建模和正文都只能空转。",
      targetLabel: "资料沉淀",
      targetView: "evidence",
      targetTab: "research",
      targetSection: "source-form",
      ctaLabel: "补资料卡",
      tone: "warn",
    };
  }

  if (!selectedBundle.sectorModel) {
    return {
      stepId: "model",
      title: "生成板块建模",
      reason: "资料已有，下一步要把事实翻译成空间骨架和价值判断。",
      targetLabel: "板块建模",
      targetView: "model",
      targetTab: "structure",
      targetSection: "sector-model",
      executeStep: "sector-model",
      ctaLabel: "生成板块建模",
      tone: "warn",
    };
  }

  if (!selectedBundle.outlineDraft || selectedBundle.outlineDraft.sections.length === 0) {
    return {
      stepId: "outline",
      title: "生成论证提纲",
      reason: "先确定核心判断、论证顺序和段落任务，正文才不会散。",
      targetLabel: "论证提纲",
      targetView: "outline",
      targetTab: "structure",
      targetSection: "outline",
      executeStep: "outline",
      ctaLabel: "生成论证提纲",
      tone: "warn",
    };
  }

  if (!selectedBundle.articleDraft) {
    return {
      stepId: "draft",
      title: "生成正文双稿",
      reason: "提纲已到位，下一步把分析版和成文版跑出来。",
      targetLabel: "正文打磨",
      targetView: "draft",
      targetTab: "drafts",
      targetSection: "drafts",
      executeStep: "drafts",
      ctaLabel: "生成正文",
      tone: "warn",
    };
  }

  if (!selectedBundle.reviewReport) {
    return {
      stepId: "publish",
      title: "运行质量检查",
      reason: "正文已有，先做质量检查，再进入发布包整理。",
      targetLabel: "体检发布",
      targetView: "publish",
      targetTab: "publish",
      targetSection: "publish-prep",
      executeStep: "review",
      ctaLabel: "运行体检",
      tone: "warn",
    };
  }

  if (!canPublish) {
    return {
      stepId: "publish",
      title: "先修掉硬伤",
      reason: vitality.overallVerdict || selectedBundle.reviewReport.overallVerdict || "发布前体检还没有过线，先修关键问题再生成发布包。",
      targetLabel: "体检发布",
      targetView: "publish",
      targetTab: "publish",
      targetSection: "publish-prep",
      ctaLabel: "查看体检结果",
      tone: vitality.overallStatus,
    };
  }

  if (!selectedBundle.publishPackage) {
    return {
      stepId: "publish",
      title: "生成发布包",
      reason: "体检已通过，可以整理标题、摘要、配图建议和发布清单。",
      targetLabel: "体检发布",
      targetView: "publish",
      targetTab: "publish",
      targetSection: "publish-prep",
      ctaLabel: "生成发布包",
      tone: "pass",
    };
  }

  return {
    stepId: "publish",
    title: "继续润色或导出",
    reason: activeViewLabel ? "文章生产链路已经完成，可以继续人工润色或导出 Markdown。" : "文章生产链路已经完成，可以继续人工润色或导出 Markdown。",
    targetLabel: "体检发布",
    targetView: "publish",
    targetTab: "publish",
    targetSection: "publish-prep",
    ctaLabel: "打开发布包",
    tone: "pass",
  };
}

export function getActiveViewLabel(activeTab: ActiveTab, focusedSection: WorkspaceSection) {
  if (activeTab === "overview") {
    switch (focusedSection) {
      case "workbench-dashboard":
        return "总览";
      case "overview-style-core":
        return "选题判断 / 表达策略";
      case "overview-compatibility":
        return "选题判断 / 调试映射";
      case "overview-vitality":
        return "体检发布 / 质量检查";
      case "overview-think-card":
      default:
        return "选题判断";
    }
  }

  if (activeTab === "research") {
    switch (focusedSection) {
      case "source-form":
        return "资料沉淀 / 资料录入";
      case "source-library":
        return "资料沉淀 / 资料库";
      case "research-brief":
      default:
        return "资料沉淀 / 研究清单";
    }
  }

  if (activeTab === "publish") {
    return "体检发布";
  }

  if (activeTab === "structure") {
    switch (focusedSection) {
      case "outline":
        return "论证提纲";
      case "sector-model":
      default:
        return "板块建模";
    }
  }

  return "正文打磨";
}

const WORKBENCH_WORKFLOW_DEFS: Array<Omit<WorkbenchWorkflowStep, "status" | "hint">> = [
  ...WORKBENCH_FLOW.map((item) => ({
    id: item.id,
    label: item.label,
    shortLabel: item.shortLabel,
    targetTab: getTargetForFlow(item.id).targetTab,
    targetSection: getTargetForFlow(item.id).targetSection,
  })),
];

function resolveStepStatus({
  id,
  selectedBundle,
  staleArtifacts,
  nextAction,
  activeJobSteps,
}: {
  id: WorkbenchWorkflowStepId;
  selectedBundle: ProjectBundle;
  staleArtifacts: StaleArtifact[];
  nextAction: WorkbenchNextAction;
  activeJobSteps: Set<string>;
}): WorkbenchWorkflowStepStatus {
  if (isStepJobActive(id, activeJobSteps)) {
    return "pending";
  }
  if (isStepStale(id, selectedBundle, staleArtifacts)) {
    return "stale";
  }
  if (isStepComplete(id, selectedBundle)) {
    return "complete";
  }
  if (id === nextAction.stepId) {
    return "current";
  }
  if (isStepBlocked(id, selectedBundle)) {
    return "blocked";
  }
  return "pending";
}

function isStepComplete(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle) {
  switch (id) {
    case "judgement":
      return isJudgementComplete(selectedBundle);
    case "evidence":
      return Boolean(selectedBundle.researchBrief) && selectedBundle.sourceCards.length > 0;
    case "model":
      return Boolean(selectedBundle.sectorModel);
    case "outline":
      return Boolean(selectedBundle.outlineDraft?.sections.length);
    case "draft":
      return Boolean(selectedBundle.articleDraft);
    case "publish":
      return Boolean(selectedBundle.reviewReport) && canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck) && Boolean(selectedBundle.publishPackage);
  }
}

function isStepBlocked(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle) {
  const hasJudgement = isJudgementComplete(selectedBundle);
  const hasResearchInput = Boolean(selectedBundle.researchBrief) && selectedBundle.sourceCards.length > 0;
  switch (id) {
    case "judgement":
      return false;
    case "evidence":
      return !hasJudgement;
    case "model":
      return !hasJudgement || !hasResearchInput;
    case "outline":
      return !hasJudgement || !hasResearchInput || !selectedBundle.sectorModel;
    case "draft":
      return !hasJudgement || !selectedBundle.outlineDraft?.sections.length;
    case "publish":
      return !selectedBundle.articleDraft;
  }
}

function isStepStale(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle, staleArtifacts: StaleArtifact[]) {
  const staleSet = new Set(staleArtifacts);
  switch (id) {
    case "evidence":
      return Boolean(selectedBundle.researchBrief) && staleSet.has("research-brief");
    case "model":
      return Boolean(selectedBundle.sectorModel) && staleSet.has("sector-model");
    case "outline":
      return Boolean(selectedBundle.outlineDraft) && staleSet.has("outline");
    case "draft":
      return Boolean(selectedBundle.articleDraft) && staleSet.has("drafts");
    case "publish":
      return (Boolean(selectedBundle.reviewReport) && staleSet.has("review")) || (Boolean(selectedBundle.publishPackage) && staleSet.has("publish-prep"));
    case "judgement":
    default:
      return false;
  }
}

function isStepJobActive(id: WorkbenchWorkflowStepId, activeJobSteps: Set<string>) {
  switch (id) {
    case "evidence":
      return activeJobSteps.has("research-brief") || activeJobSteps.has("source-card-extract") || activeJobSteps.has("source-card-summarize");
    case "model":
      return activeJobSteps.has("sector-model");
    case "outline":
      return activeJobSteps.has("outline");
    case "draft":
      return activeJobSteps.has("drafts");
    case "publish":
      return activeJobSteps.has("review") || activeJobSteps.has("publish-prep");
    case "judgement":
    default:
      return false;
  }
}

function getStepHint(id: WorkbenchWorkflowStepId, status: WorkbenchWorkflowStepStatus, selectedBundle: ProjectBundle) {
  if (status === "complete") {
    return "已完成";
  }
  if (status === "stale") {
    return "上游已修改，建议重跑";
  }
  if (status === "pending") {
    return "等待前置步骤";
  }
  if (status === "blocked") {
    return getBlockedHint(id, selectedBundle);
  }
  switch (id) {
    case "evidence":
      return selectedBundle.researchBrief ? "继续补资料卡" : "生成研究清单";
    case "model":
      return "生成板块建模";
    case "outline":
      return "生成论证提纲";
    case "draft":
      return "生成正文双稿";
    case "publish":
      return selectedBundle.reviewReport ? "生成发布包" : "运行体检";
    case "judgement":
    default:
      return "完善选题判断";
  }
}

function getBlockedHint(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle) {
  switch (id) {
    case "evidence":
      return "先完成选题判断";
    case "model":
      return !selectedBundle.researchBrief ? "先生成研究清单" : "先补资料卡";
    case "outline":
      return "先完成板块建模";
    case "draft":
      return "先完成论证提纲";
    case "publish":
      return "先生成正文";
    case "judgement":
    default:
      return "等待前置步骤";
  }
}

function isJudgementComplete(selectedBundle: ProjectBundle) {
  return isThinkCardComplete(selectedBundle.project.thinkCard) && isStyleCoreComplete(selectedBundle.project.styleCore);
}

function getTargetForFlow(id: WorkbenchWorkflowStepId): { targetTab: ActiveTab; targetSection: WorkspaceSection } {
  switch (id) {
    case "judgement":
      return { targetTab: "overview", targetSection: "overview-think-card" };
    case "evidence":
      return { targetTab: "research", targetSection: "research-brief" };
    case "model":
      return { targetTab: "structure", targetSection: "sector-model" };
    case "outline":
      return { targetTab: "structure", targetSection: "outline" };
    case "draft":
      return { targetTab: "drafts", targetSection: "drafts" };
    case "publish":
      return { targetTab: "publish", targetSection: "publish-prep" };
  }
}
