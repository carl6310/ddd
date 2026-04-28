"use client";

import type { ProjectBundle, ReviewSeverity, VitalityCheckEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/surface";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { canPreparePublish } from "@/lib/workflow";

type ActiveTab = "overview" | "research" | "structure" | "drafts" | "publish";
type WorkspaceSection =
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
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";

export function ReviewSidebar({
  selectedBundle,
  activeTab,
  focusedSection,
  onNavigate,
  onExecute,
  isPending,
}: {
  selectedBundle: ProjectBundle | null;
  activeTab: ActiveTab;
  focusedSection: WorkspaceSection;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  isPending: boolean;
}) {
  if (!selectedBundle) {
    return null;
  }

  const tc = selectedBundle.project.thinkCard;
  const sc = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const workflowItems = [
    Boolean(selectedBundle.researchBrief),
    selectedBundle.sourceCards.length > 0,
    Boolean(selectedBundle.sectorModel),
    Boolean(selectedBundle.outlineDraft),
    Boolean(selectedBundle.articleDraft),
    Boolean(selectedBundle.reviewReport),
    Boolean(selectedBundle.publishPackage),
  ];
  const completedCount = workflowItems.filter(Boolean).length;
  const activeViewLabel = getActiveViewLabel(activeTab, focusedSection);
  const nextAction = getNextAction(selectedBundle, activeViewLabel);
  const riskItems = getRiskItems(
    vitality.entries,
    Boolean(tc.materialDigest && tc.verdictReason && tc.hkr.happy && tc.hkr.knowledge && tc.hkr.resonance),
    Boolean(sc.rhythm && sc.breakPattern && sc.knowledgeDrop && sc.personalView && sc.judgement),
  );
  const primaryRisk = riskItems[0] ?? null;

  return (
    <Panel as="aside" className={`status-bar inspector-panel status-bar-${nextAction.tone}`} aria-label="项目状态面板">
      <div className="status-bar-top">
        <div className="status-bar-info">
          <div className="status-bar-head">
            <span className="status-bar-label">项目状态</span>
            <span className="status-bar-count">{completedCount}/7</span>
          </div>
          <div className="status-bar-progress" aria-label={`流程完成度 ${completedCount}/7`}>
            {Array.from({ length: 7 }).map((_, index) => (
              <span className={index < completedCount ? "is-complete" : ""} key={index} />
            ))}
          </div>
          <p className="status-bar-title">{nextAction.title}</p>
          <p className="status-bar-copy">{nextAction.reason}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="status-bar-cta"
          onClick={() => {
            if (nextAction.executeStep) {
              void onExecute(nextAction.executeStep);
              return;
            }
            onNavigate(nextAction.targetTab, nextAction.targetSection);
          }}
          disabled={isPending}
        >
          {nextAction.ctaLabel}
        </Button>
      </div>
      <div className="status-bar-bottom">
        <div className="status-bar-meta-group">
          <Chip>{formatProjectStage(selectedBundle.project.stage)}</Chip>
          <Chip>{activeViewLabel}</Chip>
        </div>
        <div className="status-bar-meta-group">
          {selectedBundle.reviewReport?.rewriteIntents?.length ? (
            <Chip tone="warning">待改段落：{selectedBundle.reviewReport.rewriteIntents.length}</Chip>
          ) : null}
          {selectedBundle.reviewReport?.continuityFlags?.length ? (
            <Chip tone="warning">连续性：{selectedBundle.reviewReport.continuityFlags.length}</Chip>
          ) : null}
          {primaryRisk ? (
            <Chip tone={getRiskChipTone(primaryRisk.status)}>风险：{primaryRisk.title}</Chip>
          ) : (
            <Chip tone="success">当前无硬阻塞</Chip>
          )}
        </div>
        <small className="status-bar-target">{nextAction.targetLabel}</small>
      </div>
    </Panel>
  );
}

function getRiskChipTone(status: ReviewSeverity) {
  if (status === "fail") {
    return "danger";
  }
  if (status === "warn") {
    return "warning";
  }
  return "success";
}

function getNextAction(selectedBundle: ProjectBundle, activeViewLabel: string) {
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  const vitality = selectedBundle.project.vitalityCheck;

  if (!selectedBundle.researchBrief) {
    return {
      title: "先开始研究链路",
      reason: "先把研究问题清单生成出来，后面的资料卡、板块建模和提纲才有稳定依据。",
      targetLabel: "资料 / 研究清单",
      targetTab: "research" as ActiveTab,
      targetSection: "research-brief" as WorkspaceSection,
      executeStep: "research-brief" as WorkbenchStepPath,
      ctaLabel: "生成研究清单",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (selectedBundle.sourceCards.length === 0) {
    return {
      title: "先补第一张资料卡",
      reason: "没有资料卡时，板块建模和正文都只能空转，先补至少 1 张可信材料。",
      targetLabel: "资料 / 资料录入",
      targetTab: "research" as ActiveTab,
      targetSection: "source-form" as WorkspaceSection,
      ctaLabel: "补资料卡",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (!selectedBundle.sectorModel) {
    return {
      title: "把研究结论翻成板块模型",
      reason: "研究和资料已经有了，但还没有空间骨架，提纲和双稿会缺骨架。",
      targetLabel: "写作 / 板块建模",
      targetTab: "drafts" as ActiveTab,
      targetSection: "sector-model" as WorkspaceSection,
      executeStep: "sector-model" as WorkbenchStepPath,
      ctaLabel: "生成板块建模",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (!selectedBundle.outlineDraft) {
    return {
      title: "先把段落提纲补出来",
      reason: "板块结构已经有了，下一步应该落成段落任务书，避免正文直接散掉。",
      targetLabel: "写作 / 段落提纲",
      targetTab: "drafts" as ActiveTab,
      targetSection: "outline" as WorkspaceSection,
      executeStep: "outline" as WorkbenchStepPath,
      ctaLabel: "生成段落提纲",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (!selectedBundle.articleDraft) {
    return {
      title: "生成第一版双稿",
      reason: "提纲已经到位，下一步最有价值的是把分析版和成文版先跑出来。",
      targetLabel: "写作 / 双稿编辑",
      targetTab: "drafts" as ActiveTab,
      targetSection: "drafts" as WorkspaceSection,
      executeStep: "drafts" as WorkbenchStepPath,
      ctaLabel: "生成双稿",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (!selectedBundle.reviewReport) {
    return {
      title: "先做发布前检查",
      reason: "正文已有，但还没有生命力检查，先别急着进入发布整理。",
      targetLabel: "判断 / VitalityCheck",
      targetTab: "overview" as ActiveTab,
      targetSection: "overview-vitality" as WorkspaceSection,
      executeStep: "review" as WorkbenchStepPath,
      ctaLabel: "运行 VitalityCheck",
      tone: "warn" as ReviewSeverity,
    };
  }

  if (!canPublish) {
    return {
      title: "修掉发布前检查里的硬伤",
      reason: vitality.overallVerdict || "发布前检查还没有过线，先修关键问题再走发布整理。",
      targetLabel: "判断 / VitalityCheck",
      targetTab: "overview" as ActiveTab,
      targetSection: "overview-vitality" as WorkspaceSection,
      ctaLabel: "查看检查项",
      tone: vitality.overallStatus,
    };
  }

  if (!selectedBundle.publishPackage) {
    return {
      title: "进入发布整理",
      reason: "生命力检查已过线，下一步把正文整理成标题、摘要和发布清单。",
      targetLabel: "发布 / 发布整理",
      targetTab: "publish" as ActiveTab,
      targetSection: "publish-prep" as WorkspaceSection,
      ctaLabel: "打开发布整理",
      tone: "pass" as ReviewSeverity,
    };
  }

  return {
    title: "继续润色或导出",
    reason: `当前在 ${activeViewLabel}，可以继续人工润色、导出 Markdown，或回到薄弱环节再补一轮。`,
    targetLabel: "发布 / 发布整理",
    targetTab: "publish" as ActiveTab,
    targetSection: "publish-prep" as WorkspaceSection,
    ctaLabel: "打开发布整理",
    tone: "pass" as ReviewSeverity,
  };
}

function getRiskItems(entries: VitalityCheckEntry[], isThinkCardComplete: boolean, isStyleCoreComplete: boolean) {
  const urgencyItems = entries
    .filter((entry) => entry.status !== "pass")
    .slice(0, 1)
    .map((entry) => ({
      title: entry.title,
      detail: entry.detail,
      status: entry.status,
    }));

  if (urgencyItems.length > 0) {
    return urgencyItems;
  }

  if (!isThinkCardComplete) {
    return [
      {
        title: "选题判断还没补齐",
        detail: "主判断、题值理由和读者收获没填完整时，后面的判断依据会发虚。",
        status: "warn" as ReviewSeverity,
      },
    ];
  }

  if (!isStyleCoreComplete) {
    return [
      {
        title: "表达策略还没补齐",
        detail: "风格动作不完整时，双稿容易只剩结构，没有明显作者像。",
        status: "warn" as ReviewSeverity,
      },
    ];
  }

  return [];
}

function getActiveViewLabel(activeTab: ActiveTab, focusedSection: WorkspaceSection) {
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

  switch (focusedSection) {
    case "drafts":
    default:
      return "写作 / 正文编辑";
  }
}
