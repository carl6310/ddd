"use client";

import { useState } from "react";
import type { ProjectBundle } from "@/lib/types";
import { canPreparePublish } from "@/lib/workflow";
import { AutoGrowTextarea } from "@/components/ui/auto-grow-textarea";
import { ContainedScrollArea } from "@/components/ui/contained-scroll-area";

type WorkbenchStepPath = "research-brief" | "sector-model" | "outline" | "drafts" | "review";
type ActiveTab = "overview" | "research" | "drafts";
type WorkspaceSection =
  | "overview-think-card"
  | "overview-style-core"
  | "overview-compatibility"
  | "overview-vitality"
  | "research-brief"
  | "source-form"
  | "source-library"
  | "sector-model"
  | "outline"
  | "drafts"
  | "publish-prep"
  | null;
type OverviewEditorSection = "think-card" | "style-core" | "compatibility" | "vitality";
type OverviewSurface = "dashboard" | "editor";

interface OverviewTabProps {
  selectedBundle: ProjectBundle;
  setSelectedBundle: React.Dispatch<React.SetStateAction<ProjectBundle | null>>;
  isPending: boolean;
  runProjectStep: (step: WorkbenchStepPath, successMessage: string) => Promise<void>;
  generatePublishPrep: () => Promise<void>;
  saveProjectFrame: () => Promise<void>;
  setFocusedSection: (section: WorkspaceSection) => void;
  focusSection: WorkspaceSection;
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
}: OverviewTabProps) {
  const [localEditorSection, setLocalEditorSection] = useState<OverviewEditorSection>("think-card");
  const [localSurface, setLocalSurface] = useState<OverviewSurface>("dashboard");

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
    selectedBundle.project.thinkCard.hkr.happy,
    selectedBundle.project.thinkCard.hkr.knowledge,
    selectedBundle.project.thinkCard.hkr.resonance,
    selectedBundle.project.thinkCard.hkr.summary,
    selectedBundle.project.thinkCard.aiRole,
  ]);
  const styleCoreCompletion = countFilled([
    selectedBundle.project.styleCore.rhythm,
    selectedBundle.project.styleCore.breakPattern,
    selectedBundle.project.styleCore.knowledgeDrop,
    selectedBundle.project.styleCore.personalView,
    selectedBundle.project.styleCore.judgement,
    selectedBundle.project.styleCore.counterView,
    selectedBundle.project.styleCore.emotionCurve,
    selectedBundle.project.styleCore.personalStake,
    selectedBundle.project.styleCore.characterPortrait,
    selectedBundle.project.styleCore.culturalLift,
    selectedBundle.project.styleCore.sentenceBreak,
    selectedBundle.project.styleCore.echo,
    selectedBundle.project.styleCore.humbleSetup,
    selectedBundle.project.styleCore.costSense,
  ]);
  const vitalityIssueCount = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status !== "pass").length;
  const vitalityIssues = selectedBundle.project.vitalityCheck.entries.filter(
    (entry): entry is typeof entry & { status: "warn" | "fail" } => entry.status !== "pass",
  );
  const vitalityPassed = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status === "pass");
  const vitalityGuidance = buildVitalityGuidance(vitalityIssues, selectedBundle.reviewReport);

  return (
    <>
      <section className="card stack project-summary-card">
        <div className="project-summary-top">
          <div className="project-summary-title">
            <h2>{selectedBundle.project.topic}</h2>
            <p className="subtle">
              {selectedBundle.project.articleType} · {selectedBundle.project.audience}
            </p>
          </div>
          <div className="badge-cluster">
            <span className="badge">{selectedBundle.project.stage}</span>
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
        </div>
      </section>

      {highlightedStep ? (
        <section className="card stack workflow-strip-card">
          <div className="workflow-strip-head">
            <h2>下一步操作</h2>
            <span className={`workflow-status-chip workflow-status-${highlightedStep.status}`}>
              {highlightedStep.status === "complete" ? "已完成" : highlightedStep.status === "current" ? "当前" : highlightedStep.status === "ready" ? "可执行" : "待解锁"}
            </span>
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
        </section>
      ) : null}

      <section className="card stack section-shell">
        <div className="card-header">
          <div>
            <h2>选题与检查</h2>
            <p className="subtle">先看摘要，只有需要修改时才进入编辑态，避免把首页变成一张长表单。</p>
          </div>
        </div>
        <div className="surface-toggle">
          <button
            className={`section-subnav-button ${surface === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setLocalSurface("dashboard");
              setFocusedSection(null);
            }}
          >
            当前概览
          </button>
          <button className={`section-subnav-button ${surface === "editor" ? "active" : ""}`} onClick={() => setLocalSurface("editor")}>
            进入编辑
          </button>
        </div>

        {surface === "dashboard" ? (
          <section className="stack section-panel">
            <div className="editor-overview-grid">
              <EditorStatCard label="ThinkCard" value={`${thinkCardCompletion}/9`} note="主判断、题值理由和 HKR 已填字段。" />
              <EditorStatCard label="StyleCore" value={`${styleCoreCompletion}/14`} note="风格动作目前已填字段。" />
              <EditorStatCard label="VitalityCheck" value={`${vitalityIssueCount}`} note="当前未通过的检查项数量。" />
            </div>
            <div className="overview-quick-grid">
              <OverviewQuickCard
                title="选题判断"
                description="看主判断、题值和读者收获。"
                meta={`${thinkCardCompletion}/9 已填`}
                onOpen={() => {
                  setLocalEditorSection("think-card");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="表达策略"
                description="看推进、判断和作者站位。"
                meta={`${styleCoreCompletion}/14 已填`}
                onOpen={() => {
                  setLocalEditorSection("style-core");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="旧版映射"
                description="检查老链路还能不能正常工作。"
                meta="HKRR / HAMD / 旧动作卡"
                onOpen={() => {
                  setLocalEditorSection("compatibility");
                  setLocalSurface("editor");
                }}
              />
              <OverviewQuickCard
                title="发布前检查"
                description="先看 fail，再看 warn。"
                meta={`${vitalityIssueCount} 个问题待处理`}
                onOpen={() => {
                  setLocalEditorSection("vitality");
                  setLocalSurface("editor");
                }}
              />
            </div>
          </section>
        ) : null}

        {surface === "editor" ? (
          <div className="section-subnav">
            <button className={`section-subnav-button ${activeEditorSection === "think-card" ? "active" : ""}`} onClick={() => setLocalEditorSection("think-card")}>
            ThinkCard
          </button>
          <button className={`section-subnav-button ${activeEditorSection === "style-core" ? "active" : ""}`} onClick={() => setLocalEditorSection("style-core")}>
            StyleCore
          </button>
          <button className={`section-subnav-button ${activeEditorSection === "compatibility" ? "active" : ""}`} onClick={() => setLocalEditorSection("compatibility")}>
            兼容层
          </button>
          <button className={`section-subnav-button ${activeEditorSection === "vitality" ? "active" : ""}`} onClick={() => setLocalEditorSection("vitality")}>
            VitalityCheck
          </button>
          </div>
        ) : null}

        {surface === "editor" && activeEditorSection === "think-card" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>ThinkCard</h3>
              <span className="badge">{selectedBundle.project.thinkCard.topicVerdict}</span>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="完成度" value={`${thinkCardCompletion}/9`} note="先把主判断、题值理由和 HKR 补完整。" />
              <EditorStatCard label="当前题值" value={selectedBundle.project.thinkCard.topicVerdict} note="`strong / rework / weak` 决定后面是否值得继续往下推。" />
              <EditorStatCard label="替代角度" value={String(selectedBundle.project.thinkCard.alternativeAngles.length)} note="保留备选角度，避免正文写到一半才发现命题不成立。" />
            </div>
            <div className="editor-group-grid">
              <EditorGroupCard title="立论基础" description="先把这篇文章到底在回答什么讲清楚。">
                <TextAreaField label="一句话主判断" value={selectedBundle.project.thesis} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { thesis: value })} />
                <TextAreaField label="核心问题" value={selectedBundle.project.coreQuestion} rows={3} onChange={(value) => updateProjectField(setSelectedBundle, { coreQuestion: value })} />
                <TextAreaField label="素材吃透摘要" value={selectedBundle.project.thinkCard.materialDigest} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { materialDigest: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="题值判断" description="这里决定这题值不值得继续投入。">
                <SelectField label="选题值判断" value={selectedBundle.project.thinkCard.topicVerdict} onChange={(value) => updateThinkCardField(setSelectedBundle, { topicVerdict: value as typeof selectedBundle.project.thinkCard.topicVerdict })} options={["strong", "rework", "weak"]} />
                <TextAreaField label="值得写 / 不够好的原因" value={selectedBundle.project.thinkCard.verdictReason} rows={4} onChange={(value) => updateThinkCardField(setSelectedBundle, { verdictReason: value })} />
                <TextAreaField label="改方向建议" value={selectedBundle.project.thinkCard.rewriteSuggestion} rows={3} onChange={(value) => updateThinkCardField(setSelectedBundle, { rewriteSuggestion: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="HKR 交付" description="把读者的快乐、知识和共鸣拆开写。">
                <TextAreaField label="HKR - Happy" value={selectedBundle.project.thinkCard.hkr.happy} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { happy: value })} />
                <TextAreaField label="HKR - Knowledge" value={selectedBundle.project.thinkCard.hkr.knowledge} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { knowledge: value })} />
                <TextAreaField label="HKR - Resonance" value={selectedBundle.project.thinkCard.hkr.resonance} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { resonance: value })} />
                <TextAreaField label="HKR 总结" value={selectedBundle.project.thinkCard.hkr.summary} rows={3} onChange={(value) => updateThinkCardHKR(setSelectedBundle, { summary: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="备选路线" description="保留可切换方向，避免命题一条路走死。">
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
              </EditorGroupCard>
            </div>
            <button onClick={saveProjectFrame} disabled={isPending}>
              保存 ThinkCard
            </button>
          </section>
        ) : null}

        {surface === "editor" && activeEditorSection === "style-core" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>StyleCore</h3>
              <span className="badge">风格动作编辑</span>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="完成度" value={`${styleCoreCompletion}/14`} note="先补齐推进、判断、作者站位这三组动作。" />
              <EditorStatCard label="核心动作" value="节奏 + 判断" note="这两组字段最直接决定正文是不是只是资料堆叠。" />
              <EditorStatCard label="作者像" value="私人视角" note="没有作者站位时，整篇会更像结构化报告而不是文章。" />
            </div>
            <div className="editor-group-grid">
              <EditorGroupCard title="推进与判断" description="决定文章往前走的主驱动力。">
                <TextAreaField label="节奏推进" value={selectedBundle.project.styleCore.rhythm} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { rhythm: value })} />
                <TextAreaField label="故意打破" value={selectedBundle.project.styleCore.breakPattern} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { breakPattern: value })} />
                <TextAreaField label="判断力" value={selectedBundle.project.styleCore.judgement} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { judgement: value })} />
                <TextAreaField label="对立面理解" value={selectedBundle.project.styleCore.counterView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { counterView: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="作者站位" description="让这篇东西更像你写的，而不是系统写的。">
                <TextAreaField label="私人视角" value={selectedBundle.project.styleCore.personalView} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalView: value })} />
                <TextAreaField label="亲自下场" value={selectedBundle.project.styleCore.personalStake} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { personalStake: value })} />
                <TextAreaField label="人物画像法" value={selectedBundle.project.styleCore.characterPortrait} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { characterPortrait: value })} />
                <TextAreaField label="情绪递进" value={selectedBundle.project.styleCore.emotionCurve} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { emotionCurve: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="表达动作" description="让知识不是生硬掉落，而是顺着叙事滑进去。">
                <TextAreaField label="知识顺手掏出来的方式" value={selectedBundle.project.styleCore.knowledgeDrop} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { knowledgeDrop: value })} />
                <TextAreaField label="文化升维" value={selectedBundle.project.styleCore.culturalLift} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { culturalLift: value })} />
                <TextAreaField label="句式断裂" value={selectedBundle.project.styleCore.sentenceBreak} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { sentenceBreak: value })} />
                <TextAreaField label="谦逊铺垫法" value={selectedBundle.project.styleCore.humbleSetup} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { humbleSetup: value })} />
              </EditorGroupCard>
              <EditorGroupCard title="回收与代价" description="结尾有没有回环，判断有没有现实重量。">
                <TextAreaField label="回环呼应" value={selectedBundle.project.styleCore.echo} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { echo: value })} />
                <TextAreaField label="现实代价" value={selectedBundle.project.styleCore.costSense} rows={3} onChange={(value) => updateStyleCoreField(setSelectedBundle, { costSense: value })} />
              </EditorGroupCard>
            </div>
            <button onClick={saveProjectFrame} disabled={isPending}>
              保存 StyleCore
            </button>
          </section>
        ) : null}

        {surface === "editor" && activeEditorSection === "compatibility" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <h3>兼容层</h3>
              <span className="badge">旧链路兼容</span>
            </div>
            <div className="status-block">
              <p className="subtle">这部分会从 ThinkCard / StyleCore 自动派生，先保留给旧链路和导出使用。</p>
              <ul className="compact-list">
                <li>
                  <strong>HKRR</strong>
                  <span>{selectedBundle.project.hkrr.happy} / {selectedBundle.project.hkrr.knowledge} / {selectedBundle.project.hkrr.resonance}</span>
                </li>
                <li>
                  <strong>HAMD</strong>
                  <span>{selectedBundle.project.hamd.hook || "待补"} / {selectedBundle.project.hamd.anchor || "待补"} / {selectedBundle.project.hamd.different || "待补"}</span>
                </li>
                <li>
                  <strong>旧动作卡</strong>
                  <span>{selectedBundle.project.writingMoves.signatureLine || "待补"}</span>
                </li>
              </ul>
            </div>
            <button onClick={saveProjectFrame} disabled={isPending}>
              同步兼容层
            </button>
          </section>
        ) : null}

        {surface === "editor" && activeEditorSection === "vitality" ? (
          <section className="stack section-panel">
            <div className="section-panel-header">
              <div className="stack section-header-copy">
                <h3>VitalityCheck</h3>
                <p className="subtle">你改完正文后，点右侧按钮重新检查，不需要重新生成整套流程。</p>
              </div>
              <div className="action-row">
                <span className={`badge status-${selectedBundle.project.vitalityCheck.overallStatus}`}>
                  {selectedBundle.project.vitalityCheck.overallStatus}
                </span>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void runProjectStep("review", "质检报告已更新。")}
                  disabled={isPending || !hasDrafts}
                >
                  重新检查
                </button>
              </div>
            </div>
            <div className="editor-overview-grid">
              <EditorStatCard label="总体状态" value={selectedBundle.project.vitalityCheck.overallStatus} note={selectedBundle.project.vitalityCheck.overallVerdict || "还没有总体判断。"} />
              <EditorStatCard label="待修问题" value={String(vitalityIssueCount)} note="优先看 `fail`，再看 `warn`。" />
              <EditorStatCard label="是否硬阻塞" value={selectedBundle.project.vitalityCheck.hardBlocked ? "是" : "否"} note={selectedBundle.project.vitalityCheck.hardBlocked ? "先不要进发布整理。" : "可以继续润色或进入下一步。"} />
            </div>
            <ContainedScrollArea className="vitality-scroll-panel">
              <article className="status-block compact-status-block">
                <h3>当前不达标的是哪些</h3>
                <p>{selectedBundle.project.vitalityCheck.overallVerdict}</p>
                <div className="vitality-issue-strip">
                  {vitalityIssues.map((entry) => (
                    <span key={entry.key} className={`status-chip status-chip-${entry.status}`}>
                      {entry.title}
                    </span>
                  ))}
                </div>
              </article>

              <div className="vitality-guidance-list">
                {vitalityGuidance.map((item) => (
                  <article className="status-block compact-status-block vitality-guidance-card" key={item.key}>
                    <div className="vitality-guidance-head">
                      <div>
                        <h3>{item.title}</h3>
                        <span className={`status-chip status-chip-${item.status}`}>{item.status}</span>
                      </div>
                    </div>
                    <p className="subtle">{item.why}</p>
                    <div>
                      <strong>怎么改</strong>
                      <ul className="compact-list compact-inline-list">
                        {item.how.map((tip) => (
                          <li key={tip}>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {item.examples.length > 0 ? (
                      <div>
                        <strong>可以直接借用的句子</strong>
                        <ul className="compact-list compact-inline-list">
                          {item.examples.map((example) => (
                            <li key={example}>
                              <span>{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {item.related.length > 0 ? (
                      <div>
                        <strong>为什么判你不过</strong>
                        <ul className="compact-list compact-inline-list">
                          {item.related.map((detail) => (
                            <li key={detail}>
                              <span>{detail}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>

              {selectedBundle.reviewReport?.revisionSuggestions?.length ? (
                <article className="status-block compact-status-block">
                  <h3>模型给你的补充修稿建议</h3>
                  <ul className="compact-list compact-inline-list">
                    {selectedBundle.reviewReport.revisionSuggestions.slice(0, 6).map((tip) => (
                      <li key={tip}>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ) : null}

              {vitalityPassed.length ? (
                <details className="status-block">
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
          </section>
        ) : null}
      </section>
    </>
  );
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
      <AutoGrowTextarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
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

function EditorGroupCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <article className="editor-group-card stack">
      <div className="editor-group-head">
        <h4>{title}</h4>
        <p className="subtle">{description}</p>
      </div>
      <div className="stack">{children}</div>
    </article>
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
      <button type="button" className="secondary-button" onClick={onOpen}>
        进入编辑
      </button>
    </article>
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
        "在大段之间补一句“为什么下一段会接这一段”的过渡句。",
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
