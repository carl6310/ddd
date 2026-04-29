"use client";

import type { ProjectBundle, ReviewSeverity, VitalityCheckEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/surface";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { buildWorkbenchWorkflow, type ActiveTab, type WorkbenchStepPath, type WorkspaceSection } from "./workflow-state";

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

  return (
    <Panel as="aside" className={`status-bar inspector-panel status-bar-${nextAction.tone}`} aria-label="项目状态面板">
      <div className="status-bar-top">
        <div className="status-bar-info">
          <div className="status-bar-head">
            <span className="status-bar-label">项目状态</span>
            <span className="status-bar-count">{completedCount}/7</span>
          </div>
          <div className="status-bar-progress" aria-label={`流程完成度 ${completedCount}/${steps.length}`}>
            {steps.map((step, index) => (
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
