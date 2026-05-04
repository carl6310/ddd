"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { SourceLibraryCardViewModel, SourceLibraryViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";
import type { WorkbenchInspectorSelection } from "../WorkbenchInspector";

type SourceFilter = "all" | "cited" | "orphan";

export function SourceLibraryWorkspace({
  model,
  selectedSourceCardId,
  isPending,
  onNavigate,
  onExecute,
  onInspectorSelectionChange,
}: {
  model: SourceLibraryViewModel;
  selectedSourceCardId: string | null;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("all");
  const [supportLevel, setSupportLevel] = useState("all");
  const [credibility, setCredibility] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  const visibleCards = useMemo(
    () =>
      model.cards.filter((card) => {
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery) {
          const haystack = [card.title, card.summary, card.evidence, card.zone, card.intendedSection, ...card.tags]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(normalizedQuery)) {
            return false;
          }
        }
        if (zone !== "all" && card.zone !== zone) {
          return false;
        }
        if (supportLevel !== "all" && card.supportLevel !== supportLevel) {
          return false;
        }
        if (credibility !== "all" && card.credibility !== credibility) {
          return false;
        }
        if (sourceFilter === "cited" && !card.isCited) {
          return false;
        }
        if (sourceFilter === "orphan" && !card.isOrphan) {
          return false;
        }
        return true;
      }),
    [credibility, model.cards, query, sourceFilter, supportLevel, zone],
  );
  const selectedVisibleCard = visibleCards.find((card) => card.id === selectedSourceCardId) ?? visibleCards[0] ?? null;
  const sourcePlaceholders = buildSourcePlaceholders(model, Math.max(0, 6 - visibleCards.length));

  useEffect(() => {
    if (!selectedVisibleCard) {
      return;
    }
    if (selectedVisibleCard.id !== selectedSourceCardId) {
      onInspectorSelectionChange({ kind: "source-card", sourceCardId: selectedVisibleCard.id });
    }
  }, [onInspectorSelectionChange, selectedSourceCardId, selectedVisibleCard]);

  return (
    <section className="redesign-source-library" aria-label="研究资料库">
      <div className="redesign-source-hero">
        <div className="redesign-source-hero-copy">
          <span>当前项目</span>
          <h2>资料卡库</h2>
          <p>{model.projectTitle} · 用可读标题、摘要和证据片段管理资料；内部证据 ID 保留在底层。</p>
        </div>
        <div className="redesign-source-actions">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => void onExecute("research-brief")}>
            生成研究清单
          </Button>
          <Button type="button" variant="primary" onClick={() => onNavigate("research", "source-form")}>
            录入资料卡
          </Button>
        </div>
      </div>

      <div className="redesign-source-metrics" aria-label="资料库概览">
        <SourceMetric label="全部资料卡" value={model.totalCount} detail={`${visibleCards.length} 当前可见`} />
        <SourceMetric label="官方来源" value={model.officialSourceCount} detail={`${model.highCredibilityCount} 高可信`} />
        <SourceMetric label="强支撑" value={model.strongSupportCount} detail={`已引用 ${model.citedCount}`} />
        <SourceMetric label="已引用资料" value={model.citedCount} detail={`未接入 ${model.orphanCount}`} />
        <SourceMetric label="引用覆盖" value={model.citationCoverageLabel} detail={`${model.brokenCitationCount} 无效引用`} />
      </div>

      <div className="redesign-source-toolbar">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索标题、摘要、片区、标签"
          aria-label="搜索资料卡"
        />
        <select value={zone} onChange={(event) => setZone(event.target.value)} aria-label="筛选片区">
          <option value="all">全部片区</option>
          {model.zones.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={supportLevel} onChange={(event) => setSupportLevel(event.target.value)} aria-label="筛选支撑强度">
          <option value="all">全部支撑</option>
          {model.supportLevels.map((item) => (
            <option value={item} key={item}>
              {formatSupportLevel(item)}
            </option>
          ))}
        </select>
        <select value={credibility} onChange={(event) => setCredibility(event.target.value)} aria-label="筛选可信度">
          <option value="all">全部可信度</option>
          {model.credibilityLevels.map((item) => (
            <option value={item} key={item}>
              {item}可信度
            </option>
          ))}
        </select>
        <div className="redesign-source-segment" role="group" aria-label="引用状态">
          <button type="button" className={sourceFilter === "all" ? "active" : ""} onClick={() => setSourceFilter("all")}>
            全部
          </button>
          <button type="button" className={sourceFilter === "cited" ? "active" : ""} onClick={() => setSourceFilter("cited")}>
            已引用
          </button>
          <button type="button" className={sourceFilter === "orphan" ? "active" : ""} onClick={() => setSourceFilter("orphan")}>
            未接入正文
          </button>
        </div>
      </div>

      {visibleCards.length ? (
        <div className="redesign-source-main">
          <section className="redesign-source-list-panel" aria-label="资料卡列表">
            <div className="redesign-source-panel-head">
              <div>
                <span>共 {visibleCards.length} 张资料卡</span>
                <h3>{sourceFilter === "orphan" ? "未接入正文" : sourceFilter === "cited" ? "已引用资料" : "全部资料"}</h3>
              </div>
              <Chip tone={selectedVisibleCard ? "accent" : "neutral"}>{selectedVisibleCard ? "已选中资料" : "未选中"}</Chip>
            </div>
            <div className="redesign-source-grid">
              {visibleCards.map((card) => (
                <SourceCardButton
                  card={card}
                  selected={card.id === selectedVisibleCard?.id}
                  key={card.id}
                  onSelect={() => onInspectorSelectionChange({ kind: "source-card", sourceCardId: card.id })}
                />
              ))}
              {sourcePlaceholders.map((placeholder) => (
                <SourcePlaceholderButton
                  key={placeholder.id}
                  placeholder={placeholder}
                  onCreate={() => onNavigate("research", "source-form")}
                />
              ))}
            </div>
          </section>
          <SourceDetailPanel card={selectedVisibleCard} key={selectedVisibleCard?.id ?? "empty-source-detail"} />
        </div>
      ) : (
        <EmptyState
          title={model.totalCount ? "没有匹配资料卡" : "还没有资料卡"}
          className="workbench-empty-state redesign-source-empty"
          action={
            <Button type="button" variant="primary" onClick={() => onNavigate("research", "source-form")}>
              录入资料卡
            </Button>
          }
        >
          <p>{model.totalCount ? "调整搜索或筛选条件。" : "先录入或从链接抓取第一张资料卡。"}</p>
        </EmptyState>
      )}
    </section>
  );
}

