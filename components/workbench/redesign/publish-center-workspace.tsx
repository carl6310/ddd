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
  const primaryImageCue = model.imageCues[0] ?? null;

  return (
    <section className="redesign-publish-center" aria-label="发布中心">
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
          <Button type="button" variant="secondary" disabled={isPending || !model.hasDraft} onClick={() => void onRunReview()}>
            运行 VitalityCheck
          </Button>
          <Button type="button" variant="primary" disabled={isPending || !model.canGeneratePublishPrep} onClick={() => void onGeneratePublishPrep()}>
            {model.hasPublishPackage ? "重新整理发布包" : "生成发布整理"}
          </Button>
        </div>
      </div>

      <div className="redesign-publish-metrics" aria-label="发布概览">
        <PublishMetric label="发布状态" value={model.statusLabel} detail={model.gateModeLabel} />
        <PublishMetric label="正文长度" value={articleStats.characterCountLabel} detail={`${articleStats.paragraphCount} 段 / 约 ${articleStats.readMinutes} 分钟`} />
        <PublishMetric label="发布清单" value={`${checklistPassedCount}/${model.checklist.length}`} detail={model.hasReview ? "来自真实检查" : "待检查"} />
        <PublishMetric label="导出形态" value={readyExportCount} detail={`${plannedExportCount} 个规划中`} />
      </div>

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
          <p>发布中心只展示真实项目内容。先完成正文生成，再运行 VitalityCheck 和发布整理。</p>
        </EmptyState>
      ) : (
        <div className="redesign-publish-grid">
          <aside className="redesign-publish-left-stack" aria-label="发布前检查">
            <section className="redesign-publish-detail redesign-publish-checklist" aria-label="发布清单">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>发布前检查</span>
                  <h3>发布清单</h3>
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
                  <h3>文章预览</h3>
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
              qualityItemCount={model.qualityItems.length}
            />

            <section className="redesign-publish-detail redesign-publish-pending" aria-label="待处理事项">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>待处理事项</span>
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
                <p className="redesign-publish-muted">当前没有发布阻塞项。</p>
              )}
            </section>

            <section className="redesign-publish-detail redesign-publish-quality" aria-label="质量门槛">
              <div className="redesign-publish-panel-head">
                <div>
                  <span>质量门槛</span>
                  <h3>检查结果</h3>
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
                  <span>摘要与图位</span>
                  <h3>发布素材</h3>
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
                  <span>标题候选</span>
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
                <p className="redesign-publish-muted">生成发布整理后，这里会显示真实标题候选。</p>
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

type PublishPendingItem = {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
};

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
  qualityItemCount,
}: {
  readiness: PublishReadiness;
  checklistPassedCount: number;
  checklistTotalCount: number;
  gateModeLabel: string;
  qualityItemCount: number;
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
            <span>待处理项</span>
            <strong>{qualityItemCount}</strong>
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
    if (item.tone === "accent") return sum + 3;
    return sum;
  }, 0);
  const issuePenalty = Math.min(rawIssuePenalty, model.hasReview ? 24 : 18);
  const operationalScore = checklistScore + packageScore + reviewScore - issuePenalty;
  const statusBaseline = model.hasReview ? getPublishStatusBaseline(model.statusTone) : model.hasDraft ? 54 : 22;
  const baselinePenalty = Math.min(rawIssuePenalty, model.statusTone === "danger" ? 12 : 8);
  const score = Math.max(0, Math.min(100, Math.round(Math.max(operationalScore, statusBaseline - baselinePenalty))));

  if (score >= 82) return { score, label: "优秀", tone: "success" };
  if (score >= 62) return { score, label: "可发布整理", tone: "accent" };
  if (score >= 40) return { score, label: "待完善", tone: "warning" };
  return { score, label: "有阻塞", tone: "danger" };
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
  const gateItems = qualityItems.map((item) => ({
    id: `quality-${item.id}`,
    title: item.title,
    detail: item.detail,
    tone: item.tone,
  }));

  return [...checklistItems, ...gateItems].slice(0, 4);
}
