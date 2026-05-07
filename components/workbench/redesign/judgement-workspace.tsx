"use client";

import type { Dispatch, ReactNode, SetStateAction } from "react";
import {
  ARTICLE_PROTOTYPE_LABELS,
  TOPIC_READER_PERSONA_LABELS,
  type ArticlePrototype,
  type ProjectBundle,
  type TopicReaderPersona,
  type TopicVerdict,
} from "@/lib/types";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import type { JudgementWorkspaceIssueViewModel, JudgementWorkspaceViewModel } from "@/lib/design/view-models";
import type { WorkbenchDisplayMode } from "../display-mode";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "../workflow-state";

type JudgementPanel = "think-card" | "style-core" | "vitality";
type BundleSetter = Dispatch<SetStateAction<ProjectBundle | null>>;

const topicVerdictLabels: Record<TopicVerdict, string> = {
  strong: "值得开题",
  rework: "需要重构",
  weak: "暂缓",
};

const articlePrototypeOptions = Object.entries(ARTICLE_PROTOTYPE_LABELS).map(([value, label]) => ({ value: value as ArticlePrototype, label }));
const readerPersonaOptions = Object.entries(TOPIC_READER_PERSONA_LABELS).map(([value, label]) => ({ value: value as TopicReaderPersona, label }));
const topicVerdictOptions = Object.entries(topicVerdictLabels).map(([value, label]) => ({ value: value as TopicVerdict, label }));

export function JudgementWorkspace({
  model,
  selectedBundle,
  activeSection,
  setSelectedBundle,
  isPending,
  onNavigate,
  onExecute,
  onSaveProjectFrame,
  displayMode,
}: {
  model: JudgementWorkspaceViewModel;
  selectedBundle: ProjectBundle;
  activeSection: WorkspaceSection;
  setSelectedBundle: BundleSetter;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  onSaveProjectFrame: () => Promise<void>;
  displayMode: WorkbenchDisplayMode;
}) {
  const showDebugPanels = displayMode === "debug";
  const activePanel = getActivePanel(showDebugPanels ? activeSection : activeSection === "overview-vitality" ? "overview-think-card" : activeSection);
  const project = selectedBundle.project;

  return (
    <section className="redesign-judgement-workspace" aria-label="判断工作区">
      <div className={`redesign-judgement-hero redesign-tone-${getPanelTone(activePanel, model)}`}>
        <div className="redesign-judgement-hero-copy">
          <span>判断核心</span>
          <h2>{model.projectTitle}</h2>
          <p>{getHeroDetail(activePanel, model)}</p>
        </div>
        <div className="redesign-judgement-actions">
          {showDebugPanels ? (
            <Button type="button" variant="secondary" disabled={isPending} onClick={() => onNavigate("overview", "overview-compatibility")}>
              系统映射
            </Button>
          ) : null}
          <Button type="button" variant="primary" disabled={isPending} onClick={() => void onSaveProjectFrame()}>
            保存判断
          </Button>
        </div>
      </div>

      <div className="redesign-judgement-metrics" aria-label="判断概览">
        <JudgementMetric label="选题判断" value={model.thinkCardCompletion.label} tone={model.thinkCardCompletion.tone} detail={topicVerdictLabels[project.thinkCard.topicVerdict]} />
        <JudgementMetric label="表达策略" value={model.styleCoreCompletion.label} tone={model.styleCoreCompletion.tone} detail={`${project.styleCore.allowedMoves.length} 个允许动作`} />
        {showDebugPanels ? (
          <>
            <JudgementMetric label="质量检查" value={model.vitality.statusLabel} tone={model.vitality.tone} detail={`${model.vitality.issueCount} 个提醒`} />
            <JudgementMetric label="发布门槛" value={model.vitality.canPreparePublish ? "可整理" : "待修"} tone={model.vitality.canPreparePublish ? "success" : "warning"} detail={model.vitality.hardBlocked ? "硬阻塞" : "未硬阻塞"} />
          </>
        ) : null}
      </div>

      <div className="redesign-judgement-tabs" role="tablist" aria-label="判断核心入口">
        <button type="button" role="tab" className={activePanel === "think-card" ? "active" : ""} aria-selected={activePanel === "think-card"} onClick={() => onNavigate("overview", "overview-think-card")}>
          选题判断
        </button>
        <button type="button" role="tab" className={activePanel === "style-core" ? "active" : ""} aria-selected={activePanel === "style-core"} onClick={() => onNavigate("overview", "overview-style-core")}>
          表达策略
        </button>
        {showDebugPanels ? (
          <button type="button" role="tab" className={activePanel === "vitality" ? "active" : ""} aria-selected={activePanel === "vitality"} onClick={() => onNavigate("overview", "overview-vitality")}>
            质量检查
          </button>
        ) : null}
      </div>

      {activePanel === "think-card" ? (
        <ThinkCardPanel selectedBundle={selectedBundle} setSelectedBundle={setSelectedBundle} model={model} />
      ) : null}

      {activePanel === "style-core" ? (
        <StyleCorePanel selectedBundle={selectedBundle} setSelectedBundle={setSelectedBundle} model={model} />
      ) : null}

      {activePanel === "vitality" ? (
        <VitalityPanel model={model} selectedBundle={selectedBundle} isPending={isPending} onNavigate={onNavigate} onExecute={onExecute} />
      ) : null}
    </section>
  );
}

