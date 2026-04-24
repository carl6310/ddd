"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectBundle, SourceCard } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button, ButtonLink } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { InlineTextEdit, InlineTextAreaEdit } from "@/components/ui/inline-edit";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { AccordionCard } from "@/components/ui/accordion-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, Panel, Surface } from "@/components/ui/surface";
import { canPreparePublish } from "@/lib/workflow";
import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";

type DraftsSection = "sector-model" | "outline" | "drafts" | "publish-prep";
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
  onOpenVitalityCheck,
  focusSection,
}: DraftsTabProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [activeSection, setActiveSection] = useState<DraftsSection>("sector-model");
  const [draftPreviewMode, setDraftPreviewMode] = useState<"analysis" | "narrative">("narrative");
  const hasPublishPackage = Boolean(selectedBundle.publishPackage);
  const hasArticleDraft = Boolean(selectedBundle.articleDraft);
  const hasOutlineDraft = Boolean(selectedBundle.outlineDraft);
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);
  const exportHref = `/api/projects/${selectedProjectId}/export/markdown`;
  const sourceCards = selectedBundle.sourceCards;
  const sourceCardMap = useMemo(
    () => new Map(sourceCards.map((card) => [card.id, card])),
    [sourceCards],
  );

  useEffect(() => {
    if (focusSection === "sector-model" || focusSection === "outline" || focusSection === "drafts" || focusSection === "publish-prep") {
      setActiveSection(focusSection);
      return;
    }
    if (hasPublishPackage) {
      setActiveSection("publish-prep");
    } else if (hasArticleDraft) {
      setActiveSection("drafts");
    } else if (hasOutlineDraft) {
      setActiveSection("outline");
    } else {
      setActiveSection("sector-model");
    }
  }, [focusSection, selectedProjectId, hasPublishPackage, hasArticleDraft, hasOutlineDraft]);

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
          <div className="section-subnav" role="tablist" aria-label={`${surfaceTitle}阶段视图`}>
            <button type="button" role="tab" aria-selected={activeSection === "sector-model"} className={`section-subnav-button ${activeSection === "sector-model" ? "active" : ""}`} onClick={() => setActiveSection("sector-model")}>
              板块建模
            </button>
            <button type="button" role="tab" aria-selected={activeSection === "outline"} className={`section-subnav-button ${activeSection === "outline" ? "active" : ""}`} onClick={() => setActiveSection("outline")}>
              段落提纲
            </button>
            <button type="button" role="tab" aria-selected={activeSection === "drafts"} className={`section-subnav-button ${activeSection === "drafts" ? "active" : ""}`} onClick={() => setActiveSection("drafts")}>
              双稿编辑
            </button>
            <button type="button" role="tab" aria-selected={activeSection === "publish-prep"} className={`section-subnav-button ${activeSection === "publish-prep" ? "active" : ""}`} onClick={() => setActiveSection("publish-prep")}>
              发布整理
            </button>
          </div>
        </div>

        {activeSection === "sector-model" ? (
          <Panel className="stack section-panel writing-form-stage sector-model-stage">
            <div className="section-panel-header">
              <h3>板块建模</h3>
              {selectedBundle.sectorModel ? <Chip tone="accent">{selectedBundle.sectorModel.zones.length} 个片区</Chip> : null}
            </div>
            {selectedBundle.sectorModel ? (
              <div className="stack">
                {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
                <Card className="writing-hero-panel">
                  <span>板块主判断</span>
                  <strong>{selectedBundle.sectorModel.summaryJudgement || "还没有总判断"}</strong>
                  <p>{selectedBundle.sectorModel.spatialBackbone || "补齐空间骨架后，这里会成为写作阶段的主画布摘要。"}</p>
                </Card>
                <div className="workspace-pane-grid">
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <label>
                      总判断
                      <InlineTextAreaEdit value={selectedBundle.sectorModel.summaryJudgement} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            summaryJudgement: val,
                          })
                        } rows={3} />
                    </label>
                    <label>
                      误解点
                      <InlineTextAreaEdit value={selectedBundle.sectorModel.misconception} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            misconception: val,
                          })
                        } rows={3} />
                    </label>
                    <label>
                      空间骨架
                      <InlineTextAreaEdit value={selectedBundle.sectorModel.spatialBackbone} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            spatialBackbone: val,
                          })
                        } rows={4} />
                    </label>
                    <div className="two-column">
                      <label>
                        切割线
                        <InlineTextAreaEdit value={selectedBundle.sectorModel.cutLines.join("\n")} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              cutLines: splitLines(val),
                            })
                          } rows={5} />
                      </label>
                      <label>
                        未来变量
                        <InlineTextAreaEdit value={selectedBundle.sectorModel.futureWatchpoints.join("\n")} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              futureWatchpoints: splitLines(val),
                            })
                          } rows={5} />
                      </label>
                    </div>
                    <label>
                      供地判断
                      <InlineTextAreaEdit value={selectedBundle.sectorModel.supplyObservation} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            supplyObservation: val,
                          })
                        } rows={3} />
                    </label>
                    <Button type="button" variant="secondary" size="md" onClick={saveSectorModel} disabled={isPending}>
                      保存板块建模
                    </Button>
                  </ContainedScrollArea>
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <div className="section-panel-header">
                      <h3>片区列表</h3>
                      <Chip tone="accent">{selectedBundle.sectorModel.zones.length} 个片区</Chip>
                    </div>
                    <div className="zone-grid zone-grid-scroll">
                  {selectedBundle.sectorModel.zones.map((zone, index) => (
                    <AccordionCard title={zone.name || "未命名片区"} description={zone.label || "未设置标签"} className="zone-card" key={zone.id}>
                      <label>
                        片区名
                        <InlineTextEdit value={zone.name} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, name: val } : entry,
                              ),
                            })
                          } />
                      </label>
                      <label>
                        标签
                        <InlineTextEdit value={zone.label} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, label: val } : entry,
                              ),
                            })
                          } />
                      </label>
                      <label>
                        片区描述
                        <InlineTextAreaEdit value={zone.description} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, description: val } : entry,
                              ),
                            })
                          } rows={5} />
                      </label>
                      <label>
                        证据资料卡
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
                      </label>
                    </AccordionCard>
                  ))}
                    </div>
                  </ContainedScrollArea>
                </div>
              </div>
            ) : (
              <EmptyState className="stack" title="还没有板块建模">
                <p>还没有板块建模。</p>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void runProjectStep("sector-model", "板块建模已生成。")}
                  disabled={isPending || !selectedBundle.researchBrief || selectedBundle.sourceCards.length === 0}
                >
                  生成板块建模
                </Button>
              </EmptyState>
            )}
          </Panel>
        ) : null}

        {activeSection === "outline" ? (
          <Panel className="stack section-panel writing-form-stage outline-stage">
            <div className="section-panel-header">
              <h3>段落级提纲</h3>
              {selectedBundle.outlineDraft ? <Chip tone="accent">{selectedBundle.outlineDraft.sections.length} 段</Chip> : null}
            </div>
            {selectedBundle.outlineDraft ? (
              <div className="stack">
                {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
                <Card className="writing-hero-panel">
                  <span>段落任务书</span>
                  <strong>{selectedBundle.outlineDraft.hook || "还没有开头钩子"}</strong>
                  <p>{selectedBundle.outlineDraft.closing || "结尾收束会决定整篇文章最后落在判断、行动还是情绪回收上。"}</p>
                </Card>
                <div className="workspace-pane-grid">
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <label>
                      开头钩子
                      <InlineTextAreaEdit value={selectedBundle.outlineDraft.hook} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            hook: val,
                          })
                        } rows={4} />
                    </label>
                    <label>
                      结尾收束
                      <InlineTextAreaEdit value={selectedBundle.outlineDraft.closing} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            closing: val,
                          })
                        } rows={4} />
                    </label>
                    <Button type="button" variant="secondary" size="md" onClick={saveOutlineDraft} disabled={isPending}>
                      保存段落提纲
                    </Button>
                  </ContainedScrollArea>
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <div className="section-panel-header">
                      <h3>段落列表</h3>
                      <Chip tone="accent">{selectedBundle.outlineDraft.sections.length} 段</Chip>
                    </div>
                    <ContainedScrollArea className="outline-list editor-scroll-stack">
                  {selectedBundle.outlineDraft.sections.map((section, index) => (
                    <AccordionCard
                      title={`段落 ${index + 1}: ${section.heading || "未命名段落"}`}
                      description={buildOutlineSectionDescription(section)}
                      className="outline-item"
                      defaultOpen={index === 0}
                      key={section.id}
                    >
                      <label>
                        段落标题
                        <InlineTextEdit value={section.heading} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, heading: val } : entry,
                              ),
                            })
                          } />
                      </label>
                      <label>
                        段落目的
                        <InlineTextAreaEdit value={section.purpose} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, purpose: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        段落主判断
                        <InlineTextAreaEdit value={section.sectionThesis} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sectionThesis: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        唯一动作
                        <InlineTextAreaEdit value={section.singlePurpose} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, singlePurpose: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label>
                        必须落地
                        <InlineTextAreaEdit value={section.mustLandDetail} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mustLandDetail: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <details className="outline-advanced-fields">
                        <summary>叙事与转折约束</summary>
                        <div className="outline-advanced-grid">
                      <label>
                        场景 / 代价
                        <InlineTextAreaEdit value={section.sceneOrCost} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, sceneOrCost: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        主线句
                        <InlineTextAreaEdit value={section.mainlineSentence} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mainlineSentence: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        回环目标
                        <InlineTextAreaEdit value={section.callbackTarget} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, callbackTarget: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label>
                        微型故事需求
                        <InlineTextAreaEdit value={section.microStoryNeed} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, microStoryNeed: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label>
                        发现转折
                        <InlineTextAreaEdit value={section.discoveryTurn} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, discoveryTurn: val } : entry,
                              ),
                            })
                          } rows={2} />
                      </label>
                      <label>
                        推进动作
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
                      <label>
                        强约束证据
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
                      <label>
                        参考证据
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
                        <label>
                          节奏
                          <InlineTextEdit value={section.tone} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, tone: val } : entry,
                                ),
                              })
                            } />
                        </label>
                        <label>
                          承接目标
                          <InlineTextEdit value={section.transitionTarget} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, transitionTarget: val } : entry,
                                ),
                              })
                            } />
                        </label>
                        <label>
                          打破
                          <InlineTextEdit value={section.break} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, break: val } : entry,
                                ),
                              })
                            } />
                        </label>
                      </div>
                      <label>
                        反面理解 / 反证
                        <InlineTextAreaEdit value={section.counterPoint} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, counterPoint: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        对立观点
                        <InlineTextAreaEdit value={section.opposingView} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, opposingView: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        读者用途
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
                    </ContainedScrollArea>
                  </ContainedScrollArea>
                </div>
              </div>
            ) : (
              <EmptyState className="stack" title="还没有提纲">
                <p>还没有提纲。</p>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void runProjectStep("outline", "提纲已生成。")}
                  disabled={isPending || !selectedBundle.sectorModel}
                >
                  生成提纲
                </Button>
              </EmptyState>
            )}
          </Panel>
        ) : null}

        {activeSection === "drafts" ? (
          <Panel className="stack section-panel draft-editor-stage">
            <div className="section-panel-header">
              <h3>初稿与人工改写</h3>
              {selectedBundle.articleDraft ? <Chip tone="success">双稿已就绪</Chip> : null}
            </div>
            {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
            {selectedBundle.articleDraft ? (
              <div className="draft-workspace-grid">
                <div className="workspace-pane draft-editor-pane">
                  <label className="draft-editor-field">
                    人工改写版
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="draft-save-button"
                    onClick={() => {
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
                    }}
                    disabled={isPending}
                  >
                    保存人工改写稿
                  </Button>
                  {selectedBundle.editorialFeedbackEvents.length > 0 ? (
                    <Card className="status-block draft-feedback-panel">
                      <h3>编辑反馈回路</h3>
                      <ul className="compact-list">
                        {selectedBundle.editorialFeedbackEvents.slice(0, 6).map((event) => (
                          <li key={event.id}>
                            <strong>{event.eventType}</strong>
                            <span>{event.sectionHeading}</span>
                          </li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
                </div>
                <section className="workspace-pane draft-preview-pane">
                  <div className="draft-pane-head">
                    <div>
                      <h4>{draftPreviewMode === "analysis" ? "分析版预览" : "成文版预览"}</h4>
                      <p className="subtle">只读参考区，避免多个长文本框并排滚动。</p>
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
                  <ContainedScrollArea className="draft-preview-reader">
                    <pre className="draft-preview-content">{draftPreviewMode === "analysis"
                        ? selectedBundle.articleDraft.analysisMarkdown
                        : selectedBundle.articleDraft.narrativeMarkdown}</pre>
                  </ContainedScrollArea>
                </section>
              </div>
            ) : (
              <EmptyState className="stack" title="还没有初稿">
                <p>还没有初稿。</p>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => void runProjectStep("drafts", "双稿初稿已生成。")}
                  disabled={isPending || !selectedBundle.sectorModel || !selectedBundle.outlineDraft || selectedBundle.sourceCards.length === 0}
                >
                  生成双稿
                </Button>
              </EmptyState>
            )}
          </Panel>
        ) : null}

        {activeSection === "publish-prep" ? (
          <Panel className="stack section-panel publish-prep-stage">
            <div className="section-panel-header">
              <h3>发布前整理</h3>
              <div className="action-row publish-action-row">
                {selectedBundle.articleDraft ? (
                  <ButtonLink variant="primary" size="lg" className="publish-export-button" href={exportHref} target="_blank" rel="noreferrer">
                    {selectedBundle.publishPackage ? "导出 Markdown" : "导出当前 Markdown"}
                  </ButtonLink>
                ) : null}
                {selectedBundle.publishPackage ? <Chip tone="accent">{selectedBundle.publishPackage.titleOptions.length} 个标题候选</Chip> : null}
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => void generatePublishPrep()}
                  disabled={isPending || !canPublish}
                  type="button"
                >
                  {selectedBundle.publishPackage ? "重新生成发布前整理" : "生成发布前整理"}
                </Button>
              </div>
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
                  <Card className="status-block">
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
                  <Card className="status-block">
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
                <Card className="status-block">
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
                <Card className="status-block">
                  <h3>摘要</h3>
                  <p>{selectedBundle.publishPackage.summary}</p>
                </Card>
                <Card className="status-block">
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
              <EmptyState className="stack" title={canPublish ? "可以进入发布整理" : "还不能生成发布整理"}>
                {canPublish ? (
                  <>
                    <p>已经可以进入发布前整理了。</p>
                    <p className="subtle">建议先看完质量金字塔和门槛提示，再决定是否直接进入发布整理。</p>
                  </>
                ) : (
                  <>
                    <p>现在还不能生成发布前整理。</p>
                    <div className="action-row">
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        onClick={onOpenVitalityCheck}
                        disabled={isPending}
                      >
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
                  </>
                )}
              </EmptyState>
            )}
          </Panel>
        ) : null}
      </Surface>
    </>
  );
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
