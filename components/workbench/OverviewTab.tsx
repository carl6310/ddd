"use client";

import { useState } from "react";
import type { ProjectBundle } from "@/lib/types";
import { getTopicReaderLens } from "@/lib/topic-meta";
import { canPreparePublish } from "@/lib/workflow";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { InlineTextAreaEdit } from "@/components/ui/inline-edit";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";
import { AccordionCard } from "@/components/ui/accordion-card";
import { Card, Panel, Surface } from "@/components/ui/surface";
import { buildWritingQualitySnapshot } from "@/lib/writing-quality/summary";
import type { ActiveTab, WorkbenchStepPath, WorkspaceSection } from "./workflow-state";
import type { WorkbenchInspectorSelection } from "./WorkbenchInspector";

type OverviewEditorSection = "think-card" | "style-core" | "compatibility" | "vitality";
type OverviewSurface = "dashboard" | "editor";
type ReviewRepairGroupId = "must" | "should" | "optional";

interface ReviewRepairTask {
  id: string;
  group: ReviewRepairGroupId;
  title: string;
  reason: string;
  suggestedAction?: string;
  sourceLabel: string;
  locationLabel: string;
  targetTab: ActiveTab;
  targetSection: WorkspaceSection;
}

interface OverviewTabProps {
  selectedBundle: ProjectBundle;
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>;
  isPending: boolean;
  runProjectStep: (step: WorkbenchStepPath, successMessage: string) => Promise<void>;
  generatePublishPrep: () => Promise<void>;
  saveProjectFrame: () => Promise<void>;
  setFocusedSection: (section: WorkspaceSection) => void;
  focusSection: WorkspaceSection;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onInspectorSelectionChange: (selection: WorkbenchInspectorSelection) => void;
}

