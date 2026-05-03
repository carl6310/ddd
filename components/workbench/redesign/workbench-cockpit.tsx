import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { WorkbenchDesignViewModel } from "@/lib/design/view-models";
import type { DesignStageItem } from "@/lib/design/stages";
import type { ActiveTab, WorkbenchNextAction, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";
import { StageNavigation } from "./stage-navigation";

export function WorkbenchCockpit({
  model,
  nextAction,
  isPending,
  onNavigate,
  onExecute,
}: {
  model: WorkbenchDesignViewModel;
  nextAction: WorkbenchNextAction;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  return (
    <section className={`redesign-cockpit redesign-cockpit-${model.healthTone}`} aria-label={model.pageTitle} aria-busy={isPending}>
      <div className="redesign-cockpit-hero">
        <div className="redesign-cockpit-copy">
          <div className="redesign-cockpit-kicker">
            <span>{model.pageTitle}</span>
            <Chip tone={toneToChip(model.healthTone)}>{model.healthLabel}</Chip>
          </div>
          <h2>{model.projectTitle}</h2>
          <p>{model.projectSubtitle || "本地写作项目"}</p>
        </div>
        <div className="redesign-next-action">
          <span>下一步</span>
          <strong>{nextAction.title}</strong>
          <p>{nextAction.reason}</p>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => {
              if (nextAction.executeStep) {
                void onExecute(nextAction.executeStep);
                return;
              }
              onNavigate(nextAction.targetTab, nextAction.targetSection);
            }}
          >
            {isPending ? "处理中" : nextAction.ctaLabel}
          </Button>
        </div>
      </div>

      <StageNavigation
        items={model.stageItems}
        onNavigate={(item: DesignStageItem) => onNavigate(item.targetTab as ActiveTab, item.targetSection as WorkspaceSection)}
      />

      <div className="redesign-metric-grid" aria-label="项目概览">
        {model.metrics.map((metric) => (
          <div className="redesign-metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.detail}</small>
          </div>
        ))}
      </div>

      <div className="redesign-core-grid" aria-label="核心能力">
        {model.coreCards.map((card) => (
          <button
            type="button"
            className={`redesign-core-card redesign-tone-${card.tone}`}
            key={card.id}
            onClick={() => onNavigate(card.targetTab, card.targetSection)}
          >
            <span className="redesign-core-eyebrow">{card.eyebrow}</span>
            <strong>{card.title}</strong>
            <p>{card.body}</p>
            <small>{card.detail}</small>
            <em>{card.statusLabel}</em>
          </button>
        ))}
      </div>

      <div className="redesign-snapshot-grid" aria-label="内容摘要">
        {model.snapshots.map((snapshot) => (
          <button
            type="button"
            className={`redesign-snapshot-card redesign-tone-${snapshot.tone}`}
            key={snapshot.id}
            onClick={() => onNavigate(snapshot.targetTab, snapshot.targetSection)}
          >
            <span>{snapshot.label}</span>
            <strong>{snapshot.value}</strong>
            <p>{snapshot.detail}</p>
          </button>
        ))}
      </div>

      <div className="redesign-cockpit-foot">
        <span>当前阶段：{model.currentStage}</span>
        <span>
          阶段进度：{model.completedStageCount}/{model.totalStageCount}
        </span>
        <span>更新：{model.updatedAtLabel}</span>
        <span>{model.healthDetail}</span>
      </div>
    </section>
  );
}

function toneToChip(tone: WorkbenchDesignViewModel["healthTone"]) {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "stale":
      return "stale";
    case "accent":
      return "accent";
    case "neutral":
    default:
      return "neutral";
  }
}