function SourceDetailPanel({ card }: { card: SourceLibraryCardViewModel | null }) {
  const [outlineChooserOpen, setOutlineChooserOpen] = useState(false);
  const [notice, setNotice] = useState("");

  if (!card) {
    return null;
  }

  return (
    <aside className="redesign-source-detail" aria-label="资料卡详情">
      <div className="redesign-source-detail-head">
        <span className={`redesign-source-thumb source-visual-${getSourceVisualVariant(card)}`}>{getSourceInitial(card)}</span>
        <div>
          <h3>{card.title}</h3>
          <p>{card.sourceHost} · {card.publishedAtLabel}</p>
        </div>
        <Chip tone={card.isCited ? "success" : card.isOrphan ? "warning" : "neutral"}>
          {card.isCited ? "已引用" : card.isOrphan ? "未接入正文" : "资料卡"}
        </Chip>
      </div>

      <div className="redesign-source-detail-tags">
        <Chip>{card.zone}</Chip>
        <Chip>{formatSupportLevel(card.supportLevel)}</Chip>
        <Chip tone={card.credibility === "高" ? "success" : card.credibility === "低" ? "warning" : "neutral"}>
          {card.credibility}可信
        </Chip>
        {card.tags.slice(0, 3).map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>

      <section className="redesign-source-detail-block">
        <span>关键摘要</span>
        <p>{card.summary || "这张资料卡还没有摘要。"}</p>
      </section>

      <section className="redesign-source-detail-quote">
        <span>高亮引用</span>
        <strong>{card.evidence || "还没有提炼可引用证据片段。"}</strong>
        <small>{card.reliabilityNote || "暂无可靠性说明。"}</small>
      </section>

      <section className="redesign-source-detail-block">
        <span>我的笔记</span>
        <p>{card.rawTextPreview || card.summary || "暂无笔记。"}</p>
      </section>

      <section className="redesign-source-link-row">
        <span>关联章节</span>
        <strong>{card.intendedSection || "未指定"}</strong>
      </section>

      <div className="redesign-source-detail-actions" aria-label="资料卡操作">
        <Button type="button" variant="secondary" size="sm" onClick={() => setOutlineChooserOpen((current) => !current)}>
          加入提纲
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setNotice("单卡提取观点会接入后台任务；当前可用顶部“生成研究清单”做批量整理。")}
        >
          提取观点
        </Button>
        {card.url ? (
          <a className="secondary-button button-size-sm redesign-source-detail-link" href={card.url} target="_blank" rel="noreferrer">
            查看原文
          </a>
        ) : null}
      </div>

      {outlineChooserOpen ? (
        <div className="redesign-source-popover" role="dialog" aria-label="选择加入提纲的位置">
          <strong>选择章节</strong>
          {buildOutlineTargets(card).map((target) => (
            <button
              type="button"
              key={target}
              onClick={() => {
                setOutlineChooserOpen(false);
                setNotice(`已标记为“${target}”的候选资料；正式写入会在提纲资料选择 Sheet 中完成。`);
              }}
            >
              {target}
            </button>
          ))}
        </div>
      ) : null}

      {notice ? <p className="redesign-source-detail-notice">{notice}</p> : null}
    </aside>
  );
}

