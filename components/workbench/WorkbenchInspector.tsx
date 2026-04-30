"use client";

import type { ProjectBundle, ReviewSeverity, VitalityCheckEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/surface";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { buildWorkbenchWorkflow, type ActiveTab, type WorkbenchStepPath, type WorkspaceSection } from "./workflow-state";
import type { WorkbenchDisplayMode } from "./display-mode";

export type WorkbenchInspectorSelection =
  | { kind: "outline-section"; sectionId: string }
  | { kind: "source-card"; sourceCardId: string }
  | {
      kind: "review-issue";
      title: string;
      reason: string;
      sourceLabel: string;
      locationLabel: string;
      suggestedAction?: string;
      targetTab: ActiveTab;
      targetSection: WorkspaceSection;
    }
  | { kind: "argument-claim"; claimId: string }
  | null;

export function WorkbenchInspector({
  selectedBundle,
  activeTab,
  focusedSection,
  selection,
  onClearSelection,
  onNavigate,
  onExecute,
  isPending,
  displayMode,
}: {
  selectedBundle: ProjectBundle | null;
  activeTab: ActiveTab;
  focusedSection: WorkspaceSection;
  selection: WorkbenchInspectorSelection;
  onClearSelection: () => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  isPending: boolean;
  displayMode: WorkbenchDisplayMode;
}) {
  if (!selectedBundle) {
    return null;
  }

  const tc = selectedBundle.project.thinkCard;
  const sc = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const workflow = buildWorkbenchWorkflow({
    selectedBundle,
    staleArtifacts: [],
    activeTab,
    focusedSection,
  });
  const { activeViewLabel, completedCount, nextAction, steps } = workflow;
  const riskItems = getRiskItems(
    vitality.entries,
    Boolean(tc.materialDigest && tc.verdictReason && tc.hkr.happy && tc.hkr.knowledge && tc.hkr.resonance),
    Boolean(sc.rhythm && sc.breakPattern && sc.knowledgeDrop && sc.personalView && sc.judgement),
  );
  const primaryRisk = riskItems[0] ?? null;
  const selectedDetail = resolveInspectorDetail(selectedBundle, selection, displayMode);

  return (
    <Panel as="aside" className={`status-bar inspector-panel status-bar-${nextAction.tone}`} aria-label="工作台检查器">
      {selectedDetail ? (
        <div className="inspector-selection-card">
          <div className="inspector-selection-head">
            <div>
              <span className="status-bar-label">{selectedDetail.eyebrow}</span>
              <h3>{selectedDetail.title}</h3>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
              清除
            </Button>
          </div>
          <p>{selectedDetail.body}</p>
          {selectedDetail.suggestedAction ? <small>{selectedDetail.suggestedAction}</small> : null}
          <div className="status-bar-meta-group">
            {selectedDetail.chips.map((chip) => (
              <Chip tone={chip.tone ?? "neutral"} key={chip.label}>
                {chip.label}
              </Chip>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inspector-selection-action"
            onClick={() => onNavigate(selectedDetail.targetTab, selectedDetail.targetSection)}
          >
            定位到这里
          </Button>
        </div>
      ) : null}

      <div className="status-bar-top">
        <div className="status-bar-info">
          <div className="status-bar-head">
            <span className="status-bar-label">项目状态</span>
            <span className="status-bar-count">{completedCount}/{steps.length}</span>
          </div>
          <div className="status-bar-progress" aria-label={`流程完成度 ${completedCount}/${steps.length}`}>
            {steps.map((step, index) => (
              <span className={index < completedCount ? "is-complete" : ""} key={step.id} />
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
          {selectedBundle.reviewReport?.argumentQualityFlags?.length ? (
            <Chip tone="warning">论证：{selectedBundle.reviewReport.argumentQualityFlags.length}</Chip>
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

function resolveInspectorDetail(selectedBundle: ProjectBundle, selection: WorkbenchInspectorSelection, displayMode: WorkbenchDisplayMode) {
  if (!selection) {
    return null;
  }

  if (selection.kind === "outline-section") {
    const section = selectedBundle.outlineDraft?.sections.find((item) => item.id === selection.sectionId);
    if (!section) {
      return null;
    }
    const evidenceCount = new Set([...section.evidenceIds, ...section.mustUseEvidenceIds].filter(Boolean)).size;
    return {
      eyebrow: "段落提纲",
      title: section.heading || "未命名段落",
      body: section.sectionThesis || section.purpose || section.singlePurpose || "这段还没有主判断。",
      suggestedAction: section.readerUsefulness ? `读者用途：${section.readerUsefulness}` : undefined,
      targetTab: "structure" as const,
      targetSection: "outline" as const,
      chips: [
        { label: `${evidenceCount} 证据`, tone: evidenceCount > 0 ? "accent" as const : "warning" as const },
        { label: section.mustUseEvidenceIds.length ? `${section.mustUseEvidenceIds.length} 必要证据` : "无必要证据", tone: section.mustUseEvidenceIds.length ? "accent" as const : "neutral" as const },
      ],
    };
  }

  if (selection.kind === "source-card") {
    const sourceCard = selectedBundle.sourceCards.find((card) => card.id === selection.sourceCardId);
    if (!sourceCard) {
      return null;
    }
    return {
      eyebrow: "资料卡",
      title: sourceCard.title || (displayMode === "debug" ? sourceCard.id : "未命名资料卡"),
      body: sourceCard.summary || sourceCard.evidence || "这张资料卡还没有摘要。",
      suggestedAction: sourceCard.intendedSection ? `预期落段：${sourceCard.intendedSection}` : undefined,
      targetTab: "research" as const,
      targetSection: "source-library" as const,
      chips: [
        { label: `${sourceCard.credibility}可信度`, tone: "neutral" as const },
        { label: formatSupportLevel(sourceCard.supportLevel), tone: sourceCard.supportLevel === "high" ? "accent" as const : "neutral" as const },
        { label: sourceCard.zone || "未分区", tone: "neutral" as const },
      ],
    };
  }

  if (selection.kind === "review-issue") {
    return {
      eyebrow: selection.sourceLabel,
      title: selection.title,
      body: selection.reason,
      suggestedAction: selection.suggestedAction,
      targetTab: selection.targetTab,
      targetSection: selection.targetSection,
      chips: [{ label: selection.locationLabel, tone: "warning" as const }],
    };
  }

  const argumentFrame = selectedBundle.outlineDraft?.argumentFrame;
  if (!argumentFrame) {
    return null;
  }
  const claim = argumentFrame.supportingClaims.find((item) => item.id === selection.claimId);
  if (!claim) {
    return null;
  }
  return {
    eyebrow: displayMode === "debug" ? "论证 claim" : "论点",
    title: displayMode === "debug" ? `${claim.role} / ${claim.id}` : claim.role,
    body: claim.claim,
    suggestedAction: claim.shouldNotBecomeSection ? "这条论点不要直接变成独立章节，片区材料只作为证据。" : undefined,
    targetTab: "structure" as const,
    targetSection: "outline" as const,
    chips: [
      { label: `${claim.evidenceIds.length} 参考证据`, tone: claim.evidenceIds.length ? "accent" as const : "neutral" as const },
      { label: `${claim.mustUseEvidenceIds.length} 必要证据`, tone: claim.mustUseEvidenceIds.length ? "accent" as const : "neutral" as const },
      { label: formatArgumentShape(argumentFrame.primaryShape), tone: "neutral" as const },
    ],
  };
}

const argumentShapeLabels: Record<string, string> = {
  judgement_essay: "判断稿",
  misread_correction: "误读纠偏",
  signal_reinterpretation: "信号重释",
  lifecycle_reframe: "生命周期改写",
  asset_tiering: "资产分层",
  mismatch_diagnosis: "错配诊断",
  tradeoff_decision: "取舍决策",
  risk_decomposition: "风险拆解",
  comparison_benchmark: "横向比较",
  planning_reality_check: "规划校验",
  cycle_timing: "周期判断",
  buyer_persona_split: "买家分型",
};

function formatArgumentShape(shape: string) {
  return argumentShapeLabels[shape] ?? shape.replaceAll("_", " ");
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

function formatSupportLevel(level: string) {
  const labels: Record<string, string> = {
    high: "强支撑",
    medium: "中支撑",
    low: "弱支撑",
  };
  return labels[level] ?? level;
}
