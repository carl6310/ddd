"use client";

import type { ProjectBundle, ReviewSeverity } from "@/lib/types";
import { canPreparePublish } from "@/lib/workflow";

export type ActiveTab = "overview" | "research" | "structure" | "drafts" | "publish";
export type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
export type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";
export type WorkspaceSection =
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

export type WorkbenchWorkflowStepId = "topic" | "research" | "model" | "argument" | "outline" | "draft" | "review" | "publish";
export type WorkbenchWorkflowStepStatus = "complete" | "current" | "blocked" | "stale" | "pending";

export interface WorkbenchNextAction {
  stepId: WorkbenchWorkflowStepId;
  title: string;
  reason: string;
  targetLabel: string;
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

  if (!selectedBundle.researchBrief) {
    return {
      stepId: "research",
      title: "先开始研究链路",
      reason: "先把研究问题清单生成出来，后面的资料卡、板块建模和提纲才有稳定依据。",
      targetLabel: "资料 / 研究清单",
      targetTab: "research",
      targetSection: "research-brief",
      executeStep: "research-brief",
      ctaLabel: "生成研究清单",
      tone: "warn",
    };
  }

  if (selectedBundle.sourceCards.length === 0) {
    return {
      stepId: "research",
      title: "先补第一张资料卡",
      reason: "没有资料卡时，板块建模和正文都只能空转，先补至少 1 张可信材料。",
      targetLabel: "资料 / 资料录入",
      targetTab: "research",
      targetSection: "source-form",
      ctaLabel: "补资料卡",
      tone: "warn",
    };
  }

  if (!selectedBundle.sectorModel) {
    return {
      stepId: "model",
      title: "把研究结论翻成板块模型",
      reason: "研究和资料已经有了，但还没有空间骨架，提纲和双稿会缺骨架。",
      targetLabel: "结构 / 板块建模",
      targetTab: "structure",
      targetSection: "sector-model",
      executeStep: "sector-model",
      ctaLabel: "生成板块建模",
      tone: "warn",
    };
  }

  if (!selectedBundle.outlineDraft) {
    return {
      stepId: "argument",
      title: "先定论证骨架",
      reason: "板块模型已经有了，下一步要先把核心判断、论证走向和段落提纲落下来。",
      targetLabel: "结构 / 论证与提纲",
      targetTab: "structure",
      targetSection: "outline",
      executeStep: "outline",
      ctaLabel: "生成论证与提纲",
      tone: "warn",
    };
  }

  if (selectedBundle.outlineDraft.sections.length === 0) {
    return {
      stepId: "outline",
      title: "先把段落提纲补出来",
      reason: "论证骨架已经到位，下一步应该落成段落任务书，避免正文直接散掉。",
      targetLabel: "结构 / 段落提纲",
      targetTab: "structure",
      targetSection: "outline",
      executeStep: "outline",
      ctaLabel: "生成段落提纲",
      tone: "warn",
    };
  }

  if (!selectedBundle.articleDraft) {
    return {
      stepId: "draft",
      title: "生成第一版双稿",
      reason: "提纲已经到位，下一步最有价值的是把分析版和成文版先跑出来。",
      targetLabel: "写作 / 正文编辑",
      targetTab: "drafts",
      targetSection: "drafts",
      executeStep: "drafts",
      ctaLabel: "生成双稿",
      tone: "warn",
    };
  }

  if (!selectedBundle.reviewReport) {
    return {
      stepId: "review",
      title: "先做发布前检查",
      reason: "正文已有，但还没有生命力检查，先别急着进入发布整理。",
      targetLabel: "判断 / VitalityCheck",
      targetTab: "overview",
      targetSection: "overview-vitality",
      executeStep: "review",
      ctaLabel: "运行 VitalityCheck",
      tone: "warn",
    };
  }

  if (!canPublish) {
    return {
      stepId: "review",
      title: "修掉发布前检查里的硬伤",
      reason: vitality.overallVerdict || "发布前检查还没有过线，先修关键问题再走发布整理。",
      targetLabel: "判断 / VitalityCheck",
      targetTab: "overview",
      targetSection: "overview-vitality",
      ctaLabel: "查看检查项",
      tone: vitality.overallStatus,
    };
  }

  if (!selectedBundle.publishPackage) {
    return {
      stepId: "publish",
      title: "进入发布整理",
      reason: "生命力检查已过线，下一步把正文整理成标题、摘要和发布清单。",
      targetLabel: "发布 / 发布整理",
      targetTab: "publish",
      targetSection: "publish-prep",
      ctaLabel: "打开发布整理",
      tone: "pass",
    };
  }

  return {
    stepId: "publish",
    title: "继续润色或导出",
    reason: `当前在 ${activeViewLabel}，可以继续人工润色、导出 Markdown，或回到薄弱环节再补一轮。`,
    targetLabel: "发布 / 发布整理",
    targetTab: "publish",
    targetSection: "publish-prep",
    ctaLabel: "打开发布整理",
    tone: "pass",
  };
}

