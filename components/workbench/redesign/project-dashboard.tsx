"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { DesignCardTone, ProjectDashboardCard, ProjectDashboardViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchNextAction, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";

type DashboardFilter = "all" | "active" | "review" | "done";

const FILTERS: Array<{ id: DashboardFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "active", label: "进行中" },
  { id: "review", label: "待复盘" },
  { id: "done", label: "已完成" },
];

export function ProjectDashboard({
  model,
  nextAction,
  isPending,
  onCreateProject,
  onCocreateTopic,
  onSelectProject,
  onNavigate,
  onExecute,
}: {
  model: ProjectDashboardViewModel;
  nextAction: WorkbenchNextAction;
  isPending: boolean;
  onCreateProject: () => void;
  onCocreateTopic: () => void;
  onSelectProject: (projectId: string) => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const [visibleLimit, setVisibleLimit] = useState(9);
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  const projectCards = useMemo(
    () =>
      model.projectCards.filter((project) => {
        const haystack = [project.title, project.subtitle, project.summary, project.stageLabel].join(" ").toLocaleLowerCase("zh-CN");
        const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
        const matchesFilter =
          filter === "all" ||
          (filter === "active" && project.stageIndex < model.currentStatus.stageTotal) ||
          (filter === "review" && project.stageIndex >= 6 && project.stageIndex < model.currentStatus.stageTotal) ||
          (filter === "done" && project.stageIndex >= model.currentStatus.stageTotal);

        return matchesQuery && matchesFilter;
      }),
    [filter, model.currentStatus.stageTotal, model.projectCards, normalizedQuery],
  );
  const visibleProjectCards = projectCards.slice(0, visibleLimit);
  const hasMoreProjects = visibleProjectCards.length < projectCards.length;

  return (
    <section className="redesign-project-dashboard" aria-label="项目中控台">
      <div className="project-dashboard-head">
        <div>
          <span className="project-dashboard-kicker">项目</span>
          <h2>项目</h2>
          <p>管理你的研究与写作项目，洞察进度、把控资料与结构状态。</p>
        </div>
        <div className="project-dashboard-head-actions">
          <Button type="button" variant="secondary" onClick={onCocreateTopic}>
            选题共创
          </Button>
          <Button type="button" variant="primary" onClick={onCreateProject}>
            新建项目
          </Button>
        </div>
      </div>

      <div className="project-dashboard-toolbar" aria-label="项目筛选">
        <label className="project-dashboard-search">
          <span aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索项目名称、阶段或关键词" aria-label="搜索项目名称、阶段或关键词" />
        </label>
        <div className="project-dashboard-filters" role="group" aria-label="项目状态">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "active" : ""}
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="project-dashboard-layout">
        <div className="project-dashboard-main">
          <CurrentProjectPanel
            model={model}
            nextAction={nextAction}
            isPending={isPending}
            onNavigate={onNavigate}
            onExecute={onExecute}
          />

          <section className="project-card-board" aria-label="全部项目">
            <div className="project-card-board-head">
              <div>
                <h3>全部项目</h3>
                <span>{projectCards.length} / {model.projectCount}</span>
              </div>
              <Chip>{filterLabel(filter)}</Chip>
            </div>

            {projectCards.length > 0 ? (
              <>
                <div className="project-card-grid">
                  {visibleProjectCards.map((project) => (
                    <ProjectGridCard key={project.id} project={project} onSelectProject={onSelectProject} />
                  ))}
                </div>
                {hasMoreProjects ? (
                  <button type="button" className="project-load-more" onClick={() => setVisibleLimit((value) => value + 9)}>
                    加载更多项目
                  </button>
                ) : null}
              </>
            ) : (
              <div className="project-dashboard-empty">
                <strong>没有匹配项目</strong>
                <span>换一个关键词，或切回全部状态。</span>
              </div>
            )}
          </section>
        </div>

        <ProjectDashboardRail
          model={model}
          nextAction={nextAction}
          isPending={isPending}
          onNavigate={onNavigate}
          onExecute={onExecute}
        />
      </div>
    </section>
  );
}

