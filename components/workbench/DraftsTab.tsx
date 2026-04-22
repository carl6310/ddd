"use client";

import { useEffect, useState } from "react";
import type { ProjectBundle } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { InlineTextEdit, InlineTextAreaEdit } from "@/components/ui/inline-edit";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { AccordionCard } from "@/components/ui/accordion-card";
import { canPreparePublish } from "@/lib/workflow";
import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";

type DraftsSection = "sector-model" | "outline" | "drafts" | "publish-prep";
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";

interface DraftsTabProps {
  selectedBundle: ProjectBundle;
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>;
  selectedProjectId: string;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  runProjectStep: (step: WorkbenchStepPath, successMessage: string) => Promise<void>;
  generatePublishPrep: () => Promise<void>;
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
  runProjectStep,
  generatePublishPrep,
  onOpenVitalityCheck,
  focusSection,
}: DraftsTabProps) {
  const [draftMessage, setDraftMessage] = useState("");
  const [activeSection, setActiveSection] = useState<DraftsSection>("sector-model");
  const hasPublishPackage = Boolean(selectedBundle.publishPackage);
  const hasArticleDraft = Boolean(selectedBundle.articleDraft);
  const hasOutlineDraft = Boolean(selectedBundle.outlineDraft);
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);

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
      setDraftMessage("人工改写稿已保存。");
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
      setDraftMessage("板块建模已保存。");
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
      setDraftMessage("段落提纲已保存。");
    } catch (error) {
      setDraftMessage(error instanceof Error ? error.message : "保存提纲失败。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <section className="card stack section-shell">
        <div className="card-header">
          <div>
            <h2>流转工作区</h2>
            <p className="subtle">把建模、提纲、双稿和发布整理拆成二级菜单，切换更直接。</p>
          </div>
        </div>
        <div className="section-subnav">
          <button className={`section-subnav-button ${activeSection === "sector-model" ? "active" : ""}`} onClick={() => setActiveSection("sector-model")}>
            板块建模
          </button>
          <button className={`section-subnav-button ${activeSection === "outline" ? "active" : ""}`} onClick={() => setActiveSection("outline")}>
            段落提纲
          </button>
          <button className={`section-subnav-button ${activeSection === "drafts" ? "active" : ""}`} onClick={() => setActiveSection("drafts")}>
            双稿编辑
          </button>
          <button className={`section-subnav-button ${activeSection === "publish-prep" ? "active" : ""}`} onClick={() => setActiveSection("publish-prep")}>
            发布整理
          </button>
        </div>

        {activeSection === "sector-model" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>板块建模</h3>
              {selectedBundle.sectorModel ? <span className="badge">{selectedBundle.sectorModel.zones.length} 个片区</span> : null}
            </div>
            {selectedBundle.sectorModel ? (
              <div className="stack">
                {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
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
                    <button onClick={saveSectorModel} disabled={isPending}>
                      保存板块建模
                    </button>
                  </ContainedScrollArea>
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <div className="section-panel-header">
                      <h3>片区列表</h3>
                      <span className="badge">{selectedBundle.sectorModel.zones.length} 个片区</span>
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
                        证据 ID
                        <InlineTextAreaEdit value={zone.evidenceIds.join("\n")} onChange={(val: string) => updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, evidenceIds: splitLines(val) } : entry,
                              ),
                            })
                          } rows={4} />
                      </label>
                    </AccordionCard>
                  ))}
                    </div>
                  </ContainedScrollArea>
                </div>
              </div>
            ) : (
              <div className="empty-state stack">
                <p>还没有板块建模。</p>
                <button
                  className="primary-button"
                  onClick={() => void runProjectStep("sector-model", "板块建模已生成。")}
                  disabled={isPending || !selectedBundle.researchBrief || selectedBundle.sourceCards.length === 0}
                >
                  生成板块建模
                </button>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "outline" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>段落级提纲</h3>
              {selectedBundle.outlineDraft ? <span className="badge">{selectedBundle.outlineDraft.sections.length} 段</span> : null}
            </div>
            {selectedBundle.outlineDraft ? (
              <div className="stack">
                {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
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
                    <button onClick={saveOutlineDraft} disabled={isPending}>
                      保存段落提纲
                    </button>
                  </ContainedScrollArea>
                  <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                    <div className="section-panel-header">
                      <h3>段落列表</h3>
                      <span className="badge">{selectedBundle.outlineDraft.sections.length} 段</span>
                    </div>
                    <ContainedScrollArea className="outline-list editor-scroll-stack">
                  {selectedBundle.outlineDraft.sections.map((section, index) => (
                    <AccordionCard title={`段落 ${index + 1}: ${section.heading || "未命名段落"}`} description={section.purpose} className="outline-item" key={section.id}>
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
                        推进动作
                        <InlineTextAreaEdit value={section.move} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, move: val } : entry,
                              ),
                            })
                          } rows={3} />
                      </label>
                      <label>
                        强约束证据 ID
                        <InlineTextAreaEdit value={section.mustUseEvidenceIds.join("\n")} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, mustUseEvidenceIds: splitLines(val) } : entry,
                              ),
                            })
                          } rows={4} />
                      </label>
                      <label>
                        证据 ID
                        <InlineTextAreaEdit value={section.evidenceIds.join("\n")} onChange={(val: string) => updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, evidenceIds: splitLines(val) } : entry,
                              ),
                            })
                          } rows={4} />
                      </label>
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
                    </AccordionCard>
                  ))}
                    </ContainedScrollArea>
                  </ContainedScrollArea>
                </div>
              </div>
            ) : (
              <div className="empty-state stack">
                <p>还没有提纲。</p>
                <button
                  className="primary-button"
                  onClick={() => void runProjectStep("outline", "提纲已生成。")}
                  disabled={isPending || !selectedBundle.sectorModel}
                >
                  生成提纲
                </button>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "drafts" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>初稿与人工改写</h3>
              {selectedBundle.articleDraft ? <span className="badge">双稿已就绪</span> : null}
            </div>
            {draftMessage ? <p className="subtle">{draftMessage}</p> : null}
            {selectedBundle.articleDraft ? (
              <div className="workspace-pane-grid">
                <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                  <div className="draft-grid">
                    <label>
                      分析版
                      <AutoGrowTextarea value={selectedBundle.articleDraft.analysisMarkdown} readOnly rows={10} />
                    </label>
                    <label>
                      成文版
                      <AutoGrowTextarea value={selectedBundle.articleDraft.narrativeMarkdown} readOnly rows={10} />
                    </label>
                  </div>
                </ContainedScrollArea>
                <div className="workspace-pane workspace-pane-hero stack">
                  <label>
                    人工改写版
                    <InlineTextAreaEdit value={selectedBundle.articleDraft.editedMarkdown || selectedBundle.articleDraft.narrativeMarkdown} onChange={(val: string) => setSelectedBundle((current) =>
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
                  <button
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
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state stack">
                <p>还没有初稿。</p>
                <button
                  className="primary-button"
                  onClick={() => void runProjectStep("drafts", "双稿初稿已生成。")}
                  disabled={isPending || !selectedBundle.sectorModel || !selectedBundle.outlineDraft || selectedBundle.sourceCards.length === 0}
                >
                  生成双稿
                </button>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "publish-prep" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>发布前整理</h3>
              <div className="action-row">
                {selectedBundle.publishPackage ? <span className="badge">{selectedBundle.publishPackage.titleOptions.length} 个标题候选</span> : null}
                <button
                  className="secondary-button"
                  onClick={() => void generatePublishPrep()}
                  disabled={isPending || !canPublish}
                  type="button"
                >
                  {selectedBundle.publishPackage ? "重新生成发布前整理" : "生成发布前整理"}
                </button>
              </div>
            </div>
            {selectedBundle.publishPackage ? (
              <div className="stack">
                <p className="subtle">你改完正文后，可以直接点上面的按钮重新生成这一整套发布整理结果。</p>
                {selectedBundle.publishPackage.qualityGate ? (
                  <article className="status-block">
                    <h3>Writing Quality Gate</h3>
                    <p className="subtle">当前模式：{selectedBundle.publishPackage.qualityGate.mode}，不会拦截发布前整理，但会明确提醒先修什么。</p>
                    {selectedBundle.publishPackage.qualityGate.mustFix.length > 0 ? (
                      <>
                        <strong>Must Fix</strong>
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
                        <strong>Should Fix</strong>
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
                        <strong>Optional Polish</strong>
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
                  </article>
                ) : null}
                <article className="status-block">
                  <h3>标题候选</h3>
                  <ul className="compact-list">
                    {selectedBundle.publishPackage.titleOptions.map((option) => (
                      <li key={option.title}>
                        <strong>{option.title}{option.isPrimary ? "（主打）" : ""}</strong>
                        <span>{option.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="status-block">
                  <h3>摘要</h3>
                  <p>{selectedBundle.publishPackage.summary}</p>
                </article>
                <article className="status-block">
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
                </article>
                <div className="action-row" style={{ marginTop: '24px', justifyContent: 'center' }}>
                  <button
                    className="primary-button"
                    onClick={() => void runProjectStep("review", "已请求全面质量评审。")}
                    disabled={isPending}
                    style={{ padding: '12px 32px', fontSize: '15px' }}
                  >
                    请求人工质量评审
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state stack">
                {canPublish ? (
                  <>
                    <p>已经可以进入发布前整理了。</p>
                    <p className="subtle">当前不会因为写作质量 gate 被硬拦，但建议先看完 warn-only 提示再继续。</p>
                  </>
                ) : (
                  <>
                    <p>现在还不能生成发布前整理。</p>
                    <div className="action-row">
                      <button
                        className="primary-button"
                        onClick={onOpenVitalityCheck}
                        disabled={isPending}
                      >
                        去看发布前检查
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => void runProjectStep("review", "质检报告已更新。")}
                        disabled={isPending || !selectedBundle.articleDraft}
                      >
                        重新检查
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        ) : null}
      </section>
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

function splitLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}
