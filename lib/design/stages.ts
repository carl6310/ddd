import type { ProjectBundle, ProjectStage } from "@/lib/types";

export type DesignActiveTab = "overview" | "research" | "structure" | "drafts" | "publish";

export type DesignWorkspaceSection =
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

export type DesignStageStatus = "complete" | "current" | "blocked" | "running" | "stale" | "pending";
export type DesignStageTone = "neutral" | "accent" | "success" | "warning" | "danger" | "stale";

export type DesignStaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";

export interface DesignStageDefinition {
  stage: ProjectStage;
  label: string;
  shortLabel: string;
  targetTab: DesignActiveTab;
  targetSection: DesignWorkspaceSection;
  jobSteps: string[];
  staleArtifacts: DesignStaleArtifact[];
}

export interface DesignStageItem extends DesignStageDefinition {
  index: number;
  status: DesignStageStatus;
  tone: DesignStageTone;
  hint: string;
}

export const DESIGN_STAGE_DEFINITIONS: DesignStageDefinition[] = [
  {
    stage: "选题定义",
    label: "选题定义",
    shortLabel: "选题",
    targetTab: "overview",
    targetSection: null,
    jobSteps: [],
    staleArtifacts: [],
  },
  {
    stage: "ThinkCard / HKR",
    label: "ThinkCard",
    shortLabel: "ThinkCard",
    targetTab: "overview",
    targetSection: "overview-think-card",
    jobSteps: [],
    staleArtifacts: [],
  },
  {
    stage: "StyleCore",
    label: "StyleCore",
    shortLabel: "StyleCore",
    targetTab: "overview",
    targetSection: "overview-style-core",
    jobSteps: [],
    staleArtifacts: [],
  },
  {
    stage: "研究清单",
    label: "研究清单",
    shortLabel: "研究",
    targetTab: "research",
    targetSection: "research-brief",
    jobSteps: ["research-brief"],
    staleArtifacts: ["research-brief"],
  },
  {
    stage: "资料卡整理",
    label: "资料卡整理",
    shortLabel: "资料卡",
    targetTab: "research",
    targetSection: "source-library",
    jobSteps: ["source-card-extract", "source-card-summarize"],
    staleArtifacts: [],
  },
  {
    stage: "板块建模",
    label: "板块建模",
    shortLabel: "建模",
    targetTab: "structure",
    targetSection: "sector-model",
    jobSteps: ["sector-model"],
    staleArtifacts: ["sector-model"],
  },
  {
    stage: "提纲生成",
    label: "提纲生成",
    shortLabel: "提纲",
    targetTab: "structure",
    targetSection: "outline",
    jobSteps: ["outline"],
    staleArtifacts: ["outline"],
  },
  {
    stage: "正文生成",
    label: "正文生成",
    shortLabel: "正文",
    targetTab: "drafts",
    targetSection: "drafts",
    jobSteps: ["drafts"],
    staleArtifacts: ["drafts"],
  },
  {
    stage: "VitalityCheck",
    label: "VitalityCheck",
    shortLabel: "质检",
    targetTab: "overview",
    targetSection: "overview-vitality",
    jobSteps: ["review"],
    staleArtifacts: ["review"],
  },
  {
    stage: "发布前整理",
    label: "发布前整理",
    shortLabel: "发布",
    targetTab: "publish",
    targetSection: "publish-prep",
    jobSteps: ["publish-prep"],
    staleArtifacts: ["publish-prep"],
  },
];

export function buildDesignStageItems({
  selectedBundle,
  jobs,
  staleArtifacts,
}: {
  selectedBundle: ProjectBundle;
  jobs: Array<{ step: string; status: string }>;
  staleArtifacts: DesignStaleArtifact[];
}): DesignStageItem[] {
  const activeJobSteps = new Set(
    jobs.filter((job) => job.status === "queued" || job.status === "running").map((job) => job.step),
  );
  const staleSet = new Set(staleArtifacts);
  const firstIncompleteIndex = DESIGN_STAGE_DEFINITIONS.findIndex((definition) => !isDesignStageComplete(definition.stage, selectedBundle));
  const currentIndex = firstIncompleteIndex === -1 ? DESIGN_STAGE_DEFINITIONS.length - 1 : firstIncompleteIndex;

  return DESIGN_STAGE_DEFINITIONS.map((definition, index) => {
    const status = resolveDesignStageStatus({
      definition,
      index,
      currentIndex,
      selectedBundle,
      activeJobSteps,
      staleSet,
    });

    return {
      ...definition,
      index,
      status,
      tone: getStageTone(status),
      hint: getStageHint(definition.stage, status, selectedBundle),
    };
  });
}

