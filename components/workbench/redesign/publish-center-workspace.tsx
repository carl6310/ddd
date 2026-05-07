"use client";

import type { CSSProperties } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  DesignCardTone,
  PublishCenterChecklistItemViewModel,
  PublishCenterExportOptionViewModel,
  PublishCenterQualityItemViewModel,
  PublishCenterViewModel,
} from "@/lib/design/view-models";
import type { ActiveTab, WorkspaceSection } from "../workflow-state";

export function PublishCenterWorkspace({
  model,
  isPending,
  exportHref,
  onNavigate,
  onRunReview,
  onGeneratePublishPrep,
}: {
  model: PublishCenterViewModel;
  isPending: boolean;
  exportHref: string;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onRunReview: () => Promise<void>;
  onGeneratePublishPrep: () => Promise<void>;
}) {
  const previewText = formatPublishPreviewText(model.previewMarkdown, model.citationLabels);
  const readyExportCount = model.exportOptions.filter((option) => option.state === "ready").length;
  const plannedExportCount = model.exportOptions.filter((option) => option.state === "planned").length;
  const articleStats = buildPublishArticleStats(previewText);
  const checklistPassedCount = model.checklist.filter((item) => item.tone === "success").length;
  const readiness = buildPublishReadiness(model, checklistPassedCount);
  const pendingItems = buildPublishPendingItems(model.checklist, model.qualityItems);
  const blockingQualityItemCount = model.qualityItems.filter(isBlockingPublishQualityItem).length;
  const optionalQualityItemCount = model.qualityItems.length - blockingQualityItemCount;
  const primaryImageCue = model.imageCues[0] ?? null;
  const primaryAction = getPublishPrimaryAction(model);

  return (
    <section className="redesign-publish-center" aria-label="体检发布">
      <div className={`redesign-publish-hero redesign-tone-${model.statusTone}`}>
        <div className="redesign-publish-hero-copy">
          <span>当前项目</span>
          <h2>{model.projectTitle}</h2>
          <p>{model.statusDetail}</p>
        </div>
        <div className="redesign-publish-actions">
          <Chip tone={model.statusTone}>{model.statusLabel}</Chip>
          {model.canExportMarkdown ? (
            <ButtonLink variant="secondary" href={exportHref} target="_blank" rel="noreferrer">
              导出 Markdown
            </ButtonLink>
          ) : null}
          {primaryAction.kind === "review" ? (
            <Button type="button" variant="primary" disabled={isPending || !model.hasDraft} onClick={() => void onRunReview()}>
              {primaryAction.ctaLabel}
            </Button>
          ) : null}
          {primaryAction.kind === "draft" ? (
            <Button type="button" variant="primary" disabled={isPending || !model.hasDraft} onClick={() => onNavigate("drafts", "drafts")}>
              {primaryAction.ctaLabel}
            </Button>
          ) : null}
          {primaryAction.kind === "publish-prep" ? (
            <Button type="button" variant="primary" disabled={isPending || !model.canGeneratePublishPrep} onClick={() => void onGeneratePublishPrep()}>
              {primaryAction.ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="redesign-publish-metrics" aria-label="发布概览">
        <PublishMetric label="发布状态" value={model.statusLabel} detail={model.gateModeLabel} />
        <PublishMetric label="正文长度" value={articleStats.characterCountLabel} detail={`${articleStats.paragraphCount} 段 / 约 ${articleStats.readMinutes} 分钟`} />
        <PublishMetric label="发布清单" value={`${checklistPassedCount}/${model.checklist.length}`} detail={model.hasReview ? "来自真实检查" : "待检查"} />
        <PublishMetric label="导出形态" value={readyExportCount} detail={`${plannedExportCount} 个规划中`} />
      </div>

      {model.hasDraft ? (
        <PublishFlowPanel
          model={model}
          primaryAction={primaryAction}
          readiness={readiness}
          checklistPassedCount={checklistPassedCount}
          checklistTotalCount={model.checklist.length}
          blockingQualityItemCount={blockingQualityItemCount}
          optionalQualityItemCount={optionalQualityItemCount}
          exportHref={exportHref}
          isPending={isPending}
          onNavigate={onNavigate}
          onRunReview={onRunReview}
          onGeneratePublishPrep={onGeneratePublishPrep}
        />
      ) : null}

      {!model.hasDraft ? (
        <EmptyState
          title="还没有正文可发布"
          className="workbench-empty-state redesign-publish-empty"
          action={
            <Button type="button" variant="primary" onClick={() => onNavigate("drafts", "drafts")}>
              去生成正文
            </Button>
          }
        >
          <p>体检发布只展示真实项目内容。先完成正文生成，再运行质量检查和发布包整理。</p>
        </EmptyState>
      ) : (
        <div className="redesign-publish-grid">
          <aside className="redesign-publish-left-stack" aria-label="发布前检查">
            <section className="redesign-publish-detail redesign-publish-checklist" aria-label="体检结果">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>质量检查</span>
                  <h3>体检结果</h3>
                </div>
              </div>
              <div className="redesign-publish-checklist-list">
                {model.checklist.map((item) => (
                  <PublishChecklistItem item={item} key={item.id} />
                ))}
              </div>
              <div className="redesign-publish-progress-row" aria-label={`${checklistPassedCount}/${model.checklist.length} 项完成`}>
                <span>{checklistPassedCount} / {model.checklist.length} 项已完成</span>
                <div className="redesign-publish-progress-track">
                  <i style={{ width: `${Math.round((checklistPassedCount / Math.max(model.checklist.length, 1)) * 100)}%` }} />
                </div>
              </div>
            </section>

            <section className="redesign-publish-detail redesign-publish-binding" aria-label="资料绑定">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>资料绑定</span>
                  <h3>完整度</h3>
                </div>
              </div>
              <div className="redesign-publish-mini-metrics">
                <div className="redesign-publish-mini-metric">
                  <strong>{model.citationLabels.length}</strong>
                  <span>引用资料</span>
                </div>
                <div className="redesign-publish-mini-metric">
                  <strong>{model.imageCues.length}</strong>
                  <span>图位建议</span>
                </div>
                <div className="redesign-publish-mini-metric">
                  <strong>{model.titleOptions.length}</strong>
                  <span>标题候选</span>
                </div>
              </div>
            </section>
          </aside>

          <main className="redesign-publish-main-stack">
            <section className="redesign-publish-preview" aria-label={model.previewLabel}>
              <div className="redesign-publish-panel-head">
                <div>
                  <span>{model.previewLabel}</span>
                  <h3>发布包</h3>
                </div>
                <Chip tone={model.hasPublishPackage ? "success" : "warning"}>
                  {model.hasPublishPackage ? "发布包" : "草稿"}
                </Chip>
              </div>
              <div className="redesign-publish-article-card">
                <div className={`redesign-publish-article-cover${primaryImageCue ? "" : " is-empty"}`}>
                  <span>{primaryImageCue?.placement ?? "封面待绑定"}</span>
                  <strong>{primaryImageCue?.imageType ?? "暂无真实封面素材"}</strong>
                  <p>{primaryImageCue?.brief ?? "当前只展示真实项目内容，不使用模拟配图。"}</p>
                </div>
                <div className="redesign-publish-article-body">
                  <h3>{model.projectTitle}</h3>
                  <p>{model.summary || model.statusDetail}</p>
                  <div className="redesign-publish-stat-row" aria-label="文章统计">
                    <span>{articleStats.characterCountLabel}</span>
                    <span>{articleStats.paragraphCount} 段</span>
                    <span>约 {articleStats.readMinutes} 分钟</span>
                  </div>
                </div>
              </div>
              <pre>{previewText || "还没有可预览正文。"}</pre>
            </section>

            <section className="redesign-publish-command" aria-label="导出版本">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>导出版本</span>
                  <h3>选择格式</h3>
                </div>
              </div>
              <div className="redesign-publish-export-list">
                {model.exportOptions.map((option) => (
                  <PublishExportOption option={option} exportHref={exportHref} key={option.id} />
                ))}
              </div>
            </section>
          </main>

          <aside className="redesign-publish-inspector" aria-label="发布质检">
            <PublishQualityScore
              readiness={readiness}
              checklistPassedCount={checklistPassedCount}
              checklistTotalCount={model.checklist.length}
              gateModeLabel={model.gateModeLabel}
              blockingQualityItemCount={blockingQualityItemCount}
            />

            <section className="redesign-publish-detail redesign-publish-pending" aria-label="待处理事项">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>{pendingItems.length ? "修正文档" : optionalQualityItemCount ? "可继续优化" : "修正文档"}</span>
                  <h3>{pendingItems.length ? "需要关注" : "暂无阻塞"}</h3>
                </div>
              </div>
              {pendingItems.length ? (
                <div className="redesign-publish-quality-list">
                  {pendingItems.map((item) => (
                    <div className={`redesign-publish-pending-item redesign-tone-${item.tone}`} key={item.id}>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="redesign-publish-muted">
                  {optionalQualityItemCount ? `当前没有发布阻塞项，还有 ${optionalQualityItemCount} 个可选润色点。` : "当前没有发布阻塞项。"}
                </p>
              )}
            </section>

            <section className="redesign-publish-detail redesign-publish-quality" aria-label="质量门槛">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>体检结果</span>
                  <h3>必须修 / 建议修 / 可润色</h3>
                </div>
                <Chip tone={model.statusTone}>{model.gateModeLabel}</Chip>
              </div>
              {model.qualityItems.length ? (
                <div className="redesign-publish-quality-list">
                  {model.qualityItems.map((item) => (
                    <PublishQualityItem item={item} key={item.id} />
                  ))}
                </div>
              ) : (
                <p className="redesign-publish-muted">当前没有需要展示的阻塞项或修正项。</p>
              )}
            </section>

            <section className="redesign-publish-detail redesign-publish-summary" aria-label="摘要">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>发布包</span>
                  <h3>摘要与图位</h3>
                </div>
              </div>
              {model.summary ? <p>{model.summary}</p> : <p className="redesign-publish-muted">发布摘要等待整理生成。</p>}
              {model.imageCues.length ? (
                <div className="redesign-publish-image-list">
                  {model.imageCues.map((cue) => (
                    <div className="redesign-publish-image-cue" key={cue.id}>
                      <strong>{cue.placement}</strong>
                      <p>{cue.purpose}</p>
                      <small>{cue.brief}</small>
                      <span>{cue.imageType} / {cue.layout}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="redesign-publish-detail redesign-publish-titles" aria-label="标题候选">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>发布包</span>
                  <h3>{model.titleOptions.length ? `${model.titleOptions.length} 个候选` : "待生成"}</h3>
                </div>
              </div>
              {model.titleOptions.length ? (
                <div className="redesign-publish-title-list">
                  {model.titleOptions.map((option) => (
                    <div className="redesign-publish-title-option" key={option.title}>
                      <strong>{option.title}</strong>
                      <p>{option.rationale}</p>
                      {option.isPrimary ? <Chip tone="accent">主打</Chip> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="redesign-publish-muted">生成发布包后，这里会显示真实标题候选。</p>
              )}
            </section>
          </aside>

          {model.qualityPyramid.length ? (
            <section className="redesign-publish-detail redesign-publish-pyramid" aria-label="质量金字塔">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>质量金字塔</span>
                  <h3>分层评估</h3>
                </div>
              </div>
              <div className="redesign-publish-pyramid-list">
                {model.qualityPyramid.map((layer) => (
                  <div className={`redesign-publish-pyramid-item redesign-tone-${layer.tone}`} key={layer.level}>
                    <span>{layer.level} / {layer.statusLabel}</span>
                    <strong>{layer.title}</strong>
                    <p>{layer.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </section>
  );
}

type PublishReadiness = {
  score: number;
  label: string;
  tone: DesignCardTone;
};

type PublishPrimaryAction = {
  kind: "review" | "draft" | "publish-prep";
  title: string;
  reason: string;
  ctaLabel: string;
};

type PublishPendingItem = {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
};

function PublishFlowPanel({
  model,
  primaryAction,
  readiness,
  checklistPassedCount,
  checklistTotalCount,
  blockingQualityItemCount,
  optionalQualityItemCount,
  exportHref,
  isPending,
  onNavigate,
  onRunReview,
  onGeneratePublishPrep,
}: {
  model: PublishCenterViewModel;
  primaryAction: PublishPrimaryAction;
  readiness: PublishReadiness;
  checklistPassedCount: number;
  checklistTotalCount: number;
  blockingQualityItemCount: number;
  optionalQualityItemCount: number;
  exportHref: string;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onRunReview: () => Promise<void>;
  onGeneratePublishPrep: () => Promise<void>;
}) {
  const reviewTitle = model.hasReview ? "体检已完成" : "等待质量检查";
  const reviewBody = model.hasReview
    ? `${model.canGeneratePublishPrep ? readiness.label : "需回修"} · ${formatPublishIssueSummary(blockingQualityItemCount, optionalQualityItemCount)} · ${checklistPassedCount}/${checklistTotalCount} 项清单完成。`
    : "正文已经进入发布页，先运行体检，再决定回修或整理发布包。";
  const packageTitle = model.hasPublishPackage ? "发布包已整理" : model.canGeneratePublishPrep ? "可以生成发布包" : "等待体检通过";
  const packageBody = model.hasPublishPackage
    ? `${model.titleOptions.length} 个标题候选 · ${model.imageCues.length} 个图位建议 · ${model.summary ? "摘要已生成" : "摘要待补"}。`
    : "发布包会整理标题、摘要、配图建议、最终稿和发布清单。";

  return (
    <section className="redesign-publish-flow-panel" aria-label="体检发布主路径">
      <article className={`redesign-publish-flow-card is-primary redesign-tone-${model.statusTone}`}>
        <span>下一步</span>
        <strong>{primaryAction.title}</strong>
        <p>{primaryAction.reason}</p>
        <div className="redesign-publish-flow-actions">
          <PublishPrimaryActionButton
            primaryAction={primaryAction}
            model={model}
            isPending={isPending}
            onNavigate={onNavigate}
            onRunReview={onRunReview}
            onGeneratePublishPrep={onGeneratePublishPrep}
          />
          {model.canExportMarkdown ? (
            <ButtonLink variant="secondary" size="sm" href={exportHref} target="_blank" rel="noreferrer">
              导出 Markdown
            </ButtonLink>
          ) : null}
        </div>
      </article>
      <article className={`redesign-publish-flow-card redesign-tone-${readiness.tone}`}>
        <span>体检结果</span>
        <strong>{reviewTitle}</strong>
        <p>{reviewBody}</p>
      </article>
      <article className={`redesign-publish-flow-card redesign-tone-${model.hasPublishPackage ? "success" : model.canGeneratePublishPrep ? "accent" : "warning"}`}>
        <span>发布包</span>
        <strong>{packageTitle}</strong>
        <p>{packageBody}</p>
      </article>
    </section>
  );
}

function PublishPrimaryActionButton({
  primaryAction,
  model,
  isPending,
  onNavigate,
  onRunReview,
  onGeneratePublishPrep,
}: {
  primaryAction: PublishPrimaryAction;
  model: PublishCenterViewModel;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onRunReview: () => Promise<void>;
  onGeneratePublishPrep: () => Promise<void>;
}) {
  if (primaryAction.kind === "review") {
    return (
      <Button type="button" variant="primary" size="sm" disabled={isPending || !model.hasDraft} onClick={() => void onRunReview()}>
        {primaryAction.ctaLabel}
      </Button>
    );
  }
  if (primaryAction.kind === "draft") {
    return (
      <Button type="button" variant="primary" size="sm" disabled={isPending || !model.hasDraft} onClick={() => onNavigate("drafts", "drafts")}>
        {primaryAction.ctaLabel}
      </Button>
    );
  }
  return (
    <Button type="button" variant="primary" size="sm" disabled={isPending || !model.canGeneratePublishPrep} onClick={() => void onGeneratePublishPrep()}>
      {primaryAction.ctaLabel}
    </Button>
  );
}

function PublishMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-publish-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function PublishQualityScore({
  readiness,
  checklistPassedCount,
  checklistTotalCount,
  gateModeLabel,
  blockingQualityItemCount,
}: {
  readiness: PublishReadiness;
  checklistPassedCount: number;
  checklistTotalCount: number;
  gateModeLabel: string;
  blockingQualityItemCount: number;
}) {
  const ringStyle = {
    background: `conic-gradient(var(--accent) ${readiness.score * 3.6}deg, rgba(15, 23, 42, 0.08) 0deg)`,
  } satisfies CSSProperties;

  return (
    <section className={`redesign-publish-score-card redesign-tone-${readiness.tone}`} aria-label="发布就绪度">
      <div className="redesign-publish-panel-head">
        <div>
          <span>内容质量评分</span>
          <h3>发布就绪度</h3>
        </div>
        <Chip tone={readiness.tone}>{readiness.label}</Chip>
      </div>
      <div className="redesign-publish-score-body">
        <div className="redesign-publish-score-ring" style={ringStyle}>
          <div>
            <strong>{readiness.score}</strong>
            <span>/100</span>
          </div>
        </div>
        <div className="redesign-publish-score-meta">
          <div>
            <span>清单完成</span>
            <strong>{checklistPassedCount}/{checklistTotalCount}</strong>
          </div>
          <div>
            <span>阻塞/建议</span>
            <strong>{blockingQualityItemCount}</strong>
          </div>
          <div>
            <span>门槛模式</span>
            <strong>{gateModeLabel}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublishExportOption({ option, exportHref }: { option: PublishCenterExportOptionViewModel; exportHref: string }) {
  return (
    <div className={`redesign-publish-export-option redesign-tone-${option.tone}`} data-export-state={option.state}>
      <div>
        <span>{option.statusLabel}</span>
        <strong>{option.label}</strong>
        <p>{option.detail}</p>
      </div>
      {option.state === "ready" ? (
        <ButtonLink variant="primary" size="sm" href={exportHref} target="_blank" rel="noreferrer">
          导出
        </ButtonLink>
      ) : (
        <Button type="button" variant="secondary" size="sm" disabled>
          {option.state === "planned" ? "规划中" : "不可用"}
        </Button>
      )}
    </div>
  );
}

function PublishChecklistItem({ item }: { item: PublishCenterChecklistItemViewModel }) {
  return (
    <div className={`redesign-publish-check-item redesign-tone-${item.tone}`}>
      <span />
      <strong>{item.label}</strong>
    </div>
  );
}

function PublishQualityItem({ item }: { item: PublishCenterQualityItemViewModel }) {
  return (
    <div className={`redesign-publish-quality-item redesign-tone-${item.tone}`}>
      <strong>{item.title}</strong>
      <p>{item.detail}</p>
    </div>
  );
}

function formatPublishPreviewText(value: string, citationLabels: PublishCenterViewModel["citationLabels"]) {
  const labels = new Map(citationLabels.map((item) => [item.id, item.label]));
  return value.replace(/\[SC:([^\]]+)\]/g, (_match, id: string) => `【资料：${labels.get(id) ?? "未匹配资料卡"}】`);
}

function buildPublishArticleStats(value: string) {
  const normalized = value.trim();
  const characterCount = normalized.replace(/\s/g, "").length;
  const paragraphCount = normalized ? normalized.split(/\n{2,}/).filter(Boolean).length : 0;

  return {
    characterCount,
    characterCountLabel: characterCount.toLocaleString("zh-CN"),
    paragraphCount,
    readMinutes: characterCount > 0 ? Math.max(1, Math.ceil(characterCount / 520)) : 0,
  };
}

function buildPublishReadiness(model: PublishCenterViewModel, checklistPassedCount: number): PublishReadiness {
  const checklistTotal = Math.max(model.checklist.length, 1);
  const checklistScore = (checklistPassedCount / checklistTotal) * 46;
  const packageScore = model.hasPublishPackage ? 24 : model.canGeneratePublishPrep ? 18 : 8;
  const reviewScore = model.hasReview ? 18 : 8;
  const rawIssuePenalty = model.qualityItems.reduce((sum, item) => {
    if (item.tone === "danger") return sum + 12;
    if (item.tone === "warning") return sum + 7;
    if (item.tone === "stale") return sum + 5;
    return sum;
  }, 0);
  const issuePenalty = Math.min(rawIssuePenalty, model.hasReview ? 24 : 18);
  const operationalScore = checklistScore + packageScore + reviewScore - issuePenalty;
  const statusBaseline = model.hasReview ? getPublishStatusBaseline(model.statusTone) : model.hasDraft ? 54 : 22;
  const baselinePenalty = Math.min(rawIssuePenalty, model.statusTone === "danger" ? 12 : 8);
  const score = Math.max(0, Math.min(100, Math.round(Math.max(operationalScore, statusBaseline - baselinePenalty))));

  if (model.hasReview && !model.canGeneratePublishPrep) {
    return { score: Math.min(score, 61), label: "需回修", tone: model.statusTone === "danger" ? "danger" : "warning" };
  }
  if (score >= 82) return { score, label: "优秀", tone: "success" };
  if (score >= 62) return { score, label: "可生成发布包", tone: "accent" };
  if (score >= 40) return { score, label: "待完善", tone: "warning" };
  return { score, label: "有阻塞", tone: "danger" };
}

function getPublishPrimaryAction(model: PublishCenterViewModel): PublishPrimaryAction {
  if (!model.hasReview) {
    return {
      kind: "review",
      title: "运行质量检查",
      reason: "正文已有，先做质量检查，再判断是否可以进入发布整理。",
      ctaLabel: "运行体检",
    };
  }
  if (!model.canGeneratePublishPrep) {
    return {
      kind: "draft",
      title: "先回正文打磨",
      reason: "体检还没有过发布门槛，先修掉硬伤，再生成发布包。",
      ctaLabel: "回正文打磨",
    };
  }
  if (!model.hasPublishPackage) {
    return {
      kind: "publish-prep",
      title: "生成发布包",
      reason: "体检已通过，可以整理标题、摘要、配图建议和发布清单。",
      ctaLabel: "生成发布包",
    };
  }
  return {
    kind: "publish-prep",
    title: "继续润色或导出",
    reason: "发布包已经整理完成，可以导出 Markdown，也可以重新整理发布包。",
    ctaLabel: "重新整理发布包",
  };
}

function getPublishStatusBaseline(tone: DesignCardTone) {
  switch (tone) {
    case "success":
      return 86;
    case "accent":
      return 78;
    case "warning":
    case "stale":
      return 72;
    case "danger":
      return 52;
    case "neutral":
    default:
      return 64;
  }
}

function buildPublishPendingItems(
  checklist: PublishCenterChecklistItemViewModel[],
  qualityItems: PublishCenterQualityItemViewModel[],
): PublishPendingItem[] {
  const checklistItems = checklist
    .filter((item) => item.tone !== "success")
    .map((item) => ({
      id: `check-${item.id}`,
      title: item.label,
      detail: "来自发布清单",
      tone: item.tone,
    }));
  const gateItems = qualityItems.filter(isBlockingPublishQualityItem).map((item) => ({
    id: `quality-${item.id}`,
    title: item.title,
    detail: item.detail,
    tone: item.tone,
  }));

  return [...checklistItems, ...gateItems].slice(0, 4);
}

function isBlockingPublishQualityItem(item: PublishCenterQualityItemViewModel) {
  return item.tone === "danger" || item.tone === "warning" || item.tone === "stale";
}

function formatPublishIssueSummary(blockingCount: number, optionalCount: number) {
  if (blockingCount > 0) {
    return `${blockingCount} 个阻塞/建议修`;
  }
  if (optionalCount > 0) {
    return `${optionalCount} 个可选润色点`;
  }
  return "暂无待修项";
}
