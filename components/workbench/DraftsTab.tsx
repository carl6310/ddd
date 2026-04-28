"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectBundle, SourceCard } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InlineTextEdit, InlineTextAreaEdit } from "@/components/ui/inline-edit";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { AccordionCard } from "@/components/ui/accordion-card";
import { DisclosureList, DisclosureRow } from "@/components/ui/disclosure-list";
import { EditableSettingRow, GroupedSettings, SettingRow } from "@/components/ui/editable-setting-row";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, Panel, Surface } from "@/components/ui/surface";
import { canPreparePublish } from "@/lib/workflow";
import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";

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
  focusSection,
}: DraftsTabProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [activeSection, setActiveSection] = useState<DraftsSection>("sector-model");
  const [draftPreviewMode, setDraftPreviewMode] = useState<"analysis" | "narrative">("narrative");
  const hasOutlineDraft = Boolean(selectedBundle.outlineDraft);
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  const exportHref = `/api/projects/${selectedProjectId}/export/markdown`;
  const sourceCards = selectedBundle.sourceCards;
  const sourceCardMap = useMemo(
    () => new Map(sourceCards.map((card) => [card.id, card])),
    [sourceCards],
  );

  const visibleSections = useMemo(() => getVisibleDraftSections(surfaceMode), [surfaceMode]);

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
      setDraftMessage("人工改写稿已保存。VitalityCheck 和发布整理可能需要重生成。");
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
      setDraftMessage("板块建模已保存。提纲、正文、检查和发布整理可能需要重生成。");
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
      setDraftMessage("段落提纲已保存。正文、检查和发布整理可能需要重生成。");
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "保存提纲失败。");
    } finally {
      setIsPending(false);
    }
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
                  发布整理
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
          <div className="document-flow-container outline-stage structure-stage">
            {selectedBundle.outlineDraft ? (
              <>
                <div className="structure-stage-head">
                  <div>
                    <p className="writing-section-label">段落提纲</p>
                    <h3>文章结构</h3>
                  </div>
                  <Button type="button" variant="secondary" size="md" onClick={saveOutlineDraft} disabled={isPending}>
                    保存段落提纲
                  </Button>
                </div>
                {draftMessage ? <p className="subtle structure-stage-message">{draftMessage}</p> : null}

                {selectedBundle.outlineDraft.argumentFrame ? (
                  <ArgumentFrameCard argumentFrame={selectedBundle.outlineDraft.argumentFrame} />
                ) : null}

                <div className="document-block outline-block">
                  <div className="document-block-title">引子</div>
                  <div className="apple-form-group">
                    <label className="apple-form-item">
                      <span>开头钩子</span>
                      <InlineTextAreaEdit value={selectedBundle.outlineDraft.hook} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            hook: val,
                          })
                        } rows={4} />
                    </label>
                  </div>
                </div>

                <div className="document-block outline-block outline-sections-block">
                  <div className="document-block-title">
                    正文段落 <Chip tone="accent">{selectedBundle.outlineDraft.sections.length} 段</Chip>
                  </div>
                  <div className="outline-list stack">
                    {selectedBundle.outlineDraft.sections.map((section, index) => (
                      <AccordionCard
                        title={`段落 ${index + 1}: ${section.heading || "未命名段落"}`}
                        description={buildOutlineSectionDescription(section)}
                        className="outline-item"
                        defaultOpen={index === 0}
                        key={section.id}
                      >
                      <div className="apple-form-group flush">
                      <label className="apple-form-item">
                        <span>段落标题</span>
                        <InlineTextEdit value={section.heading} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, heading: val } : entry,
                              ),
                            })
                          } />
                      </label>
                      <label className="apple-form-item">
                        <span>段落目的</span>
                        <InlineTextAreaEdit value={section.purpose} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, purpose: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>段落主判断</span>
                        <InlineTextAreaEdit value={section.sectionThesis} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sectionThesis: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>唯一动作</span>
                        <InlineTextAreaEdit value={section.singlePurpose} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, singlePurpose: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label className="apple-form-item">
                        <span>必须落地</span>
                        <InlineTextAreaEdit value={section.mustLandDetail} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mustLandDetail: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                    </div>
                      <details className="outline-advanced-fields">
                        <summary>叙事与转折约束</summary>
                        <div className="outline-advanced-grid">
                      <label className="apple-form-item">
                        <span>场景 / 代价</span>
                        <InlineTextAreaEdit value={section.sceneOrCost} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sceneOrCost: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>主线句</span>
                        <InlineTextAreaEdit value={section.mainlineSentence} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mainlineSentence: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>回环目标</span>
                        <InlineTextAreaEdit value={section.callbackTarget} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, callbackTarget: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label className="apple-form-item">
                        <span>微型故事需求</span>
                        <InlineTextAreaEdit value={section.microStoryNeed} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, microStoryNeed: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label className="apple-form-item">
                        <span>发现转折</span>
                        <InlineTextAreaEdit value={section.discoveryTurn} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, discoveryTurn: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label className="apple-form-item">
                        <span>推进动作</span>
                        <InlineTextAreaEdit value={section.move} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, move: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                        </div>
                      </details>
                      <label className="apple-form-item">
                        <span>强约束证据</span>
                        <EvidenceSelector
                          selectedIds={section.mustUseEvidenceIds}
                          sourceCards={sourceCards}
                          sourceCardMap={sourceCardMap}
                          helperText="这几张资料卡必须真的写进正文，不只是备选。"
                          onChange={(nextIds) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mustUseEvidenceIds: nextIds } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="apple-form-item">
                        <span>参考证据</span>
                        <EvidenceSelector
                          selectedIds={section.evidenceIds}
                          sourceCards={sourceCards}
                          sourceCardMap={sourceCardMap}
                          helperText="这些资料卡会参与这段的论证，不一定每张都强制落笔。"
                          onChange={(nextIds) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, evidenceIds: nextIds } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <details className="outline-advanced-fields">
                        <summary>节奏、反证与读者用途</summary>
                        <div className="outline-advanced-grid">
                      <div className="two-column">
                        <label className="apple-form-item">
                        <span>节奏</span>
                        <InlineTextEdit value={section.tone} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, tone: val } : entry,
                                ),
                              })
                            } />
                        </label>
                        <label className="apple-form-item">
                        <span>承接目标</span>
                        <InlineTextEdit value={section.transitionTarget} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, transitionTarget: val } : entry,
                                ),
                              })
                            } />
                        </label>
                        <label className="apple-form-item">
                        <span>打破</span>
                        <InlineTextEdit value={section.break} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, break: val } : entry,
                                ),
                              })
                            } />
                        </label>
                      </div>
                      <label className="apple-form-item">
                        <span>反面理解 / 反证</span>
                        <InlineTextAreaEdit value={section.counterPoint} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, counterPoint: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>对立观点</span>
                        <InlineTextAreaEdit value={section.opposingView} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, opposingView: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label className="apple-form-item">
                        <span>读者用途</span>
                        <InlineTextAreaEdit value={section.readerUsefulness} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, readerUsefulness: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                        </div>
                      </details>
                    </AccordionCard>
                    ))}
                  </div>
                </div>

                <div className="document-block outline-block">
                  <div className="document-block-title">收尾</div>
                  <div className="apple-form-group">
                    <label className="apple-form-item">
                      <span>结尾收束</span>
                      <InlineTextAreaEdit value={selectedBundle.outlineDraft.closing} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            closing: val,
                          })
                        } rows={4} />
                    </label>
                  </div>
                </div>
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
              <h3>发布前整理</h3>
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
                    重新生成发布前整理
                  </Button>
                </div>
              ) : null}
            </div>
            {selectedBundle.publishPackage ? (
              <div className="stack">
                <Card className="publish-command-strip">
                  <div>
                    <strong>发布包已就绪</strong>
                    <p>这里集中处理标题、摘要、配图位和 Markdown 导出；正文改过后先重跑检查，再重新生成发布整理。</p>
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
                title={canPublish ? "可以进入发布整理" : "还不能生成发布整理"}
                action={
                  canPublish ? (
                    <Button variant="primary" size="lg" onClick={() => void generatePublishPrep()} disabled={isPending || !canPublish} type="button">
                      生成发布前整理
                    </Button>
                  ) : (
                    <div className="action-row">
                      <Button type="button" variant="secondary" size="md" onClick={onOpenVitalityCheck} disabled={isPending}>
                        去看发布前检查
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
                  <p>发布整理需要先通过发布前检查。先看阻塞项，修完正文后再重新检查。</p>
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
  onChange,
}: {
  selectedIds: string[];
  sourceCards: SourceCard[];
  sourceCardMap: Map<string, SourceCard>;
  helperText: string;
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
              title={`点击移除：${card.title}`}
            >
              <strong>{card.title}</strong>
              <span>{card.id}</span>
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
                    <strong>{card.title}</strong>
                    <span>{card.id}</span>
                  </div>
                  <p>{card.summary || card.evidence || "这张资料卡还没有摘要。"}</p>
                </div>
              </label>
            );
          })}
        </div>
      </ContainedScrollArea>

      <details className="evidence-picker-advanced">
        <summary>高级模式：直接看内部 ID</summary>
        <AutoGrowTextarea
          value={selectedIds.join("\n")}
          onChange={(event) => onChange(splitLines(event.target.value))}
          rows={4}
        />
      </details>
    </div>
  );
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildOutlineSectionDescription(section: NonNullable<ProjectBundle["outlineDraft"]>["sections"][number]) {
  const brief = (value: string, maxLength = 34) => (value.length > maxLength ? `${value.slice(0, maxLength)}...` : value);
  const summaryItems = [
    section.purpose ? `目的：${brief(section.purpose)}` : "",
    section.sectionThesis ? `主判断：${brief(section.sectionThesis)}` : "",
    section.singlePurpose || section.move ? `动作：${brief(section.singlePurpose || section.move, 28)}` : "",
  ].filter(Boolean);

  return summaryItems.join(" / ") || "这一段还没有补充任务说明。";
}

