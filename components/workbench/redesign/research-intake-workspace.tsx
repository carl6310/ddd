"use client";

import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ProjectBundle, SourceCard } from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { useJobAction } from "@/hooks/use-job-action";
import type { ResearchBriefDimensionViewModel, ResearchIntakeViewModel } from "@/lib/design/view-models";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";

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

type StaleArtifact = "research-brief" | "sector-model" | "outline" | "drafts" | "review" | "publish-prep";
type BundleSetter = Dispatch<SetStateAction<ProjectBundle | null>>;

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

export function ResearchIntakeWorkspace({
  model,
  selectedBundle,
  selectedProjectId,
  activeSection,
  setSelectedBundle,
  refreshProjectsAndBundle,
  isPending,
  setIsPending,
  setMessage,
  markArtifactsStale,
  onNavigate,
  onExecute,
}: {
  model: ResearchIntakeViewModel;
  selectedBundle: ProjectBundle;
  selectedProjectId: string;
  activeSection: WorkspaceSection;
  setSelectedBundle: BundleSetter;
  refreshProjectsAndBundle: (id?: string) => Promise<void>;
  isPending: boolean;
  setIsPending: (pending: boolean) => void;
  setMessage: (msg: string) => void;
  markArtifactsStale: (artifacts: StaleArtifact[]) => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  const [sourceCardForm, setSourceCardForm] = useState<SourceCardFormState>(emptySourceCardForm);
  const extractJob = useJobAction();
  const summarizeJob = useJobAction();
  const sourceCardSaveReadiness = getSourceCardSaveReadiness(sourceCardForm);
  const mode = activeSection === "source-form" ? "source-form" : "research-brief";

  useEffect(() => {
    setSourceCardForm(emptySourceCardForm);
  }, [selectedProjectId]);

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

  async function saveResearchBrief() {
    if (!selectedProjectId || !selectedBundle.researchBrief) {
      return;
    }

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

  async function saveSourceCard() {
    if (!selectedProjectId) {
      return;
    }
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

  return (
    <section className="redesign-research-intake" aria-label="研究入口">
      <div className="redesign-research-hero">
        <div className="redesign-research-hero-copy">
          <span>研究入口</span>
          <h2>{model.projectTitle}</h2>
          <p>{mode === "research-brief" ? "先把研究问题和证据方向定清楚，再进入资料录入。" : "把链接、原文、摘要和证据片段整理成真实资料卡。"}</p>
        </div>
        <div className="redesign-research-actions">
          <Button type="button" variant="secondary" onClick={() => onNavigate("research", mode === "research-brief" ? "source-form" : "research-brief")}>
            {mode === "research-brief" ? "去录入资料" : "看研究清单"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => onNavigate("research", "source-library")}>
            资料库
          </Button>
          <Button type="button" variant="primary" disabled={isPending} onClick={() => void onExecute("research-brief")}>
            {model.hasResearchBrief ? "重新生成研究清单" : "生成研究清单"}
          </Button>
        </div>
      </div>

      <div className="redesign-research-metrics" aria-label="研究概览">
        <ResearchMetric label="研究维度" value={model.dimensions.length} detail={model.hasResearchBrief ? "来自研究清单" : "待生成"} />
        <ResearchMetric label="资料卡" value={model.sourceCount} detail={`${model.highCredibilityCount} 高可信`} />
        <ResearchMetric label="资料缺口" value={model.researchGapCount} detail="按研究维度匹配" />
        <ResearchMetric label="引用覆盖" value={model.citationCoverageLabel} detail={`分段 ${model.sectionCoverageLabel}`} />
      </div>

      <div className="redesign-research-tabs" role="tablist" aria-label="研究入口">
        <button type="button" role="tab" className={mode === "research-brief" ? "active" : ""} aria-selected={mode === "research-brief"} onClick={() => onNavigate("research", "research-brief")}>
          研究清单
        </button>
        <button type="button" role="tab" className={mode === "source-form" ? "active" : ""} aria-selected={mode === "source-form"} onClick={() => onNavigate("research", "source-form")}>
          资料录入
        </button>
      </div>

      {mode === "research-brief" ? (
        <ResearchBriefPanel
          model={model}
          selectedBundle={selectedBundle}
          setSelectedBundle={setSelectedBundle}
          isPending={isPending}
          onGenerate={() => onExecute("research-brief")}
          onSave={() => saveResearchBrief()}
        />
      ) : (
        <SourceIntakePanel
          model={model}
          sourceCardForm={sourceCardForm}
          setSourceCardForm={setSourceCardForm}
          isPending={isPending}
          extractPending={extractJob.isSubmitting}
          summarizePending={summarizeJob.isSubmitting}
          saveReadiness={sourceCardSaveReadiness}
          onExtract={() => extractSourceFromUrl()}
          onSummarize={() => autoFillSourceCard()}
          onSave={() => saveSourceCard()}
        />
      )}
    </section>
  );
}

function ResearchBriefPanel({
  model,
  selectedBundle,
  setSelectedBundle,
  isPending,
  onGenerate,
  onSave,
}: {
  model: ResearchIntakeViewModel;
  selectedBundle: ProjectBundle;
  setSelectedBundle: BundleSetter;
  isPending: boolean;
  onGenerate: () => Promise<void>;
  onSave: () => Promise<void>;
}) {
  const researchBrief = selectedBundle.researchBrief;
  if (!researchBrief) {
    return (
      <EmptyState
        title="还没有研究清单"
        className="workbench-empty-state redesign-research-empty"
        action={
          <Button type="button" variant="primary" disabled={isPending || !model.canGenerateResearchBrief} onClick={() => void onGenerate()}>
            生成研究清单
          </Button>
        }
      >
        <p>先生成研究角度、关键问题、盲区提醒和必须研究的证据方向。</p>
      </EmptyState>
    );
  }

  return (
    <div className="redesign-research-grid">
      <main className="redesign-research-main" aria-label="研究清单编辑">
        <div className="redesign-research-panel-head">
          <div>
            <span>研究清单</span>
            <h3>研究清单</h3>
          </div>
          <Chip tone="accent">{model.dimensions.length} 个维度</Chip>
        </div>
        <div className="redesign-research-form-grid">
          <TextAreaField label="研究角度" value={researchBrief.angle} rows={3} onChange={(value) => updateResearchBrief(setSelectedBundle, { ...researchBrief, angle: value })} />
          <ListField label="关键问题" value={researchBrief.questions} rows={5} onChange={(value) => updateResearchBrief(setSelectedBundle, { ...researchBrief, questions: value })} />
          <ListField label="盲区提醒" value={researchBrief.blindSpots} rows={5} onChange={(value) => updateResearchBrief(setSelectedBundle, { ...researchBrief, blindSpots: value })} />
          <ListField label="阶段清单" value={researchBrief.stageChecklist} rows={5} onChange={(value) => updateResearchBrief(setSelectedBundle, { ...researchBrief, stageChecklist: value })} />
        </div>
        <section className="redesign-research-dimensions" aria-label="必须研究">
          <div className="redesign-research-panel-head">
            <div>
              <span>必须研究</span>
              <h3>必须研究</h3>
            </div>
          </div>
          <div className="redesign-research-dimension-list">
            {model.dimensions.map((dimension) => (
              <ResearchDimensionCard
                dimension={dimension}
                key={dimension.id}
                onChange={(patch) =>
                  updateResearchBrief(setSelectedBundle, {
                    ...researchBrief,
                    mustResearch: researchBrief.mustResearch.map((item, index) => (index === dimension.index ? { ...item, ...patch } : item)),
                  })
                }
              />
            ))}
          </div>
        </section>
        <div className="redesign-research-save-row">
          <Button type="button" variant="secondary" disabled={isPending} onClick={() => void onSave()}>
            保存研究清单
          </Button>
        </div>
      </main>

      <aside className="redesign-research-side" aria-label="研究状态">
        <ResearchSideCard title="资料缺口" label={`${model.researchGapCount} 个`}>
          {model.researchGaps.length ? (
            <ul>
              {model.researchGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          ) : (
            <p>当前研究维度都有资料标签支撑。</p>
          )}
        </ResearchSideCard>
        <ResearchSideCard title="近期资料卡" label={`${model.recentSourceCards.length} 张`}>
          {model.recentSourceCards.length ? (
            <div className="redesign-research-source-mini-list">
              {model.recentSourceCards.map((card) => (
                <div className="redesign-research-source-mini" key={card.id}>
                  <strong>{card.title}</strong>
                  <p>{card.summary}</p>
                  <span>{card.credibility}可信 / {formatSupportLevel(card.supportLevel)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>还没有资料卡。研究清单生成后，去资料录入补第一张。</p>
          )}
        </ResearchSideCard>
      </aside>
    </div>
  );
}

function SourceIntakePanel({
  model,
  sourceCardForm,
  setSourceCardForm,
  isPending,
  extractPending,
  summarizePending,
  saveReadiness,
  onExtract,
  onSummarize,
  onSave,
}: {
  model: ResearchIntakeViewModel;
  sourceCardForm: SourceCardFormState;
  setSourceCardForm: Dispatch<SetStateAction<SourceCardFormState>>;
  isPending: boolean;
  extractPending: boolean;
  summarizePending: boolean;
  saveReadiness: { ok: boolean; message: string };
  onExtract: () => Promise<void>;
  onSummarize: () => Promise<void>;
  onSave: () => Promise<void>;
}) {
  return (
    <div className="redesign-source-intake-grid">
      <main className="redesign-source-intake-main" aria-label="资料录入">
        <div className="redesign-research-panel-head">
          <div>
            <span>资料卡</span>
            <h3>资料录入</h3>
          </div>
          <Chip tone={saveReadiness.ok ? "success" : "warning"}>{saveReadiness.ok ? "可保存" : "待补齐"}</Chip>
        </div>
        <div className="redesign-source-intake-actions">
          <Button type="button" variant="secondary" disabled={isPending || extractPending || !sourceCardForm.url.trim()} onClick={() => void onExtract()}>
            从链接抓正文
          </Button>
          <Button type="button" variant="secondary" disabled={isPending || summarizePending || !sourceCardForm.rawText.trim()} onClick={() => void onSummarize()}>
            自动生成摘要与证据
          </Button>
          <Button type="button" variant="primary" disabled={isPending || !saveReadiness.ok} onClick={() => void onSave()}>
            保存资料卡
          </Button>
        </div>
        {!saveReadiness.ok ? <p className="redesign-research-hint">{saveReadiness.message}</p> : null}

        <div className="redesign-research-form-grid">
          <InputField label="标题" value={sourceCardForm.title} placeholder="资料标题" onChange={(value) => setSourceCardForm((current) => ({ ...current, title: value }))} />
          <InputField label="URL" value={sourceCardForm.url} placeholder="https://..." onChange={(value) => setSourceCardForm((current) => ({ ...current, url: value }))} />
          <TextAreaField label="摘要" value={sourceCardForm.summary} rows={5} onChange={(value) => setSourceCardForm((current) => ({ ...current, summary: value }))} />
          <TextAreaField label="证据片段" value={sourceCardForm.evidence} rows={5} onChange={(value) => setSourceCardForm((current) => ({ ...current, evidence: value }))} />
        </div>

        <section className="redesign-source-raw-panel" aria-label="原文池">
          <div className="redesign-research-panel-head">
            <div>
              <span>原文池</span>
              <h3>原文池</h3>
            </div>
            <Chip>{sourceCardForm.rawText.trim().length.toLocaleString()} 字</Chip>
          </div>
          <AutoGrowTextarea
            className="redesign-source-raw-textarea"
            value={sourceCardForm.rawText}
            rows={14}
            placeholder="粘贴完整原文、访谈记录或网页正文。"
            onChange={(event) => setSourceCardForm((current) => ({ ...current, rawText: event.target.value }))}
          />
        </section>
      </main>

      <aside className="redesign-source-intake-side" aria-label="资料属性">
        <ResearchSideCard title="研究缺口" label={`${model.researchGapCount} 个`}>
          {model.researchGaps.length ? <p>{model.researchGaps.slice(0, 4).join(" / ")}</p> : <p>当前没有明确缺口提醒。</p>}
        </ResearchSideCard>
        <InputField label="备注" value={sourceCardForm.note} placeholder="来源备注" onChange={(value) => setSourceCardForm((current) => ({ ...current, note: value }))} />
        <InputField label="发布时间" value={sourceCardForm.publishedAt} placeholder="2026-04-13" onChange={(value) => setSourceCardForm((current) => ({ ...current, publishedAt: value }))} />
        <SelectField label="可信度" value={sourceCardForm.credibility} options={["高", "中", "低"]} onChange={(value) => setSourceCardForm((current) => ({ ...current, credibility: value as SourceCard["credibility"] }))} />
        <SelectField label="来源类型" value={sourceCardForm.sourceType} options={["official", "media", "commentary", "interview", "observation"]} format={formatSourceType} onChange={(value) => setSourceCardForm((current) => ({ ...current, sourceType: value as SourceCard["sourceType"] }))} />
        <SelectField label="支撑强度" value={sourceCardForm.supportLevel} options={["high", "medium", "low"]} format={formatSupportLevel} onChange={(value) => setSourceCardForm((current) => ({ ...current, supportLevel: value as SourceCard["supportLevel"] }))} />
        <SelectField label="论断类型" value={sourceCardForm.claimType} options={["fact", "observation", "judgement", "counterevidence", "quote"]} format={formatClaimType} onChange={(value) => setSourceCardForm((current) => ({ ...current, claimType: value as SourceCard["claimType"] }))} />
        <SelectField label="时效性" value={sourceCardForm.timeSensitivity} options={["evergreen", "timely", "volatile"]} format={formatTimeSensitivity} onChange={(value) => setSourceCardForm((current) => ({ ...current, timeSensitivity: value as SourceCard["timeSensitivity"] }))} />
        <InputField label="片区标签" value={sourceCardForm.zone} placeholder="如：核心承接区" onChange={(value) => setSourceCardForm((current) => ({ ...current, zone: value }))} />
        <InputField label="预期落段" value={sourceCardForm.intendedSection} placeholder="如：开头主判断" onChange={(value) => setSourceCardForm((current) => ({ ...current, intendedSection: value }))} />
        <InputField label="标签" value={sourceCardForm.tagsText} placeholder="规划, 供地, 地铁" onChange={(value) => setSourceCardForm((current) => ({ ...current, tagsText: value }))} />
        <TextAreaField label="可靠性备注" value={sourceCardForm.reliabilityNote} rows={3} onChange={(value) => setSourceCardForm((current) => ({ ...current, reliabilityNote: value }))} />
      </aside>
    </div>
  );
}

function ResearchMetric({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="redesign-research-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function ResearchDimensionCard({
  dimension,
  onChange,
}: {
  dimension: ResearchBriefDimensionViewModel;
  onChange: (patch: Partial<NonNullable<ProjectBundle["researchBrief"]>["mustResearch"][number]>) => void;
}) {
  return (
    <article className={`redesign-research-dimension-card ${dimension.hasSourceSupport ? "has-support" : ""}`}>
      <div className="redesign-research-dimension-head">
        <span>{String(dimension.index + 1).padStart(2, "0")}</span>
        <Chip tone={dimension.hasSourceSupport ? "success" : "warning"}>{dimension.hasSourceSupport ? "有资料支撑" : "待补资料"}</Chip>
      </div>
      <InputField label="研究维度" value={dimension.dimension} onChange={(value) => onChange({ dimension: value })} />
      <TextAreaField label="为什么要研究" value={dimension.reason} rows={3} onChange={(value) => onChange({ reason: value })} />
      <TextAreaField label="期望证据" value={dimension.expectedEvidence} rows={3} onChange={(value) => onChange({ expectedEvidence: value })} />
    </article>
  );
}

function ResearchSideCard({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <section className="redesign-research-side-card">
      <div className="redesign-research-panel-head">
        <div>
          <span>{label}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="redesign-research-field">
      <span>{label}</span>
      <AutoGrowTextarea value={value} rows={rows} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ListField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string[];
  rows: number;
  onChange: (value: string[]) => void;
}) {
  return <TextAreaField label={label} value={value.join("\n")} rows={rows} onChange={(nextValue) => onChange(splitLines(nextValue))} />;
}

function InputField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="redesign-research-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  format,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  format?: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="redesign-research-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option value={option} key={option}>
            {format ? format(option) : option}
          </option>
        ))}
      </select>
    </label>
  );
}

function updateResearchBrief(setSelectedBundle: BundleSetter, nextResearchBrief: NonNullable<ProjectBundle["researchBrief"]>) {
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