function buildOutlineTargets(card: SourceLibraryCardViewModel) {
  return Array.from(
    new Set([
      card.intendedSection || "当前选中章节",
      card.zone ? `${card.zone} 相关段落` : "区位与判断段落",
      "待补证据池",
    ]),
  );
}

function SourceMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-source-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function SourceCardButton({
  card,
  selected,
  onSelect,
}: {
  card: SourceLibraryCardViewModel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`redesign-source-card ${selected ? "is-selected" : ""} ${card.isOrphan ? "is-orphan" : ""}`}
      onClick={onSelect}
    >
      <div className="redesign-source-card-top">
        <span className={`redesign-source-thumb source-visual-${getSourceVisualVariant(card)}`}>{getSourceInitial(card)}</span>
        <div>
          <span className="redesign-source-card-title">{card.title}</span>
          <em>{card.sourceHost} · {card.publishedAtLabel}</em>
        </div>
      </div>
      <p>{card.summary}</p>
      <small>{card.evidence}</small>
      <div className="redesign-source-card-meta">
        <Chip>{card.zone}</Chip>
        <Chip tone={card.credibility === "高" ? "success" : card.credibility === "低" ? "warning" : "neutral"}>
          {card.credibility}可信
        </Chip>
        <Chip tone={card.supportLevel === "high" ? "accent" : "neutral"}>{formatSupportLevel(card.supportLevel)}</Chip>
        {card.isCited ? <Chip tone="success">已引用</Chip> : card.isOrphan ? <Chip tone="warning">未接入正文</Chip> : null}
      </div>
      <div className="redesign-source-strength" aria-label={`证据强度 ${getEvidenceStrength(card)}/5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <i className={index < getEvidenceStrength(card) ? "is-active" : ""} key={index} />
        ))}
      </div>
    </button>
  );
}

type SourcePlaceholder = {
  id: string;
  title: string;
  detail: string;
  tag: string;
  tone: "official" | "report" | "transit" | "industry" | "residential";
};

function SourcePlaceholderButton({
  placeholder,
  onCreate,
}: {
  placeholder: SourcePlaceholder;
  onCreate: () => void;
}) {
  return (
    <button type="button" className="redesign-source-card redesign-source-placeholder" onClick={onCreate}>
      <div className="redesign-source-card-top">
        <span className={`redesign-source-thumb source-visual-${placeholder.tone}`} aria-hidden="true">+</span>
        <div>
          <span className="redesign-source-card-title">{placeholder.title}</span>
          <em>待补资料位 · 点击录入</em>
        </div>
      </div>
      <p>{placeholder.detail}</p>
      <small>这不是虚拟资料，只是当前项目还缺少的资料入口。</small>
      <div className="redesign-source-card-meta">
        <Chip tone="warning">待补</Chip>
        <Chip>{placeholder.tag}</Chip>
      </div>
    </button>
  );
}

function buildSourcePlaceholders(model: SourceLibraryViewModel, count: number): SourcePlaceholder[] {
  if (count <= 0) {
    return [];
  }
  const templates: SourcePlaceholder[] = [
    {
      id: "official-planning",
      title: "补一张官方规划资料",
      detail: `${model.projectTitle} 需要一条可核验的规划或政策依据，支撑空间定位和边界判断。`,
      tag: "官方来源",
      tone: "official",
    },
    {
      id: "market-report",
      title: "补一张市场报告资料",
      detail: "补充成交、租赁、供应或价格数据，让判断从感觉进入可比较的证据。",
      tag: "市场报告",
      tone: "report",
    },
    {
      id: "transit-evidence",
      title: "补一张交通区位资料",
      detail: "用轨交、高架、通勤或枢纽数据解释板块价值，不只写概念优势。",
      tag: "交通区位",
      tone: "transit",
    },
    {
      id: "industry-evidence",
      title: "补一张产业生态资料",
      detail: "补充企业、办公、园区或就业信号，判断长期需求是否真实存在。",
      tag: "产业生态",
      tone: "industry",
    },
    {
      id: "residential-evidence",
      title: "补一张居住体验资料",
      detail: "补齐学校、商业、社区成熟度或生活成本，避免只写宏观规划。",
      tag: "居住体验",
      tone: "residential",
    },
  ];
  return templates.slice(0, Math.min(count, templates.length));
}

function getSourceInitial(card: SourceLibraryCardViewModel) {
  if (card.sourceType === "official") {
    return "官";
  }
  if (card.sourceType === "interview") {
    return "访";
  }
  if (card.sourceType === "observation") {
    return "观";
  }
  if (card.sourceType === "commentary") {
    return "评";
  }
  return "媒";
}

function getSourceVisualVariant(card: SourceLibraryCardViewModel) {
  const text = `${card.title} ${card.summary} ${card.tags.join(" ")} ${card.zone}`;
  if (card.sourceType === "official" || /规划|政府|国土|空间|统计|政策/.test(text)) {
    return "official";
  }
  if (/CBRE|报告|研究|白皮书|市场|租赁|商业/.test(text)) {
    return "report";
  }
  if (/交通|高架|地铁|道路|枢纽|虹桥/.test(text)) {
    return "transit";
  }
  if (/产业|园区|企业|商务|办公|金融|科创/.test(text)) {
    return "industry";
  }
  if (/房|宅|居住|社区|新房|置换/.test(text)) {
    return "residential";
  }
  return "media";
}

function getEvidenceStrength(card: SourceLibraryCardViewModel) {
  const supportScore = card.supportLevel === "high" ? 3 : card.supportLevel === "medium" ? 2 : 1;
  const credibilityScore = card.credibility === "高" ? 2 : card.credibility === "中" ? 1 : 0;
  return Math.max(1, Math.min(5, supportScore + credibilityScore));
}

function formatSupportLevel(value: SourceLibraryCardViewModel["supportLevel"]) {
  switch (value) {
    case "high":
      return "强支撑";
    case "medium":
      return "中支撑";
    case "low":
      return "弱支撑";
  }
}