export function getActiveViewLabel(activeTab: ActiveTab, focusedSection: WorkspaceSection) {
  if (activeTab === "overview") {
    switch (focusedSection) {
      case "overview-style-core":
        return "判断 / 表达策略";
      case "overview-compatibility":
        return "判断 / 系统映射";
      case "overview-vitality":
        return "判断 / VitalityCheck";
      case "overview-think-card":
      default:
        return "判断 / 选题判断";
    }
  }

  if (activeTab === "research") {
    switch (focusedSection) {
      case "source-form":
        return "资料 / 资料录入";
      case "source-library":
        return "资料 / 资料索引";
      case "research-brief":
      default:
        return "资料 / 研究清单";
    }
  }

  if (activeTab === "publish") {
    return "发布 / 发布整理";
  }

  if (activeTab === "structure") {
    switch (focusedSection) {
      case "outline":
        return "结构 / 段落提纲";
      case "sector-model":
      default:
        return "结构 / 板块建模";
    }
  }

  return "写作 / 正文编辑";
}

const WORKBENCH_WORKFLOW_DEFS: Array<Omit<WorkbenchWorkflowStep, "status" | "hint">> = [
  { id: "topic", label: "选题", shortLabel: "选题", targetTab: "overview", targetSection: "overview-think-card" },
  { id: "research", label: "资料", shortLabel: "资料", targetTab: "research", targetSection: "research-brief" },
  { id: "model", label: "建模", shortLabel: "建模", targetTab: "structure", targetSection: "sector-model" },
  { id: "argument", label: "论证", shortLabel: "论证", targetTab: "structure", targetSection: "outline" },
  { id: "outline", label: "提纲", shortLabel: "提纲", targetTab: "structure", targetSection: "outline" },
  { id: "draft", label: "正文", shortLabel: "正文", targetTab: "drafts", targetSection: "drafts" },
  { id: "review", label: "质检", shortLabel: "质检", targetTab: "overview", targetSection: "overview-vitality" },
  { id: "publish", label: "发布", shortLabel: "发布", targetTab: "publish", targetSection: "publish-prep" },
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
    case "topic":
      return Boolean(selectedBundle.project);
    case "research":
      return Boolean(selectedBundle.researchBrief) && selectedBundle.sourceCards.length > 0;
    case "model":
      return Boolean(selectedBundle.sectorModel);
    case "argument":
      return Boolean(selectedBundle.outlineDraft);
    case "outline":
      return Boolean(selectedBundle.outlineDraft?.sections.length);
    case "draft":
      return Boolean(selectedBundle.articleDraft);
    case "review":
      return Boolean(selectedBundle.reviewReport);
    case "publish":
      return Boolean(selectedBundle.publishPackage);
  }
}

function isStepBlocked(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle) {
  const hasResearchInput = Boolean(selectedBundle.researchBrief) && selectedBundle.sourceCards.length > 0;
  switch (id) {
    case "topic":
    case "research":
      return false;
    case "model":
      return !hasResearchInput;
    case "argument":
    case "outline":
      return !selectedBundle.sectorModel;
    case "draft":
      return !selectedBundle.outlineDraft || selectedBundle.sourceCards.length === 0;
    case "review":
      return !selectedBundle.articleDraft;
    case "publish":
      return !selectedBundle.reviewReport || !canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  }
}

function isStepStale(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle, staleArtifacts: StaleArtifact[]) {
  const staleSet = new Set(staleArtifacts);
  switch (id) {
    case "research":
      return Boolean(selectedBundle.researchBrief) && staleSet.has("research-brief");
    case "model":
      return Boolean(selectedBundle.sectorModel) && staleSet.has("sector-model");
    case "argument":
    case "outline":
      return Boolean(selectedBundle.outlineDraft) && staleSet.has("outline");
    case "draft":
      return Boolean(selectedBundle.articleDraft) && staleSet.has("drafts");
    case "review":
      return Boolean(selectedBundle.reviewReport) && staleSet.has("review");
    case "publish":
      return Boolean(selectedBundle.publishPackage) && staleSet.has("publish-prep");
    case "topic":
    default:
      return false;
  }
}

function isStepJobActive(id: WorkbenchWorkflowStepId, activeJobSteps: Set<string>) {
  switch (id) {
    case "research":
      return activeJobSteps.has("research-brief") || activeJobSteps.has("source-card-extract") || activeJobSteps.has("source-card-summarize");
    case "model":
      return activeJobSteps.has("sector-model");
    case "argument":
    case "outline":
      return activeJobSteps.has("outline");
    case "draft":
      return activeJobSteps.has("drafts");
    case "review":
      return activeJobSteps.has("review");
    case "publish":
      return activeJobSteps.has("publish-prep");
    case "topic":
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
    case "research":
      return selectedBundle.researchBrief ? "继续补资料卡" : "生成研究清单";
    case "model":
      return "生成板块建模";
    case "argument":
      return "生成论证骨架";
    case "outline":
      return "生成段落提纲";
    case "draft":
      return "生成正文双稿";
    case "review":
      return "运行质检";
    case "publish":
      return "整理发布稿";
    case "topic":
    default:
      return "完善选题判断";
  }
}

function getBlockedHint(id: WorkbenchWorkflowStepId, selectedBundle: ProjectBundle) {
  switch (id) {
    case "model":
      return !selectedBundle.researchBrief ? "先生成研究清单" : "先补资料卡";
    case "argument":
    case "outline":
      return "先完成板块建模";
    case "draft":
      return "先完成提纲";
    case "review":
      return "先生成正文";
    case "publish":
      return "先通过质检";
    case "topic":
    case "research":
    default:
      return "等待前置步骤";
  }
}
