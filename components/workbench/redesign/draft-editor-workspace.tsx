"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import type { DraftEditorSectionViewModel, DraftEditorViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";
import type { WorkbenchInspectorSelection } from "../WorkbenchInspector";

type DraftVersion = "edited" | "narrative" | "analysis";
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
  onInspectorSelectionChange,
}: {
  model: DraftEditorViewModel;
  selectedSectionId: string | null;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onSaveEditedDraft: (value: string) => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}) {
  const initialEditorValue = model.editedMarkdown || model.narrativeMarkdown;
  const [draftVersion, setDraftVersion] = useState<DraftVersion>("narrative");
  const [editorValue, setEditorValue] = useState(initialEditorValue);
  const [focusMode, setFocusMode] = useState(false);
  const isDirty = editorValue !== initialEditorValue;
  const selectedSection = useMemo(
    () => model.outlineSections.find((section) => section.id === selectedSectionId) ?? model.outlineSections[0] ?? null,
    [model.outlineSections, selectedSectionId],
  );
  const versionOptions = useMemo(() => getDraftVersionOptions(model), [model]);
  const selectedVersionOption = versionOptions.find((option) => option.id === draftVersion) ?? versionOptions[0];
  const displayedText = formatDraftReaderText(
    draftVersion === "analysis" ? model.analysisMarkdown : draftVersion === "narrative" ? model.narrativeMarkdown : editorValue,
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

  async function saveDraft() {
    await onSaveEditedDraft(editorValue);
  }

  return (
    <section className={`redesign-draft-editor ${focusMode ? "is-focus-mode" : ""}`} aria-label="写作编辑器">
      <div className="redesign-draft-hero">
        <div className="redesign-draft-hero-copy">
          <span>正文编辑器</span>
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
            运行 VitalityCheck
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
          <DraftContextPanel model={model} selectedSection={selectedSection} onNavigate={onNavigate} />
        </div>
      )}
    </section>
  );
}

function DraftContextPanel({
  model,
  selectedSection,
  onNavigate,
}: {
  model: DraftEditorViewModel;
  selectedSection: DraftEditorSectionViewModel | null;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
}) {
  const visibleIssues = model.reviewIssues.slice(0, 4);
  const feedbackEvents = model.feedbackEvents.slice(0, 3);

  return (
    <aside className="redesign-draft-context" aria-label="写作建议">
      <section className="redesign-draft-style-card">
        <div className="redesign-draft-panel-head">
          <span>StyleCore 建议</span>
          <Chip tone="accent">写作风格</Chip>
        </div>
        <dl>
          <div>
            <dt>判断姿态</dt>
            <dd>{model.activeStyle.judgement}</dd>
          </div>
          <div>
            <dt>节奏</dt>
            <dd>{model.activeStyle.rhythm}</dd>
          </div>
          <div>
            <dt>知识落点</dt>
            <dd>{model.activeStyle.knowledgeDrop}</dd>
          </div>
        </dl>
        <Button type="button" variant="ghost" size="sm" onClick={() => onNavigate("overview", "overview-style-core")}>
          查看 StyleCore
        </Button>
      </section>

      <section className={`redesign-draft-vitality-card redesign-tone-${model.vitality.tone}`}>
        <div className="redesign-draft-panel-head">
          <span>VitalityCheck</span>
          <Chip tone={model.vitality.tone}>{model.vitality.statusLabel}</Chip>
        </div>
        <p>{model.vitality.verdict}</p>
        <strong>{model.vitality.issueCount} 条提醒</strong>
      </section>

      {selectedSection ? (
        <section className={`redesign-draft-section-card redesign-tone-${selectedSection.tone}`}>
          <span>当前段落</span>
          <strong>{selectedSection.heading}</strong>
          <p>{selectedSection.thesis}</p>
          <small>
            {selectedSection.statusLabel} / {selectedSection.evidenceCount} 条证据
          </small>
        </section>
      ) : null}

      <section>
        <div className="redesign-draft-panel-head">
          <span>论证检查</span>
          <Chip tone={visibleIssues.length ? "warning" : "success"}>{visibleIssues.length ? `${visibleIssues.length} 条` : "良好"}</Chip>
        </div>
        {visibleIssues.length ? (
          <div className="redesign-draft-issue-list">
            {visibleIssues.map((issue) => (
              <div className={`redesign-draft-issue redesign-tone-${issue.tone}`} key={issue.id}>
                <strong>{issue.title}</strong>
                <p>{issue.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>当前没有需要优先处理的质检项。</p>
        )}
      </section>

      {feedbackEvents.length ? (
        <section>
          <div className="redesign-draft-panel-head">
            <span>修改记录</span>
            <Chip>{feedbackEvents.length}</Chip>
          </div>
          {feedbackEvents.map((event) => (
            <div className="redesign-draft-feedback-row" key={event.id}>
              <strong>{event.label}</strong>
              <span>{event.sectionHeading}</span>
            </div>
          ))}
        </section>
      ) : null}
    </aside>
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
      id: "edited",
      label: "改写版",
      detail: model.editedMarkdown ? "人工改写稿" : "等待人工改写",
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
  }
  return text.replace(/\[SC:[^\]]+\]/g, "〔资料〕");
}
