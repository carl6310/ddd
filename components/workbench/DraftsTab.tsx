"use client";

import { useEffect, useMemo, useState } from "react";
import type { OutlineSection, ProjectBundle, SourceCard } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InlineTextAreaEdit } from "@/components/ui/inline-edit";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { DisclosureList, DisclosureRow } from "@/components/ui/disclosure-list";
import { EditableSettingRow, GroupedSettings, SettingRow } from "@/components/ui/editable-setting-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, Panel, Surface } from "@/components/ui/surface";
import { canPreparePublish } from "@/lib/workflow";
import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";
import type { WorkbenchInspectorSelection } from "./WorkbenchInspector";
import type { WorkbenchDisplayMode } from "./display-mode";

type DraftsSection = "sector-model" | "outline" | "drafts" | "publish-prep";
type DraftsSurfaceMode = "structure" | "writing" | "publish";
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";

interface DraftsTabProps {
  selectedBundle: ProjectBundle;
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>;
  selectedProjectId: string;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  markArtifactsStale: (artifacts: StaleArtifact[]) => void;
  runProjectStep: (step: WorkbenchStepPath, successMessage: string) => Promise<void>;
  generatePublishPrep: () => Promise<void>;
  surfaceTitle?: string;
  surfaceMode?: DraftsSurfaceMode;
  onOpenVitalityCheck: () => void;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
  displayMode: WorkbenchDisplayMode;
  focusSection: "research-brief" | "source-form" | "source-library" | "sector-model" | "outline" | "drafts" | "publish-prep" | null;
}

