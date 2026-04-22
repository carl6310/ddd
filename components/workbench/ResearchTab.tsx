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
  runProjectStep,
  focusSection,
}: ResearchTabProps) {
  const [sourceCardForm, setSourceCardForm] = useState<SourceCardFormState>(emptySourceCardForm);
  const [activeSection, setActiveSection] = useState<ResearchSection>("research-brief");
  const extractJob = useJobAction();
  const summarizeJob = useJobAction();
  const hasResearchBrief = Boolean(selectedBundle.researchBrief);
  const sourceCardCount = selectedBundle.sourceCards.length;

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
      setMessage("资料卡已保存。");
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
      setMessage("研究清单已保存。");
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
      setMessage("资料卡已删除。");
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
        <div className="card-header">
          <div>
            <h2>研究工作区</h2>
            <p className="subtle">把研究问题、资料录入和资料索引拆成二级菜单，减少来回滚动。</p>
          </div>
        </div>
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

        {activeSection === "research-brief" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>研究清单</h3>
              {selectedBundle.researchBrief ? <span className="badge">{selectedBundle.researchBrief.mustResearch.length} 个维度</span> : null}
            </div>
            {selectedBundle.researchBrief ? (
              <div className="stack">
                <label>
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
                <ContainedScrollArea className="editor-card-grid editor-scroll-stack">
                  {selectedBundle.researchBrief.mustResearch.map((item, index) => (
                    <article className="status-block stack compact-editor-card" key={`must-research-${index}`}>
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
              <span className="badge">建议先抓链接，再手改摘要</span>
            </div>
            {researchGaps.length > 0 ? (
              <div className="status-block">
                <h3>资料缺口提醒</h3>
                <ul className="compact-list">
                  {researchGaps.map((gap) => (
                    <li key={gap}>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="workspace-pane-grid">
              <ContainedScrollArea className="workspace-pane workspace-pane-scroll stack">
                <label>
                  标题
                  <input value={sourceCardForm.title} onChange={(event) => setSourceCardForm({ ...sourceCardForm, title: event.target.value })} placeholder="资料标题" />
                </label>
                <label>
                  URL
                  <input value={sourceCardForm.url} onChange={(event) => setSourceCardForm({ ...sourceCardForm, url: event.target.value })} placeholder="https://..." />
                </label>
                <div className="action-row">
                  <button onClick={extractSourceFromUrl} disabled={isPending || extractJob.isSubmitting || !sourceCardForm.url.trim()}>
                    从链接抓正文
                  </button>
                  <button onClick={saveSourceCard} disabled={isPending || (!sourceCardForm.title.trim() && !sourceCardForm.rawText.trim())}>
                    保存资料卡
                  </button>
                </div>
                <label>
                  备注
                  <input value={sourceCardForm.note} onChange={(event) => setSourceCardForm({ ...sourceCardForm, note: event.target.value })} placeholder="来源备注" />
                </label>
                <label>
                  发布时间
                  <input value={sourceCardForm.publishedAt} onChange={(event) => setSourceCardForm({ ...sourceCardForm, publishedAt: event.target.value })} placeholder="2026-04-13" />
                </label>
                <div className="inline-grid">
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
                </div>
                <label>
                  预期落段
                  <input
                    value={sourceCardForm.intendedSection}
                    onChange={(event) => setSourceCardForm({ ...sourceCardForm, intendedSection: event.target.value })}
                    placeholder="如：开头主判断 / 第二段结构拆解"
                  />
                </label>
                <label>
                  可靠性备注
                  <AutoGrowTextarea
                    value={sourceCardForm.reliabilityNote}
                    onChange={(event) => setSourceCardForm({ ...sourceCardForm, reliabilityNote: event.target.value })}
                    rows={3}
                  />
                </label>
                <label>
                  标签
                  <input value={sourceCardForm.tagsText} onChange={(event) => setSourceCardForm({ ...sourceCardForm, tagsText: event.target.value })} placeholder="规划, 供地, 地铁" />
                </label>
                <label>
                  摘要
                  <AutoGrowTextarea value={sourceCardForm.summary} onChange={(event) => setSourceCardForm({ ...sourceCardForm, summary: event.target.value })} rows={3} />
                </label>
                <label>
                  证据片段
                  <AutoGrowTextarea value={sourceCardForm.evidence} onChange={(event) => setSourceCardForm({ ...sourceCardForm, evidence: event.target.value })} rows={4} />
                </label>
              </ContainedScrollArea>
              <div className="workspace-pane workspace-pane-hero stack">
                <label>
                  粘贴资料原文
                  <AutoGrowTextarea
                    value={sourceCardForm.rawText}
                    onChange={(event) => setSourceCardForm({ ...sourceCardForm, rawText: event.target.value })}
                    rows={16}
                    placeholder="把原始文本粘进来，点一下自动生成摘要。"
                  />
                </label>
                <button onClick={autoFillSourceCard} disabled={isPending || summarizeJob.isSubmitting}>
                  自动生成摘要与证据
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {activeSection === "source-library" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>资料索引</h3>
              <span className="badge">{selectedBundle.sourceCards.length} 张</span>
            </div>
            <div className="two-column">
              <article className="status-block">
                <h3>Evidence Summary</h3>
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
              <article className="status-block">
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
            <ContainedScrollArea className="source-card-list editor-scroll-stack">
              {selectedBundle.sourceCards.map((card) => (
                <article className="source-card" key={card.id}>
                  <div className="card-header">
                    <strong>{card.title}</strong>
                    <button className="danger-button" onClick={() => deleteCard(card.id)} disabled={isPending}>
                      删除
                    </button>
                  </div>
                  <p>{card.summary}</p>
                  <small>
                    {card.zone || "未分区"} · {card.credibility} · {card.sourceType} · {card.supportLevel} · {card.claimType}
                  </small>
                  {card.intendedSection ? <small>预期落段：{card.intendedSection}</small> : null}
                  {card.reliabilityNote ? <small>可靠性备注：{card.reliabilityNote}</small> : null}
                  <code>{card.id}</code>
                </article>
              ))}
            </ContainedScrollArea>
            <div className="two-column">
              <article className="status-block">
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
              <article className="status-block">
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
