"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectBundle, SourceCard } from "@/lib/types";
import { getResearchGaps } from "@/lib/workflow";
import { AccordionCard } from "@/components/ui/accordion-card";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineTextAreaEdit, InlineTextEdit } from "@/components/ui/inline-edit";
import { Card, Panel, Surface } from "@/components/ui/surface";
import { useJobAction } from "@/hooks/use-job-action";
import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";
import type { WorkbenchInspectorSelection } from "./WorkbenchInspector";
import type { WorkbenchDisplayMode } from "./display-mode";

type ResearchSection = "research-brief" | "source-form" | "source-library";
type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";

type SourceCardFormState = {
  title: string;
  url: string;
  note: string;
  publishedAt: string;
  credibility: SourceCard["credibility"];
  sourceType: SourceCard["sourceType"];
  supportLevel: SourceCard["supportLevel"];
  claimType: SourceCard["claimType"];
  timeSensitivity: SourceCard["timeSensitivity"];
  zone: string;
  intendedSection: string;
  reliabilityNote: string;
  tagsText: string;
  summary: string;
  evidence: string;
  rawText: string;
};

const emptySourceCardForm: SourceCardFormState = {
  title: "",
  url: "",
  note: "",
  publishedAt: "",
  credibility: "中",
  sourceType: "media",
  supportLevel: "medium",
  claimType: "fact",
  timeSensitivity: "timely",
  zone: "",
  intendedSection: "",
  reliabilityNote: "",
  tagsText: "",
  summary: "",
  evidence: "",
  rawText: "",
};

interface ResearchTabProps {
  selectedBundle: ProjectBundle;
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>;
  selectedProjectId: string;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  markArtifactsStale: (artifacts: StaleArtifact[]) => void;
  runProjectStep: (step: WorkbenchStepPath, successMessage: string) => Promise<void>;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
  displayMode: WorkbenchDisplayMode;
  focusSection: "research-brief" | "source-form" | "source-library" | "sector-model" | "outline" | "drafts" | "publish-prep" | null;
}