function ThinkCardPanel({
  selectedBundle,
  setSelectedBundle,
  model,
}: {
  selectedBundle: ProjectBundle;
  setSelectedBundle: BundleSetter;
  model: JudgementWorkspaceViewModel;
}) {
  const project = selectedBundle.project;
  const thinkCard = project.thinkCard;

  return (
    <div className="redesign-judgement-grid">
      <main className="redesign-judgement-main" aria-label="选题判断编辑">
        <div className="redesign-judgement-panel-head">
          <div>
            <span>选题判断</span>
            <h3>选题判断</h3>
          </div>
          <Chip tone={model.thinkCardCompletion.tone}>{model.thinkCardCompletion.label}</Chip>
        </div>

        <JudgementBrief selectedBundle={selectedBundle} />

        <div className="redesign-judgement-form-grid">
          <TextAreaField variant="primary" label="一句话主判断" value={project.thesis} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { thesis: value })} />
          <TextAreaField variant="primary" label="核心问题" value={project.coreQuestion} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { coreQuestion: value })} />
          <TextAreaField variant="primary" label="素材吃透摘要" value={thinkCard.materialDigest} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { materialDigest: value })} />
          <TextAreaField variant="primary" label="核心判断" value={thinkCard.coreJudgement} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { coreJudgement: value })} />
          <SelectField label="选题值判断" value={thinkCard.topicVerdict} options={topicVerdictOptions} onChange={(value) => updateThinkCardField(setSelectedBundle, { topicVerdict: value as TopicVerdict })} />
          <SelectField label="文章原型" value={thinkCard.articlePrototype} options={articlePrototypeOptions} onChange={(value) => updateThinkCardField(setSelectedBundle, { articlePrototype: value as ArticlePrototype })} />
          <SelectField label="目标读者画像" value={thinkCard.targetReaderPersona} options={readerPersonaOptions} onChange={(value) => updateThinkCardField(setSelectedBundle, { targetReaderPersona: value as TopicReaderPersona })} />
          <TextAreaField label="题值理由" value={thinkCard.verdictReason} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { verdictReason: value })} />
          <TextAreaField label="读者收益" value={thinkCard.readerPayoff} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { readerPayoff: value })} />
          <TextAreaField label="决策影响" value={thinkCard.decisionImplication} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { decisionImplication: value })} />
          <TextAreaField label="创作锚点" value={thinkCard.creativeAnchor} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { creativeAnchor: value })} />
          <TextAreaField label="反直觉抓手" value={thinkCard.counterIntuition} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { counterIntuition: value })} />
        </div>

        <section className="redesign-judgement-subpanel" aria-label="HKR 交付">
          <div className="redesign-judgement-panel-head">
            <div>
              <span>读者交付</span>
              <h3>读者交付</h3>
            </div>
          </div>
          <div className="redesign-judgement-form-grid">
            <TextAreaField label="情绪收益" value={thinkCard.hkr.happy} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { happy: value })} />
            <TextAreaField label="知识收益" value={thinkCard.hkr.knowledge} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { knowledge: value })} />
            <TextAreaField label="共鸣收益" value={thinkCard.hkr.resonance} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { resonance: value })} />
            <TextAreaField label="读者交付总结" value={thinkCard.hkr.summary} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { summary: value })} />
          </div>
        </section>
      </main>

      <aside className="redesign-judgement-side" aria-label="选题上下文">
        <ContextCard title="选题评分" label={model.topicScorecard?.statusLabel ?? "未记录"}>
          <p>{model.topicScorecard?.signalCoverage || "暂时没有选题评分。"}</p>
          {model.topicScorecard ? <small>读者交付 {model.topicScorecard.hkrLabel}</small> : null}
        </ContextCard>
        <ListField label="明确不写什么" value={thinkCard.excludedTakeaways} rows={5} onChange={(value) => updateThinkCardField(setSelectedBundle, { excludedTakeaways: value })} />
        <ListField label="替代角度" value={thinkCard.alternativeAngles} rows={5} onChange={(value) => updateThinkCardField(setSelectedBundle, { alternativeAngles: value })} />
        <TextAreaField label="改方向建议" value={thinkCard.rewriteSuggestion} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { rewriteSuggestion: value })} />
        <TextAreaField label="AI 角色说明" value={thinkCard.aiRole} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { aiRole: value })} />
      </aside>
    </div>
  );
}