export function OverviewTab({
  selectedBundle,
  setSelectedBundle,
  isPending,
  runProjectStep,
  generatePublishPrep,
  saveProjectFrame,
  setFocusedSection,
  focusSection,
  onNavigate,
  onInspectorSelectionChange,
}: OverviewTabProps) {
  const [localEditorSection, setLocalEditorSection] = useState<OverviewEditorSection>("think-card");
  const [localSurface, setLocalSurface] = useState<OverviewSurface>("dashboard");
  const [handledRepairTaskIds, setHandledRepairTaskIds] = useState<string[]>([]);

  const hasResearchBrief = Boolean(selectedBundle.researchBrief);
  const hasSourceCards = selectedBundle.sourceCards.length > 0;
  const hasSectorModel = Boolean(selectedBundle.sectorModel);
  const hasOutline = Boolean(selectedBundle.outlineDraft);
  const hasDrafts = Boolean(selectedBundle.articleDraft);
  const hasReview = Boolean(selectedBundle.reviewReport);
  const hasPublishPackage = Boolean(selectedBundle.publishPackage);
  const canPublish = canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck);

  const activeEditorSection: OverviewEditorSection = (() => {
    switch (focusSection) {
      case "overview-style-core":
        return "style-core";
      case "overview-compatibility":
        return "compatibility";
      case "overview-vitality":
        return "vitality";
      case "overview-think-card":
        return "think-card";
      default:
        return localEditorSection;
    }
  })();
  const surface: OverviewSurface =
    focusSection === "overview-think-card" ||
    focusSection === "overview-style-core" ||
    focusSection === "overview-compatibility" ||
    focusSection === "overview-vitality"
      ? "editor"
      : localSurface;

  const nextRecommendedStep = !hasResearchBrief
    ? "research-brief"
    : !hasSourceCards
      ? "sector-model"
      : !hasSectorModel
        ? "sector-model"
        : !hasOutline
          ? "outline"
          : !hasDrafts
            ? "drafts"
            : !hasReview
              ? "review"
              : !hasPublishPackage && canPublish
                ? "publish-prep"
                : null;

  const workflowSteps: Array<{
    id: WorkbenchStepPath | "publish-prep";
    label: string;
    targetTab: ActiveTab;
    targetSection: WorkspaceSection;
    status: "complete" | "current" | "ready" | "blocked";
    disabled: boolean;
    hint: string;
    summary: string;
    resultLabel?: string;
    onClick: () => void;
  }> = [
    {
      id: "research-brief",
      label: "1. 生成研究清单",
      targetTab: "research",
      targetSection: "research-brief",
      status: hasResearchBrief ? "complete" : nextRecommendedStep === "research-brief" ? "current" : "ready",
      disabled: isPending,
      hint: hasResearchBrief ? "已生成，结果在“研究清单 & 资料”里。" : "生成后会自动切到“研究清单 & 资料”。",
      summary: hasResearchBrief ? `已生成 ${selectedBundle.researchBrief?.mustResearch.length ?? 0} 个研究维度。` : "先产出问题清单和证据方向。",
      resultLabel: hasResearchBrief ? "查看研究清单" : "去研究区",
      onClick: () => void runProjectStep("research-brief", "研究清单已生成。"),
    },
    {
      id: "sector-model",
      label: "2. 生成板块建模",
      targetTab: !hasResearchBrief || !hasSourceCards ? "research" : "drafts",
      targetSection: !hasResearchBrief ? "research-brief" : !hasSourceCards ? "source-form" : "sector-model",
      status: hasSectorModel ? "complete" : !hasResearchBrief || !hasSourceCards ? "blocked" : nextRecommendedStep === "sector-model" ? "current" : "ready",
      disabled: isPending || !hasResearchBrief || !hasSourceCards,
      hint: !hasResearchBrief ? "请先生成研究清单。" : !hasSourceCards ? "请先添加至少 1 张资料卡。" : "生成后会自动切到“流转定稿”。",
      summary: hasSectorModel ? `已拆出 ${selectedBundle.sectorModel?.zones.length ?? 0} 个片区。` : "把研究结论翻成空间骨架和片区模型。",
      resultLabel: hasSectorModel ? "查看板块建模" : hasSourceCards ? "去流转区等结果" : "去补资料卡",
      onClick: () => void runProjectStep("sector-model", "板块建模已生成。"),
    },
    {
      id: "outline",
      label: "3. 生成提纲",
      targetTab: "drafts",
      targetSection: hasSectorModel ? "outline" : "sector-model",
      status: hasOutline ? "complete" : !hasSectorModel ? "blocked" : nextRecommendedStep === "outline" ? "current" : "ready",
      disabled: isPending || !hasSectorModel,
      hint: hasOutline ? "已生成，结果在“流转定稿”里。" : !hasSectorModel ? "请先生成板块建模。" : "生成后会自动切到“流转定稿”。",
      summary: hasOutline ? `已生成 ${selectedBundle.outlineDraft?.sections.length ?? 0} 段任务书。` : "把板块模型翻成可执行段落提纲。",
      resultLabel: hasOutline ? "查看段落提纲" : "去流转区",
      onClick: () => void runProjectStep("outline", "提纲已生成。"),
    },
    {
      id: "drafts",
      label: "4. 生成双稿",
      targetTab: !hasSourceCards ? "research" : "drafts",
      targetSection: !hasSectorModel ? "sector-model" : !hasOutline ? "outline" : !hasSourceCards ? "source-form" : "drafts",
      status: hasDrafts ? "complete" : !hasSectorModel || !hasOutline || !hasSourceCards ? "blocked" : nextRecommendedStep === "drafts" ? "current" : "ready",
      disabled: isPending || !hasSectorModel || !hasOutline || !hasSourceCards,
      hint: hasDrafts ? "已生成，结果在“流转定稿”里。" : !hasSectorModel || !hasOutline ? "请先完成板块建模和提纲生成。" : !hasSourceCards ? "请先添加资料卡。" : "生成后会自动切到“流转定稿”。",
      summary: hasDrafts ? "分析版、成文版和人工改写区已就绪。" : "基于资料卡和提纲生成可编辑双稿。",
      resultLabel: hasDrafts ? "查看双稿结果" : "去流转区",
      onClick: () => void runProjectStep("drafts", "双稿初稿已生成。"),
    },
    {
      id: "review",
      label: "5. 运行 VitalityCheck",
      targetTab: "overview",
      targetSection: "overview-vitality",
      status: hasReview ? "complete" : !hasDrafts ? "blocked" : nextRecommendedStep === "review" ? "current" : "ready",
      disabled: isPending || !hasDrafts,
      hint: hasReview ? "已更新，结果会在概览里的 VitalityCheck 子页和右侧检查区显示。" : !hasDrafts ? "请先生成双稿。" : "生成后会自动切到概览里的 VitalityCheck 子页。",
      summary: hasReview ? `已生成 ${selectedBundle.reviewReport?.checks.length ?? 0} 条质检检查项。` : "检查结构、证据、风格和作者像度。",
      resultLabel: "查看 VitalityCheck",
      onClick: () => void runProjectStep("review", "质检报告已更新。"),
    },
    {
      id: "publish-prep",
      label: "6. 生成发布前整理",
      targetTab: "drafts",
      targetSection: "publish-prep",
      status: hasPublishPackage ? "complete" : !canPublish ? "blocked" : nextRecommendedStep === "publish-prep" ? "current" : "ready",
      disabled: isPending || !canPublish,
      hint: hasPublishPackage ? "已生成，结果在“流转定稿”的发布整理子页里。" : "需要先让 VitalityCheck 过线。",
      summary: hasPublishPackage ? `已产出 ${selectedBundle.publishPackage?.titleOptions.length ?? 0} 个标题候选和发布摘要。` : "把过线稿整理成可发布版本。",
      resultLabel: hasPublishPackage ? "查看发布整理" : undefined,
      onClick: () => void generatePublishPrep(),
    },
  ];

  const highlightedStep =
    workflowSteps.find((step) => step.status === "current") ??
    workflowSteps.find((step) => step.status === "blocked") ??
    workflowSteps.find((step) => step.status === "ready") ??
    null;
  const thinkCardCompletion = countFilled([
    selectedBundle.project.thesis,
    selectedBundle.project.coreQuestion,
    selectedBundle.project.thinkCard.materialDigest,
    selectedBundle.project.thinkCard.verdictReason,
    selectedBundle.project.thinkCard.coreJudgement,
    selectedBundle.project.thinkCard.articlePrototype,
    selectedBundle.project.thinkCard.targetReaderPersona,
    selectedBundle.project.thinkCard.creativeAnchor,
    selectedBundle.project.thinkCard.counterIntuition,
    selectedBundle.project.thinkCard.readerPayoff,
    selectedBundle.project.thinkCard.decisionImplication,
    selectedBundle.project.thinkCard.excludedTakeaways.join(" "),
    selectedBundle.project.thinkCard.hkr.happy,
    selectedBundle.project.thinkCard.hkr.knowledge,
    selectedBundle.project.thinkCard.hkr.resonance,
    selectedBundle.project.thinkCard.hkr.summary,
    selectedBundle.project.thinkCard.aiRole,
  ]);
  const styleCoreCompletion = countFilled([
    selectedBundle.project.styleCore.rhythm,
    selectedBundle.project.styleCore.breakPattern,
    selectedBundle.project.styleCore.openingMoves.join(" "),
    selectedBundle.project.styleCore.transitionMoves.join(" "),
    selectedBundle.project.styleCore.endingEchoMoves.join(" "),
    selectedBundle.project.styleCore.knowledgeDrop,
    selectedBundle.project.styleCore.personalView,
    selectedBundle.project.styleCore.judgement,
    selectedBundle.project.styleCore.counterView,
    selectedBundle.project.styleCore.allowedMoves.join(" "),
    selectedBundle.project.styleCore.forbiddenMoves.join(" "),
    selectedBundle.project.styleCore.allowedMetaphors.join(" "),
    selectedBundle.project.styleCore.emotionCurve,
    selectedBundle.project.styleCore.personalStake,
    selectedBundle.project.styleCore.characterPortrait,
    selectedBundle.project.styleCore.culturalLift,
    selectedBundle.project.styleCore.sentenceBreak,
    selectedBundle.project.styleCore.echo,
    selectedBundle.project.styleCore.humbleSetup,
    selectedBundle.project.styleCore.toneCeiling,
    selectedBundle.project.styleCore.concretenessRequirement,
    selectedBundle.project.styleCore.costSense,
    selectedBundle.project.styleCore.forbiddenFabrications.join(" "),
    selectedBundle.project.styleCore.genericLanguageBlackList.join(" "),
    selectedBundle.project.styleCore.unsupportedSceneDetector,
  ]);
  const vitalityIssueCount = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status !== "pass").length;
  const vitalityPassed = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status === "pass");
  const writingQuality = buildWritingQualitySnapshot(selectedBundle);
  const topicReaderLens = getTopicReaderLens(selectedBundle.project.topicMeta);
  const argumentFrame = selectedBundle.outlineDraft?.argumentFrame ?? null;
  const reviewRepairTasks = buildReviewRepairTasks(selectedBundle);
  const visibleReviewRepairTasks = reviewRepairTasks.filter((task) => !handledRepairTaskIds.includes(task.id));
  const handledReviewRepairCount = reviewRepairTasks.length - visibleReviewRepairTasks.length;
  const writingQualityMetrics = [
    {
      label: "总体质量分",
      value: writingQuality.overallScore ?? "n/a",
    },
    {
      label: "引用覆盖率",
      value: writingQuality.citationCoverage !== null ? `${Math.round(writingQuality.citationCoverage * 100)}%` : "n/a",
    },
    {
      label: "分段证据覆盖",
      value: writingQuality.sectionEvidenceCoverage !== null ? `${Math.round(writingQuality.sectionEvidenceCoverage * 100)}%` : "n/a",
    },
    {
      label: "编辑反馈事件",
      value: writingQuality.editorialEventCount,
    },
  ];

  return (
    <>
      <Card as="section" className="stack project-summary-card">
        <div className="project-summary-top">
          <div className="project-summary-title">
            <h2>{selectedBundle.project.topic}</h2>
            <p className="subtle">
              {selectedBundle.project.articleType} · {selectedBundle.project.audience}
            </p>
          </div>
          <div className="badge-cluster">
            <Chip tone="accent">{formatProjectStage(selectedBundle.project.stage)}</Chip>
            <a className="link-button" href={`/api/projects/${selectedBundle.project.id}/export/markdown`} target="_blank" rel="noreferrer">
              导出 Markdown
            </a>
          </div>
        </div>
        <div className="project-summary-body">
          <div className="project-summary-row">
            <strong>这篇想说什么</strong>
            <p>{selectedBundle.project.thesis}</p>
          </div>
          <div className="project-summary-row">
            <strong>核心问题</strong>
            <p>{selectedBundle.project.coreQuestion}</p>
          </div>
          {selectedBundle.project.topicMeta.topicScorecard ? (
            <div className="project-summary-row">
              <strong>选题评分</strong>
              <p>
                {selectedBundle.project.topicMeta.topicScorecard.status} · HKR {selectedBundle.project.topicMeta.topicScorecard.hkr.h}/
                {selectedBundle.project.topicMeta.topicScorecard.hkr.k}/{selectedBundle.project.topicMeta.topicScorecard.hkr.r}
              </p>
            </div>
          ) : null}
          <div className="project-summary-row">
            <strong>文章原型 / 读者镜头</strong>
            <p>
              {selectedBundle.project.thinkCard.articlePrototype} · {selectedBundle.project.thinkCard.targetReaderPersona}
              {topicReaderLens.length ? ` · ${topicReaderLens.join(" / ")}` : ""}
            </p>
          </div>
        </div>
      </Card>

      {highlightedStep ? (
        <Card as="section" className="stack workflow-strip-card">
          <div className="workflow-strip-head">
            <h2>下一步操作</h2>
            <Chip className={`workflow-status-chip workflow-status-${highlightedStep.status}`} tone={highlightedStep.status === "complete" ? "success" : highlightedStep.status === "blocked" ? "warning" : "accent"}>
              {highlightedStep.status === "complete" ? "已完成" : highlightedStep.status === "current" ? "当前" : highlightedStep.status === "ready" ? "可执行" : "待解锁"}
            </Chip>
          </div>
          <div className="workflow-strip-body">
            <p>{highlightedStep.label}</p>
            <small>{highlightedStep.summary}</small>
          </div>
          <div className="workflow-step-inline" aria-label="流程概览">
            {workflowSteps.map((step) => (
              <span className={`workflow-step-inline-chip workflow-step-${step.status}`} key={step.id}>
                {step.label}
              </span>
            ))}
          </div>
        </Card>
      ) : null}

      <Surface className="stack section-shell">
        <div className="card-header">
          <div>
            <h2>判断</h2>
            <p className="subtle">先看摘要，只有需要修改时才进入编辑态，避免把首页变成一张长表单。</p>
          </div>
        </div>
        <div className="surface-toggle" role="tablist" aria-label="判断视图">
          <button
            type="button"
            role="tab"
            className={`section-subnav-button ${surface === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setLocalSurface("dashboard");
              setFocusedSection(null);
            }}
            aria-selected={surface === "dashboard"}
          >
            当前概览
          </button>
          <button
            type="button"
            role="tab"
            className={`section-subnav-button ${surface === "editor" ? "active" : ""}`}
            onClick={() => setLocalSurface("editor")}
            aria-selected={surface === "editor"}
          >
            进入编辑
          </button>
        </div>

        {surface === "dashboard" ? (
          <Panel className="stack section-panel overview-dashboard-stage">
            <div className="editor-overview-grid">
              <EditorStatCard label="选题判断" value={`${thinkCardCompletion}/17`} note="ThinkCard 主判断、原型、读者画像、创作锚点和 HKR 已填字段。" />
              <EditorStatCard label="表达策略" value={`${styleCoreCompletion}/25`} note="StyleCore 风格动作、限制条件、anti-fabrication 和具体性要求目前已填字段。" />
              <EditorStatCard label="生命力检查" value={`${vitalityIssueCount}`} note="当前未通过的检查项数量。" />
              <EditorStatCard label="写作质量" value={writingQuality.overallScore !== null ? String(writingQuality.overallScore) : "n/a"} note="当前项目的写作质量基线分数。" />
            </div>
            <div className="overview-quick-grid">
              <OverviewQuickCard
                title="选题评分"
                description="看这题为什么值得写，以及当前建议开题还是补信号。"
                meta={selectedBundle.project.topicMeta.topicScorecard ? selectedBundle.project.topicMeta.topicScorecard.status : "未记录"}
                onOpen={() => {
                  setLocalEditorSection("think-card");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="选题判断"
                description="主判断、题值、读者收获和不写什么。"
                meta={`${thinkCardCompletion}/17 已填`}
                onOpen={() => {
                  setLocalEditorSection("think-card");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="表达策略"
                description="推进节奏、表达动作、作者站位和禁区。"
                meta={`${styleCoreCompletion}/25 已填`}
                onOpen={() => {
                  setLocalEditorSection("style-core");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="质量金字塔"
                description="看问题卡在 L1-L4 哪一层。"
                meta={selectedBundle.reviewReport?.qualityPyramid?.map((layer) => `${layer.level}:${layer.status}`).join(" / ") || "未运行"}
                onOpen={() => {
                  setLocalEditorSection("vitality");
                  setLocalSurface("editor");
                }}
              />
            </div>
            <CompatibilityDiagnostics selectedBundle={selectedBundle} compact />
            {selectedBundle.project.topicMeta.signalBrief ? (
              <Card className="overview-insight-card">
                <h3>信号简报</h3>
                <ul className="compact-list">
                  {selectedBundle.project.topicMeta.signalBrief.signals.slice(0, 4).map((signal) => (
                    <li key={`${signal.title}-${signal.source}`}>
                      <strong>{signal.title}</strong>
                      <span>{signal.summary}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
            {selectedBundle.project.topicMeta.topicScorecard ? (
              <Card className="overview-insight-card">
                <h3>选题评分</h3>
                <ul className="compact-list">
                  <li>
                    <strong>建议状态</strong>
                    <span>{selectedBundle.project.topicMeta.topicScorecard.status}</span>
                  </li>
                  <li>
                    <strong>HKR</strong>
                    <span>
                      {selectedBundle.project.topicMeta.topicScorecard.hkr.h}/{selectedBundle.project.topicMeta.topicScorecard.hkr.k}/
                      {selectedBundle.project.topicMeta.topicScorecard.hkr.r}
                    </span>
                  </li>
                  <li>
                    <strong>信号覆盖</strong>
                    <span>{selectedBundle.project.topicMeta.topicScorecard.signalCoverageSummary}</span>
                  </li>
                </ul>
              </Card>
            ) : null}
            {selectedBundle.reviewReport?.qualityPyramid?.length ? (
              <Card className="overview-insight-card">
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
            {argumentFrame ? (
              <Card className="overview-insight-card">
                <h3>论证骨架</h3>
                <ul className="compact-list">
                  <li>
                    <strong>主形状</strong>
                    <span>{argumentFrame.primaryShape}</span>
                  </li>
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
                </ul>
              </Card>
            ) : null}
            <Card className="writing-quality-card">
              <div className="quality-card-head">
                <div>
                  <h3>写作质量</h3>
                  <p>把质量分、证据覆盖和人工编辑反馈合在一起看，避免被单个数字误导。</p>
                </div>
                <Chip tone={getQualityGateTone(writingQuality.qualityGate.overallStatus)}>
                  {formatQualityGateLabel(writingQuality.qualityGate.overallStatus, writingQuality.qualityGate.mode)}
                </Chip>
              </div>
              <div className="quality-metric-grid">
                {writingQualityMetrics.map((metric) => (
                  <div className="quality-metric" key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>
              {writingQuality.notes.length ? (
                <div className="quality-note-panel">
                  <strong>当前提示</strong>
                  <ul>
                  {writingQuality.notes.slice(0, 6).map((note) => (
                    <li key={note}>
                      <span>{formatQualityNote(note)}</span>
                    </li>
                  ))}
                  </ul>
                </div>
              ) : null}
            </Card>
          </Panel>
        ) : null}

        {surface === "editor" ? (
          <div className="section-subnav" role="tablist" aria-label="创作策略编辑区">
            <button type="button" role="tab" aria-selected={activeEditorSection === "think-card"} className={`section-subnav-button ${activeEditorSection === "think-card" ? "active" : ""}`} onClick={() => setLocalEditorSection("think-card")}>
            选题判断
          </button>
          <button type="button" role="tab" aria-selected={activeEditorSection === "style-core"} className={`section-subnav-button ${activeEditorSection === "style-core" ? "active" : ""}`} onClick={() => setLocalEditorSection("style-core")}>
            表达策略
          </button>
          <button type="button" role="tab" aria-selected={activeEditorSection === "vitality"} className={`section-subnav-button ${activeEditorSection === "vitality" ? "active" : ""}`} onClick={() => setLocalEditorSection("vitality")}>
            VitalityCheck
          </button>
          </div>
        ) : null}

        {surface === "editor" && activeEditorSection === "think-card" ? (
          <Panel className="stack section-panel">
            <div className="section-panel-header">
              <div className="stack section-header-copy">
                <h3>选题判断</h3>
                <p className="subtle">ThinkCard 是这篇文章的主命题来源。</p>
              </div>
              <Chip tone="accent">{selectedBundle.project.thinkCard.topicVerdict}</Chip>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="完成度" value={`${thinkCardCompletion}/17`} note="先把主判断、原型、读者画像、创作锚点和 HKR 补完整。" />
              <EditorStatCard label="当前题值" value={selectedBundle.project.thinkCard.topicVerdict} note="`strong / rework / weak` 决定后面是否值得继续往下推。" />
              <EditorStatCard label="替代角度" value={String(selectedBundle.project.thinkCard.alternativeAngles.length)} note="保留备选角度，避免正文写到一半才发现命题不成立。" />
            </div>
            <div className="editor-group-grid">
              <AccordionCard title="立论基础" description="先把这篇文章到底在回答什么讲清楚。" defaultOpen>
                <TextAreaField label="一句话主判断" value={selectedBundle.project.thesis} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { thesis: value })} />
                <TextAreaField label="核心问题" value={selectedBundle.project.coreQuestion} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { coreQuestion: value })} />
                <TextAreaField label="素材吃透摘要" value={selectedBundle.project.thinkCard.materialDigest} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { materialDigest: value })} />
                <TextAreaField label="核心判断" value={selectedBundle.project.thinkCard.coreJudgement} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { coreJudgement: value })} />
                <SelectField label="文章原型" value={selectedBundle.project.thinkCard.articlePrototype} onChange={(value) => updateThinkCardField(setSelectedBundle, { articlePrototype: value as typeof selectedBundle.project.thinkCard.articlePrototype })} options={["total_judgement", "spatial_segmentation", "buyer_split", "transaction_observation", "decision_service", "risk_deconstruction", "scene_character"]} />
                <SelectField label="目标读者画像" value={selectedBundle.project.thinkCard.targetReaderPersona} onChange={(value) => updateThinkCardField(setSelectedBundle, { targetReaderPersona: value as typeof selectedBundle.project.thinkCard.targetReaderPersona })} options={["busy_relocator", "improver_buyer", "risk_aware_reader", "local_life_reader"]} />
                <TextAreaField label="创作锚点" value={selectedBundle.project.thinkCard.creativeAnchor} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { creativeAnchor: value })} />
                <TextAreaField label="反直觉抓手" value={selectedBundle.project.thinkCard.counterIntuition} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { counterIntuition: value })} />
              </AccordionCard>
              <AccordionCard title="题值判断" description="这里决定这题值不值得继续投入。">
                <SelectField label="选题值判断" value={selectedBundle.project.thinkCard.topicVerdict} onChange={(value) => updateThinkCardField(setSelectedBundle, { topicVerdict: value as typeof selectedBundle.project.thinkCard.topicVerdict })} options={["strong", "rework", "weak"]} />
                <TextAreaField label="值得写 / 不够好的原因" value={selectedBundle.project.thinkCard.verdictReason} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { verdictReason: value })} />
                <TextAreaField label="改方向建议" value={selectedBundle.project.thinkCard.rewriteSuggestion} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { rewriteSuggestion: value })} />
                <TextAreaField label="读者收益" value={selectedBundle.project.thinkCard.readerPayoff} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { readerPayoff: value })} />
                <TextAreaField label="决策影响" value={selectedBundle.project.thinkCard.decisionImplication} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { decisionImplication: value })} />
              </AccordionCard>
              <AccordionCard title="读者交付" description="把读者的情绪收益、知识收益和共鸣收益拆开写。">
                <TextAreaField label="情绪收益" value={selectedBundle.project.thinkCard.hkr.happy} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { happy: value })} />
                <TextAreaField label="知识收益" value={selectedBundle.project.thinkCard.hkr.knowledge} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { knowledge: value })} />
                <TextAreaField label="共鸣收益" value={selectedBundle.project.thinkCard.hkr.resonance} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { resonance: value })} />
                <TextAreaField label="读者交付总结" value={selectedBundle.project.thinkCard.hkr.summary} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { summary: value })} />
              </AccordionCard>
              <AccordionCard title="备选路线" description="保留可切换方向，避免命题一条路走死。">
                <TextAreaField
                  label="替代角度"
                  value={selectedBundle.project.thinkCard.alternativeAngles.join("\n")}
                  rows={4}
                  onChange={(value) =>
                    updateThinkCardField(setSelectedBundle, {
                      alternativeAngles: value
                        .split(/\n|,/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <TextAreaField label="AI 角色说明" value={selectedBundle.project.thinkCard.aiRole} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { aiRole: value })} />
                <TextAreaField
                  label="明确不写什么"
                  value={selectedBundle.project.thinkCard.excludedTakeaways.join("\n")}
                  rows={4}
                  onChange={(value) =>
                    updateThinkCardField(setSelectedBundle, {
                      excludedTakeaways: value
                        .split(/\n|,/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </AccordionCard>
            </div>
            <Button type="button" variant="secondary" size="md" onClick={saveProjectFrame} disabled={isPending}>
              保存选题判断
            </Button>
          </Panel>
        ) : null}

        {surface === "editor" && activeEditorSection === "style-core" ? (
          <Panel className="stack section-panel">
            <div className="section-panel-header">
              <div className="stack section-header-copy">
                <h3>表达策略</h3>
                <p className="subtle">StyleCore 是后续提纲、初稿和修稿的写法约束。</p>
              </div>
              <Chip tone="accent">StyleCore</Chip>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="完成度" value={`${styleCoreCompletion}/25`} note="先补齐推进、动作资产、作者站位和 anti-fabrication 规则。" />
              <EditorStatCard label="核心动作" value="节奏 + 判断" note="这两组字段最直接决定正文是不是只是资料堆叠。" />
              <EditorStatCard label="作者像" value="私人视角" note="没有作者站位时，整篇会更像结构化报告而不是文章。" />
            </div>
            <div className="editor-group-grid">
              <AccordionCard title="推进与判断" description="决定文章往前走的主驱动力。" defaultOpen>
                <TextAreaField label="节奏推进" value={selectedBundle.project.styleCore.rhythm} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { rhythm: value })} />
                <TextAreaField label="故意打破" value={selectedBundle.project.styleCore.breakPattern} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { breakPattern: value })} />
                <TextAreaField label="开头动作" value={selectedBundle.project.styleCore.openingMoves.join("\n")} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { openingMoves: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })} />
                <TextAreaField label="转场动作" value={selectedBundle.project.styleCore.transitionMoves.join("\n")} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { transitionMoves: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })} />
                <TextAreaField label="结尾回环动作" value={selectedBundle.project.styleCore.endingEchoMoves.join("\n")} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { endingEchoMoves: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })} />
                <TextAreaField label="判断力" value={selectedBundle.project.styleCore.judgement} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { judgement: value })} />
                <TextAreaField label="对立面理解" value={selectedBundle.project.styleCore.counterView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { counterView: value })} />
              </AccordionCard>
              <AccordionCard title="动作边界" description="明确这篇允许什么动作，禁止什么套路。">
                <TextAreaField
                  label="允许动作"
                  value={selectedBundle.project.styleCore.allowedMoves.join("\n")}
                  rows={4}
                  onChange={(value) =>
                    updateStyleCoreField(setSelectedBundle, {
                      allowedMoves: value
                        .split(/\n|,/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <TextAreaField
                  label="禁止动作"
                  value={selectedBundle.project.styleCore.forbiddenMoves.join("\n")}
                  rows={4}
                  onChange={(value) =>
                    updateStyleCoreField(setSelectedBundle, {
                      forbiddenMoves: value
                        .split(/\n|,/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <TextAreaField
                  label="允许比喻"
                  value={selectedBundle.project.styleCore.allowedMetaphors.join("\n")}
                  rows={4}
                  onChange={(value) =>
                    updateStyleCoreField(setSelectedBundle, {
                      allowedMetaphors: value
                        .split(/\n|,/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </AccordionCard>
              <AccordionCard title="作者站位" description="让这篇东西更像你写的，而不是系统写的。">
                <TextAreaField label="私人视角" value={selectedBundle.project.styleCore.personalView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalView: value })} />
                <TextAreaField label="亲自下场" value={selectedBundle.project.styleCore.personalStake} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalStake: value })} />
                <TextAreaField label="人物画像法" value={selectedBundle.project.styleCore.characterPortrait} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { characterPortrait: value })} />
                <TextAreaField label="情绪递进" value={selectedBundle.project.styleCore.emotionCurve} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { emotionCurve: value })} />
              </AccordionCard>
              <AccordionCard title="表达动作" description="让知识不是生硬掉落，而是顺着叙事滑进去。">
                <TextAreaField label="知识顺手掏出来的方式" value={selectedBundle.project.styleCore.knowledgeDrop} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { knowledgeDrop: value })} />
                <TextAreaField label="文化升维" value={selectedBundle.project.styleCore.culturalLift} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { culturalLift: value })} />
                <TextAreaField label="句式断裂" value={selectedBundle.project.styleCore.sentenceBreak} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { sentenceBreak: value })} />
                <TextAreaField label="谦逊铺垫法" value={selectedBundle.project.styleCore.humbleSetup} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { humbleSetup: value })} />
                <TextAreaField label="语气上限" value={selectedBundle.project.styleCore.toneCeiling} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { toneCeiling: value })} />
                <TextAreaField
                  label="具体性要求"
                  value={selectedBundle.project.styleCore.concretenessRequirement}
                  rows={3}
                  onChange={(value) => updateStyleCoreField(setSelectedBundle, { concretenessRequirement: value })}
                />
              </AccordionCard>
              <AccordionCard title="回收与代价" description="结尾有没有回环，判断有没有现实重量。">
                <TextAreaField label="回环呼应" value={selectedBundle.project.styleCore.echo} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { echo: value })} />
                <TextAreaField label="现实代价" value={selectedBundle.project.styleCore.costSense} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { costSense: value })} />
                <TextAreaField label="禁止编造" value={selectedBundle.project.styleCore.forbiddenFabrications.join("\n")} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { forbiddenFabrications: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })} />
                <TextAreaField label="泛化黑名单" value={selectedBundle.project.styleCore.genericLanguageBlackList.join("\n")} rows={4} onChange={(value) => updateStyleCoreField(setSelectedBundle, { genericLanguageBlackList: value.split(/\n|,/).map((item) => item.trim()).filter(Boolean) })} />
                <TextAreaField label="Unsupported scene detector" value={selectedBundle.project.styleCore.unsupportedSceneDetector} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { unsupportedSceneDetector: value })} />
              </AccordionCard>
            </div>
            <Button type="button" variant="secondary" size="md" onClick={saveProjectFrame} disabled={isPending}>
              保存表达策略
            </Button>
          </Panel>
        ) : null}

        {surface === "editor" && activeEditorSection === "compatibility" ? (
          <Panel className="stack section-panel">
            <div className="section-panel-header">
              <div className="stack section-header-copy">
                <h3>系统映射</h3>
                <p className="subtle">旧链路诊断，只读查看。</p>
              </div>
              <Chip>只读</Chip>
            </div>
            <CompatibilityDiagnostics selectedBundle={selectedBundle} />
          </Panel>
        ) : null}

        {surface === "editor" && activeEditorSection === "vitality" ? (
          <Panel className="stack section-panel">
            <div className="section-panel-header">
              <div className="stack section-header-copy">
                <h3>VitalityCheck</h3>
                <p className="subtle">你改完正文后，点右侧按钮重新检查，不需要重新生成整套流程。</p>
              </div>
              <div className="action-row">
                <Chip className={`status-${selectedBundle.project.vitalityCheck.overallStatus}`} tone={selectedBundle.project.vitalityCheck.overallStatus === "pass" ? "success" : selectedBundle.project.vitalityCheck.overallStatus === "fail" ? "danger" : "warning"}>
                  {selectedBundle.project.vitalityCheck.overallStatus}
                </Chip>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => void runProjectStep("review", "质检报告已更新。")}
                  disabled={isPending || !hasDrafts}
                >
                  重新检查
                </Button>
              </div>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="总体状态" value={selectedBundle.project.vitalityCheck.overallStatus} note={selectedBundle.project.vitalityCheck.overallVerdict || "还没有总体判断。"} />
              <EditorStatCard label="待修任务" value={String(visibleReviewRepairTasks.length)} note="优先处理必须先修，再看建议修。" />
              <EditorStatCard label="是否硬阻塞" value={selectedBundle.project.vitalityCheck.hardBlocked ? "是" : "否"} note={selectedBundle.project.vitalityCheck.hardBlocked ? "先不要进发布整理。" : "可以继续润色或进入下一步。"} />
            </div>
            <ContainedScrollArea className="vitality-scroll-panel">
              <ReviewRepairList
                tasks={visibleReviewRepairTasks}
                totalCount={reviewRepairTasks.length}
                handledCount={handledReviewRepairCount}
                onNavigate={onNavigate}
                onInspectTask={(task) =>
                  onInspectorSelectionChange({
                    kind: "review-issue",
                    title: task.title,
                    reason: task.reason,
                    sourceLabel: task.sourceLabel,
                    locationLabel: task.locationLabel,
                    suggestedAction: task.suggestedAction,
                    targetTab: task.targetTab,
                    targetSection: task.targetSection,
                  })
                }
                onMarkHandled={(taskId) => {
                  setHandledRepairTaskIds((current) => (current.includes(taskId) ? current : [...current, taskId]));
                }}
              />

              {vitalityPassed.length ? (
                <details className="ui-card vitality-detail-card">
                  <summary>已达标项（{vitalityPassed.length}）</summary>
                  <ul className="compact-list compact-inline-list mt-3">
                    {vitalityPassed.map((entry) => (
                      <li key={entry.key}>
                        <strong className="status-pass">{entry.title}</strong>
                        <span>{entry.detail}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </ContainedScrollArea>
          </Panel>
        ) : null}
      </Surface>
    </>
  );
}

function ReviewRepairList({
  tasks,
  totalCount,
  handledCount,
  onNavigate,
  onInspectTask,
  onMarkHandled,
}: {
  tasks: ReviewRepairTask[];
  totalCount: number;
  handledCount: number;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onInspectTask: (task: ReviewRepairTask) => void;
  onMarkHandled: (taskId: string) => void;
}) {
  const groups: Array<{
    id: ReviewRepairGroupId;
    title: string;
    description: string;
    emptyText: string;
    tone: "danger" | "warning" | "neutral";
  }> = [
    {
      id: "must",
      title: "必须先修",
      description: "会阻止发布整理，或者会让文章判断失真。",
      emptyText: "没有硬阻塞。",
      tone: "danger",
    },
    {
      id: "should",
      title: "建议修",
      description: "不一定阻塞，但会影响连贯性、论证力度或证据可信度。",
      emptyText: "暂时没有建议修复项。",
      tone: "warning",
    },
    {
      id: "optional",
      title: "可选润色",
      description: "更偏表达和作者像，适合主要问题修完后再看。",
      emptyText: "暂无额外润色建议。",
      tone: "neutral",
    },
  ];

  if (totalCount === 0) {
    return (
      <Card className="vitality-detail-card review-repair-empty-state">
        <h3>修复任务</h3>
        <p>当前没有需要处理的质检项。可以继续人工润色，或进入发布整理。</p>
      </Card>
    );
  }

  return (
    <div className="review-repair-list">
      <Card className="vitality-detail-card review-repair-summary">
        <div>
          <h3>修复任务</h3>
          <p>先处理“必须先修”，再看“建议修”。每条任务都可以直接定位到应该改的区域。</p>
        </div>
        <div className="review-repair-summary-chips">
          <Chip tone={tasks.some((task) => task.group === "must") ? "danger" : "success"}>待处理 {tasks.length}</Chip>
          {handledCount > 0 ? <Chip tone="neutral">已标记 {handledCount}</Chip> : null}
        </div>
      </Card>

      {groups.map((group) => {
        const groupTasks = tasks.filter((task) => task.group === group.id);
        return (
          <section className={`review-repair-group review-repair-group-${group.id}`} key={group.id}>
            <div className="review-repair-group-head">
              <div>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <Chip tone={group.tone}>{groupTasks.length}</Chip>
            </div>
            {groupTasks.length ? (
              <div className="review-repair-cards">
                {groupTasks.map((task) => (
                  <article className="review-repair-card" key={task.id}>
                    <div className="review-repair-card-top">
                      <div>
                        <span className="review-repair-source">{task.sourceLabel}</span>
                        <h4>{task.title}</h4>
                      </div>
                      <Chip tone={group.tone}>{task.locationLabel}</Chip>
                    </div>
                    <p>{task.reason}</p>
                    {task.suggestedAction ? <small>{task.suggestedAction}</small> : null}
                    <div className="review-repair-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          onInspectTask(task);
                          onNavigate(task.targetTab, task.targetSection);
                        }}
                      >
                        定位
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => onMarkHandled(task.id)}>
                        标记已处理
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="review-repair-empty">{group.emptyText}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function buildReviewRepairTasks(selectedBundle: ProjectBundle): ReviewRepairTask[] {
  const tasks: ReviewRepairTask[] = [];
  const projectId = selectedBundle.project.id;
  const reviewReport = selectedBundle.reviewReport;
  const vitalityIssues = selectedBundle.project.vitalityCheck.entries.filter(
    (entry): entry is typeof entry & { status: "warn" | "fail" } => entry.status !== "pass",
  );

  if (selectedBundle.project.vitalityCheck.hardBlocked && vitalityIssues.every((entry) => entry.status !== "fail")) {
    tasks.push({
      id: buildRepairTaskId(projectId, "vitality-hard-block", selectedBundle.project.vitalityCheck.overallVerdict),
      group: "must",
      title: "发布整理被硬阻塞",
      reason: selectedBundle.project.vitalityCheck.overallVerdict || "当前 VitalityCheck 判定还不能进入发布整理。",
      sourceLabel: "发布门槛",
      locationLabel: "全文",
      targetTab: "overview",
      targetSection: "overview-vitality",
    });
  }

  for (const item of buildVitalityGuidance(vitalityIssues, reviewReport)) {
    tasks.push({
      id: buildRepairTaskId(projectId, "vitality", item.key, item.why),
      group: item.status === "fail" ? "must" : "should",
      title: item.title,
      reason: item.why,
      suggestedAction: item.how[0],
      sourceLabel: "生命力门槛",
      locationLabel: "全文",
      targetTab: "overview",
      targetSection: "overview-vitality",
    });
  }

  if (!reviewReport) {
    return tasks;
  }

  for (const layer of reviewReport.qualityPyramid.filter((item) => item.status !== "pass")) {
    const fixTip = layer.status === "fail" ? layer.mustFix[0] : layer.shouldFix[0] ?? layer.optionalPolish[0];
    tasks.push({
      id: buildRepairTaskId(projectId, "quality-pyramid", layer.level, layer.summary),
      group: layer.status === "fail" ? "must" : "should",
      title: formatQualityLayerTitle(layer.level, layer.title),
      reason: layer.summary,
      suggestedAction: fixTip,
      sourceLabel: "质量金字塔",
      locationLabel: layer.level,
      targetTab: "overview",
      targetSection: "overview-vitality",
    });
  }

  for (const check of reviewReport.checks.filter((item) => item.status !== "pass")) {
    const isUnsupportedScene = hasUnsupportedSceneSignal(check.key, check.title, check.detail);
    tasks.push({
      id: buildRepairTaskId(projectId, "review-check", check.key, check.detail),
      group: check.status === "fail" || isUnsupportedScene ? "must" : "should",
      title: isUnsupportedScene ? "不可靠场景细节" : check.title,
      reason: check.detail,
      sourceLabel: check.layer ? `检查项 ${check.layer}` : "检查项",
      locationLabel: check.evidenceIds.length ? `证据 ${check.evidenceIds.length}` : "全文",
      targetTab: isUnsupportedScene ? "drafts" : "overview",
      targetSection: isUnsupportedScene ? "drafts" : "overview-vitality",
    });
  }

  for (const intent of reviewReport.structuralRewriteIntents ?? []) {
    tasks.push({
      id: buildRepairTaskId(projectId, "structural-rewrite", intent.issueTypes.join("-"), intent.whyItFails),
      group: "must",
      title: formatStructuralRewriteTitle(intent.issueTypes),
      reason: intent.whyItFails,
      suggestedAction: formatRewriteMode(intent.suggestedRewriteMode),
      sourceLabel: "结构重写",
      locationLabel: getSectionLabel(selectedBundle, intent.affectedSectionIds),
      targetTab: shouldReviewTaskOpenOutline(intent.issueTypes) ? "structure" : "drafts",
      targetSection: shouldReviewTaskOpenOutline(intent.issueTypes) ? "outline" : "drafts",
    });
  }

  for (const intent of reviewReport.deferredStructuralRewriteIntents ?? []) {
    tasks.push({
      id: buildRepairTaskId(projectId, "deferred-structural-rewrite", intent.issueTypes.join("-"), intent.whyItFails),
      group: "should",
      title: `后续结构修复：${formatStructuralRewriteTitle(intent.issueTypes)}`,
      reason: intent.whyItFails,
      suggestedAction: formatRewriteMode(intent.suggestedRewriteMode),
      sourceLabel: "延后重写",
      locationLabel: getSectionLabel(selectedBundle, intent.affectedSectionIds),
      targetTab: shouldReviewTaskOpenOutline(intent.issueTypes) ? "structure" : "drafts",
      targetSection: shouldReviewTaskOpenOutline(intent.issueTypes) ? "outline" : "drafts",
    });
  }

  for (const flag of reviewReport.continuityFlags ?? []) {
    tasks.push({
      id: buildRepairTaskId(projectId, "continuity", flag.type, flag.sectionIds.join("-"), flag.reason),
      group: flag.severity === "fail" ? "must" : "should",
      title: formatContinuityTitle(flag.type),
      reason: flag.reason,
      suggestedAction: flag.suggestedAction,
      sourceLabel: "连续性",
      locationLabel: getSectionLabel(selectedBundle, flag.sectionIds),
      targetTab: "drafts",
      targetSection: "drafts",
    });
  }

  for (const flag of reviewReport.argumentQualityFlags ?? []) {
    const openOutline = shouldReviewTaskOpenOutline([flag.type]);
    tasks.push({
      id: buildRepairTaskId(projectId, "argument", flag.type, flag.sectionIds.join("-"), flag.reason),
      group: flag.severity === "fail" ? "must" : "should",
      title: formatArgumentQualityTitle(flag.type),
      reason: formatArgumentQualityMessage(flag.type, flag.reason),
      suggestedAction: flag.suggestedAction,
      sourceLabel: "论证质量",
      locationLabel: getSectionLabel(selectedBundle, flag.sectionIds),
      targetTab: openOutline ? "structure" : "drafts",
      targetSection: openOutline ? "outline" : "drafts",
    });
  }

  for (const intent of reviewReport.rewriteIntents) {
    tasks.push({
      id: buildRepairTaskId(projectId, "rewrite-intent", intent.targetRange, intent.issueType, intent.whyItFails),
      group: hasUnsupportedSceneSignal(intent.issueType, intent.whyItFails) ? "must" : "should",
      title: formatRewriteIssueTitle(intent.issueType),
      reason: intent.whyItFails,
      suggestedAction: intent.suggestedRewriteMode,
      sourceLabel: "段落返工",
      locationLabel: intent.targetRange,
      targetTab: "drafts",
      targetSection: "drafts",
    });
  }

  for (const flag of reviewReport.paragraphFlags) {
    const isUnsupportedScene = hasUnsupportedSceneSignal(flag.issueTypes.join(" "), flag.detail, flag.preview);
    tasks.push({
      id: buildRepairTaskId(projectId, "paragraph", String(flag.paragraphIndex), flag.issueTypes.join("-"), flag.preview),
      group: isUnsupportedScene ? "must" : "should",
      title: isUnsupportedScene ? "段落含不可靠场景" : `段落需要${formatParagraphAction(flag.suggestedAction)}`,
      reason: `${flag.detail}${flag.preview ? `：${flag.preview}` : ""}`,
      suggestedAction: formatParagraphAction(flag.suggestedAction),
      sourceLabel: "段落检查",
      locationLabel: flag.sectionHeading || `段落 ${flag.paragraphIndex + 1}`,
      targetTab: "drafts",
      targetSection: "drafts",
    });
  }

  for (const tip of reviewReport.revisionSuggestions.slice(0, 8)) {
    tasks.push({
      id: buildRepairTaskId(projectId, "revision-suggestion", tip),
      group: "optional",
      title: "补充修稿建议",
      reason: tip,
      sourceLabel: "润色建议",
      locationLabel: "全文",
      targetTab: "drafts",
      targetSection: "drafts",
    });
  }

  for (const pattern of reviewReport.missingPatterns.slice(0, 6)) {
    tasks.push({
      id: buildRepairTaskId(projectId, "missing-pattern", pattern),
      group: "optional",
      title: "补回作者动作",
      reason: pattern,
      sourceLabel: "作者像",
      locationLabel: "全文",
      targetTab: "drafts",
      targetSection: "drafts",
    });
  }

  return dedupeRepairTasks(tasks);
}

function dedupeRepairTasks(tasks: ReviewRepairTask[]) {
  const seen = new Set<string>();
  return tasks.map((task) => ({
    ...task,
    title: formatRepairText(task.title),
    reason: formatRepairText(task.reason),
    suggestedAction: task.suggestedAction ? formatRepairText(task.suggestedAction) : undefined,
    sourceLabel: formatRepairText(task.sourceLabel),
    locationLabel: formatRepairText(task.locationLabel),
  })).filter((task) => {
    const key = `${task.group}|${task.title}|${task.reason}|${task.locationLabel}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildRepairTaskId(...parts: string[]) {
  return parts
    .join("|")
    .replace(/\s+/g, " ")
    .slice(0, 220);
}

function getSectionLabel(selectedBundle: ProjectBundle, sectionIds: string[]) {
  if (sectionIds.length === 0) {
    return "全文";
  }
  const sections = selectedBundle.outlineDraft?.sections ?? [];
  const labels = sectionIds.map((id) => sections.find((section) => section.id === id)?.heading || id);
  return `章节：${labels.slice(0, 3).join(" / ")}${labels.length > 3 ? "…" : ""}`;
}

function shouldReviewTaskOpenOutline(issueTypes: string[]) {
  return issueTypes.some((type) => type === "map_tour_in_judgement_essay" || type === "factor_tour_in_judgement_essay" || type === "zones_used_as_structure_not_evidence");
}

function hasUnsupportedSceneSignal(...values: string[]) {
  const text = values.join(" ").toLowerCase();
  return /unsupported[-_ ]?scene|scene[_-]?unsupported|unsupported scene|编造|不可靠场景|伪现场|买家 quote|pseudo[-_ ]?interview/.test(text);
}

function formatRepairText(text: string) {
  return text
    .replaceAll("Unsupported Scene", "不可靠场景")
    .replaceAll("unsupported-scene", "不可靠场景")
    .replaceAll("unsupported_scene", "不可靠场景")
    .replaceAll("WritingLint", "写作硬伤")
    .replaceAll("StructureFlow", "结构推进")
    .replaceAll("StyleCore", "表达策略")
    .replaceAll("ThinkCard", "选题判断")
    .replaceAll("mustUseEvidenceIds", "必要证据")
    .replaceAll("continuityLedger", "连续性台账");
}

function formatQualityLayerTitle(level: string, title: string) {
  const labels: Record<string, string> = {
    WritingLint: "写作硬伤",
    StructureFlow: "结构推进",
    EvidenceDepth: "证据深度",
    AuthorVoice: "作者像",
  };
  return `${level} ${labels[title] ?? title}`;
}

function formatStructuralRewriteTitle(issueTypes: string[]) {
  if (issueTypes.includes("map_tour_in_judgement_essay") || issueTypes.includes("factor_tour_in_judgement_essay")) {
    return "判断稿结构需要改成论点驱动";
  }
  if (issueTypes.includes("headline_not_answered") || issueTypes.includes("thesis_too_generic")) {
    return "开头需要更早回答标题问题";
  }
  if (issueTypes.includes("counterargument_missing")) {
    return "需要补真实反方处理";
  }
  return issueTypes.map((type) => formatContinuityTitle(type)).join(" / ");
}

function formatContinuityTitle(type: string) {
  const labels: Record<string, string> = {
    does_not_answer_previous: "没有回答上一节问题",
    no_new_information: "这一节没有新增信息",
    can_be_swapped: "相邻章节可以互换",
    section_redundant: "章节可能冗余",
    repeated_claim: "重复同一个判断",
    fake_bridge: "转场只是表面连接",
    section_does_not_deliver_new_information: "没有兑现提纲的新信息",
    section_does_not_answer_ledger: "没有回答论证台账的问题",
    section_missing_required_evidence: "缺少必要证据",
    section_missing_optional_evidence: "可选证据未使用",
    unlinked_adjacency: "相邻章节没有接上",
  };
  return labels[type] ?? type;
}

function formatRewriteIssueTitle(type: string) {
  const labels: Record<string, string> = {
    weak_opening: "开头不够有力",
    missing_anchor: "缺少具体锚点",
    weak_transition: "段落衔接弱",
    evidence_not_integrated: "证据没有融进判断",
    generic_language: "表达太泛",
    missing_scene: "缺少场景或代价感",
    missing_cost: "缺少现实代价",
    weak_ending_echo: "结尾回扣不够",
  };
  return labels[type] ?? type;
}

function formatRewriteMode(mode: string) {
  const labels: Record<string, string> = {
    merge_sections: "合并相关章节",
    delete_redundant_section: "删除冗余章节",
    reorder_sections: "调整章节顺序",
    rewrite_section_roles: "重写章节角色",
    rewrite_opening_and_next_section: "重写开头和下一节承接",
  };
  return labels[mode] ?? mode;
}

function formatParagraphAction(action: string) {
  const labels: Record<string, string> = {
    rewrite: "重写",
    split: "拆分",
    move: "移动",
    trim: "压缩",
  };
  return labels[action] ?? action;
}

function updateProjectField(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  patch: Partial<ProjectBundle["project"]>,
) {
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

function updateThinkCardField(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  patch: Partial<ProjectBundle["project"]["thinkCard"]>,
) {
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

function updateThinkCardHKR(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  patch: Partial<ProjectBundle["project"]["thinkCard"]["hkr"]>,
) {
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

function updateStyleCoreField(
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>,
  patch: Partial<ProjectBundle["project"]["styleCore"]>,
) {
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

function getQualityGateTone(status: string) {
  if (status === "fail") {
    return "danger";
  }
  if (status === "warn" || status === "warn-only") {
    return "warning";
  }
  return "success";
}

function formatQualityGateLabel(status: string, mode: string) {
  const statusLabel: Record<string, string> = {
    fail: "未达标",
    warn: "需留意",
    pass: "已达标",
  };
  const modeLabel: Record<string, string> = {
    "warn-only": "仅提醒",
    "soft-block": "建议先修",
    "hard-block": "暂缓发布",
  };
  return `${statusLabel[status] ?? status} / ${modeLabel[mode] ?? mode}`;
}

function formatQualityNote(note: string) {
  const artifactLabels: Record<string, string> = {
    article_draft: "正文初稿",
    review_report: "发布前检查",
    outline_draft: "段落提纲",
    source_cards: "资料卡",
    project_bundle: "项目数据包",
  };
  return Object.entries(artifactLabels).reduce(
    (current, [key, label]) => current.replaceAll(key, label),
    note,
  );
}

function formatArgumentQualityTitle(type: string) {
  const labels: Record<string, string> = {
    headline_not_answered: "标题问题没有回答",
    thesis_too_generic: "主判断太泛",
    map_tour_in_judgement_essay: "判断稿写成片区巡游",
    factor_tour_in_judgement_essay: "判断稿写成因素目录",
    zones_used_as_structure_not_evidence: "片区成了目录",
    counterargument_missing: "缺少反方处理",
    decision_frame_weak: "决策框架弱",
    too_much_background_before_answer: "答案出现太晚",
    evidence_without_argument: "证据没有服务论点",
    claim_without_consequence: "论点缺少读者后果",
  };
  return labels[type] ?? type;
}

function formatArgumentQualityMessage(type: string, fallback: string) {
  if (type === "map_tour_in_judgement_essay") {
    return "这篇是判断稿，但中段像片区巡游。建议把片区材料合并进核心论点，不要连续写成北广场/南广场/商务区/春申。";
  }
  return fallback;
}

function TextAreaField({
  label,
  value,
  onChange,
  rows,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
}) {
  return (
    <label>
      {label}
      <InlineTextAreaEdit value={value} onChange={(val: string) => onChange(val)} rows={rows} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}



function EditorStatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="editor-stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function OverviewQuickCard({
  title,
  description,
  meta,
  onOpen,
}: {
  title: string;
  description: string;
  meta: string;
  onOpen: () => void;
}) {
  return (
    <article className="overview-quick-card">
      <div className="stack">
        <h4>{title}</h4>
        <p className="subtle">{description}</p>
        <small>{meta}</small>
      </div>
      <Button type="button" variant="secondary" size="md" onClick={onOpen}>
        进入编辑
      </Button>
    </article>
  );
}

function CompatibilityDiagnostics({
  selectedBundle,
  compact = false,
}: {
  selectedBundle: ProjectBundle;
  compact?: boolean;
}) {
  const { hkrr, hamd, writingMoves } = selectedBundle.project;
  const derivedItems = [
    {
      label: "HKRR",
      value: [hkrr.happy, hkrr.knowledge, hkrr.resonance, hkrr.rhythm].filter(Boolean).length,
      total: 4,
      summary: hkrr.summary || hkrr.knowledge || "待同步",
    },
    {
      label: "HAMD",
      value: [hamd.hook, hamd.anchor, hamd.different].filter(Boolean).length,
      total: 3,
      summary: hamd.anchor || hamd.hook || "待同步",
    },
    {
      label: "旧动作卡",
      value: [
        writingMoves.signatureLine,
        writingMoves.characterScene,
        writingMoves.freshObservation,
        writingMoves.culturalLift,
        writingMoves.costSense,
        writingMoves.echoLine,
      ].filter(Boolean).length,
      total: 6,
      summary: writingMoves.signatureLine || writingMoves.echoLine || "待同步",
    },
  ];

  if (compact) {
    return (
      <details className="compat-diagnostics compact-compat-diagnostics">
        <summary>
          <span>系统映射</span>
          <small>旧链路只读诊断</small>
        </summary>
        <div className="compat-diagnostics-grid">
          {derivedItems.map((item) => (
            <article className="compat-diagnostics-item" key={item.label}>
              <span>{item.label}</span>
              <strong>
                {item.value}/{item.total}
              </strong>
              <small>{item.summary}</small>
            </article>
          ))}
        </div>
      </details>
    );
  }

  return (
    <div className="compat-diagnostics">
      <div className="compat-diagnostics-grid">
        {derivedItems.map((item) => (
          <article className="compat-diagnostics-item" key={item.label}>
            <span>{item.label}</span>
            <strong>
              {item.value}/{item.total}
            </strong>
            <small>{item.summary}</small>
          </article>
        ))}
      </div>
      <div className="compat-readout">
        <section>
          <h4>旧读者交付</h4>
          <ul className="compact-list">
            <li>
              <strong>情绪收益</strong>
              <span>{hkrr.happy || "待同步"}</span>
            </li>
            <li>
              <strong>知识收益</strong>
              <span>{hkrr.knowledge || "待同步"}</span>
            </li>
            <li>
              <strong>共鸣收益</strong>
              <span>{hkrr.resonance || "待同步"}</span>
            </li>
            <li>
              <strong>节奏推进</strong>
              <span>{hkrr.rhythm || "待同步"}</span>
            </li>
          </ul>
        </section>
        <section>
          <h4>旧开题卡</h4>
          <ul className="compact-list">
            <li>
              <strong>开头抓手</strong>
              <span>{hamd.hook || "待同步"}</span>
            </li>
            <li>
              <strong>创作锚点</strong>
              <span>{hamd.anchor || "待同步"}</span>
            </li>
            <li>
              <strong>差异判断</strong>
              <span>{hamd.different || "待同步"}</span>
            </li>
          </ul>
        </section>
        <section>
          <h4>旧动作卡</h4>
          <ul className="compact-list">
            <li>
              <strong>标志句</strong>
              <span>{writingMoves.signatureLine || "待同步"}</span>
            </li>
            <li>
              <strong>新鲜观察</strong>
              <span>{writingMoves.freshObservation || "待同步"}</span>
            </li>
            <li>
              <strong>回环句</strong>
              <span>{writingMoves.echoLine || "待同步"}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function countFilled(values: string[]) {
  return values.filter((value) => value.trim()).length;
}

function buildVitalityGuidance(
  entries: Array<{ key: string; title: string; status: "warn" | "fail" } & { detail: string }>,
  reviewReport: ProjectBundle["reviewReport"],
) {
  return entries.map((entry) => {
    const relatedKeys = getRelatedReviewKeys(entry.key);
    const related = (reviewReport?.checks ?? [])
      .filter((check) => relatedKeys.includes(check.key) && check.status !== "pass")
      .map((check) => check.detail)
      .slice(0, 3);

    return {
      key: entry.key,
      title: entry.title,
      status: entry.status,
      why: entry.detail,
      how: getFixSteps(entry.key),
      examples: getFixExamples(entry.key),
      related,
    };
  });
}

function getRelatedReviewKeys(key: string) {
  switch (key) {
    case "cannot-invent":
      return ["citations"];
    case "momentum":
      return ["emotional-arc", "paragraph-transitions", "reading-rhythm", "heavy-paragraphs"];
    case "echo":
      return ["echo", "emotional-progression"];
    case "not-old-copy":
      return ["fresh-observation", "misconception-detail"];
    case "humble-setup":
      return ["humble-setup", "humble-requirement"];
    case "oral-tone":
      return ["oral-coverage", "oral-requirement"];
    default:
      return [];
  }
}

function getFixSteps(key: string) {
  switch (key) {
    case "cannot-invent":
      return [
        "把关键判断后面补上资料卡引用，不要只写结论。",
        "优先给规划兑现、板块切割、片区价差、供应节奏这几类硬判断挂来源。",
        "一句结论只挂最相关的 1 到 2 张资料卡，不要一段堆很多引用。",
      ];
    case "momentum":
      return [
        "不要补独立过渡句；重写上一节结尾和下一节开头，让下一节成为上一节问题的自然答案。",
        "把最重的一段拆成两到三段，每段只推进一个判断。",
        "先讲表象，再讲结构原因，最后讲后果，不要一段里同时讲三层。",
      ];
    case "echo":
      return [
        "结尾回扣开头那句最强判断，不要只做平铺总结。",
        "用一句“回到开头”式的收束，把文章重新扣回主命题。",
        "如果前面用了抓手词，结尾要重新点名那个抓手。",
      ];
    case "not-old-copy":
      return [
        "从这次材料里挑一个新的具体观察立起来，不要只复述旧结论。",
        "把“为什么这次和以前不一样”写成一两句明确判断。",
        "优先从片区差异、切割线、更新节奏里长出新观察。",
      ];
    case "humble-setup":
      return [
        "在最强判断前先加一句自己的不确定或迟疑。",
        "把语气从“下判断”改成“我这次重新捋材料后的理解”。",
        "核心结论前至少留一个谦逊缓冲，不要一上来像判卷子。",
      ];
    case "oral-tone":
      return [
        "多加几句人话转场，少一点连续分析报告腔。",
        "把两三处平直陈述改成聊天口吻，例如“问题就在这”“说真的”。",
        "让每个关键转场更像你在带读者往前走，而不是只陈列信息。",
      ];
    default:
      return ["先把这条问题对应的判断、证据和表达重新对齐，再继续往下润色。"];
  }
}

function getFixExamples(key: string) {
  switch (key) {
    case "cannot-invent":
      return [
        "这不是体感猜测，资料卡里已经能看到更新节奏长期偏慢。[SC:资料卡ID]",
        "如果只看位置当然会误判，但真正决定价格的，是后面的结构性问题。[SC:资料卡ID]",
      ];
    case "momentum":
      return [
        "但问题恰恰不在“离得近”，而在它内部一直没长成一个完整板块。",
        "说真的，距离只是表象，更深层的是后面这几个结构问题。",
      ];
    case "echo":
      return [
        "回到开头，塘桥最尴尬的地方，正是这种离核心很近、却接不住红利的夹心感。",
        "所以塘桥的问题，从来不是规划不够好，而是它一直没从“夹心层”里真正长出来。",
      ];
    case "not-old-copy":
      return [
        "这次真正新的地方在于，塘桥不是一个整体板块，而是被主干道和老旧存量切成了几个完全不同的生活单元。",
        "离陆家嘴近这件事，反而让它长期被误判成“理应跟涨”的板块。",
      ];
    case "humble-setup":
      return [
        "说实话，这个判断我一开始也拿不太准。",
        "这只是我把材料重新捋过一遍之后的理解。",
      ];
    case "oral-tone":
      return [
        "说真的，这地方最拧巴的其实不是规划，而是结构。",
        "你想想看，离核心这么近，结果却一直没真正接住红利，这才是问题。",
      ];
    default:
      return [];
  }
}