export function ResearchTab({
  selectedBundle,
  setSelectedBundle,
  selectedProjectId,
  refreshProjectsAndBundle,
  isPending,
  setIsPending,
  setMessage,
  markArtifactsStale,
  runProjectStep,
  onInspectorSelectionChange,
  displayMode,
  focusSection,
}: ResearchTabProps) {
  const [sourceCardForm, setSourceCardForm] = useState<SourceCardFormState>(emptySourceCardForm);
  const [activeSection, setActiveSection] = useState<ResearchSection>("research-brief");
  const extractJob = useJobAction();
  const summarizeJob = useJobAction();
  const hasResearchBrief = Boolean(selectedBundle.researchBrief);
  const sourceCardCount = selectedBundle.sourceCards.length;
  const sourceCardSaveReadiness = getSourceCardSaveReadiness(sourceCardForm);

  const sourceCardGroups = useMemo(() => {
    const byZone = selectedBundle.sourceCards.reduce<Record<string, SourceCard[]>>((groups, card) => {
      const key = card.zone || "未分区";
      groups[key] = groups[key] || [];
      groups[key].push(card);
      return groups;
    }, {});
    const byCredibility = selectedBundle.sourceCards.reduce<Record<string, SourceCard[]>>((groups, card) => {
      const key = card.credibility;
      groups[key] = groups[key] || [];
      groups[key].push(card);
      return groups;
    }, {});
    const draft = selectedBundle.articleDraft?.editedMarkdown || selectedBundle.articleDraft?.narrativeMarkdown || "";
    const ids = Array.from(new Set(draft.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));
    const citations = ids
      .map((id) => selectedBundle.sourceCards.find((card) => card.id === id))
      .filter((card): card is SourceCard => Boolean(card))
      .map((card) => ({ id: card.id, title: card.title, summary: card.summary }));

    return { byZone, byCredibility, citations };
  }, [selectedBundle]);

  const researchGaps = useMemo(
    () => (selectedBundle ? getResearchGaps(selectedBundle.researchBrief, selectedBundle.sourceCards) : []),
    [selectedBundle]
  );
  const evidenceAnalysis = useMemo(() => analyzeEvidenceCoverage(selectedBundle), [selectedBundle]);
  const orphanSourceCards = useMemo(
    () =>
      evidenceAnalysis.orphanSourceCardIds
        .map((cardId) => selectedBundle.sourceCards.find((card) => card.id === cardId))
        .filter((card): card is SourceCard => Boolean(card)),
    [evidenceAnalysis.orphanSourceCardIds, selectedBundle.sourceCards],
  );
  const evidenceSummaryMetrics = [
    {
      label: "引用覆盖率",
      value: `${Math.round(evidenceAnalysis.summary.citationCoverage * 100)}%`,
    },
    {
      label: "分段证据覆盖",
      value: `${Math.round(evidenceAnalysis.summary.sectionEvidenceCoverage * 100)}%`,
    },
    {
      label: "关键点覆盖",
      value: `${Math.round(evidenceAnalysis.summary.keyPointCoverage * 100)}%`,
    },
    {
      label: "无效引用",
      value: evidenceAnalysis.summary.brokenCitationCount,
    },
    {
      label: "孤立资料卡",
      value: evidenceAnalysis.summary.orphanSourceCardCount,
    },
  ];
  const citedSourceCardIds = useMemo(() => new Set(sourceCardGroups.citations.map((card) => card.id)), [sourceCardGroups.citations]);
  const orphanSourceCardIds = useMemo(() => new Set(evidenceAnalysis.orphanSourceCardIds), [evidenceAnalysis.orphanSourceCardIds]);

  useEffect(() => {
    if (focusSection === "research-brief" || focusSection === "source-form" || focusSection === "source-library") {
      setActiveSection(focusSection);
      return;
    }
    if (!hasResearchBrief) {
      setActiveSection("research-brief");
    } else if (sourceCardCount === 0) {
      setActiveSection("source-form");
    }
  }, [focusSection, selectedProjectId, hasResearchBrief, sourceCardCount]);

  useEffect(() => {
    extractJob.bindTerminalHandlers({
      onSucceeded(detail) {
        const extracted = detail.job.result as {
          title?: string;
          note?: string;
          publishedAt?: string;
          rawText?: string;
          summary?: string;
          evidence?: string;
          tags?: string[];
        } | null;
        if (!extracted) {
          setMessage("链接抓取任务已完成，但没有返回可用结果。");
          return;
        }
        setSourceCardForm((current) => ({
          ...current,
          title: current.title || extracted.title || "",
          note: current.note || extracted.note || "",
          publishedAt: current.publishedAt || extracted.publishedAt || "",
          rawText: extracted.rawText || current.rawText,
          summary: extracted.summary || current.summary,
          evidence: extracted.evidence || current.evidence,
          tagsText: extracted.tags?.join(", ") || current.tagsText,
        }));
        setMessage("已从链接抓到正文并填充到资料卡，你可以再手动修一下。");
      },
      onFailed(detail) {
        setMessage(detail.job.errorMessage || "从链接抓正文失败。");
      },
    });
  }, [extractJob, setMessage]);

  useEffect(() => {
    summarizeJob.bindTerminalHandlers({
      onSucceeded(detail) {
        const generated = detail.job.result as {
          title?: string;
          summary?: string;
          evidence?: string;
          tags?: string[];
        } | null;
        if (!generated) {
          setMessage("资料摘要任务已完成，但没有返回可用结果。");
          return;
        }
        setSourceCardForm((current) => ({
          ...current,
          title: current.title || generated.title || "",
          summary: generated.summary || current.summary,
          evidence: generated.evidence || current.evidence,
          tagsText: generated.tags?.join(", ") || current.tagsText,
        }));
        setMessage("摘要和证据片段已通过模型分析生成，你可以继续手改。");
      },
      onFailed(detail) {
        setMessage(detail.job.errorMessage || "生成资料摘要失败。");
      },
    });
  }, [setMessage, summarizeJob]);

  async function saveSourceCard() {
    if (!selectedProjectId) return;
    if (!sourceCardSaveReadiness.ok) {
      setMessage(sourceCardSaveReadiness.message);
      return;
    }

    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}/source-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sourceCardForm),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存资料卡失败。");
      }
      setSourceCardForm(emptySourceCardForm);
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["sector-model", "outline", "drafts", "review", "publish-prep"]);
      setMessage("资料卡已保存。下游建模、提纲、正文和发布整理可能需要重生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存资料卡失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function saveResearchBrief() {
    if (!selectedProjectId || !selectedBundle.researchBrief) return;

    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchBrief: selectedBundle.researchBrief }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "保存研究清单失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["sector-model", "outline", "drafts", "review", "publish-prep"]);
      setMessage("研究清单已保存。下游建模、提纲、正文和发布整理可能需要重生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存研究清单失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function extractSourceFromUrl() {
    if (!selectedProjectId || !sourceCardForm.url.trim()) {
      setMessage("先填一个链接，再抓正文。");
      return;
    }

    try {
      setMessage("");
      await extractJob.submitJob({
        url: `/api/projects/${selectedProjectId}/source-cards/extract`,
        body: { url: sourceCardForm.url },
        onQueued(_jobId, deduped) {
          setMessage(deduped ? "相同链接抓取任务已在后台执行，已继续跟踪。" : "链接抓取任务已入队，正在后台执行。");
        },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "从链接抓正文失败。");
    }
  }

  async function deleteCard(sourceCardId: string) {
    if (!selectedProjectId) return;

    setIsPending(true);
    try {
      setMessage("");
      const response = await fetch(`/api/projects/${selectedProjectId}/source-cards/${sourceCardId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "删除资料卡失败。");
      }
      await refreshProjectsAndBundle(selectedProjectId);
      markArtifactsStale(["sector-model", "outline", "drafts", "review", "publish-prep"]);
      setMessage("资料卡已删除。下游建模、提纲、正文和发布整理可能需要重生成。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除资料卡失败。");
    } finally {
      setIsPending(false);
    }
  }

  async function autoFillSourceCard() {
    if (!sourceCardForm.rawText.trim()) {
      setMessage("先粘贴资料原文，再自动生成摘要。");
      return;
    }

    try {
      setMessage("");
      await summarizeJob.submitJob({
        url: `/api/projects/${selectedProjectId}/source-cards/summarize`,
        body: {
          title: sourceCardForm.title || "未命名资料",
          rawText: sourceCardForm.rawText,
        },
        onQueued(_jobId, deduped) {
          setMessage(deduped ? "相同资料摘要任务已在后台执行，已继续跟踪。" : "资料摘要任务已入队，正在后台执行。");
        },
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "生成资料摘要失败。");
    }
  }

  return (
    <>
      <Surface className="stack section-shell">
        <div className="section-shell-compact-head">
          <h2>资料</h2>
          <div className="section-subnav" role="tablist" aria-label="资料阶段视图">
            <button type="button" role="tab" aria-selected={activeSection === "research-brief"} className={`section-subnav-button ${activeSection === "research-brief" ? "active" : ""}`} onClick={() => setActiveSection("research-brief")}>
              研究清单
            </button>
            <button type="button" role="tab" aria-selected={activeSection === "source-form"} className={`section-subnav-button ${activeSection === "source-form" ? "active" : ""}`} onClick={() => setActiveSection("source-form")}>
              资料录入
            </button>
            <button type="button" role="tab" aria-selected={activeSection === "source-library"} className={`section-subnav-button ${activeSection === "source-library" ? "active" : ""}`} onClick={() => setActiveSection("source-library")}>
              资料索引
            </button>
          </div>
        </div>

        {activeSection === "research-brief" ? (
          <Panel className="stack section-panel research-brief-stage">
            <div className="section-panel-header">
              <h3>研究清单</h3>
              {selectedBundle.researchBrief ? <Chip tone="accent">{selectedBundle.researchBrief.mustResearch.length} 个维度</Chip> : null}
            </div>
            {selectedBundle.researchBrief ? (
              <div className="stack research-brief-edit-shell">
                <div className="editor-group-grid research-brief-edit-grid">
                  <AccordionCard
                    title="研究角度"
                    description={briefText(selectedBundle.researchBrief.angle, "决定这一轮资料搜集围绕什么判断展开。")}
                    defaultOpen
                  >
                    <label>
                      研究角度
                      <InlineTextAreaEdit
                        value={selectedBundle.researchBrief.angle}
                        onChange={(value) =>
                          updateResearchBrief(setSelectedBundle, {
                            ...selectedBundle.researchBrief!,
                            angle: value,
                          })
                        }
                        rows={3}
                      />
                    </label>
                  </AccordionCard>
                  <AccordionCard title="关键问题" description={`${selectedBundle.researchBrief.questions.length} 个待回答问题`}>
                    <label>
                      关键问题
                      <InlineTextAreaEdit
                        value={selectedBundle.researchBrief.questions.join("\n")}
                        onChange={(value) =>
                          updateResearchBrief(setSelectedBundle, {
                            ...selectedBundle.researchBrief!,
                            questions: splitLines(value),
                          })
                        }
                        rows={6}
                      />
                    </label>
                  </AccordionCard>
                  <AccordionCard title="盲区提醒" description={`${selectedBundle.researchBrief.blindSpots.length} 个风险点`}>
                    <label>
                      盲区提醒
                      <InlineTextAreaEdit
                        value={selectedBundle.researchBrief.blindSpots.join("\n")}
                        onChange={(value) =>
                          updateResearchBrief(setSelectedBundle, {
                            ...selectedBundle.researchBrief!,
                            blindSpots: splitLines(value),
                          })
                        }
                        rows={6}
                      />
                    </label>
                  </AccordionCard>
                  <AccordionCard title="阶段清单" description={`${selectedBundle.researchBrief.stageChecklist.length} 个推进动作`}>
                    <label>
                      阶段清单
                      <InlineTextAreaEdit
                        value={selectedBundle.researchBrief.stageChecklist.join("\n")}
                        onChange={(value) =>
                          updateResearchBrief(setSelectedBundle, {
                            ...selectedBundle.researchBrief!,
                            stageChecklist: splitLines(value),
                          })
                        }
                        rows={5}
                      />
                    </label>
                  </AccordionCard>
                </div>
                <ContainedScrollArea className="editor-card-grid editor-scroll-stack research-brief-list">
                  {selectedBundle.researchBrief.mustResearch.map((item, index) => (
                    <details
                      className="accordion-card research-dimension-card"
                      key={`must-research-${index}`}
                    >
                      <summary className="accordion-head">
                        <div className="accordion-title-block">
                          <h4>{`${index + 1}. ${item.dimension || "未命名研究维度"}`}</h4>
                          <p className="subtle">{buildResearchDimensionDescription(item)}</p>
                        </div>
                        <div className="accordion-icon">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </div>
                      </summary>
                      <div className="accordion-body stack">
                        <label>
                          研究维度
                          <InlineTextEdit
                            value={item.dimension}
                            onChange={(value) =>
                              updateResearchBrief(setSelectedBundle, {
                                ...selectedBundle.researchBrief!,
                                mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, dimension: value } : entry,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          为什么要研究
                          <InlineTextAreaEdit
                            value={item.reason}
                            onChange={(value) =>
                              updateResearchBrief(setSelectedBundle, {
                                ...selectedBundle.researchBrief!,
                                mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, reason: value } : entry,
                                ),
                              })
                            }
                            rows={3}
                          />
                        </label>
                        <label>
                          期望证据
                          <InlineTextAreaEdit
                            value={item.expectedEvidence}
                            onChange={(value) =>
                              updateResearchBrief(setSelectedBundle, {
                                ...selectedBundle.researchBrief!,
                                mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, expectedEvidence: value } : entry,
                                ),
                              })
                            }
                            rows={3}
                          />
                        </label>
                      </div>
                    </details>
                  ))}
                </ContainedScrollArea>
                <Button type="button" variant="secondary" size="md" onClick={saveResearchBrief} disabled={isPending}>
                  保存研究清单
                </Button>
              </div>
            ) : (
              <EmptyState
                className="workbench-empty-state"
                title="还没有研究清单"
                action={
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => void runProjectStep("research-brief", "研究清单已生成。")}
                    disabled={isPending}
                  >
                    生成研究清单
                  </Button>
                }
              >
                <p>先生成研究问题和证据方向，再进入资料录入。</p>
              </EmptyState>
            )}
          </Panel>
        ) : null}

        {activeSection === "source-form" ? (
          <Panel className="stack section-panel">
            <div className="section-panel-header">
              <h3>资料录入</h3>
              <Chip tone="accent">{sourceCardForm.rawText.trim().length.toLocaleString()} 字原文</Chip>
            </div>
            {researchGaps.length > 0 ? (
              <details className="source-gap-panel">
                <summary>
                  <span>资料缺口提醒</span>
                  <strong>{researchGaps.length}</strong>
                </summary>
                <ul className="compact-list">
                  {researchGaps.map((gap) => (
                    <li key={gap}>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
            <div className="source-intake-layout">
              <Card as="section" className="source-intake-card source-intake-primary">
                <div className="source-intake-head">
                  <div>
                    <h4>快速录入</h4>
                    <p className="subtle">链接来源、标题和入库动作。</p>
                  </div>
                  <Chip>{sourceCardForm.title.trim() ? "待保存" : "未命名"}</Chip>
                </div>
                <div className="source-title-url-grid">
                  <label>
                    标题
                    <input value={sourceCardForm.title} onChange={(event) => setSourceCardForm({ ...sourceCardForm, title: event.target.value })} placeholder="资料标题" />
                  </label>
                  <label>
                    URL
                    <input value={sourceCardForm.url} onChange={(event) => setSourceCardForm({ ...sourceCardForm, url: event.target.value })} placeholder="https://..." />
                  </label>
                </div>
                <div className="source-action-bar">
                  <Button type="button" variant="secondary" size="md" onClick={extractSourceFromUrl} disabled={isPending || extractJob.isSubmitting || !sourceCardForm.url.trim()}>
                    从链接抓正文
                  </Button>
                  <Button type="button" variant="secondary" size="md" onClick={autoFillSourceCard} disabled={isPending || summarizeJob.isSubmitting || !sourceCardForm.rawText.trim()}>
                    自动生成摘要与证据
                  </Button>
                  <Button type="button" variant="primary" size="lg" onClick={saveSourceCard} disabled={isPending || !sourceCardSaveReadiness.ok}>
                    保存资料卡
                  </Button>
                </div>
                {!sourceCardSaveReadiness.ok ? <p className="subtle action-hint">{sourceCardSaveReadiness.message}</p> : null}
              </Card>

              <Card as="section" className="source-intake-card source-raw-card">
                <div className="source-intake-head">
                  <div>
                    <h4>原文池</h4>
                    <p className="subtle">粘贴或抓取的完整资料原文。</p>
                  </div>
                  <Chip>{sourceCardForm.rawText.trim().length.toLocaleString()} 字</Chip>
                </div>
                <label className="source-raw-field">
                  粘贴资料原文
                  <InlineTextAreaEdit
                    className="source-raw-editor"
                    value={sourceCardForm.rawText}
                    onChange={(value) => setSourceCardForm({ ...sourceCardForm, rawText: value })}
                    placeholder="粘贴完整原文、访谈记录或网页正文。"
                    rows={12}
                  />
                </label>
              </Card>

              <Card as="section" className="source-intake-card source-digest-card">
                <div className="source-intake-head">
                  <div>
                    <h4>摘要与证据</h4>
                    <p className="subtle">这两项决定资料卡后面能不能被正文真正引用。</p>
                  </div>
                </div>
                <label>
                  摘要
                  <InlineTextAreaEdit
                    className="source-digest-editor"
                    value={sourceCardForm.summary}
                    onChange={(value) => setSourceCardForm({ ...sourceCardForm, summary: value })}
                    placeholder="点击补充资料摘要。"
                    rows={5}
                  />
                </label>
                <label>
                  证据片段
                  <InlineTextAreaEdit
                    className="source-digest-editor"
                    value={sourceCardForm.evidence}
                    onChange={(value) => setSourceCardForm({ ...sourceCardForm, evidence: value })}
                    placeholder="点击摘出可以进入正文的证据片段。"
                    rows={5}
                  />
                </label>
              </Card>

              <details className="source-intake-card source-meta-card">
                <summary>
                  <span>资料属性</span>
                  <small>{sourceCardForm.credibility}可信度 · {formatSourceType(sourceCardForm.sourceType)}</small>
                </summary>
                <div className="source-meta-grid">
                  <label>
                    备注
                    <input value={sourceCardForm.note} onChange={(event) => setSourceCardForm({ ...sourceCardForm, note: event.target.value })} placeholder="来源备注" />
                  </label>
                  <label>
                    发布时间
                    <input value={sourceCardForm.publishedAt} onChange={(event) => setSourceCardForm({ ...sourceCardForm, publishedAt: event.target.value })} placeholder="2026-04-13" />
                  </label>
                  <label>
                    可信度
                    <select
                      value={sourceCardForm.credibility}
                      onChange={(event) =>
                        setSourceCardForm({ ...sourceCardForm, credibility: event.target.value as SourceCard["credibility"] })
                      }
                    >
                      <option value="高">高</option>
                      <option value="中">中</option>
                      <option value="低">低</option>
                    </select>
                  </label>
                  <label>
                    来源类型
                    <select
                      value={sourceCardForm.sourceType}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, sourceType: event.target.value as SourceCard["sourceType"] })}
                    >
                      <option value="official">官方</option>
                      <option value="media">媒体</option>
                      <option value="commentary">评论</option>
                      <option value="interview">访谈</option>
                      <option value="observation">观察</option>
                    </select>
                  </label>
                  <label>
                    支撑强度
                    <select
                      value={sourceCardForm.supportLevel}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, supportLevel: event.target.value as SourceCard["supportLevel"] })}
                    >
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                  <label>
                    论断类型
                    <select
                      value={sourceCardForm.claimType}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, claimType: event.target.value as SourceCard["claimType"] })}
                    >
                      <option value="fact">事实</option>
                      <option value="observation">观察</option>
                      <option value="judgement">判断</option>
                      <option value="counterevidence">反证</option>
                      <option value="quote">引语</option>
                    </select>
                  </label>
                  <label>
                    时效性
                    <select
                      value={sourceCardForm.timeSensitivity}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, timeSensitivity: event.target.value as SourceCard["timeSensitivity"] })}
                    >
                      <option value="evergreen">长期有效</option>
                      <option value="timely">阶段有效</option>
                      <option value="volatile">高时效</option>
                    </select>
                  </label>
                  <label>
                    片区标签
                    <input value={sourceCardForm.zone} onChange={(event) => setSourceCardForm({ ...sourceCardForm, zone: event.target.value })} placeholder="如：核心承接区" />
                  </label>
                  <label>
                    预期落段
                    <input
                      value={sourceCardForm.intendedSection}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, intendedSection: event.target.value })}
                      placeholder="如：开头主判断 / 第二段结构拆解"
                    />
                  </label>
                  <label>
                    标签
                    <input value={sourceCardForm.tagsText} onChange={(event) => setSourceCardForm({ ...sourceCardForm, tagsText: event.target.value })} placeholder="规划, 供地, 地铁" />
                  </label>
                  <label className="source-meta-wide">
                    可靠性备注
                    <AutoGrowTextarea
                      value={sourceCardForm.reliabilityNote}
                      onChange={(event) => setSourceCardForm({ ...sourceCardForm, reliabilityNote: event.target.value })}
                      rows={3}
                    />
                  </label>
                </div>
              </details>
            </div>
          </Panel>
        ) : null}

        {activeSection === "source-library" ? (
          <Panel className="stack section-panel source-library-stage">
            <div className="section-panel-header source-library-head">
              <h3>资料索引</h3>
              <Chip tone="accent">{selectedBundle.sourceCards.length} 张</Chip>
            </div>
            <div className="two-column evidence-summary-grid">
              <Card className="evidence-summary-card">
                <div className="evidence-summary-head">
                  <div>
                    <h3>证据摘要</h3>
                    <p>先判断资料有没有进入正文链路，再决定补证据还是删低价值材料。</p>
                  </div>
                  <Chip tone={evidenceAnalysis.summary.orphanSourceCardCount > 0 ? "warning" : "success"}>
                    {evidenceAnalysis.summary.orphanSourceCardCount > 0 ? "待处理" : "已对齐"}
                  </Chip>
                </div>
                <div className="evidence-metric-grid">
                  {evidenceSummaryMetrics.map((metric) => (
                    <div className="evidence-metric" key={metric.label}>
                      <span>{metric.label}</span>
                      <strong>{metric.value}</strong>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="evidence-gap-card">
                <h3>待补证据</h3>
                <ul className="compact-list">
                  {evidenceAnalysis.criticalJudgementAlerts.length > 0 ? (
                    evidenceAnalysis.criticalJudgementAlerts.map((alert) => (
                      <li key={`${alert.target}-${alert.label}`}>
                        <strong>{alert.label}</strong>
                        <span>{alert.detail}</span>
                      </li>
                    ))
                  ) : (
                    <li>
                      <span>当前没有检测到明确的关键证据缺口。</span>
                    </li>
                  )}
                </ul>
              </Card>
            </div>
            {orphanSourceCards.length > 0 ? (
              <Card className="evidence-action-block">
                <div className="evidence-action-head">
                  <div>
                    <h3>未进入正文链路的资料卡</h3>
                    <p>这些资料已经入库，但没有被提纲或正文引用。下一步应分配到段落证据，或删除低价值材料。</p>
                  </div>
                  <Chip tone="warning">{orphanSourceCards.length} 张</Chip>
                </div>
                <ul className="compact-list evidence-action-list">
                  {orphanSourceCards.slice(0, 6).map((card) => (
                    <li key={card.id}>
                      <strong>{card.title || (displayMode === "debug" ? card.id : "未命名资料卡")}</strong>
                      <span>{card.intendedSection ? `预期落段：${card.intendedSection}` : "未设置预期落段"}</span>
                    </li>
                  ))}
                  {orphanSourceCards.length > 6 ? (
                    <li>
                      <span>还有 {orphanSourceCards.length - 6} 张，建议先处理可信度高、支撑强度高的资料。</span>
                    </li>
                  ) : null}
                </ul>
              </Card>
            ) : null}
            <div className="source-library-list-head">
              <div>
                <h3>资料卡列表</h3>
                <p>按正文可用性浏览，先处理未进入正文链路的资料。</p>
              </div>
              <Chip tone="accent">{selectedBundle.sourceCards.length} 张</Chip>
            </div>
            <ContainedScrollArea className="source-card-board editor-scroll-stack">
              {selectedBundle.sourceCards.length > 0 ? (
                selectedBundle.sourceCards.map((card) => {
                  const isCited = citedSourceCardIds.has(card.id);
                  const isOrphan = orphanSourceCardIds.has(card.id);
                  return (
                    <Card className={`source-card evidence-source-card ${isOrphan ? "source-card-orphan" : ""}`} key={card.id}>
                      <div className="source-card-head">
                        <div className="source-card-title-group">
                          <strong>{card.title || "未命名资料卡"}</strong>
                          <div className="source-card-status-row">
                            <Chip tone={isCited ? "success" : isOrphan ? "warning" : "neutral"}>
                              {isCited ? "已被正文引用" : isOrphan ? "未进入正文链路" : "待分配"}
                            </Chip>
                            <Chip>{card.credibility}可信度</Chip>
                            <Chip>{formatSupportLevel(card.supportLevel)}</Chip>
                            <Chip>{formatClaimType(card.claimType)}</Chip>
                          </div>
                        </div>
                        <div className="source-card-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => onInspectorSelectionChange({ kind: "source-card", sourceCardId: card.id })}
                          >
                            查看
                          </Button>
                          <Button type="button" variant="danger" size="sm" className="source-card-delete" onClick={() => deleteCard(card.id)} disabled={isPending}>
                            删除
                          </Button>
                        </div>
                      </div>
                      <div className="source-card-body-grid">
                        <div className="source-card-main-copy">
                          <p>{card.summary || "还没有摘要。建议回到资料录入补摘要，或重新生成资料摘要。"}</p>
                          {card.evidence ? (
                            <blockquote>{card.evidence}</blockquote>
                          ) : (
                            <blockquote className="source-card-empty-evidence">缺少证据片段，正文引用时会变弱。</blockquote>
                          )}
                        </div>
                        <dl className="source-card-meta-list">
                          <div>
                            <dt>预期落段</dt>
                            <dd>{card.intendedSection || "未设置"}</dd>
                          </div>
                          <div>
                            <dt>片区</dt>
                            <dd>{card.zone || "未分区"}</dd>
                          </div>
                          <div>
                            <dt>来源</dt>
                            <dd>{formatSourceType(card.sourceType)} · {formatTimeSensitivity(card.timeSensitivity)}</dd>
                          </div>
                          {displayMode === "debug" ? (
                            <div>
                              <dt>资料 ID</dt>
                              <dd><code>{card.id}</code></dd>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                      <div className="source-card-footer">
                        <div className="source-card-tags">
                          {card.tags.length > 0 ? card.tags.slice(0, 6).map((tag) => <span key={tag}>{tag}</span>) : <span>无标签</span>}
                        </div>
                        {card.url ? (
                          <a href={card.url} target="_blank" rel="noreferrer">
                            打开来源
                          </a>
                        ) : null}
                      </div>
                      {card.reliabilityNote ? <p className="source-card-reliability">可靠性备注：{card.reliabilityNote}</p> : null}
                    </Card>
                  );
                })
              ) : (
                <EmptyState
                  className="workbench-empty-state"
                  title="还没有资料卡"
                  action={
                    <Button variant="primary" size="lg" type="button" onClick={() => setActiveSection("source-form")}>
                      去录入第一张资料卡
                    </Button>
                  }
                >
                  <p>资料索引会在这里展示可引用资料、证据片段和来源状态。</p>
                </EmptyState>
              )}
            </ContainedScrollArea>
            <details className="source-library-groups-panel">
              <summary>
                <span>资料分组</span>
                <small>按片区 / 可信度</small>
              </summary>
              <div className="two-column source-library-groups">
                <Card className="source-library-group">
                  <h3>按片区分组</h3>
                  <ul className="compact-list">
                    {Object.entries(sourceCardGroups.byZone).map(([group, cards]) => (
                      <li key={group}>
                        <strong>{group}</strong>
                        <span>{cards?.map((card) => card.title).join("、") || "暂无"}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                <Card className="source-library-group">
                  <h3>按可信度分组</h3>
                  <ul className="compact-list">
                    {Object.entries(sourceCardGroups.byCredibility).map(([group, cards]) => (
                      <li key={group}>
                        <strong>{group}</strong>
                        <span>{cards?.map((card) => card.title).join("、") || "暂无"}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </details>
          </Panel>
        ) : null}
      </Surface>
    </>
  );
}

function updateResearchBrief(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  nextResearchBrief: NonNullable<ProjectBundle["researchBrief"]>,
) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          researchBrief: nextResearchBrief,
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

function briefText(value: string, fallback: string, maxLength = 38) {
  const compact = value.trim().replace(/\s+/g, " ");
  if (!compact) return fallback;
  return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
}

function buildResearchDimensionDescription(item: NonNullable<ProjectBundle["researchBrief"]>["mustResearch"][number]) {
  const reason = briefText(item.reason, "", 28);
  const evidence = briefText(item.expectedEvidence, "", 28);
  return [reason ? `原因：${reason}` : "", evidence ? `证据：${evidence}` : ""].filter(Boolean).join(" / ") || "点击补研究理由和证据方向。";
}

function splitTagText(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatSourceType(value: SourceCard["sourceType"]) {
  const labels: Record<SourceCard["sourceType"], string> = {
    official: "官方",
    media: "媒体",
    commentary: "评论",
    interview: "访谈",
    observation: "观察",
  };
  return labels[value] ?? value;
}

function formatSupportLevel(value: SourceCard["supportLevel"]) {
  const labels: Record<SourceCard["supportLevel"], string> = {
    high: "强支撑",
    medium: "中支撑",
    low: "弱支撑",
  };
  return labels[value] ?? value;
}

function formatClaimType(value: SourceCard["claimType"]) {
  const labels: Record<SourceCard["claimType"], string> = {
    fact: "事实",
    observation: "观察",
    judgement: "判断",
    counterevidence: "反证",
    quote: "引语",
  };
  return labels[value] ?? value;
}

function formatTimeSensitivity(value: SourceCard["timeSensitivity"]) {
  const labels: Record<SourceCard["timeSensitivity"], string> = {
    evergreen: "长期有效",
    timely: "阶段有效",
    volatile: "高时效",
  };
  return labels[value] ?? value;
}

function getSourceCardSaveReadiness(form: SourceCardFormState) {
  if (!form.summary.trim()) {
    return { ok: false, message: "保存前先补摘要；可以点“自动生成摘要与证据”。" };
  }
  if (!form.evidence.trim()) {
    return { ok: false, message: "保存前先补证据片段；正文引用需要这部分。" };
  }
  if (splitTagText(form.tagsText).length === 0) {
    return { ok: false, message: "保存前至少补 1 个标签，方便后面分段和索引。" };
  }
  return { ok: true, message: "" };
}