function JudgementBrief({ selectedBundle }: { selectedBundle: ProjectBundle }) {
  const project = selectedBundle.project;
  const thinkCard = project.thinkCard;
  const briefItems = [
    {
      label: "主判断",
      value: thinkCard.coreJudgement || project.thesis || "还没有形成主判断。",
    },
    {
      label: "读者收益",
      value: thinkCard.readerPayoff || "还没有写清楚读者收益。",
    },
    {
      label: "反直觉",
      value: thinkCard.counterIntuition || "还没有形成反直觉抓手。",
    },
  ];

  return (
    <section className="redesign-judgement-brief" aria-label="判断摘要">
      {briefItems.map((item) => (
        <article className="redesign-judgement-brief-card" key={item.label}>
          <span>{item.label}</span>
          <p>{item.value}</p>
        </article>
      ))}
    </section>
  );
}

function StyleCorePanel({
  selectedBundle,
  setSelectedBundle,
  model,
}: {
  selectedBundle: ProjectBundle;
  setSelectedBundle: BundleSetter;
  model: JudgementWorkspaceViewModel;
}) {
  const styleCore = selectedBundle.project.styleCore;

  return (
    <div className="redesign-judgement-grid">
      <main className="redesign-judgement-main" aria-label="表达策略编辑">
        <div className="redesign-judgement-panel-head">
          <div>
            <span>表达策略</span>
            <h3>表达策略</h3>
          </div>
          <Chip tone={model.styleCoreCompletion.tone}>{model.styleCoreCompletion.label}</Chip>
        </div>

        <div className="redesign-style-highlight-grid">
          {model.styleHighlights.map((item) => (
            <div className={`redesign-style-highlight redesign-tone-${item.tone}`} key={item.id}>
              <span>{item.label}</span>
              <p>{item.value}</p>
            </div>
          ))}
        </div>

        <section className="redesign-judgement-subpanel" aria-label="推进与判断">
          <div className="redesign-judgement-panel-head">
            <div>
              <span>推进策略</span>
              <h3>推进与判断</h3>
            </div>
          </div>
          <div className="redesign-judgement-form-grid">
            <TextAreaField label="节奏推进" value={styleCore.rhythm} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { rhythm: value })} />
            <TextAreaField label="故意打破" value={styleCore.breakPattern} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { breakPattern: value })} />
            <TextAreaField label="判断力" value={styleCore.judgement} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { judgement: value })} />
            <TextAreaField label="对立面理解" value={styleCore.counterView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { counterView: value })} />
            <TextAreaField label="私人视角" value={styleCore.personalView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalView: value })} />
            <TextAreaField label="亲自下场" value={styleCore.personalStake} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalStake: value })} />
          </div>
        </section>

        <section className="redesign-judgement-subpanel" aria-label="表达动作">
          <div className="redesign-judgement-panel-head">
            <div>
              <span>表达动作</span>
              <h3>表达动作</h3>
            </div>
          </div>
          <div className="redesign-judgement-form-grid">
            <ListField label="开头动作" value={styleCore.openingMoves} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { openingMoves: value })} />
            <ListField label="转场动作" value={styleCore.transitionMoves} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { transitionMoves: value })} />
            <ListField label="结尾回环动作" value={styleCore.endingEchoMoves} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { endingEchoMoves: value })} />
            <TextAreaField label="知识落点" value={styleCore.knowledgeDrop} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { knowledgeDrop: value })} />
            <TextAreaField label="文化升维" value={styleCore.culturalLift} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { culturalLift: value })} />
            <TextAreaField label="句式断裂" value={styleCore.sentenceBreak} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { sentenceBreak: value })} />
            <TextAreaField label="谦逊铺垫" value={styleCore.humbleSetup} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { humbleSetup: value })} />
            <TextAreaField label="回环呼应" value={styleCore.echo} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { echo: value })} />
          </div>
        </section>
      </main>

      <aside className="redesign-judgement-side" aria-label="表达边界">
        <ListField label="允许动作" value={styleCore.allowedMoves} rows={5} onChange={(value) => updateStyleCoreField(setSelectedBundle, { allowedMoves: value })} />
        <ListField label="禁止动作" value={styleCore.forbiddenMoves} rows={5} onChange={(value) => updateStyleCoreField(setSelectedBundle, { forbiddenMoves: value })} />
        <ListField label="允许比喻" value={styleCore.allowedMetaphors} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { allowedMetaphors: value })} />
        <TextAreaField label="人物画像法" value={styleCore.characterPortrait} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { characterPortrait: value })} />
        <TextAreaField label="情绪递进" value={styleCore.emotionCurve} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { emotionCurve: value })} />
        <TextAreaField label="语气上限" value={styleCore.toneCeiling} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { toneCeiling: value })} />
        <TextAreaField label="具体性要求" value={styleCore.concretenessRequirement} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { concretenessRequirement: value })} />
        <TextAreaField label="现实代价" value={styleCore.costSense} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { costSense: value })} />
        <ListField label="禁止编造" value={styleCore.forbiddenFabrications} rows={5} onChange={(value) => updateStyleCoreField(setSelectedBundle, { forbiddenFabrications: value })} />
        <ListField label="泛化黑名单" value={styleCore.genericLanguageBlackList} rows={5} onChange={(value) => updateStyleCoreField(setSelectedBundle, { genericLanguageBlackList: value })} />
        <TextAreaField label="不可靠场景探测" value={styleCore.unsupportedSceneDetector} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { unsupportedSceneDetector: value })} />
      </aside>
    </div>
  );
}

