"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import type { DesignCardTone, DraftEditorSectionViewModel, DraftEditorViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";
import type { WorkbenchInspectorSelection } from "../WorkbenchInspector";

type DraftVersion = "current" | "edited" | "narrative" | "analysis";
type DraftHeaderAction = {
  id: number;
  kind: "save" | "focus" | "history";
};
type DraftReaderBlock =
  | { id: string; kind: "heading"; level: 1 | 2 | 3; text: string }
  | { id: string; kind: "paragraph"; text: string }
  | { id: string; kind: "divider" };

export function DraftEditorWorkspace({
  model,
  selectedSectionId,
  isPending,
  onNavigate,
  onExecute,
  onSaveEditedDraft,
  headerAction,
  onInform,
  onInspectorSelectionChange,
}: {
  model: DraftEditorViewModel;
  selectedSectionId: string | null;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onSaveEditedDraft: (value: string) => Promise<void>;
  headerAction: DraftHeaderAction | null;
  onInform: (text: string, forcedKind?: "success" | "error" | "info") => void;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  const initialEditorValue = model.editedMarkdown || model.narrativeMarkdown;
  const [draftVersion, setDraftVersion] = useState<DraftVersion>("current");
  const [editorValue, setEditorValue] = useState(initialEditorValue);
  const [focusMode, setFocusMode] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const handledHeaderActionId = useRef<number | null>(null);
  const isDirty = editorValue !== initialEditorValue;
  const selectedSection = useMemo(
    () => model.outlineSections.find((section) => section.id === selectedSectionId) ?? model.outlineSections[0] ?? null,
    [model.outlineSections, selectedSectionId],
  );
  const versionOptions = useMemo(() => getDraftVersionOptions(model), [model]);
  const selectedVersionOption = versionOptions.find((option) => option.id === draftVersion) ?? versionOptions[0];
  const displayedText = formatDraftReaderText(
    draftVersion === "analysis"
      ? model.analysisMarkdown
      : draftVersion === "narrative"
        ? model.narrativeMarkdown
        : draftVersion === "edited"
          ? editorValue
          : model.currentMarkdown,
    model.citationLabels,
  );

  useEffect(() => {
    setEditorValue(initialEditorValue);
  }, [initialEditorValue]);

  useEffect(() => {
    if (selectedSection && selectedSectionId !== selectedSection.id) {
      onInspectorSelectionChange({ kind: "outline-section", sectionId: selectedSection.id });
    }
  }, [onInspectorSelectionChange, selectedSection, selectedSectionId]);

  function selectOutlineSection(sectionId: string) {
    onInspectorSelectionChange({ kind: "outline-section", sectionId });
  }

  const saveDraft = useCallback(async () => {
    await onSaveEditedDraft(editorValue);
  }, [editorValue, onSaveEditedDraft]);

  useEffect(() => {
    if (!headerAction || !model.hasDraft || handledHeaderActionId.current === headerAction.id) {
      return;
    }
    handledHeaderActionId.current = headerAction.id;
    if (headerAction.kind === "history") {
      setHistoryOpen(true);
      return;
    }
    if (headerAction.kind === "focus") {
      setFocusMode((current) => !current);
      onInform(focusMode ? "已退出专注模式。" : "已进入专注模式。", "success");
      return;
    }
    if (draftVersion !== "edited") {
      setDraftVersion("edited");
      onInform("已切到改写版。顶部保存只保存人工改写稿，请编辑后再保存。", "info");
      return;
    }
    if (!isDirty) {
      onInform("当前改写稿没有未保存修改。", "info");
      return;
    }
    void saveDraft();
  }, [draftVersion, focusMode, headerAction, isDirty, model.hasDraft, onInform, saveDraft]);

  return (
    <section className={`redesign-draft-editor ${focusMode ? "is-focus-mode" : ""}`} aria-label="写作编辑器">
      <div className="redesign-draft-hero">
        <div className="redesign-draft-hero-copy">
          <span>正文打磨</span>
          <h2>{model.projectTitle}</h2>
          <p>
            {model.characterCount} 字 · {model.paragraphCount} 段 · {model.citationCount} 处引用
          </p>
        </div>
        <div className="redesign-draft-actions">
          <Button type="button" variant="ghost" onClick={() => setFocusMode((current) => !current)}>
            {focusMode ? "退出专注" : "专注模式"}
          </Button>
          <Button type="button" variant="secondary" disabled={isPending || !model.canGenerateDraft} onClick={() => void onExecute("drafts")}>
            {model.hasDraft ? "重新生成正文" : "生成正文"}
          </Button>
          <Button type="button" variant="primary" disabled={isPending || !model.canReview} onClick={() => void onExecute("review")}>
            运行质量检查
          </Button>
        </div>
      </div>

      <div className="redesign-draft-metrics" aria-label="正文概览">
        <DraftMetric label="正文字符" value={model.characterCount} detail={`${model.paragraphCount} 个段落块`} />
        <DraftMetric label="引用绑定" value={model.citationCount} detail={`${model.sourceCount} 张资料卡`} />
        <DraftMetric
          label="质检状态"
          value={model.vitality.statusLabel}
          detail={model.reviewTotalCount ? `${model.reviewPassCount}/${model.reviewTotalCount} 项通过` : `${model.vitality.issueCount} 个提醒`}
        />
        <DraftMetric
          label="结构提醒"
          value={model.continuityFlagCount + model.rewriteSuggestionCount}
          detail={`${model.continuityFlagCount} 连续性 / ${model.rewriteSuggestionCount} 改写`}
        />
      </div>

      {model.hasDraft ? <DraftBrief model={model} selectedSection={selectedSection} draftVersion={draftVersion} /> : null}

      {!model.hasDraft ? (
        <EmptyState
          title="还没有正文"
          className="workbench-empty-state redesign-draft-empty"
          action={
            <Button type="button" variant="primary" disabled={isPending || !model.canGenerateDraft} onClick={() => void onExecute("drafts")}>
              生成正文
            </Button>
          }
        >
          <p>{model.canGenerateDraft ? "提纲和资料已经就绪，可以生成正文。" : "需要先完成资料、板块建模和提纲。"}</p>
        </EmptyState>
      ) : (
        <div className="redesign-draft-grid">
          <aside className="redesign-draft-outline" aria-label="正文小提纲">
            <div className="redesign-draft-panel-head">
              <span>大纲结构</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("structure", "outline")}>
                回提纲
              </Button>
            </div>
            <div className="redesign-draft-outline-list">
              {model.outlineSections.map((section) => (
                <DraftOutlineButton
                  section={section}
                  selected={section.id === selectedSection?.id}
                  key={section.id}
                  onSelect={() => selectOutlineSection(section.id)}
                />
              ))}
            </div>
          </aside>

          <main className="redesign-draft-canvas" aria-label="正文画布">
            <div className="redesign-draft-canvas-head">
              <div className="redesign-draft-tabs" role="tablist" aria-label="正文版本">
                {versionOptions.map((option) => (
                  <button
                    type="button"
                    role="tab"
                    className={draftVersion === option.id ? "active" : ""}
                    onClick={() => setDraftVersion(option.id)}
                    aria-selected={draftVersion === option.id}
                    key={option.id}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="redesign-draft-save-group">
                {isDirty ? <Chip tone="warning">未保存</Chip> : <Chip tone="success">已同步</Chip>}
                <Button type="button" variant="primary" size="sm" disabled={isPending || !isDirty || draftVersion !== "edited"} onClick={() => void saveDraft()}>
                  保存改写
                </Button>
              </div>
            </div>

            {selectedSection ? (
              <section className={`redesign-draft-current-section redesign-tone-${selectedSection.tone}`} aria-label="当前章节">
                <div>
                  <span>当前章节</span>
                  <strong>
                    {String(selectedSection.index + 1).padStart(2, "0")} · {selectedSection.heading}
                  </strong>
                  <p>{selectedSection.thesis}</p>
                </div>
                <div>
                  <span>{selectedSection.statusLabel}</span>
                  <strong>{selectedSection.evidenceCount}</strong>
                  <small>支撑资料</small>
                </div>
              </section>
            ) : null}

            <div className="redesign-draft-document-meta" aria-label="当前版本信息">
              <span>{selectedVersionOption.detail}</span>
              <span>{selectedVersionOption.characterCount} 字</span>
              <span>{model.citationCount} 处引用已转成资料标题</span>
            </div>

            {draftVersion === "edited" ? (
              <AutoGrowTextarea
                className="redesign-draft-textarea"
                value={editorValue}
                onChange={(event) => setEditorValue(event.target.value)}
                rows={22}
                placeholder="在这里编辑正文。"
              />
            ) : (
              <DraftReader text={displayedText} />
            )}
          </main>
        </div>
      )}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="版本历史"
        description="当前先展示本地项目里已有的正文版本和修改记录；后续可继续接入差异对比。"
        size="md"
        kind="sheet"
      >
        <div className="redesign-draft-history-sheet">
          <div className="redesign-draft-history-grid">
            {versionOptions.map((option) => (
              <button
                type="button"
                className={draftVersion === option.id ? "is-active" : ""}
                key={option.id}
                onClick={() => {
                  setDraftVersion(option.id);
                  setHistoryOpen(false);
                }}
              >
                <span>{option.label}</span>
                <strong>{option.characterCount.toLocaleString("zh-CN")} 字</strong>
                <small>{option.detail}</small>
              </button>
            ))}
          </div>
          {model.feedbackEvents.length ? (
            <section className="redesign-draft-history-events" aria-label="修改记录">
              <strong>修改记录</strong>
              {model.feedbackEvents.slice(0, 6).map((event) => (
                <div key={event.id}>
                  <span>{event.label}</span>
                  <small>{event.sectionHeading}</small>
                </div>
              ))}
            </section>
          ) : (
            <p className="redesign-draft-history-empty">当前还没有独立修改记录。</p>
          )}
        </div>
      </Modal>
    </section>
  );
}

function DraftBrief({
  model,
  selectedSection,
  draftVersion,
}: {
  model: DraftEditorViewModel;
  selectedSection: DraftEditorSectionViewModel | null;
  draftVersion: DraftVersion;
}) {
  return (
    <section className="redesign-draft-brief" aria-label="正文打磨摘要">
      <DraftBriefCard
        label="正文状态"
        title={model.vitality.statusLabel}
        body={`${getDraftVersionLabel(draftVersion)} · ${model.characterCount.toLocaleString("zh-CN")} 字 · ${
          model.citationCount
        } 处引用`}
        tone={model.vitality.tone}
      />
      <DraftBriefCard
        label="当前段落"
        title={selectedSection ? `${String(selectedSection.index + 1).padStart(2, "0")} · ${selectedSection.heading}` : "未选择段落"}
        body={selectedSection?.thesis ?? "从左侧提纲选择一个段落，正文区域会同步定位写作任务。"}
        tone={selectedSection?.tone ?? "accent"}
      />
      <DraftBriefCard label="写作约束" title={model.activeStyle.judgement} body={`节奏：${model.activeStyle.rhythm}。`} tone="accent" />
    </section>
  );
}

function DraftBriefCard({
  label,
  title,
  body,
  tone,
}: {
  label: string;
  title: string;
  body: string;
  tone: DesignCardTone;
}) {
  return (
    <article className={`redesign-draft-brief-card redesign-tone-${tone}`}>
      <span>{label}</span>
      <strong>{title}</strong>
      <p>{body}</p>
    </article>
  );
}

function DraftMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-draft-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function DraftOutlineButton({
  section,
  selected,
  onSelect,
}: {
  section: DraftEditorSectionViewModel;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`redesign-draft-outline-item redesign-tone-${section.tone} ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span>{String(section.index + 1).padStart(2, "0")}</span>
      <strong>{section.heading}</strong>
      <small>{section.thesis}</small>
      <em>
        {section.statusLabel} / {section.evidenceCount} 证据
      </em>
    </button>
  );
}

function DraftReader({ text }: { text: string }) {
  const blocks = parseDraftReaderBlocks(text);

  return (
    <article className="redesign-draft-reader">
      {blocks.map((block) => {
        if (block.kind === "divider") {
          return <hr key={block.id} />;
        }
        if (block.kind === "heading") {
          if (block.level === 1) {
            return <h1 key={block.id}>{block.text}</h1>;
          }
          if (block.level === 2) {
            return <h2 key={block.id}>{block.text}</h2>;
          }
          return <h3 key={block.id}>{block.text}</h3>;
        }
        return <p key={block.id}>{block.text}</p>;
      })}
    </article>
  );
}

function getDraftVersionOptions(model: DraftEditorViewModel): Array<{
  id: DraftVersion;
  label: string;
  detail: string;
  characterCount: number;
}> {
  return [
    {
      id: "current",
      label: "当前稿",
      detail: model.editedMarkdown ? "当前可读稿" : "当前生成稿",
      characterCount: countPlainCharacters(model.currentMarkdown),
    },
    {
      id: "edited",
      label: "改写编辑",
      detail: model.editedMarkdown ? "可编辑改写稿" : "等待人工改写",
      characterCount: countPlainCharacters(model.editedMarkdown || model.narrativeMarkdown),
    },
    {
      id: "narrative",
      label: "成文版",
      detail: "可阅读正文",
      characterCount: countPlainCharacters(model.narrativeMarkdown),
    },
    {
      id: "analysis",
      label: "分析版",
      detail: "生成过程稿",
      characterCount: countPlainCharacters(model.analysisMarkdown),
    },
  ];
}

function getDraftVersionLabel(version: DraftVersion) {
  if (version === "current") {
    return "当前稿";
  }
  if (version === "edited") {
    return "改写编辑";
  }
  if (version === "analysis") {
    return "分析版";
  }
  return "成文版";
}

function parseDraftReaderBlocks(text: string): DraftReaderBlock[] {
  return text
    .split(/\n{2,}/)
    .map((rawBlock, index): DraftReaderBlock | null => {
      const value = rawBlock.trim();
      if (!value) {
        return null;
      }
      if (/^-{3,}$/.test(value)) {
        return { id: `divider-${index}`, kind: "divider" };
      }
      const headingMatch = value.match(/^(#{1,3})\s+(.+)$/);
      if (headingMatch) {
        return {
          id: `heading-${index}`,
          kind: "heading",
          level: Math.min(headingMatch[1].length, 3) as 1 | 2 | 3,
          text: headingMatch[2],
        };
      }
      return { id: `paragraph-${index}`, kind: "paragraph", text: value.replace(/\n+/g, "\n") };
    })
    .filter((block): block is DraftReaderBlock => Boolean(block));
}

function countPlainCharacters(value: string) {
  return value.replace(/\s/g, "").length;
}

function formatDraftReaderText(value: string, citationLabels: DraftEditorViewModel["citationLabels"]) {
  let text = value;
  for (const citation of citationLabels) {
    text = text.replaceAll(`[SC:${citation.id}]`, `〔${citation.label}〕`);
    text = text.replace(new RegExp(`\\b${escapeRegExp(citation.id)}\\b`, "g"), citation.label);
  }
  return text
    .replace(/\[SC:[^\]]+\]/g, "〔资料〕")
    .replaceAll("## ThinkCard", "## 选题判断")
    .replaceAll("## StyleCore", "## 表达策略")
    .replaceAll("HKR-Happy", "情绪收益")
    .replaceAll("HKR-Knowledge", "知识收益")
    .replaceAll("HKR-Resonance", "共鸣收益")
    .replaceAll("value_reassessment", "价值重估")
    .replaceAll("total_judgement", "总体判断")
    .replaceAll("spatial_segmentation", "空间切割")
    .replaceAll("buyer_split", "客群切分")
    .replaceAll("transaction_observation", "交易观察")
    .replaceAll("decision_service", "决策服务")
    .replaceAll("risk_deconstruction", "风险拆解")
    .replaceAll("scene_character", "人物/场景")
    .replaceAll("busy_relocator", "忙碌迁居者")
    .replaceAll("improver_buyer", "改善型买家")
    .replaceAll("risk_aware_reader", "风险敏感读者")
    .replaceAll("local_life_reader", "本地生活读者")
    .replaceAll("**选题值**：strong", "**选题值**：值得开题")
    .replaceAll("**选题值**：rework", "**选题值**：需要重构")
    .replaceAll("**选题值**：weak", "**选题值**：暂缓");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