export function DraftsTab({
  selectedBundle,
  setSelectedBundle,
  selectedProjectId,
  refreshProjectsAndBundle,
  isPending,
  setIsPending,
  setMessage,
  markArtifactsStale,
  runProjectStep,
  generatePublishPrep,
  surfaceTitle = "写作",
  surfaceMode = "writing",
  onOpenVitalityCheck,
  onInspectorSelectionChange,
  displayMode,
  focusSection,
}: DraftsTabProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [activeSection, setActiveSection] = useState<DraftsSection>("sector-model");
  const [draftPreviewMode, setDraftPreviewMode] = useState<"analysis" | "narrative">("narrative");
  const [selectedOutlineSectionId, setSelectedOutlineSectionId] = useState<string | null>(null);
  const [selectedOutlineFrame, setSelectedOutlineFrame] = useState<"hook" | "closing" | null>(null);
  const [hasUnsavedOutlineChanges, setHasUnsavedOutlineChanges] = useState(false);
  const [outlineSavedAt, setOutlineSavedAt] = useState<Date | null>(selectedBundle.outlineDraft ? new Date() : null);
  const hasOutlineDraft = Boolean(selectedBundle.outlineDraft);
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  const exportHref = `/api/projects/${selectedProjectId}/export/markdown`;
  const sourceCards = selectedBundle.sourceCards;
  const sourceCardMap = useMemo(
    () => new Map(sourceCards.map((card) => [card.id, card])),
    [sourceCards],
  );

  const visibleSections = useMemo(() => getVisibleDraftSections(surfaceMode), [surfaceMode]);
  const outlineSections = useMemo(() => selectedBundle.outlineDraft?.sections ?? [], [selectedBundle.outlineDraft?.sections]);
  const selectedOutlineSectionIndex = outlineSections.findIndex((section) => section.id === selectedOutlineSectionId);
  const selectedOutlineSection = selectedOutlineSectionIndex >= 0 ? outlineSections[selectedOutlineSectionIndex] : outlineSections[0] ?? null;
  const effectiveSelectedOutlineIndex = selectedOutlineSectionIndex >= 0 ? selectedOutlineSectionIndex : selectedOutlineSection ? 0 : -1;

  useEffect(() => {
    if (
      (focusSection === "sector-model" || focusSection === "outline" || focusSection === "drafts" || focusSection === "publish-prep") &&
      visibleSections.includes(focusSection)
    ) {
      setActiveSection(focusSection);
      return;
    }

    if (surfaceMode === "publish") {
      setActiveSection("publish-prep");
    } else if (surfaceMode === "writing") {
      setActiveSection("drafts");
    } else if (hasOutlineDraft) {
      setActiveSection("outline");
    } else {
      setActiveSection("sector-model");
    }
  }, [focusSection, selectedProjectId, hasOutlineDraft, surfaceMode, visibleSections]);

  useEffect(() => {
    if (outlineSections.length === 0) {
      if (selectedOutlineSectionId !== null) {
        setSelectedOutlineSectionId(null);
      }
      return;
    }

    if (!selectedOutlineSectionId || !outlineSections.some((section) => section.id === selectedOutlineSectionId)) {
      setSelectedOutlineSectionId(outlineSections[0].id);
    }
  }, [outlineSections, selectedOutlineSectionId]);

  useEffect(() => {
    if (activeSection !== "outline" || !selectedOutlineSection || selectedOutlineFrame) {
      return;
    }
    onInspectorSelectionChange({ kind: "outline-section", sectionId: selectedOutlineSection.id });
  }, [activeSection, onInspectorSelectionChange, selectedOutlineFrame, selectedOutlineSection]);

  useEffect(() => {
    setHasUnsavedOutlineChanges(false);
    setOutlineSavedAt(hasOutlineDraft ? new Date() : null);
  }, [hasOutlineDraft, selectedProjectId]);

  async function saveEditedDraft(value: string) {
    if (!selectedProjectId) return;

    setIsPending(true);
    try {
      setDraftMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}/drafts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editedMarkdown: value }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存人工改写稿失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["review", "publish-prep"]);
      setDraftMessage("人工改写稿已保存。体检和发布包可能需要重生成。");
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "保存人工改写稿失败。");
    } finally {
      setIsPending(false);
    }
  }

  function handleSaveEditedDraft() {
    const nextEditedMarkdown = selectedBundle.articleDraft?.editedMarkdown || selectedBundle.articleDraft?.narrativeMarkdown || "";
    const events = selectedBundle.articleDraft
      ? classifyEditorialFeedbackEvents({
          projectId: selectedProjectId,
          narrativeMarkdown: selectedBundle.articleDraft.narrativeMarkdown,
          editedMarkdown: nextEditedMarkdown,
        })
      : [];
    if (events.length > 0) {
      setDraftMessage(`检测到 ${events.length} 个编辑反馈事件，保存后可用于后续质量分析。`);
    }
    void saveEditedDraft(nextEditedMarkdown);
  }

  async function saveSectorModel() {
    if (!selectedProjectId || !selectedBundle.sectorModel) return;

    setIsPending(true);
    try {
      setDraftMessage("");
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectorModel: selectedBundle.sectorModel }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存板块建模失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["outline", "drafts", "review", "publish-prep"]);
      setDraftMessage("板块建模已保存。提纲、正文、体检和发布包可能需要重生成。");
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "保存板块建模失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function saveOutlineDraft() {
    if (!selectedProjectId || !selectedBundle.outlineDraft) return;

    setIsPending(true);
    try {
      setDraftMessage("");
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineDraft: selectedBundle.outlineDraft }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存提纲失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["drafts", "review", "publish-prep"]);
      setHasUnsavedOutlineChanges(false);
      setOutlineSavedAt(new Date());
      setDraftMessage("段落提纲已保存。正文、体检和发布包可能需要重生成。");
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "保存提纲失败。");
    } finally {
      setIsPending(false);
    }
  }

  function updateOutlineSection(sectionIndex: number, patch: Partial<OutlineSection>) {
    if (!selectedBundle.outlineDraft || sectionIndex < 0) return;
    updateCurrentOutlineDraft({
      ...selectedBundle.outlineDraft,
      sections: selectedBundle.outlineDraft.sections.map((entry, entryIndex) =>
        entryIndex === sectionIndex ? { ...entry, ...patch } : entry,
      ),
    });
  }

  function updateCurrentOutlineDraft(nextOutlineDraft: NonNullable<ProjectBundle["outlineDraft"]>) {
    setHasUnsavedOutlineChanges(true);
    updateOutlineDraft(setSelectedBundle, nextOutlineDraft);
  }

  function selectOutlineSectionByIndex(sectionIndex: number) {
    const section = outlineSections[sectionIndex];
    if (!section) {
      return;
    }
    setSelectedOutlineSectionId(section.id);
    setSelectedOutlineFrame(null);
    onInspectorSelectionChange({ kind: "outline-section", sectionId: section.id });
  }

  return (
    <>
      <Surface className="stack section-shell">
        <div className="section-shell-compact-head">
          <h2>{surfaceTitle}</h2>
          {visibleSections.length > 1 ? (
            <div className="section-subnav" role="tablist" aria-label={`${surfaceTitle}阶段视图`}>
              {visibleSections.includes("sector-model") ? (
                <button type="button" role="tab" aria-selected={activeSection === "sector-model"} className={`section-subnav-button ${activeSection === "sector-model" ? "active" : ""}`} onClick={() => setActiveSection("sector-model")}>
                  板块建模
                </button>
              ) : null}
              {visibleSections.includes("outline") ? (
                <button type="button" role="tab" aria-selected={activeSection === "outline"} className={`section-subnav-button ${activeSection === "outline" ? "active" : ""}`} onClick={() => setActiveSection("outline")}>
                  段落提纲
                </button>
              ) : null}
              {visibleSections.includes("drafts") ? (
                <button type="button" role="tab" aria-selected={activeSection === "drafts"} className={`section-subnav-button ${activeSection === "drafts" ? "active" : ""}`} onClick={() => setActiveSection("drafts")}>
                  正文编辑
                </button>
              ) : null}
              {visibleSections.includes("publish-prep") ? (
                <button type="button" role="tab" aria-selected={activeSection === "publish-prep"} className={`section-subnav-button ${activeSection === "publish-prep" ? "active" : ""}`} onClick={() => setActiveSection("publish-prep")}>
                  体检发布
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {activeSection === "sector-model" ? (
          <div className="canvas-layout sector-model-stage structure-stage">
            {selectedBundle.sectorModel ? (
              <>
                <div className="canvas-main stack">
                  <div className="structure-stage-head">
                    <div>
                      <p className="writing-section-label">板块建模</p>
                      <h3>宏观判断</h3>
                    </div>
                    <Button type="button" variant="secondary" size="md" onClick={saveSectorModel} disabled={isPending}>
                      保存修改
                    </Button>
                  </div>
                  {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
                  <GroupedSettings className="sector-model-settings" aria-label="宏观判断">
                    <EditableSettingRow
                      label="总判断"
                      value={selectedBundle.sectorModel.summaryJudgement}
                      rows={3}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                          ...selectedBundle.sectorModel!,
                          summaryJudgement: val,
                        })
                      }
                    />
                    <EditableSettingRow
                      label="误解点"
                      value={selectedBundle.sectorModel.misconception}
                      rows={3}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                          ...selectedBundle.sectorModel!,
                          misconception: val,
                        })
                      }
                    />
                    <EditableSettingRow
                      label="空间骨架"
                      value={selectedBundle.sectorModel.spatialBackbone}
                      rows={4}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                          ...selectedBundle.sectorModel!,
                          spatialBackbone: val,
                        })
                      }
                    />
                    <EditableSettingRow
                      label="切割线"
                      value={selectedBundle.sectorModel.cutLines.join("\n")}
                      rows={5}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            cutLines: splitLines(val),
                          })
                        }
                    />
                    <EditableSettingRow
                      label="供地判断"
                      value={selectedBundle.sectorModel.supplyObservation}
                      rows={3}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                          ...selectedBundle.sectorModel!,
                          supplyObservation: val,
                        })
                      }
                    />
                    <EditableSettingRow
                      label="未来变量"
                      value={selectedBundle.sectorModel.futureWatchpoints.join("\n")}
                      rows={5}
                      onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            futureWatchpoints: splitLines(val),
                          })
                        }
                    />
                  </GroupedSettings>
                </div>
                <div className="canvas-inspector stack">
                  <div className="structure-inspector-head">
                    <div>
                      <h3>片区列表</h3>
                      <p>空间分组</p>
                    </div>
                    <Chip tone="accent">{selectedBundle.sectorModel.zones.length}</Chip>
                  </div>
                  <DisclosureList className="sector-zone-list" aria-label="片区列表">
                    {selectedBundle.sectorModel.zones.map((zone, index) => (
                      <DisclosureRow
                        title={zone.name || "未命名片区"}
                        description={zone.label || "未设置标签"}
                        className="sector-zone-row"
                        key={zone.id}
                      >
                        <GroupedSettings className="sector-zone-settings" aria-label={`${zone.name || "未命名片区"}详情`}>
                          <EditableSettingRow
                            label="片区名"
                            value={zone.name}
                            multiline={false}
                            onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, name: val } : entry,
                              ),
                            })
                          }
                          />
                          <EditableSettingRow
                            label="标签"
                            value={zone.label}
                            multiline={false}
                            onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, label: val } : entry,
                              ),
                            })
                          }
                          />
                          <EditableSettingRow
                            label="片区描述"
                            value={zone.description}
                            rows={5}
                            onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, description: val } : entry,
                              ),
                            })
                          }
                          />
                          <SettingRow label="证据资料卡">
                            <EvidenceSelector
                              selectedIds={zone.evidenceIds}
                              sourceCards={sourceCards}
                              sourceCardMap={sourceCardMap}
                              helperText="给这个片区挑几张最能支撑判断的资料卡。"
                              displayMode={displayMode}
                              onChange={(nextIds) =>
                                updateSectorModel(setSelectedBundle, {
                                  ...selectedBundle.sectorModel!,
                                  zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, evidenceIds: nextIds } : entry,
                                  ),
                                })
                              }
                            />
                          </SettingRow>
                        </GroupedSettings>
                      </DisclosureRow>
                    ))}
                  </DisclosureList>
                </div>
              </>
            ) : (
              <EmptyState
                className="workbench-empty-state"
                title="还没有板块建模"
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => void runProjectStep("sector-model", "板块建模已生成。")}
                    disabled={isPending || !selectedBundle.researchBrief || selectedBundle.sourceCards.length === 0}
                  >
                    生成板块建模
                  </Button>
                }
              >
                <p>先完成研究清单并录入资料卡，再生成片区结构和空间判断。</p>
              </EmptyState>
            )}
          </div>
        ) : null}

        {activeSection === "outline" ? (
          <div className="canvas-layout outline-split-stage outline-stage outline-redesign-stage structure-stage">
            {selectedBundle.outlineDraft ? (
              <>
                <div className="canvas-main stack outline-canvas outline-overview-canvas">
                  <div className="outline-overview-head">
                    <div>
                      <p className="writing-section-label">段落提纲</p>
                      <h3>文章结构</h3>
                    </div>
                    <Chip tone="accent">{selectedBundle.outlineDraft.sections.length} 段正文</Chip>
                  </div>
                  {draftMessage ? <p className="subtle structure-stage-message">{draftMessage}</p> : null}

                  {selectedBundle.outlineDraft.argumentFrame ? (
                    <ArgumentFrameCard
                      argumentFrame={selectedBundle.outlineDraft.argumentFrame}
                      onSelectClaim={(claimId) => onInspectorSelectionChange({ kind: "argument-claim", claimId })}
                      displayMode={displayMode}
                    />
                  ) : null}

                  <section className="outline-frame-section">
                    <div className="outline-section-headline">
                      <div>
                        <span>文章开合</span>
                        <strong>引子和收尾只保留可扫读摘要，完整编辑仍可点进文本。</strong>
                      </div>
                    </div>
                    <div className="outline-frame-grid">
                      <OutlineFramePreviewCard
                        label="引子"
                        value={selectedBundle.outlineDraft.hook}
                        placeholder="补一句能把读者带入判断的问题。"
                        isSelected={selectedOutlineFrame === "hook"}
                        onSelect={() => setSelectedOutlineFrame("hook")}
                      />
                      <OutlineFramePreviewCard
                        label="收尾"
                        value={selectedBundle.outlineDraft.closing}
                        placeholder="补一句让读者知道怎么决策的收束。"
                        isSelected={selectedOutlineFrame === "closing"}
                        onSelect={() => setSelectedOutlineFrame("closing")}
                      />
                    </div>
                  </section>

                  <div className="outline-section-list-panel">
                    <div className="outline-section-headline">
                      <div>
                        <span>正文段落</span>
                        <strong>选择一段后，在详情区编辑完整字段。</strong>
                      </div>
                      <Chip tone="accent">{selectedBundle.outlineDraft.sections.length} 段</Chip>
                    </div>
                    <div className="outline-section-card-list" role="list" aria-label="正文段落">
                      {selectedBundle.outlineDraft.sections.map((section, index) => (
                        <OutlineSectionCard
                          key={section.id}
                          section={section}
                          index={index}
                          isSelected={selectedOutlineSection?.id === section.id}
                          supportingClaim={getOutlineSectionClaim(section, selectedBundle.outlineDraft?.argumentFrame ?? null, index)}
                          flags={getOutlineSectionFlags(section, selectedBundle.reviewReport)}
                          onSelect={() => {
                            setSelectedOutlineFrame(null);
                            setSelectedOutlineSectionId(section.id);
                            onInspectorSelectionChange({ kind: "outline-section", sectionId: section.id });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="canvas-inspector outline-section-inspector" aria-label="段落详情编辑">
                  {selectedOutlineFrame ? (
                    <OutlineFrameInspector
                      frame={selectedOutlineFrame}
                      value={selectedOutlineFrame === "hook" ? selectedBundle.outlineDraft.hook : selectedBundle.outlineDraft.closing}
                      isPending={isPending}
                      hasUnsavedChanges={hasUnsavedOutlineChanges}
                      lastSavedAt={outlineSavedAt}
                      onSave={saveOutlineDraft}
                      onBackToSections={() => setSelectedOutlineFrame(null)}
                      onChange={(value) => updateCurrentOutlineDraft({
                        ...selectedBundle.outlineDraft!,
                        [selectedOutlineFrame]: value,
                      })}
                    />
                  ) : (
                    <OutlineSectionInspector
                      section={selectedOutlineSection}
                      sectionIndex={effectiveSelectedOutlineIndex}
                      supportingClaim={selectedOutlineSection ? getOutlineSectionClaim(selectedOutlineSection, selectedBundle.outlineDraft.argumentFrame ?? null, effectiveSelectedOutlineIndex) : null}
                      flags={selectedOutlineSection ? getOutlineSectionFlags(selectedOutlineSection, selectedBundle.reviewReport) : []}
                      sourceCards={sourceCards}
                      sourceCardMap={sourceCardMap}
                      displayMode={displayMode}
                      isPending={isPending}
                      isFirst={effectiveSelectedOutlineIndex <= 0}
                      isLast={effectiveSelectedOutlineIndex >= outlineSections.length - 1}
                      hasUnsavedChanges={hasUnsavedOutlineChanges}
                      lastSavedAt={outlineSavedAt}
                      onSave={saveOutlineDraft}
                      onPrevious={() => selectOutlineSectionByIndex(effectiveSelectedOutlineIndex - 1)}
                      onNext={() => selectOutlineSectionByIndex(effectiveSelectedOutlineIndex + 1)}
                      onChange={(patch) => updateOutlineSection(effectiveSelectedOutlineIndex, patch)}
                    />
                  )}
                </aside>
              </>
            ) : (
              <EmptyState
                className="workbench-empty-state"
                title="还没有段落提纲"
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => void runProjectStep("outline", "提纲已生成。")}
                    disabled={isPending || !selectedBundle.sectorModel}
                  >
                    生成提纲
                  </Button>
                }
              >
                <p>先有板块建模，再把空间判断拆成可执行的段落任务。</p>
              </EmptyState>
            )}
          </div>
        ) : null}

        {activeSection === "drafts" ? (
          <div className="canvas-layout draft-editor-stage draft-image2-stage">
            {selectedBundle.articleDraft ? (
              <>
                <div className="canvas-main draft-image2-main">
                  <div className="draft-editor-head">
                    <div>
                      <p className="writing-section-label">正文编辑</p>
                      <h3>人工改写</h3>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      className="draft-save-button"
                      onClick={handleSaveEditedDraft}
                      disabled={isPending}
                    >
                      保存人工改写稿
                    </Button>
                  </div>
                  {draftMessage ? <p className="draft-save-message">{draftMessage}</p> : null}
                  <label className="apple-form-item draft-editor-field">
                    <span>改写版</span>
                    <InlineTextAreaEdit className="draft-editor-surface" value={selectedBundle.articleDraft.editedMarkdown || selectedBundle.articleDraft.narrativeMarkdown} onChange={(val: string) => setSelectedBundle((current) =>
                          current
                            ? {
                                ...current,
                                articleDraft: {
                                  ...current.articleDraft!,
                                  editedMarkdown: val,
                                },
                              }
                            : current,
                        )
                      } rows={18} />
                  </label>
                </div>
                <div className="canvas-inspector draft-image2-reference">
                  <div className="draft-feedback-brief">
                    <div className="document-block-title">编辑反馈</div>
                    <ul className="draft-feedback-list">
                      {selectedBundle.editorialFeedbackEvents.length > 0 ? (
                        selectedBundle.editorialFeedbackEvents.slice(0, 2).map((event) => (
                          <li key={event.id}>
                            <strong>{getEditorialFeedbackLabel(event.eventType)}</strong>
                            <span>{event.sectionHeading || "未定位段落"}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li>
                            <strong>等待人工改写</strong>
                            <span>保存后会记录你的删改、补证据和收束动作。</span>
                          </li>
                          <li>
                            <strong>参考成文版</strong>
                            <span>右侧只做校对参照，不抢主编辑区。</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                  <section className="draft-preview-pane">
                    <div className="draft-pane-head">
                      <div>
                        <h4>{draftPreviewMode === "analysis" ? "分析版预览" : "成文版预览"}</h4>
                        <p className="subtle">只读参考区</p>
                      </div>
                      <div className="draft-preview-tabs" role="tablist" aria-label="初稿预览版本">
                        <button
                          type="button"
                          role="tab"
                          className={draftPreviewMode === "narrative" ? "active" : ""}
                          onClick={() => setDraftPreviewMode("narrative")}
                          aria-selected={draftPreviewMode === "narrative"}
                        >
                          成文版
                        </button>
                        <button
                          type="button"
                          role="tab"
                          className={draftPreviewMode === "analysis" ? "active" : ""}
                          onClick={() => setDraftPreviewMode("analysis")}
                          aria-selected={draftPreviewMode === "analysis"}
                        >
                          分析版
                        </button>
                      </div>
                    </div>
                    <div className="draft-preview-reader">
                      <pre className="draft-preview-content">{draftPreviewMode === "analysis"
                          ? selectedBundle.articleDraft.analysisMarkdown
                          : selectedBundle.articleDraft.narrativeMarkdown}</pre>
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <EmptyState
                className="workbench-empty-state"
                title="还没有初稿"
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => void runProjectStep("drafts", "双稿初稿已生成。")}
                    disabled={isPending || !selectedBundle.sectorModel || !selectedBundle.outlineDraft || selectedBundle.sourceCards.length === 0}
                  >
                    生成双稿
                  </Button>
                }
              >
                <p>完成板块建模、段落提纲和资料卡后，再生成分析版、成文版和人工改写区。</p>
              </EmptyState>
            )}
          </div>
        ) : null}

        {activeSection === "publish-prep" ? (
          <Panel className="stack section-panel publish-prep-stage">
            <div className="section-panel-header">
              <h3>发布包</h3>
              {selectedBundle.publishPackage ? (
                <div className="action-row publish-action-row">
                  <Chip tone="accent">{selectedBundle.publishPackage.titleOptions.length} 个标题候选</Chip>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => void generatePublishPrep()}
                    disabled={isPending || !canPublish}
                    type="button"
                  >
                    重新生成发布包
                  </Button>
                </div>
              ) : null}
            </div>
            {selectedBundle.publishPackage ? (
              <div className="stack">
                <Card className="publish-command-strip">
                  <div>
                    <strong>发布包已就绪</strong>
                    <p>这里集中处理标题、摘要、配图位和 Markdown 导出；正文改过后先重跑体检，再重新生成发布包。</p>
                  </div>
                  <div className="action-row">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => void runProjectStep("review", "质检报告已更新。")}
                      disabled={isPending || !selectedBundle.articleDraft}
                    >
                      重新检查
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => void generatePublishPrep()} disabled={isPending || !canPublish} type="button">
                      重新整理
                    </Button>
                    <ButtonLink variant="primary" size="lg" className="publish-export-button" href={exportHref} target="_blank" rel="noreferrer">
                      导出 Markdown
                    </ButtonLink>
                  </div>
                </Card>
                {selectedBundle.publishPackage.qualityGate ? (
                  <Card className="publish-detail-card publish-quality-gate-card">
                    <h3>写作质量门槛</h3>
                    <p className="subtle">当前模式：{selectedBundle.publishPackage.qualityGate.mode}，会明确提醒哪一层必须先修。</p>
                    {selectedBundle.publishPackage.qualityGate.mustFix.length > 0 ? (
                      <>
                        <strong>必须先修</strong>
                        <ul className="compact-list">
                          {selectedBundle.publishPackage.qualityGate.mustFix.map((item) => (
                            <li key={item.code}>
                              <span>{item.title}</span>
                              <em>{item.detail}</em>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {selectedBundle.publishPackage.qualityGate.shouldFix.length > 0 ? (
                      <>
                        <strong>建议修正</strong>
                        <ul className="compact-list">
                          {selectedBundle.publishPackage.qualityGate.shouldFix.map((item) => (
                            <li key={item.code}>
                              <span>{item.title}</span>
                              <em>{item.detail}</em>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {selectedBundle.publishPackage.qualityGate.optionalPolish.length > 0 ? (
                      <>
                        <strong>可选润色</strong>
                        <ul className="compact-list">
                          {selectedBundle.publishPackage.qualityGate.optionalPolish.map((item) => (
                            <li key={item.code}>
                              <span>{item.title}</span>
                              <em>{item.detail}</em>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </Card>
                ) : null}
                {selectedBundle.reviewReport?.qualityPyramid?.length ? (
                  <Card className="publish-detail-card">
                    <h3>质量金字塔</h3>
                    <ul className="compact-list">
                      {selectedBundle.reviewReport.qualityPyramid.map((layer) => (
                        <li key={layer.level}>
                          <strong>{layer.level} {layer.title}</strong>
                          <span>{layer.status} · {layer.summary}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ) : null}
                <Card className="publish-detail-card">
                  <h3>标题候选</h3>
                  <ul className="compact-list">
                    {selectedBundle.publishPackage.titleOptions.map((option) => (
                      <li key={option.title}>
                        <strong>{option.title}{option.isPrimary ? "（主打）" : ""}</strong>
                        <span>{option.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="publish-detail-card">
                  <h3>摘要</h3>
                  <p>{selectedBundle.publishPackage.summary}</p>
                </Card>
                <Card className="publish-detail-card">
                  <h3>配图位</h3>
                  <ul className="compact-list">
                    {selectedBundle.publishPackage.imageCues.map((cue) => (
                      <li key={cue.id}>
                        <strong>{cue.placement}</strong>
                        <span>{cue.purpose}</span>
                        <em>{cue.brief}</em>
                        <span>图型：{cue.imageType}</span>
                        <span>布局：{cue.layout}</span>
                        <span>上下文：{cue.context}</span>
                        <span>图注目标：{cue.captionGoal}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <div className="action-row publish-review-action-row">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="publish-review-button"
                    onClick={() => void runProjectStep("review", "已请求全面质量评审。")}
                    disabled={isPending}
                  >
                    请求人工质量评审
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState
                className="workbench-empty-state"
                title={canPublish ? "可以生成发布包" : "还不能生成发布包"}
                action={
                  canPublish ? (
                    <Button variant="primary" size="lg" onClick={() => void generatePublishPrep()} disabled={isPending || !canPublish} type="button">
                      生成发布包
                    </Button>
                  ) : (
                    <div className="action-row">
                      <Button type="button" variant="secondary" size="md" onClick={onOpenVitalityCheck} disabled={isPending}>
                        去看体检结果
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={() => void runProjectStep("review", "质检报告已更新。")}
                        disabled={isPending || !selectedBundle.articleDraft}
                      >
                        重新检查
                      </Button>
                    </div>
                  )
                }
              >
                {canPublish ? (
                  <p>建议先看完质量金字塔和门槛提示，再生成标题、摘要、配图位和导出包。</p>
                ) : (
                  <p>发布包需要先通过发布前体检。先看阻塞项，修完正文后再重新体检。</p>
                )}
              </EmptyState>
            )}
          </Panel>
        ) : null}
      </Surface>
    </>
  );
}

function getVisibleDraftSections(surfaceMode: DraftsSurfaceMode): DraftsSection[] {
  switch (surfaceMode) {
    case "structure":
      return ["sector-model", "outline"];
    case "publish":
      return ["publish-prep"];
    case "writing":
    default:
      return ["drafts"];
  }
}

function getEditorialFeedbackLabel(eventType: ProjectBundle["editorialFeedbackEvents"][number]["eventType"]) {
  switch (eventType) {
    case "delete_fluff":
      return "删掉空话";
    case "add_evidence":
      return "补强证据";
    case "add_cost":
      return "补代价感";
    case "reorder_paragraph":
      return "调整段落";
    case "rewrite_opening":
      return "重写开头";
    case "tighten_ending":
      return "收紧结尾";
    default:
      return "人工改写";
  }
}

function updateSectorModel(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  nextSectorModel: NonNullable<ProjectBundle["sectorModel"]>,
) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          sectorModel: nextSectorModel,
        }
      : current,
  );
}

function updateOutlineDraft(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  nextOutlineDraft: NonNullable<ProjectBundle["outlineDraft"]>,
) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          outlineDraft: nextOutlineDraft,
        }
      : current,
  );
}

function EvidenceSelector({
  selectedIds,
  sourceCards,
  sourceCardMap,
  helperText,
  displayMode,
  onChange,
}: {
  selectedIds: string[];
  sourceCards: SourceCard[];
  sourceCardMap: Map<string, SourceCard>;
  helperText: string;
  displayMode: WorkbenchDisplayMode;
  onChange: (nextIds: string[]) => void;
}) {
  const selectedCards = selectedIds
    .map((id) => sourceCardMap.get(id))
    .filter((card): card is SourceCard => Boolean(card));

  function toggleSourceCard(sourceCardId: string) {
    if (selectedIds.includes(sourceCardId)) {
      onChange(selectedIds.filter((id) => id !== sourceCardId));
      return;
    }
    onChange([...selectedIds, sourceCardId]);
  }

  return (
    <div className="evidence-picker">
      <p className="subtle evidence-picker-help">{helperText}</p>

      {selectedCards.length > 0 ? (
        <div className="evidence-picker-selected">
          {selectedCards.map((card) => (
            <button
              type="button"
              key={card.id}
              className="evidence-pill"
              onClick={() => toggleSourceCard(card.id)}
              title={`点击移除：${card.title || "未命名资料卡"}`}
            >
              <strong>{card.title || "未命名资料卡"}</strong>
              {displayMode === "debug" ? <span>{card.id}</span> : null}
            </button>
          ))}
        </div>
      ) : (
        <p className="subtle evidence-picker-empty">还没选资料卡。下面按标题勾选就行。</p>
      )}

      <ContainedScrollArea className="evidence-picker-list">
        <div className="evidence-picker-card-list">
          {sourceCards.map((card) => {
            const checked = selectedIds.includes(card.id);
            return (
              <label key={card.id} className={`evidence-card ${checked ? "is-selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSourceCard(card.id)}
                />
                <div className="evidence-card-body">
                  <div className="evidence-card-head">
                    <strong>{card.title || "未命名资料卡"}</strong>
                    {displayMode === "debug" ? <span>{card.id}</span> : null}
                  </div>
                  <p>{card.summary || card.evidence || "这张资料卡还没有摘要。"}</p>
                </div>
              </label>
            );
          })}
        </div>
      </ContainedScrollArea>

      {displayMode === "debug" ? (
        <details className="evidence-picker-advanced">
          <summary>高级模式：直接看内部 ID</summary>
          <AutoGrowTextarea
            value={selectedIds.join("\n")}
            onChange={(event) => onChange(splitLines(event.target.value))}
            rows={4}
          />
        </details>
      ) : null}
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

type OutlineSupportingClaim = NonNullable<NonNullable<ProjectBundle["outlineDraft"]>["argumentFrame"]>["supportingClaims"][number];

type OutlineSectionFlagSummary = {
  label: string;
  tone: "danger" | "warning" | "accent";
};

function OutlineFramePreviewCard({
  label,
  value,
  placeholder,
  isSelected,
  onSelect,
}: {
  label: string;
  value: string;
  placeholder: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card className={`outline-frame-preview-card ${isSelected ? "is-selected" : ""}`}>
      <button type="button" className="outline-frame-preview-button" onClick={onSelect} aria-pressed={isSelected}>
        <div className="outline-frame-preview-head">
          <span>{label}</span>
        </div>
        <p>{value || placeholder}</p>
      </button>
    </Card>
  );
}

function OutlineFrameInspector({
  frame,
  value,
  isPending,
  hasUnsavedChanges,
  lastSavedAt,
  onSave,
  onBackToSections,
  onChange,
}: {
  frame: "hook" | "closing";
  value: string;
  isPending: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
  onBackToSections: () => void;
  onChange: (value: string) => void;
}) {
  const label = frame === "hook" ? "引子" : "收尾";
  const hint = frame === "hook" ? "把读者带入核心误解或核心问题。" : "把判断收束到读者可以使用的决策感。";

  return (
    <div className="outline-inspector-stack">
      <div className="outline-inspector-hero">
        <div className="outline-inspector-title-block">
          <p className="writing-section-label">文章开合</p>
          <h3>{label}</h3>
          <div className="outline-inspector-hero-meta">
            <Chip tone="neutral">{hint}</Chip>
          </div>
        </div>
        <SaveStatus
          isPending={isPending}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </div>

      <section className="outline-inspector-group">
        <div className="outline-inspector-group-head">
          <h4>完整文本</h4>
          <p>主画布只展示摘要，这里编辑完整开合句。</p>
        </div>
        <GroupedSettings className="outline-inspector-settings" aria-label={`${label}完整文本`}>
          <EditableSettingRow label={label} value={value} rows={6} onChange={onChange} />
        </GroupedSettings>
      </section>

      <div className="outline-inspector-footer">
        <Button type="button" variant="secondary" size="sm" onClick={onBackToSections}>
          返回正文段落
        </Button>
      </div>
    </div>
  );
}

function SaveStatus({
  isPending,
  hasUnsavedChanges,
  lastSavedAt,
  onSave,
}: {
  isPending: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
}) {
  return (
    <div className="outline-save-status">
      {hasUnsavedChanges ? (
        <Button type="button" variant="secondary" size="sm" onClick={onSave} disabled={isPending}>
          {isPending ? "保存中..." : "保存修改"}
        </Button>
      ) : (
        <span>{lastSavedAt ? `已自动保存 · ${formatSavedTime(lastSavedAt)}` : "已自动保存"}</span>
      )}
    </div>
  );
}

function OutlineSectionCard({
  section,
  index,
  isSelected,
  supportingClaim,
  flags,
  onSelect,
}: {
  section: OutlineSection;
  index: number;
  isSelected: boolean;
  supportingClaim: OutlineSupportingClaim | null;
  flags: OutlineSectionFlagSummary[];
  onSelect: () => void;
}) {
  const evidenceCount = countUnique([...section.evidenceIds, ...section.mustUseEvidenceIds]);
  const summary = section.sectionThesis || section.purpose || section.singlePurpose || "还没有段落主判断。";

  return (
    <article className={`outline-section-card ${isSelected ? "is-selected" : ""}`}>
      <button type="button" className="outline-section-card-button" onClick={onSelect} aria-pressed={isSelected}>
        <div className="outline-section-card-main">
          <span className="outline-section-index">{index + 1}</span>
          <div className="outline-section-copy">
            <h4>{section.heading || "未命名段落"}</h4>
            <p>{briefText(summary, 96)}</p>
            {supportingClaim ? (
              <small>论点：{briefText(supportingClaim.claim, 86)}</small>
            ) : null}
          </div>
        </div>
        <div className="outline-section-meta">
          <Chip tone={evidenceCount > 0 ? "accent" : "warning"}>{evidenceCount} 证据</Chip>
          {flags.slice(0, 3).map((flag) => (
            <Chip tone={flag.tone} key={flag.label}>{flag.label}</Chip>
          ))}
        </div>
      </button>
    </article>
  );
}

function OutlineSectionInspector({
  section,
  sectionIndex,
  supportingClaim,
  flags,
  sourceCards,
  sourceCardMap,
  displayMode,
  isPending,
  isFirst,
  isLast,
  hasUnsavedChanges,
  lastSavedAt,
  onSave,
  onPrevious,
  onNext,
  onChange,
}: {
  section: OutlineSection | null;
  sectionIndex: number;
  supportingClaim: OutlineSupportingClaim | null;
  flags: OutlineSectionFlagSummary[];
  sourceCards: SourceCard[];
  sourceCardMap: Map<string, SourceCard>;
  displayMode: WorkbenchDisplayMode;
  isPending: boolean;
  isFirst: boolean;
  isLast: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onChange: (patch: Partial<OutlineSection>) => void;
}) {
  if (!section) {
    return (
      <EmptyState className="workbench-empty-state" title="未选择段落">
        <p>从左侧选择一个段落后，在这里编辑完整字段。</p>
      </EmptyState>
    );
  }

  return (
    <div className="outline-inspector-stack">
      <div className="outline-inspector-hero">
        <div className="outline-inspector-title-block">
          <p className="writing-section-label">段落 {sectionIndex + 1}</p>
          <h3>{section.heading || "未命名段落"}</h3>
          <div className="outline-inspector-hero-meta">
            <Chip tone={flags.length ? "warning" : "accent"}>{flags.length ? `${flags.length} 个提醒` : "可编辑"}</Chip>
            {supportingClaim ? <Chip tone="neutral">已映射论点</Chip> : null}
          </div>
        </div>
        <SaveStatus
          isPending={isPending}
          hasUnsavedChanges={hasUnsavedChanges}
          lastSavedAt={lastSavedAt}
          onSave={onSave}
        />
      </div>

      {supportingClaim ? (
        <Card className="outline-inspector-summary">
          <span>匹配论点</span>
          <p>{supportingClaim.claim}</p>
        </Card>
      ) : null}

      {flags.length ? (
        <div className="outline-inspector-flags">
          {flags.map((flag) => (
            <Chip tone={flag.tone} key={flag.label}>{flag.label}</Chip>
          ))}
        </div>
      ) : null}

      <section className="outline-inspector-group">
        <div className="outline-inspector-group-head">
          <h4>核心字段</h4>
          <p>先看这一段要完成什么判断，再补落地细节。</p>
        </div>
        <GroupedSettings className="outline-inspector-settings" aria-label="段落核心字段">
          <EditableSettingRow label="段落标题" value={section.heading} multiline={false} onChange={(value) => onChange({ heading: value })} />
          <EditableSettingRow label="段落目的" value={section.purpose} rows={3} onChange={(value) => onChange({ purpose: value })} />
          <EditableSettingRow label="段落主判断" value={section.sectionThesis} rows={4} onChange={(value) => onChange({ sectionThesis: value })} />
          <EditableSettingRow label="唯一动作" value={section.singlePurpose} rows={3} onChange={(value) => onChange({ singlePurpose: value })} />
          <EditableSettingRow label="必须落地" value={section.mustLandDetail} rows={4} onChange={(value) => onChange({ mustLandDetail: value })} />
          <EditableSettingRow label="场景 / 代价" value={section.sceneOrCost} rows={4} onChange={(value) => onChange({ sceneOrCost: value })} />
          <EditableSettingRow label="主线句" value={section.mainlineSentence} rows={4} onChange={(value) => onChange({ mainlineSentence: value })} />
        </GroupedSettings>
      </section>

      <section className="outline-inspector-group">
        <div className="outline-inspector-group-head">
          <h4>证据绑定</h4>
          <p>强约束证据必须写进正文，参考证据只做材料池。</p>
        </div>
        <GroupedSettings className="outline-inspector-settings" aria-label="证据绑定">
          <SettingRow label="强约束证据">
            <EvidenceSelector
              selectedIds={section.mustUseEvidenceIds}
              sourceCards={sourceCards}
              sourceCardMap={sourceCardMap}
              helperText="这几张资料卡必须真的写进正文，不只是备选。"
              displayMode={displayMode}
              onChange={(nextIds) => onChange({ mustUseEvidenceIds: nextIds })}
            />
          </SettingRow>
          <SettingRow label="参考证据">
            <EvidenceSelector
              selectedIds={section.evidenceIds}
              sourceCards={sourceCards}
              sourceCardMap={sourceCardMap}
              helperText="这些资料卡会参与这段的论证，不一定每张都强制落笔。"
              displayMode={displayMode}
              onChange={(nextIds) => onChange({ evidenceIds: nextIds })}
            />
          </SettingRow>
        </GroupedSettings>
      </section>

      <section className="outline-inspector-group">
        <div className="outline-inspector-group-head">
          <h4>反证与读者用途</h4>
          <p>保留反面解释，避免段落只是单向陈述。</p>
        </div>
        <GroupedSettings className="outline-inspector-settings" aria-label="反证与读者用途">
          <EditableSettingRow label="反面理解" value={section.counterPoint} rows={3} onChange={(value) => onChange({ counterPoint: value })} />
          <EditableSettingRow label="对立观点" value={section.opposingView} rows={3} onChange={(value) => onChange({ opposingView: value })} />
          <EditableSettingRow label="读者用途" value={section.readerUsefulness} rows={3} onChange={(value) => onChange({ readerUsefulness: value })} />
        </GroupedSettings>
      </section>

      <details className="outline-inspector-advanced">
        <summary>高级字段</summary>
        <GroupedSettings className="outline-inspector-settings" aria-label="高级字段">
          <EditableSettingRow label="回环目标" value={section.callbackTarget} rows={3} onChange={(value) => onChange({ callbackTarget: value })} />
          <EditableSettingRow label="微型故事需求" value={section.microStoryNeed} rows={3} onChange={(value) => onChange({ microStoryNeed: value })} />
          <EditableSettingRow label="发现转折" value={section.discoveryTurn} rows={3} onChange={(value) => onChange({ discoveryTurn: value })} />
          <EditableSettingRow label="推进动作" value={section.move} rows={3} onChange={(value) => onChange({ move: value })} />
          <EditableSettingRow label="打破" value={section.break} multiline={false} onChange={(value) => onChange({ break: value })} />
          <EditableSettingRow label="桥接" value={section.bridge} rows={3} onChange={(value) => onChange({ bridge: value })} />
          <EditableSettingRow label="承接目标" value={section.transitionTarget} multiline={false} onChange={(value) => onChange({ transitionTarget: value })} />
          <EditableSettingRow label="节奏" value={section.tone} multiline={false} onChange={(value) => onChange({ tone: value })} />
          <EditableSettingRow label="风格目标" value={section.styleObjective} rows={3} onChange={(value) => onChange({ styleObjective: value })} />
          <EditableSettingRow label="要点" value={section.keyPoints.join("\n")} rows={4} onChange={(value) => onChange({ keyPoints: splitLines(value) })} />
          <EditableSettingRow label="读完收获" value={section.expectedTakeaway} rows={3} onChange={(value) => onChange({ expectedTakeaway: value })} />
        </GroupedSettings>
      </details>

      <div className="outline-inspector-footer">
        <Button type="button" variant="secondary" size="sm" onClick={onPrevious} disabled={isFirst}>
          上一段
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onNext} disabled={isLast}>
          下一段
        </Button>
      </div>
    </div>
  );
}

function getOutlineSectionClaim(
  section: OutlineSection,
  argumentFrame: NonNullable<ProjectBundle["outlineDraft"]>["argumentFrame"] | null,
  index: number,
) {
  if (!argumentFrame?.supportingClaims.length) {
    return null;
  }

  const sectionEvidenceIds = new Set([...section.evidenceIds, ...section.mustUseEvidenceIds]);
  const evidenceMatch = argumentFrame.supportingClaims.find((claim) =>
    [...claim.evidenceIds, ...claim.mustUseEvidenceIds].some((evidenceId) => sectionEvidenceIds.has(evidenceId)),
  );
  if (evidenceMatch) {
    return evidenceMatch;
  }

  const text = `${section.heading} ${section.sectionThesis} ${section.purpose}`;
  const textMatch = argumentFrame.supportingClaims.find((claim) => {
    const claimLead = claim.claim.slice(0, 10);
    return Boolean(claimLead && text.includes(claimLead));
  });
  return textMatch ?? argumentFrame.supportingClaims[index] ?? null;
}

function getOutlineSectionFlags(section: OutlineSection, reviewReport: ProjectBundle["reviewReport"]): OutlineSectionFlagSummary[] {
  if (!reviewReport) {
    return [];
  }
  const flags: OutlineSectionFlagSummary[] = [];
  const sectionScore = reviewReport.sectionScores.find((score) => score.heading === section.heading && score.status !== "pass");
  if (sectionScore) {
    flags.push({ label: sectionScore.status === "fail" ? "质检失败" : "质检提醒", tone: sectionScore.status === "fail" ? "danger" : "warning" });
  }
  if (reviewReport.continuityFlags?.some((flag) => flag.sectionIds.includes(section.id))) {
    flags.push({ label: "连续性", tone: "warning" });
  }
  if (reviewReport.argumentQualityFlags?.some((flag) => flag.sectionIds.includes(section.id))) {
    flags.push({ label: "论证", tone: "warning" });
  }
  if (reviewReport.structuralRewriteIntents?.some((intent) => intent.affectedSectionIds.includes(section.id))) {
    flags.push({ label: "需重写", tone: "danger" });
  }
  if (reviewReport.paragraphFlags.some((flag) => flag.sectionHeading === section.heading)) {
    flags.push({ label: "段落", tone: "warning" });
  }
  return dedupeFlags(flags);
}

function dedupeFlags(flags: OutlineSectionFlagSummary[]) {
  const seen = new Set<string>();
  return flags.filter((flag) => {
    if (seen.has(flag.label)) {
      return false;
    }
    seen.add(flag.label);
    return true;
  });
}

function countUnique(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function briefText(value: string, maxLength = 34) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
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

function formatSavedTime(value: Date) {
  return value.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function ArgumentFrameCard({
  argumentFrame,
  onSelectClaim,
  displayMode,
}: {
  argumentFrame: NonNullable<NonNullable<ProjectBundle["outlineDraft"]>["argumentFrame"]>;
  onSelectClaim: (claimId: string) => void;
  displayMode: WorkbenchDisplayMode;
}) {
  const secondaryShapes = argumentFrame.secondaryShapes.map(formatArgumentShape);

  return (
    <Card className="outline-argument-card outline-argument-strip">
      <div className="outline-argument-card-head">
        <div>
          <span className="outline-strip-label">论证骨架</span>
          <Chip tone="accent">{formatArgumentShape(argumentFrame.primaryShape)}</Chip>
        </div>
        {secondaryShapes.length ? <Chip tone="neutral">{secondaryShapes.join(" / ")}</Chip> : null}
      </div>

      <div className="outline-argument-summary-strip">
        <section>
          <span>核心张力</span>
          <p>{argumentFrame.centralTension}</p>
        </section>
        <section>
          <span>回答</span>
          <p>{argumentFrame.answer}</p>
        </section>
        {argumentFrame.notThis.length ? (
          <section className="outline-argument-not-this">
            <span>不要写成</span>
            <div>
              {argumentFrame.notThis.map((item) => (
                <Chip tone="neutral" key={item}>{item}</Chip>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {argumentFrame.supportingClaims.length ? (
        <div className="outline-claim-strip" aria-label="支撑论点">
          {argumentFrame.supportingClaims.map((claim) => (
            <button
              type="button"
              className="outline-claim-chip"
              key={claim.id}
              onClick={() => onSelectClaim(claim.id)}
            >
              <span>{claim.role}</span>
              <strong>{briefText(claim.claim, 42)}</strong>
              {displayMode === "debug" ? <small>{claim.id}</small> : null}
              {claim.shouldNotBecomeSection ? <em>不要独立成章</em> : null}
              {claim.zonesAsEvidence?.length ? <small>{claim.zonesAsEvidence.join(" / ")}</small> : null}
            </button>
          ))}
        </div>
      ) : null}

      {displayMode === "debug" && argumentFrame.supportingClaims.some((claim) => claim.evidenceIds.length || claim.mustUseEvidenceIds.length) ? (
        <details className="outline-argument-debug">
          <summary>调试信息</summary>
          <div className="outline-argument-debug-list">
            {argumentFrame.supportingClaims.map((claim) => (
              <div key={claim.id}>
                <strong>{claim.id}</strong>
                <span>{[...claim.mustUseEvidenceIds, ...claim.evidenceIds].join(" / ") || "未绑定证据"}</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