function VitalityPanel({
  model,
  selectedBundle,
  isPending,
  onNavigate,
  onExecute,
}: {
  model: JudgementWorkspaceViewModel;
  selectedBundle: ProjectBundle;
  isPending: boolean;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
}) {
  const passedItems = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status === "pass");

  return (
    <div className="redesign-judgement-grid">
      <main className="redesign-judgement-main" aria-label="质量检查">
        <div className="redesign-judgement-panel-head">
          <div>
            <span>质量检查</span>
            <h3>发布前判断</h3>
          </div>
          <Chip tone={model.vitality.tone}>{model.vitality.statusLabel}</Chip>
        </div>

        <section className={`redesign-vitality-verdict redesign-tone-${model.vitality.tone}`}>
          <strong>{model.vitality.verdict}</strong>
          <p>{model.vitality.hardBlocked ? "当前存在发布硬阻塞。" : "当前没有硬阻塞标记。"}</p>
          <div className="redesign-judgement-actions">
            <Button type="button" variant="secondary" disabled={isPending || !model.vitality.canRunReview} onClick={() => void onExecute("review")}>
              重新检查
            </Button>
            <Button type="button" variant="primary" disabled={!model.vitality.canPreparePublish} onClick={() => onNavigate("publish", "publish-prep")}>
              去发布中心
            </Button>
          </div>
        </section>

        <section className="redesign-judgement-subpanel" aria-label="待处理问题">
          <div className="redesign-judgement-panel-head">
            <div>
              <span>待处理项</span>
              <h3>待处理问题</h3>
            </div>
            <Chip tone={model.issues.length ? "warning" : "success"}>{model.issues.length}</Chip>
          </div>
          {model.issues.length ? (
            <div className="redesign-vitality-issue-list">
              {model.issues.map((issue) => (
                <VitalityIssueCard issue={issue} key={issue.id} />
              ))}
            </div>
          ) : (
            <p className="redesign-judgement-muted">当前没有未通过的检查项。</p>
          )}
        </section>

        {model.qualityPyramid.length ? (
          <section className="redesign-judgement-subpanel" aria-label="质量金字塔">
            <div className="redesign-judgement-panel-head">
              <div>
                <span>质量分层</span>
                <h3>质量金字塔</h3>
              </div>
            </div>
            <div className="redesign-vitality-pyramid-list">
              {model.qualityPyramid.map((layer) => (
                <div className={`redesign-vitality-pyramid-item redesign-tone-${layer.tone}`} key={layer.level}>
                  <span>{layer.level} / {layer.statusLabel}</span>
                  <strong>{layer.title}</strong>
                  <p>{layer.summary}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <aside className="redesign-judgement-side" aria-label="已通过项目">
        <ContextCard title="检查状态" label={model.vitality.statusLabel}>
          <p>{model.vitality.issueCount} 个提醒，{passedItems.length} 个已通过。</p>
        </ContextCard>
        <div className="redesign-vitality-pass-list">
          {passedItems.map((entry) => (
            <div className="redesign-vitality-pass-item" key={entry.key}>
              <strong>{entry.title}</strong>
              <p>{entry.detail}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function JudgementMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  tone: JudgementWorkspaceViewModel["thinkCardCompletion"]["tone"];
}) {
  return (
    <div className={`redesign-judgement-metric redesign-tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function TextAreaField({
  label,
  value,
  rows,
  onChange,
  variant,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
  variant?: "primary";
}) {
  return (
    <label className={`redesign-judgement-field ${variant === "primary" ? "is-primary" : ""}`}>
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
  return (
    <TextAreaField label={label} value={value.join("\n")} rows={rows} onChange={(nextValue) => onChange(splitList(nextValue))} />
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="redesign-judgement-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ContextCard({ title, label, children }: { title: string; label: string; children: ReactNode }) {
  return (
    <section className="redesign-judgement-context-card">
      <div className="redesign-judgement-panel-head">
        <div>
          <span>{label}</span>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function VitalityIssueCard({ issue }: { issue: JudgementWorkspaceIssueViewModel }) {
  return (
    <article className={`redesign-vitality-issue-card redesign-tone-${issue.tone}`}>
      <span>{issue.sourceLabel}</span>
      <strong>{issue.title}</strong>
      <p>{issue.detail}</p>
    </article>
  );
}

function getActivePanel(activeSection: WorkspaceSection): JudgementPanel {
  if (activeSection === "overview-style-core") {
    return "style-core";
  }
  if (activeSection === "overview-vitality") {
    return "vitality";
  }
  return "think-card";
}

function getPanelTone(panel: JudgementPanel, model: JudgementWorkspaceViewModel) {
  switch (panel) {
    case "style-core":
      return model.styleCoreCompletion.tone;
    case "vitality":
      return model.vitality.tone;
    case "think-card":
    default:
      return model.thinkCardCompletion.tone;
  }
}

function getHeroDetail(panel: JudgementPanel, model: JudgementWorkspaceViewModel) {
  switch (panel) {
    case "style-core":
      return `表达策略完成度 ${model.styleCoreCompletion.label}。`;
    case "vitality":
      return model.vitality.verdict;
    case "think-card":
    default:
      return `选题判断完成度 ${model.thinkCardCompletion.label}。`;
  }
}

function updateProjectField(setSelectedBundle: BundleSetter, patch: Partial<ProjectBundle["project"]>) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          project: {
            ...current.project,
            ...patch,
          },
        }
      : current,
  );
}

function updateThinkCardField(setSelectedBundle: BundleSetter, patch: Partial<ProjectBundle["project"]["thinkCard"]>) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          project: {
            ...current.project,
            thinkCard: {
              ...current.project.thinkCard,
              ...patch,
            },
          },
        }
      : current,
  );
}

function updateThinkCardHKR(setSelectedBundle: BundleSetter, patch: Partial<ProjectBundle["project"]["thinkCard"]["hkr"]>) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          project: {
            ...current.project,
            thinkCard: {
              ...current.project.thinkCard,
              hkr: {
                ...current.project.thinkCard.hkr,
                ...patch,
              },
            },
          },
        }
      : current,
  );
}

function updateStyleCoreField(setSelectedBundle: BundleSetter, patch: Partial<ProjectBundle["project"]["styleCore"]>) {
  setSelectedBundle((current) =>
    current
      ? {
          ...current,
          project: {
            ...current.project,
            styleCore: {
              ...current.project.styleCore,
              ...patch,
            },
          },
        }
      : current,
  );
}

function splitList(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}