export function isDesignStageComplete(stage: ProjectStage, selectedBundle: ProjectBundle) {
  switch (stage) {
    case "选题定义":
      return Boolean(selectedBundle.project.topic && selectedBundle.project.coreQuestion);
    case "ThinkCard / HKR":
      return Boolean(
        selectedBundle.project.thinkCard.coreJudgement &&
          selectedBundle.project.thinkCard.verdictReason &&
          selectedBundle.project.thinkCard.hkr.happy &&
          selectedBundle.project.thinkCard.hkr.knowledge &&
          selectedBundle.project.thinkCard.hkr.resonance,
      );
    case "StyleCore":
      return Boolean(
        selectedBundle.project.styleCore.rhythm &&
          selectedBundle.project.styleCore.breakPattern &&
          selectedBundle.project.styleCore.knowledgeDrop &&
          selectedBundle.project.styleCore.personalView &&
          selectedBundle.project.styleCore.judgement,
      );
    case "研究清单":
      return Boolean(selectedBundle.researchBrief);
    case "资料卡整理":
      return selectedBundle.sourceCards.length > 0;
    case "板块建模":
      return Boolean(selectedBundle.sectorModel);
    case "提纲生成":
      return Boolean(selectedBundle.outlineDraft?.sections.length);
    case "正文生成":
      return Boolean(selectedBundle.articleDraft);
    case "VitalityCheck":
      return Boolean(selectedBundle.reviewReport);
    case "发布前整理":
      return Boolean(selectedBundle.publishPackage);
  }
}

function resolveDesignStageStatus({
  definition,
  index,
  currentIndex,
  selectedBundle,
  activeJobSteps,
  staleSet,
}: {
  definition: DesignStageDefinition;
  index: number;
  currentIndex: number;
  selectedBundle: ProjectBundle;
  activeJobSteps: Set<string>;
  staleSet: Set<DesignStaleArtifact>;
}): DesignStageStatus {
  if (definition.jobSteps.some((step) => activeJobSteps.has(step))) {
    return "running";
  }

  if (
    isDesignStageComplete(definition.stage, selectedBundle) &&
    definition.staleArtifacts.some((artifact) => staleSet.has(artifact))
  ) {
    return "stale";
  }

  if (isDesignStageComplete(definition.stage, selectedBundle)) {
    return "complete";
  }

  if (index === currentIndex) {
    return "current";
  }

  if (index > currentIndex) {
    return "blocked";
  }

  return "pending";
}

function getStageTone(status: DesignStageStatus): DesignStageTone {
  switch (status) {
    case "complete":
      return "success";
    case "current":
    case "running":
      return "accent";
    case "stale":
      return "stale";
    case "blocked":
      return "warning";
    case "pending":
    default:
      return "neutral";
  }
}

function getStageHint(stage: ProjectStage, status: DesignStageStatus, selectedBundle: ProjectBundle) {
  if (status === "complete") {
    return "已完成";
  }
  if (status === "running") {
    return "后台运行中";
  }
  if (status === "stale") {
    return "建议重跑";
  }
  if (status === "blocked") {
    return "等待前置";
  }

  switch (stage) {
    case "选题定义":
      return selectedBundle.project.coreQuestion ? "补齐选题" : "定义问题";
    case "ThinkCard / HKR":
      return "形成选题判断";
    case "StyleCore":
      return "确定表达策略";
    case "研究清单":
      return "生成研究清单";
    case "资料卡整理":
      return "补充资料卡";
    case "板块建模":
      return "生成板块模型";
    case "提纲生成":
      return "生成论证提纲";
    case "正文生成":
      return "生成正文";
    case "VitalityCheck":
      return "运行质检";
    case "发布前整理":
      return "整理发布稿";
  }
}
