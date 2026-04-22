"use client";

import { useEffect, useState } from "react";
import type { ProjectBundle } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { canPreparePublish } from "@/lib/workflow";

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
                      <AutoGrowTextarea
                        value={selectedBundle.sectorModel.summaryJudgement}
                        onChange={(event) =>
                          updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            summaryJudgement: event.target.value,
                          })
                        }
                        rows={3}
                      />
                    </label>
                    <label>
                      误解点
                      <AutoGrowTextarea
                        value={selectedBundle.sectorModel.misconception}
                        onChange={(event) =>
                          updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            misconception: event.target.value,
                          })
                        }
                        rows={3}
                      />
                    </label>
                    <label>
                      空间骨架
                      <AutoGrowTextarea
                        value={selectedBundle.sectorModel.spatialBackbone}
                        onChange={(event) =>
                          updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            spatialBackbone: event.target.value,
                          })
                        }
                        rows={4}
                      />
                    </label>
                    <div className="two-column">
                      <label>
                        切割线
                        <AutoGrowTextarea
                          value={selectedBundle.sectorModel.cutLines.join("\n")}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              cutLines: splitLines(event.target.value),
                            })
                          }
                          rows={5}
                        />
                      </label>
                      <label>
                        未来变量
                        <AutoGrowTextarea
                          value={selectedBundle.sectorModel.futureWatchpoints.join("\n")}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              futureWatchpoints: splitLines(event.target.value),
                            })
                          }
                          rows={5}
                        />
                      </label>
                    </div>
                    <label>
                      供地判断
                      <AutoGrowTextarea
                        value={selectedBundle.sectorModel.supplyObservation}
                        onChange={(event) =>
                          updateSectorModel(setSelectedBundle, {
                            ...selectedBundle.sectorModel!,
                            supplyObservation: event.target.value,
                          })
                        }
                        rows={3}
                      />
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
                    <article className="zone-card stack" key={zone.id}>
                      <label>
                        片区名
                        <input
                          value={zone.name}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, name: event.target.value } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        标签
                        <input
                          value={zone.label}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        片区描述
                        <AutoGrowTextarea
                          value={zone.description}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, description: event.target.value } : entry,
                              ),
                            })
                          }
                          rows={5}
                        />
                      </label>
                      <label>
                        证据 ID
                        <AutoGrowTextarea
                          value={zone.evidenceIds.join("\n")}
                          onChange={(event) =>
                            updateSectorModel(setSelectedBundle, {
                              ...selectedBundle.sectorModel!,
                              zones: selectedBundle.sectorModel!.zones.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, evidenceIds: splitLines(event.target.value) } : entry,
                              ),
                            })
                          }
                          rows={4}
                        />
                      </label>
                    </article>
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
                      <AutoGrowTextarea
                        value={selectedBundle.outlineDraft.hook}
                        onChange={(event) =>
                          updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            hook: event.target.value,
                          })
                        }
                        rows={4}
                      />
                    </label>
                    <label>
                      结尾收束
                      <AutoGrowTextarea
                        value={selectedBundle.outlineDraft.closing}
                        onChange={(event) =>
                          updateOutlineDraft(setSelectedBundle, {
                            ...selectedBundle.outlineDraft!,
                            closing: event.target.value,
                          })
                        }
                        rows={4}
                      />
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
                    <article className="outline-item stack" key={section.id}>
                      <label>
                        段落标题
                        <input
                          value={section.heading}
                          onChange={(event) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, heading: event.target.value } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        段落目的
                        <AutoGrowTextarea
                          value={section.purpose}
                          onChange={(event) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, purpose: event.target.value } : entry,
                              ),
                            })
                          }
                          rows={3}
                        />
                      </label>
                      <label>
                        推进动作
                        <AutoGrowTextarea
                          value={section.move}
                          onChange={(event) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, move: event.target.value } : entry,
                              ),
                            })
                          }
                          rows={3}
                        />
                      </label>
                      <label>
                        证据 ID
                        <AutoGrowTextarea
                          value={section.evidenceIds.join("\n")}
                          onChange={(event) =>
                            updateOutlineDraft(setSelectedBundle, {
                              ...selectedBundle.outlineDraft!,
                              sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, evidenceIds: splitLines(event.target.value) } : entry,
                              ),
                            })
                          }
                          rows={4}
                        />
                      </label>
                      <div className="two-column">
                        <label>
                          节奏
                          <input
                            value={section.tone}
                            onChange={(event) =>
                              updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, tone: event.target.value } : entry,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          打破
                          <input
                            value={section.break}
                            onChange={(event) =>
                              updateOutlineDraft(setSelectedBundle, {
                                ...selectedBundle.outlineDraft!,
                                sections: selectedBundle.outlineDraft!.sections.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, break: event.target.value } : entry,
                                ),
                              })
                            }
                          />
                        </label>
                      </div>
                    </article>
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
                    <AutoGrowTextarea
                      value={selectedBundle.articleDraft.editedMarkdown || selectedBundle.articleDraft.narrativeMarkdown}
                      onChange={(event) =>
                        setSelectedBundle((current) =>
                          current
                            ? {
                                ...current,
                                articleDraft: {
                                  ...current.articleDraft!,
                                  editedMarkdown: event.target.value,
                                },
                              }
                            : current,
                        )
                      }
                      rows={18}
                    />
                  </label>
                  <button
                    onClick={() => saveEditedDraft(selectedBundle.articleDraft?.editedMarkdown || selectedBundle.articleDraft?.narrativeMarkdown || "")}
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
              </div>
            ) : (
              <div className="empty-state stack">
                {canPublish ? (
                  <>
                    <p>已经可以进入发布前整理了。</p>
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