function CurrentProjectPanel({
  model,
  nextAction,
  isPending,
  onNavigate,
  onExecute,
}: {
  model: ProjectDashboardViewModel;
  nextAction: WorkbenchNextAction;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  const currentProject = model.currentProject;

  return (
    <section className={`project-feature-card dashboard-tone-${currentProject.tone}`} aria-label="当前项目">
      <div className={`project-feature-cover project-visual-${getProjectVisualVariant(currentProject)}`} aria-hidden="true">
        <span>{currentProject.stageLabel}</span>
      </div>
      <div className="project-feature-copy">
        <div className="project-feature-title-row">
          <Chip tone={toneToChip(currentProject.tone)}>{currentProject.stageLabel}</Chip>
          <span>{currentProject.updatedAtLabel}</span>
        </div>
        <h3>{currentProject.title}</h3>
        <p>{currentProject.summary}</p>
        <div className="project-feature-progress">
          <div>
            <span>进度</span>
            <strong>{currentProject.progressPercent}%</strong>
          </div>
          <span className="project-progress-track" style={progressStyle(currentProject.progressPercent)}>
            <span />
          </span>
        </div>
        <div className="project-feature-stats" aria-label="当前项目指标">
          <MetricPill label="资料卡" value={`${model.currentStatus.sourceCount}`} />
          <MetricPill label="字数" value={model.currentStatus.draftCharacters.toLocaleString("zh-CN")} />
          <MetricPill label="阶段" value={currentProject.stageLabel} />
        </div>
      </div>
      <div className="project-feature-actions" aria-label="快捷操作">
        <Button type="button" variant="primary" disabled={isPending} onClick={() => handleNextAction({ nextAction, onExecute, onNavigate })}>
          {isPending ? "处理中" : nextAction.ctaLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onNavigate("research", "source-library")}>
          查看资料
        </Button>
        <Button type="button" variant="secondary" onClick={() => onNavigate("publish", "publish-prep")}>
          发布整理
        </Button>
      </div>
    </section>
  );
}

function ProjectDashboardRail({
  model,
  nextAction,
  isPending,
  onNavigate,
  onExecute,
}: {
  model: ProjectDashboardViewModel;
  nextAction: WorkbenchNextAction;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  return (
    <aside className="project-dashboard-rail" aria-label="项目状态">
      <section className={`project-rail-card health-card dashboard-tone-${model.currentStatus.qualityTone}`}>
        <div className="project-rail-head">
          <h3>项目健康度</h3>
          <Chip tone={toneToChip(model.currentStatus.qualityTone)}>{model.currentStatus.qualityLabel}</Chip>
        </div>
        <div className="project-health-gauge" style={scoreStyle(model.currentStatus.qualityScore)} aria-label={`项目健康度 ${model.currentStatus.qualityScore} 分`}>
          <strong>{model.currentStatus.qualityScore}</strong>
          <span>分</span>
        </div>
        <div className="project-health-list">
          {model.healthItems.map((item) => (
            <div className={`project-health-row dashboard-tone-${item.tone}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="project-rail-card">
        <div className="project-rail-head">
          <h3>写作队列</h3>
          <span>{model.queue.activeCount} 个活跃</span>
        </div>
        <div className="project-queue-list">
          <QueueMetric label="运行中" value={model.queue.runningCount} />
          <QueueMetric label="排队中" value={model.queue.queuedCount} />
          <QueueMetric label="总活跃" value={model.queue.activeCount} />
        </div>
      </section>

      <section className="project-rail-card">
        <div className="project-rail-head">
          <h3>下一步</h3>
          <span>{nextAction.targetLabel}</span>
        </div>
        <p className="project-next-copy">{nextAction.reason}</p>
        <Button type="button" variant="primary" disabled={isPending} onClick={() => handleNextAction({ nextAction, onExecute, onNavigate })}>
          {isPending ? "处理中" : nextAction.ctaLabel}
        </Button>
      </section>

      <section className="project-rail-card project-activity-card">
        <div className="project-rail-head">
          <h3>最近动态</h3>
          <span>当前项目</span>
        </div>
        <div className="project-activity-list">
          <ProjectActivityItem title="更新项目状态" detail={model.currentProject.updatedAtLabel} />
          <ProjectActivityItem title={`整理资料卡 ${model.currentStatus.sourceCount} 张`} detail={model.currentStatus.citationCoverageLabel} />
          <ProjectActivityItem title={`形成结构 ${model.currentStatus.outlineSectionCount} 节`} detail={model.currentStatus.vitalityLabel} />
        </div>
      </section>

      <section className="project-rail-card project-due-card">
        <div className="project-rail-head">
          <h3>即将到期任务</h3>
          <span>建议处理</span>
        </div>
        <div className="project-due-list">
          <ProjectDueItem title={nextAction.title} detail={nextAction.targetLabel} urgent />
          <ProjectDueItem title="补齐资料支撑" detail={`${model.currentStatus.sourceCount} 张资料卡`} />
          <ProjectDueItem title="更新发布检查" detail={model.currentStatus.vitalityLabel} />
        </div>
      </section>

      <section className="project-rail-card">
        <div className="project-rail-head">
          <h3>阶段分布</h3>
          <span>{model.projectCount} 个项目</span>
        </div>
        <div className="redesign-stage-distribution">
          {model.stageDistribution.length ? (
            model.stageDistribution.map((item) => (
              <div className="redesign-stage-distribution-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <div className="redesign-stage-distribution-empty">暂无项目</div>
          )}
        </div>
      </section>
    </aside>
  );
}

function ProjectActivityItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="project-activity-item">
      <span aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function ProjectDueItem({ title, detail, urgent = false }: { title: string; detail: string; urgent?: boolean }) {
  return (
    <div className={`project-due-item ${urgent ? "is-urgent" : ""}`}>
      <span aria-hidden="true" />
      <strong>{title}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ProjectGridCard({ project, onSelectProject }: { project: ProjectDashboardCard; onSelectProject: (projectId: string) => void }) {
  return (
    <button
      type="button"
      className={`project-grid-card dashboard-tone-${project.tone} ${project.isSelected ? "is-selected" : ""}`}
      onClick={() => onSelectProject(project.id)}
      aria-pressed={project.isSelected}
    >
      <span className={`project-grid-visual project-visual-${getProjectVisualVariant(project)}`} aria-hidden="true">
        <span>{project.stageLabel}</span>
      </span>
      <span className="project-grid-copy">
        <span className="project-grid-card-head">
          <Chip tone={toneToChip(project.tone)}>{project.stageLabel}</Chip>
          <span>{project.updatedAtLabel}</span>
        </span>
        <strong>{project.title}</strong>
        <small>{project.summary}</small>
        <span className="project-grid-progress">
          <span>{project.progressPercent}%</span>
          <span className="project-progress-track" style={progressStyle(project.progressPercent)}>
            <span />
          </span>
        </span>
      </span>
    </button>
  );
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="project-metric-pill">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="project-queue-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function filterLabel(filter: DashboardFilter) {
  return FILTERS.find((item) => item.id === filter)?.label ?? "全部";
}

function progressStyle(value: number) {
  return { "--progress": `${clampPercent(value)}%` } as CSSProperties;
}

function scoreStyle(value: number) {
  return { "--score": `${clampPercent(value)}%` } as CSSProperties;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getProjectVisualVariant(project: ProjectDashboardCard) {
  const text = `${project.title} ${project.summary} ${project.stageLabel}`;
  if (/桥|虹桥|交通|高架|地铁|站|路/.test(text)) {
    return "transit";
  }
  if (/房|宅|居住|社区|新房|置换/.test(text)) {
    return "residential";
  }
  if (/产业|园区|商务|企业|办公|金融|科创/.test(text)) {
    return "industry";
  }
  if (/浦东|前滩|陆家嘴|上海|城市|板块/.test(text)) {
    return "skyline";
  }
  if (project.tone === "warning") {
    return "review";
  }
  if (project.tone === "success") {
    return "complete";
  }
  return "planning";
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

function toneToChip(tone: DesignCardTone) {
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