function ArgumentFrameCard({
  argumentFrame,
}: {
  argumentFrame: NonNullable<NonNullable<ProjectBundle["outlineDraft"]>["argumentFrame"]>;
}) {
  return (
    <div className="document-block outline-block">
      <div className="document-block-title">
        论证骨架 <Chip tone="accent">{argumentFrame.primaryShape}</Chip>
      </div>
      <ul className="compact-list compact-inline-list">
        {argumentFrame.secondaryShapes.length ? (
          <li>
            <strong>辅助形状</strong>
            <span>{argumentFrame.secondaryShapes.join(" / ")}</span>
          </li>
        ) : null}
        <li>
          <strong>核心张力</strong>
          <span>{argumentFrame.centralTension}</span>
        </li>
        <li>
          <strong>回答</strong>
          <span>{argumentFrame.answer}</span>
        </li>
        {argumentFrame.notThis.length ? (
          <li>
            <strong>不要写成</strong>
            <span>{argumentFrame.notThis.join(" / ")}</span>
          </li>
        ) : null}
      </ul>
      {argumentFrame.supportingClaims.length ? (
        <div className="outline-list stack">
          {argumentFrame.supportingClaims.map((claim) => (
            <Card className="outline-item" key={claim.id}>
              <div className="document-block-title">
                {claim.role} <Chip>{claim.id}</Chip>
              </div>
              <p>{claim.claim}</p>
              <ul className="compact-list compact-inline-list">
                {claim.evidenceIds.length ? (
                  <li>
                    <strong>证据</strong>
                    <span>{claim.evidenceIds.join(" / ")}</span>
                  </li>
                ) : null}
                {claim.mustUseEvidenceIds.length ? (
                  <li>
                    <strong>强约束证据</strong>
                    <span>{claim.mustUseEvidenceIds.join(" / ")}</span>
                  </li>
                ) : null}
                {claim.zonesAsEvidence?.length ? (
                  <li>
                    <strong>作为证据的片区</strong>
                    <span>{claim.zonesAsEvidence.join(" / ")}</span>
                  </li>
                ) : null}
                {claim.shouldNotBecomeSection ? (
                  <li>
                    <strong>结构提醒</strong>
                    <span>这条论点不要直接变成独立片区章节。</span>
                  </li>
                ) : null}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
