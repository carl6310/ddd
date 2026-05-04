import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { DesignCoreCard, DesignSnapshotCard, WorkbenchDesignViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchNextAction, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";

export function WorkbenchWorkspace({
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
  const riskItems = model.risks.length
    ? model.risks
    : [
        {
          id: "no-current-risk",
          label: "状态",
          title: "当前没有明显硬阻塞",
          detail: "可以继续推进下一步，或回到核心能力卡补强判断和表达策略。",
          tone: "success" as const,
          targetTab: "overview" as const,
          targetSection: "workbench-dashboard" as const,
        },
      ];

  return (
    <section className="redesign-workspace" aria-label="工作台主任务区">
      <div className="workbench-stage-strip" aria-label="项目进度">
        <div>
          <span>当前项目</span>
          <strong>{model.projectTitle}</strong>
          <small>{model.updatedAtLabel}</small>
        </div>
        <ol>
          {model.stageItems.map((stage, index) => (
            <li key={stage.stage} className={`stage-status-${stage.status}`}>
              <button type="button" onClick={() => onNavigate(stage.targetTab as ActiveTab, stage.targetSection as WorkspaceSection)}>
                <span>{index + 1}</span>
                <strong>{stage.label}</strong>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <div className="workbench-core-grid" aria-label="核心写作能力">
        {model.coreCards.map((card) => (
          <CoreCard key={card.id} card={card} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="redesign-workspace-grid">
        <section className="workbench-center-board" aria-label="写作现场">
          <div className={`redesign-focus-panel redesign-tone-${model.focus.tone}`}>
            <div className="redesign-focus-copy">
              <span>{model.focus.label}</span>
              <h2>{model.focus.title}</h2>
              <p>{model.focus.body}</p>
              <small>{model.focus.detail}</small>
            </div>
            <div className="redesign-focus-actions">
              <Button type="button" variant="secondary" size="sm" onClick={() => onNavigate("overview", "overview-think-card")}>
                编辑 ThinkCard
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => onNavigate("overview", "overview-style-core")}>
                编辑 StyleCore
              </Button>
            </div>
          </div>

          <div className="workbench-snapshot-grid" aria-label="资料结构正文概览">
            {model.snapshots.map((snapshot) => (
              <SnapshotCard key={snapshot.id} snapshot={snapshot} onNavigate={onNavigate} />
            ))}
          </div>

          <section className="redesign-lane-board" aria-label="生产链路">
            <div className="redesign-section-head">
              <div>
                <span>生产链路</span>
                <h3>从证据到发布的连续推进</h3>
              </div>
            </div>
            <div className="redesign-lane-list">
              {model.lanes.map((lane) => (
                <button
                  type="button"
                  className={`redesign-lane-card redesign-tone-${lane.tone}`}
                  key={lane.id}
                  onClick={() => onNavigate(lane.targetTab as ActiveTab, lane.targetSection as WorkspaceSection)}
                >
                  <span>{lane.title}</span>
                  <strong>{lane.body}</strong>
                  <p>{lane.detail}</p>
                  <em>{lane.statusLabel}</em>
                </button>
              ))}
            </div>
          </section>
        </section>

        <aside className="redesign-action-panel" aria-label="当前行动">
          <div className="redesign-section-head">
            <div>
              <span>下一步</span>
              <h3>{nextAction.title}</h3>
            </div>
            <Chip tone={toneToChip(nextAction.tone)}>{nextAction.targetLabel}</Chip>
          </div>
          <p>{nextAction.reason}</p>
          <Button
            type="button"
            variant="primary"
            disabled={isPending}
            onClick={() => handleNextAction({ nextAction, onExecute, onNavigate })}
          >
            {isPending ? "处理中" : nextAction.ctaLabel}
          </Button>

          <div className="workbench-health-card redesign-tone-accent">
            <span>项目健康度</span>
            <strong>{model.healthLabel}</strong>
            <p>{model.healthDetail}</p>
            <div>
              <small>{model.completedStageCount}/{model.totalStageCount} 步</small>
              <small>{model.projectSubtitle}</small>
            </div>
          </div>

          <div className="redesign-risk-list" aria-label="当前风险">
            {riskItems.map((risk) => (
              <button
                type="button"
                className={`redesign-risk-item redesign-tone-${risk.tone}`}
                key={risk.id}
                onClick={() => onNavigate(risk.targetTab as ActiveTab, risk.targetSection as WorkspaceSection)}
              >
                <span>{risk.label}</span>
                <strong>{risk.title}</strong>
                <small>{risk.detail}</small>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function CoreCard({
  card,
  onNavigate,
}: {
  card: DesignCoreCard;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
}) {
  return (
    <button
      type="button"
      className={`workbench-core-card redesign-tone-${card.tone}`}
      onClick={() => onNavigate(card.targetTab, card.targetSection)}
    >
      <span>{card.eyebrow}</span>
      <strong>{card.title}</strong>
      <p>{card.body}</p>
      <small>{card.statusLabel}</small>
    </button>
  );
}

function SnapshotCard({
  snapshot,
  onNavigate,
}: {
  snapshot: DesignSnapshotCard;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
}) {
  return (
    <button
      type="button"
      className={`workbench-snapshot-card redesign-tone-${snapshot.tone}`}
      onClick={() => onNavigate(snapshot.targetTab, snapshot.targetSection)}
    >
      <span>{snapshot.label}</span>
      <strong>{snapshot.value}</strong>
      <small>{snapshot.detail}</small>
    </button>
  );
}

function handleNextAction({
  nextAction,
  onExecute,
  onNavigate,
}: {
  nextAction: WorkbenchNextAction;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
}) {
  if (nextAction.executeStep) {
    void onExecute(nextAction.executeStep);
    return;
  }
  onNavigate(nextAction.targetTab, nextAction.targetSection);
}

function toneToChip(tone: WorkbenchNextAction["tone"]) {
  switch (tone) {
    case "pass":
      return "success";
    case "fail":
      return "danger";
    case "warn":
    default:
      return "warning";
  }
}
