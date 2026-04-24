"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProjectBundle, SourceCard } from "@/lib/types";
import { getResearchGaps } from "@/lib/workflow";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { useJobAction } from "@/hooks/use-job-action";
import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";

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
      <section className="card stack section-shell">
        <div className="section-shell-compact-head">
          <h2>资料</h2>
          <div className="section-subnav">
            <button className={`section-subnav-button ${activeSection === "research-brief" ? "active" : ""}`} onClick={() => setActiveSection("research-brief")}>
              研究清单
            </button>
            <button className={`section-subnav-button ${activeSection === "source-form" ? "active" : ""}`} onClick={() => setActiveSection("source-form")}>
              资料录入
            </button>
            <button className={`section-subnav-button ${activeSection === "source-library" ? "active" : ""}`} onClick={() => setActiveSection("source-library")}>
              资料索引
            </button>
          </div>
        </div>

        {activeSection === "research-brief" ? (
          <section className="stack section-panel research-brief-stage">
            <div className="section-panel-header">
              <h3>研究清单</h3>
              {selectedBundle.researchBrief ? <span className="badge">{selectedBundle.researchBrief.mustResearch.length} 个维度</span> : null}
            </div>
            {selectedBundle.researchBrief ? (
              <div className="stack">
                <label className="research-angle-field">
                  研究角度
                  <AutoGrowTextarea
                    value={selectedBundle.researchBrief.angle}
                    onChange={(event) =>
                      updateResearchBrief(setSelectedBundle, {
                        ...selectedBundle.researchBrief!,
                        angle: event.target.value,
                      })
                    }
                    rows={3}
                  />
                </label>
                <ContainedScrollArea className="editor-card-grid editor-scroll-stack research-brief-list">
                  {selectedBundle.researchBrief.mustResearch.map((item, index) => (
                    <article className="status-block stack compact-editor-card research-brief-item" key={`must-research-${index}`}>
                      <label>
                        研究维度
                        <input
                          value={item.dimension}
                          onChange={(event) =>
                            updateResearchBrief(setSelectedBundle, {
                              ...selectedBundle.researchBrief!,
                              mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, dimension: event.target.value } : entry,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        为什么要研究
                        <AutoGrowTextarea
                          value={item.reason}
                          onChange={(event) =>
                            updateResearchBrief(setSelectedBundle, {
                              ...selectedBundle.researchBrief!,
                              mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, reason: event.target.value } : entry,
                              ),
                            })
                          }
                          rows={3}
                        />
                      </label>
                      <label>
                        期望证据
                        <AutoGrowTextarea
                          value={item.expectedEvidence}
                          onChange={(event) =>
                            updateResearchBrief(setSelectedBundle, {
                              ...selectedBundle.researchBrief!,
                              mustResearch: selectedBundle.researchBrief!.mustResearch.map((entry, entryIndex) =>
                                entryIndex === index ? { ...entry, expectedEvidence: event.target.value } : entry,
                              ),
                            })
                          }
                          rows={3}
                        />
                      </label>
                    </article>
                  ))}
                </ContainedScrollArea>
                <div className="two-column">
                  <label>
                    关键问题
                    <AutoGrowTextarea
                      value={selectedBundle.researchBrief.questions.join("\n")}
                      onChange={(event) =>
                        updateResearchBrief(setSelectedBundle, {
                          ...selectedBundle.researchBrief!,
                          questions: splitLines(event.target.value),
                        })
                      }
                      rows={6}
                    />
                  </label>
                  <label>
                    盲区提醒
                    <AutoGrowTextarea
                      value={selectedBundle.researchBrief.blindSpots.join("\n")}
                      onChange={(event) =>
                        updateResearchBrief(setSelectedBundle, {
                          ...selectedBundle.researchBrief!,
                          blindSpots: splitLines(event.target.value),
                        })
                      }
                      rows={6}
                    />
                  </label>
                </div>
                <label>
                  阶段清单
                  <AutoGrowTextarea
                    value={selectedBundle.researchBrief.stageChecklist.join("\n")}
                    onChange={(event) =>
                      updateResearchBrief(setSelectedBundle, {
                        ...selectedBundle.researchBrief!,
                        stageChecklist: splitLines(event.target.value),
                      })
                    }
                    rows={5}
                  />
                </label>
                <button onClick={saveResearchBrief} disabled={isPending}>
                  保存研究清单
                </button>
              </div>
            ) : (
              <div className="empty-state stack">
                <p>还没有研究清单。</p>
                <button
                  className="primary-button"
                  onClick={() => void runProjectStep("research-brief", "研究清单已生成。")}
                  disabled={isPending}
                >
                  生成研究清单
                </button>
              </div>
            )}
          </section>
        ) : null}

        {activeSection === "source-form" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>资料录入</h3>
              <span className="badge">{sourceCardForm.rawText.trim().length.toLocaleString()} 字原文</span>
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
              <section className="source-intake-card source-intake-primary">
                <div className="source-intake-head">
                  <div>
                    <h4>快速录入</h4>
                    <p className="subtle">链接来源、标题和入库动作。</p>
                  </div>
                  <span className="badge">{sourceCardForm.title.trim() ? "待保存" : "未命名"}</span>
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
                  <button onClick={extractSourceFromUrl} disabled={isPending || extractJob.isSubmitting || !sourceCardForm.url.trim()}>
                    从链接抓正文
                  </button>
                  <button onClick={autoFillSourceCard} disabled={isPending || summarizeJob.isSubmitting || !sourceCardForm.rawText.trim()}>
                    自动生成摘要与证据
                  </button>
                  <button className="primary-button" onClick={saveSourceCard} disabled={isPending || !sourceCardSaveReadiness.ok}>
                    保存资料卡
                  </button>
                </div>
                {!sourceCardSaveReadiness.ok ? <p className="subtle action-hint">{sourceCardSaveReadiness.message}</p> : null}
              </section>

              <section className="source-intake-card source-raw-card">
                <div className="source-intake-head">
                  <div>
                    <h4>原文池</h4>
                    <p className="subtle">粘贴或抓取的完整资料原文。</p>
                  </div>
                  <span className="badge">{sourceCardForm.rawText.trim().length.toLocaleString()} 字</span>
                </div>
                <label className="source-raw-field">
                  粘贴资料原文
                  <textarea
                    className="source-raw-textarea"
                    value={sourceCardForm.rawText}
                    onChange={(event) => setSourceCardForm({ ...sourceCardForm, rawText: event.target.value })}
                    placeholder="粘贴完整原文、访谈记录或网页正文。"
                  />
                </label>
              </section>

              <section className="source-intake-card source-digest-card">
                <div className="source-intake-head">
                  <div>
                    <h4>摘要与证据</h4>
                    <p className="subtle">这两项决定资料卡后面能不能被正文真正引用。</p>
                  </div>
                </div>
                <label>
                  摘要
                  <AutoGrowTextarea value={sourceCardForm.summary} onChange={(event) => setSourceCardForm({ ...sourceCardForm, summary: event.target.value })} rows={4} />
                </label>
                <label>
                  证据片段
                  <AutoGrowTextarea value={sourceCardForm.evidence} onChange={(event) => setSourceCardForm({ ...sourceCardForm, evidence: event.target.value })} rows={5} />
                </label>
              </section>

              <details className="source-intake-card source-meta-card">
                <summary>
                  <span>资料属性</span>
                  <small>{sourceCardForm.credibility}可信度 · {sourceCardForm.sourceType}</small>
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
          </section>
        ) : null}

        {activeSection === "source-library" ? (
          <section className="stack section-panel source-library-stage">
            <div className="section-panel-header source-library-head">
              <h3>资料索引</h3>
              <span className="badge">{selectedBundle.sourceCards.length} 张</span>
            </div>
            <div className="two-column evidence-summary-grid">
              <article className="status-block evidence-summary-card">
                <h3>证据摘要</h3>
                <ul className="compact-list">
                  <li>
                    <strong>引用覆盖率</strong>
                    <span>{Math.round(evidenceAnalysis.summary.citationCoverage * 100)}%</span>
                  </li>
                  <li>
                    <strong>分段证据覆盖</strong>
                    <span>{Math.round(evidenceAnalysis.summary.sectionEvidenceCoverage * 100)}%</span>
                  </li>
                  <li>
                    <strong>关键点覆盖</strong>
                    <span>{Math.round(evidenceAnalysis.summary.keyPointCoverage * 100)}%</span>
                  </li>
                  <li>
                    <strong>无效引用</strong>
                    <span>{evidenceAnalysis.summary.brokenCitationCount}</span>
                  </li>
                  <li>
                    <strong>孤立资料卡</strong>
                    <span>{evidenceAnalysis.summary.orphanSourceCardCount}</span>
                  </li>
                </ul>
              </article>
              <article className="status-block evidence-gap-card">
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
              </article>
            </div>
            {orphanSourceCards.length > 0 ? (
              <article className="status-block evidence-action-block">
                <div className="evidence-action-head">
                  <div>
                    <h3>未进入正文链路的资料卡</h3>
                    <p>这些资料已经入库，但没有被提纲或正文引用。下一步应分配到段落证据，或删除低价值材料。</p>
                  </div>
                  <span className="badge">{orphanSourceCards.length} 张</span>
                </div>
                <ul className="compact-list evidence-action-list">
                  {orphanSourceCards.slice(0, 6).map((card) => (
                    <li key={card.id}>
                      <strong>{card.title || card.id}</strong>
                      <span>{card.intendedSection ? `预期落段：${card.intendedSection}` : "未设置预期落段"}</span>
                    </li>
                  ))}
                  {orphanSourceCards.length > 6 ? (
                    <li>
                      <span>还有 {orphanSourceCards.length - 6} 张，建议先处理可信度高、支撑强度高的资料。</span>
                    </li>
                  ) : null}
                </ul>
              </article>
            ) : null}
            <div className="source-library-list-head">
              <div>
                <h3>资料卡列表</h3>
                <p>按正文可用性浏览，先处理未进入正文链路的资料。</p>
              </div>
              <span className="badge">{selectedBundle.sourceCards.length} 张</span>
            </div>
            <ContainedScrollArea className="source-card-board editor-scroll-stack">
              {selectedBundle.sourceCards.length > 0 ? (
                selectedBundle.sourceCards.map((card) => {
                  const isCited = citedSourceCardIds.has(card.id);
                  const isOrphan = orphanSourceCardIds.has(card.id);
                  return (
                    <article className={`source-card evidence-source-card ${isOrphan ? "source-card-orphan" : ""}`} key={card.id}>
                      <div className="source-card-head">
                        <div className="source-card-title-group">
                          <strong>{card.title || "未命名资料卡"}</strong>
                          <div className="source-card-status-row">
                            <span className={`status-chip ${isCited ? "status-chip-pass" : isOrphan ? "status-chip-warn" : ""}`}>
                              {isCited ? "已被正文引用" : isOrphan ? "未进入正文链路" : "待分配"}
                            </span>
                            <span className="status-chip">{card.credibility}可信度</span>
                            <span className="status-chip">{card.supportLevel}</span>
                            <span className="status-chip">{card.claimType}</span>
                          </div>
                        </div>
                        <button className="danger-button source-card-delete" onClick={() => deleteCard(card.id)} disabled={isPending}>
                          删除
                        </button>
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
                            <dd>{card.sourceType} · {card.timeSensitivity}</dd>
                          </div>
                          <div>
                            <dt>资料 ID</dt>
                            <dd><code>{card.id}</code></dd>
                          </div>
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
                    </article>
                  );
                })
              ) : (
                <div className="empty-state stack">
                  <p>还没有资料卡。</p>
                  <button className="primary-button" type="button" onClick={() => setActiveSection("source-form")}>
                    去录入第一张资料卡
                  </button>
                </div>
              )}
            </ContainedScrollArea>
            <details className="source-library-groups-panel">
              <summary>
                <span>资料分组</span>
                <small>按片区 / 可信度</small>
              </summary>
              <div className="two-column source-library-groups">
                <article className="status-block source-library-group">
                  <h3>按片区分组</h3>
                  <ul className="compact-list">
                    {Object.entries(sourceCardGroups.byZone).map(([group, cards]) => (
                      <li key={group}>
                        <strong>{group}</strong>
                        <span>{cards?.map((card) => card.title).join("、") || "暂无"}</span>
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="status-block source-library-group">
                  <h3>按可信度分组</h3>
                  <ul className="compact-list">
                    {Object.entries(sourceCardGroups.byCredibility).map(([group, cards]) => (
                      <li key={group}>
                        <strong>{group}</strong>
                        <span>{cards?.map((card) => card.title).join("、") || "暂无"}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </details>
          </section>
        ) : null}
      </section>
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

function splitTagText(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
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
