"use client";

import type { ContinuityBeat, OutlineSection, ProjectBundle, ReviewSeverity, SourceCard, VitalityCheckEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Panel } from "@/components/ui/surface";
import { formatProjectStage } from "@/lib/project-stage-labels";
import { buildWorkbenchWorkflow, type ActiveTab, type WorkbenchStepPath, type WorkspaceSection } from "./workflow-state";
import type { WorkbenchDisplayMode } from "./display-mode";

export type WorkbenchInspectorSelection =
  | { kind: "outline-section"; sectionId: string }
  | { kind: "source-card"; sourceCardId: string }
  | {
      kind: "review-issue";
      title: string;
      reason: string;
      sourceLabel: string;
      locationLabel: string;
      suggestedAction?: string;
      targetTab: ActiveTab;
      targetSection: WorkspaceSection;
    }
  | { kind: "argument-claim"; claimId: string }
  | null;

export function WorkbenchInspector({
  selectedBundle,
  activeTab,
  focusedSection,
  selection,
  onClearSelection,
  onNavigate,
  onExecute,
  isPending,
  displayMode,
}: {
  selectedBundle: ProjectBundle | null;
  activeTab: ActiveTab;
  focusedSection: WorkspaceSection;
  selection: WorkbenchInspectorSelection;
  onClearSelection: () => void;
  onNavigate: (tab: ActiveTab, section: WorkspaceSection) => void;
  onExecute: (step: WorkbenchStepPath) => Promise<void>;
  isPending: boolean;
  displayMode: WorkbenchDisplayMode;
}) {
  if (!selectedBundle) {
    return null;
  }

  const tc = selectedBundle.project.thinkCard;
  const sc = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const workflow = buildWorkbenchWorkflow({
    selectedBundle,
    staleArtifacts: [],
    activeTab,
    focusedSection,
  });
  const { activeViewLabel, completedCount, nextAction, steps } = workflow;
  const riskItems = getRiskItems(
    vitality.entries,
    Boolean(tc.materialDigest && tc.verdictReason && tc.hkr.happy && tc.hkr.knowledge && tc.hkr.resonance),
    Boolean(sc.rhythm && sc.breakPattern && sc.knowledgeDrop && sc.personalView && sc.judgement),
  );
  const primaryRisk = riskItems[0] ?? null;
  const selectedDetail = resolveInspectorDetail(selectedBundle, selection, displayMode);
  const selectedSourceCard =
    selection?.kind === "source-card" ? selectedBundle.sourceCards.find((card) => card.id === selection.sourceCardId) ?? null : null;
  const selectedOutlineSection =
    selection?.kind === "outline-section" ? selectedBundle.outlineDraft?.sections.find((section) => section.id === selection.sectionId) ?? null : null;

  return (
    <Panel as="aside" className={`status-bar inspector-panel status-bar-${nextAction.tone}`} aria-label="工作台检查器">
      {selectedSourceCard ? (
        <InspectorSourceCard
          sourceCard={selectedSourceCard}
          displayMode={displayMode}
          onClearSelection={onClearSelection}
          onNavigate={() => onNavigate("research", "source-library")}
        />
      ) : selectedOutlineSection && activeTab === "drafts" ? (
        <InspectorDraftSection
          section={selectedOutlineSection}
          sectionIndex={selectedBundle.outlineDraft?.sections.findIndex((section) => section.id === selectedOutlineSection.id) ?? 0}
          selectedBundle={selectedBundle}
          onClearSelection={onClearSelection}
          onNavigate={() => onNavigate("drafts", "drafts")}
        />
      ) : selectedOutlineSection ? (
        <InspectorOutlineSection
          section={selectedOutlineSection}
          sectionIndex={selectedBundle.outlineDraft?.sections.findIndex((section) => section.id === selectedOutlineSection.id) ?? 0}
          selectedBundle={selectedBundle}
          onClearSelection={onClearSelection}
          onNavigate={() => onNavigate("structure", "outline")}
        />
      ) : selectedDetail ? (
        <div className="inspector-selection-card">
          <div className="inspector-selection-head">
            <div>
              <span className="status-bar-label">{selectedDetail.eyebrow}</span>
              <h3>{selectedDetail.title}</h3>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
              清除
            </Button>
          </div>
          <p>{selectedDetail.body}</p>
          {selectedDetail.suggestedAction ? <small>{selectedDetail.suggestedAction}</small> : null}
          <div className="status-bar-meta-group">
            {selectedDetail.chips.map((chip) => (
              <Chip tone={chip.tone ?? "neutral"} key={chip.label}>
                {chip.label}
              </Chip>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="inspector-selection-action"
            onClick={() => onNavigate(selectedDetail.targetTab, selectedDetail.targetSection)}
          >
            定位到这里
          </Button>
        </div>
      ) : null}

      <div className="status-bar-top">
        <div className="status-bar-info">
          <div className="status-bar-head">
            <span className="status-bar-label">项目状态</span>
            <span className="status-bar-count">{completedCount}/{steps.length}</span>
          </div>
          <div className="status-bar-progress" aria-label={`流程完成度 ${completedCount}/${steps.length}`}>
            {steps.map((step, index) => (
              <span className={index < completedCount ? "is-complete" : ""} key={step.id} />
            ))}
          </div>
          <p className="status-bar-title">{nextAction.title}</p>
          <p className="status-bar-copy">{nextAction.reason}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="status-bar-cta"
          onClick={() => {
            if (nextAction.executeStep) {
              void onExecute(nextAction.executeStep);
              return;
            }
            onNavigate(nextAction.targetTab, nextAction.targetSection);
          }}
          disabled={isPending}
        >
          {nextAction.ctaLabel}
        </Button>
      </div>

      <div className="status-bar-bottom">
        <div className="status-bar-meta-group">
          <Chip>{formatProjectStage(selectedBundle.project.stage)}</Chip>
          <Chip>{activeViewLabel}</Chip>
        </div>
        <div className="status-bar-meta-group">
          {selectedBundle.reviewReport?.rewriteIntents?.length ? (
            <Chip tone="warning">待改段落：{selectedBundle.reviewReport.rewriteIntents.length}</Chip>
          ) : null}
          {selectedBundle.reviewReport?.continuityFlags?.length ? (
            <Chip tone="warning">连续性：{selectedBundle.reviewReport.continuityFlags.length}</Chip>
          ) : null}
          {selectedBundle.reviewReport?.argumentQualityFlags?.length ? (
            <Chip tone="warning">论证：{selectedBundle.reviewReport.argumentQualityFlags.length}</Chip>
          ) : null}
          {primaryRisk ? (
            <Chip tone={getRiskChipTone(primaryRisk.status)}>风险：{primaryRisk.title}</Chip>
          ) : (
            <Chip tone="success">当前无硬阻塞</Chip>
          )}
        </div>
        <small className="status-bar-target">{nextAction.targetLabel}</small>
      </div>
    </Panel>
  );
}

function InspectorDraftSection({
  section,
  sectionIndex,
  selectedBundle,
  onClearSelection,
  onNavigate,
}: {
  section: OutlineSection;
  sectionIndex: number;
  selectedBundle: ProjectBundle;
  onClearSelection: () => void;
  onNavigate: () => void;
}) {
  const styleCore = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const evidenceIds = uniqueInspectorValues([...section.mustUseEvidenceIds, ...section.evidenceIds]);
  const sourceCardMap = new Map(selectedBundle.sourceCards.map((card) => [card.id, card]));
  const sourceCards = evidenceIds.map((id) => sourceCardMap.get(id)).filter((card): card is SourceCard => Boolean(card));
  const continuityBeat = selectedBundle.outlineDraft?.continuityLedger?.beats.find((beat) => beat.sectionId === section.id) ?? null;
  const flags = getInspectorOutlineFlags(section, selectedBundle.reviewReport);
  const healthScore = getInspectorOutlineHealthScore(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);
  const missingItems = getInspectorOutlineMissingItems(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);
  const suggestions = getInspectorOutlineSuggestions(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);
  const vitalityIssues = vitality.entries.filter((entry) => entry.status !== "pass").slice(0, 4);

  return (
    <div className="inspector-selection-card inspector-draft-card">
      <div className="inspector-selection-head">
        <div>
          <span className="status-bar-label">正文写作检查</span>
          <h3>{section.heading || `段落 ${sectionIndex + 1}`}</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          清除
        </Button>
      </div>

      <div className="inspector-draft-score">
        <div>
          <span>章节健康度</span>
          <strong>{healthScore}</strong>
          <small>{formatInspectorHealthLabel(healthScore)}</small>
        </div>
        <div>
          <span>VitalityCheck</span>
          <Chip tone={getRiskChipTone(vitality.overallStatus)}>{formatInspectorReviewStatus(vitality.overallStatus)}</Chip>
        </div>
      </div>

      <section className="inspector-draft-section-card">
        <span>主线判断</span>
        <p>{section.mainlineSentence || section.sectionThesis || section.purpose || "这一段还没有明确主线句。"}</p>
      </section>

      <section className="inspector-draft-section-card">
        <span>StyleCore 建议</span>
        <dl className="inspector-draft-style-list">
          <div>
            <dt>表达策略</dt>
            <dd>{styleCore.judgement || styleCore.personalView || "还没有明确作者站位。"}</dd>
          </div>
          <div>
            <dt>节奏</dt>
            <dd>{styleCore.rhythm || "还没有节奏策略。"}</dd>
          </div>
          <div>
            <dt>断句</dt>
            <dd>{styleCore.breakPattern || "还没有断句策略。"}</dd>
          </div>
        </dl>
      </section>

      <InspectorOutlineActionList title="缺口" emptyLabel="暂无明显缺口" items={missingItems} />
      <InspectorOutlineActionList title="优化建议" emptyLabel="保持当前结构" items={suggestions} />

      <section className="inspector-draft-section-card">
        <span>VitalityCheck 提醒</span>
        {vitalityIssues.length ? (
          <div className="inspector-draft-vitality-list">
            {vitalityIssues.map((entry) => (
              <div className={`inspector-outline-action-item redesign-tone-${getRiskChipTone(entry.status)}`} key={entry.key}>
                <strong>{entry.title}</strong>
                <p>{entry.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>{vitality.overallVerdict || "暂无未通过提醒。"}</p>
        )}
      </section>

      <section className="inspector-draft-section-card">
        <span>支撑资料</span>
        {sourceCards.length ? (
          <div className="inspector-outline-sources">
            {sourceCards.slice(0, 3).map((card) => (
              <div key={card.id}>
                <strong>{card.title || "未命名资料卡"}</strong>
                <p>{card.summary || card.evidence || "这张资料卡还没有摘要。"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p>还没有匹配资料卡。</p>
        )}
      </section>

      <div className="inspector-source-actions">
        <Button type="button" variant="secondary" size="sm" onClick={onNavigate}>
          定位到正文
        </Button>
      </div>
    </div>
  );
}

function InspectorSourceCard({
  sourceCard,
  displayMode,
  onClearSelection,
  onNavigate,
}: {
  sourceCard: ProjectBundle["sourceCards"][number];
  displayMode: WorkbenchDisplayMode;
  onClearSelection: () => void;
  onNavigate: () => void;
}) {
  const evidenceStrength = getSourceCardStrength(sourceCard);

  return (
    <div className="inspector-selection-card inspector-source-card">
      <div className="inspector-selection-head">
        <div>
          <span className="status-bar-label">资料卡详情</span>
          <h3>{sourceCard.title || (displayMode === "debug" ? sourceCard.id : "未命名资料卡")}</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          清除
        </Button>
      </div>

      <div className="inspector-source-meta">
        <Chip>{sourceCard.zone || "未分区"}</Chip>
        <Chip tone={sourceCard.credibility === "高" ? "success" : sourceCard.credibility === "低" ? "warning" : "neutral"}>
          {sourceCard.credibility}可信
        </Chip>
        <Chip tone={sourceCard.supportLevel === "high" ? "accent" : "neutral"}>{formatSupportLevel(sourceCard.supportLevel)}</Chip>
      </div>

      <p>{sourceCard.summary || sourceCard.note || sourceCard.evidence || "这张资料卡还没有摘要。"}</p>

      <div className="inspector-source-quote">
        <span>高亮证据</span>
        <strong>{sourceCard.evidence || "还没有提炼证据片段。"}</strong>
      </div>

      <div className="inspector-source-strength" aria-label={`证据强度 ${evidenceStrength}/5`}>
        <span>证据强度</span>
        <div>
          {Array.from({ length: 5 }, (_, index) => (
            <i className={index < evidenceStrength ? "is-active" : ""} key={index} />
          ))}
        </div>
      </div>

      <dl className="inspector-source-grid">
        <div>
          <dt>来源类型</dt>
          <dd>{formatSourceType(sourceCard.sourceType)}</dd>
        </div>
        <div>
          <dt>论断类型</dt>
          <dd>{formatClaimType(sourceCard.claimType)}</dd>
        </div>
        <div>
          <dt>时效性</dt>
          <dd>{formatTimeSensitivity(sourceCard.timeSensitivity)}</dd>
        </div>
        <div>
          <dt>关联章节</dt>
          <dd>{sourceCard.intendedSection || "未绑定"}</dd>
        </div>
      </dl>

      {sourceCard.reliabilityNote ? <small>{sourceCard.reliabilityNote}</small> : null}

      {sourceCard.tags.length ? (
        <div className="inspector-source-tags">
          {sourceCard.tags.slice(0, 6).map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
        </div>
      ) : null}

      <div className="inspector-source-actions">
        <Button type="button" variant="secondary" size="sm" onClick={onNavigate}>
          定位到这里
        </Button>
        {sourceCard.url ? (
          <a className="secondary-button button-size-sm inspector-source-link" href={sourceCard.url} target="_blank" rel="noreferrer">
            查看原文
          </a>
        ) : null}
      </div>
    </div>
  );
}

function InspectorOutlineSection({
  section,
  sectionIndex,
  selectedBundle,
  onClearSelection,
  onNavigate,
}: {
  section: OutlineSection;
  sectionIndex: number;
  selectedBundle: ProjectBundle;
  onClearSelection: () => void;
  onNavigate: () => void;
}) {
  const evidenceIds = uniqueInspectorValues([...section.mustUseEvidenceIds, ...section.evidenceIds]);
  const sourceCardMap = new Map(selectedBundle.sourceCards.map((card) => [card.id, card]));
  const sourceCards = evidenceIds.map((id) => sourceCardMap.get(id)).filter((card): card is SourceCard => Boolean(card));
  const unmatchedEvidenceCount = evidenceIds.length - sourceCards.length;
  const continuityBeat = selectedBundle.outlineDraft?.continuityLedger?.beats.find((beat) => beat.sectionId === section.id) ?? null;
  const flags = getInspectorOutlineFlags(section, selectedBundle.reviewReport);
  const healthScore = getInspectorOutlineHealthScore(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);
  const missingItems = getInspectorOutlineMissingItems(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);
  const suggestions = getInspectorOutlineSuggestions(section, evidenceIds.length, section.mustUseEvidenceIds.length, continuityBeat, flags);

  return (
    <div className="inspector-selection-card inspector-outline-card">
      <div className="inspector-selection-head">
        <div>
          <span className="status-bar-label">章节体检</span>
          <h3>{section.heading || `段落 ${sectionIndex + 1}`}</h3>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClearSelection}>
          清除
        </Button>
      </div>

      <div className="inspector-outline-score">
        <div>
          <span>HKR 对齐度</span>
          <strong>{healthScore}</strong>
          <small>{formatInspectorHealthLabel(healthScore)}</small>
        </div>
        <div className="inspector-outline-bars">
          <span style={{ width: `${healthScore}%` }} />
        </div>
      </div>

      <p>{section.sectionThesis || section.purpose || "这一段还没有明确主判断。"}</p>

      <dl className="inspector-source-grid inspector-outline-grid">
        <div>
          <dt>支撑资料</dt>
          <dd>{evidenceIds.length}</dd>
        </div>
        <div>
          <dt>必要证据</dt>
          <dd>{section.mustUseEvidenceIds.length}</dd>
        </div>
        <div>
          <dt>连续性</dt>
          <dd>{continuityBeat ? "已绑定" : "缺失"}</dd>
        </div>
        <div>
          <dt>复查项</dt>
          <dd>{flags.length}</dd>
        </div>
      </dl>

      <InspectorOutlineActionList title="缺失论据" emptyLabel="暂无明显缺口" items={missingItems} />
      <InspectorOutlineActionList title="优化建议" emptyLabel="保持当前结构" items={suggestions} />

      {continuityBeat ? (
        <div className="inspector-outline-continuity">
          <span>连续性</span>
          <p>{continuityBeat.inheritedQuestion}</p>
          <strong>{continuityBeat.answerThisSection}</strong>
        </div>
      ) : null}

      <div className="inspector-outline-sources">
        <span>关联资料</span>
        {sourceCards.length ? (
          sourceCards.slice(0, 3).map((card) => (
            <div key={card.id}>
              <strong>{card.title || "未命名资料卡"}</strong>
              <p>{card.summary || card.evidence || "这张资料卡还没有摘要。"}</p>
            </div>
          ))
        ) : (
          <p>还没有匹配资料卡。</p>
        )}
        {unmatchedEvidenceCount > 0 ? <small>{unmatchedEvidenceCount} 条证据未匹配到资料卡。</small> : null}
      </div>

      <div className="inspector-source-actions">
        <Button type="button" variant="secondary" size="sm" onClick={onNavigate}>
          定位到这里
        </Button>
      </div>
    </div>
  );
}

function InspectorOutlineActionList({
  title,
  emptyLabel,
  items,
}: {
  title: string;
  emptyLabel: string;
  items: Array<{ id: string; title: string; detail: string; tone: "neutral" | "accent" | "success" | "warning" | "danger" | "stale" }>;
}) {
  return (
    <div className="inspector-outline-action-list">
      <span>{title}</span>
      {items.length ? (
        <div>
          {items.map((item, index) => (
            <div className={`inspector-outline-action-item redesign-tone-${item.tone}`} key={`${item.id}-${index}`}>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>{emptyLabel}</p>
      )}
    </div>
  );
}

function resolveInspectorDetail(selectedBundle: ProjectBundle, selection: WorkbenchInspectorSelection, displayMode: WorkbenchDisplayMode) {
  if (!selection) {
    return null;
  }

  if (selection.kind === "outline-section") {
    const section = selectedBundle.outlineDraft?.sections.find((item) => item.id === selection.sectionId);
    if (!section) {
      return null;
    }
    const evidenceCount = new Set([...section.evidenceIds, ...section.mustUseEvidenceIds].filter(Boolean)).size;
    return {
      eyebrow: "段落提纲",
      title: section.heading || "未命名段落",
      body: section.sectionThesis || section.purpose || section.singlePurpose || "这段还没有主判断。",
      suggestedAction: section.readerUsefulness ? `读者用途：${section.readerUsefulness}` : undefined,
      targetTab: "structure" as const,
      targetSection: "outline" as const,
      chips: [
        { label: `${evidenceCount} 证据`, tone: evidenceCount > 0 ? "accent" as const : "warning" as const },
        { label: section.mustUseEvidenceIds.length ? `${section.mustUseEvidenceIds.length} 必要证据` : "无必要证据", tone: section.mustUseEvidenceIds.length ? "accent" as const : "neutral" as const },
      ],
    };
  }

  if (selection.kind === "source-card") {
    const sourceCard = selectedBundle.sourceCards.find((card) => card.id === selection.sourceCardId);
    if (!sourceCard) {
      return null;
    }
    return {
      eyebrow: "资料卡",
      title: sourceCard.title || (displayMode === "debug" ? sourceCard.id : "未命名资料卡"),
      body: sourceCard.summary || sourceCard.evidence || "这张资料卡还没有摘要。",
      suggestedAction: sourceCard.intendedSection ? `预期落段：${sourceCard.intendedSection}` : undefined,
      targetTab: "research" as const,
      targetSection: "source-library" as const,
      chips: [
        { label: `${sourceCard.credibility}可信度`, tone: "neutral" as const },
        { label: formatSupportLevel(sourceCard.supportLevel), tone: sourceCard.supportLevel === "high" ? "accent" as const : "neutral" as const },
        { label: sourceCard.zone || "未分区", tone: "neutral" as const },
      ],
    };
  }

  if (selection.kind === "review-issue") {
    return {
      eyebrow: selection.sourceLabel,
      title: selection.title,
      body: selection.reason,
      suggestedAction: selection.suggestedAction,
      targetTab: selection.targetTab,
      targetSection: selection.targetSection,
      chips: [{ label: selection.locationLabel, tone: "warning" as const }],
    };
  }

  const argumentFrame = selectedBundle.outlineDraft?.argumentFrame;
  if (!argumentFrame) {
    return null;
  }
  const claim = argumentFrame.supportingClaims.find((item) => item.id === selection.claimId);
  if (!claim) {
    return null;
  }
  return {
    eyebrow: displayMode === "debug" ? "论证 claim" : "论点",
    title: displayMode === "debug" ? `${claim.role} / ${claim.id}` : claim.role,
    body: claim.claim,
    suggestedAction: claim.shouldNotBecomeSection ? "这条论点不要直接变成独立章节，片区材料只作为证据。" : undefined,
    targetTab: "structure" as const,
    targetSection: "outline" as const,
    chips: [
      { label: `${claim.evidenceIds.length} 参考证据`, tone: claim.evidenceIds.length ? "accent" as const : "neutral" as const },
      { label: `${claim.mustUseEvidenceIds.length} 必要证据`, tone: claim.mustUseEvidenceIds.length ? "accent" as const : "neutral" as const },
      { label: formatArgumentShape(argumentFrame.primaryShape), tone: "neutral" as const },
    ],
  };
}

const argumentShapeLabels: Record<string, string> = {
  judgement_essay: "判断稿",
  misread_correction: "误读纠偏",
  signal_reinterpretation: "信号重释",
  lifecycle_reframe: "生命周期改写",
  asset_tiering: "资产分层",
  mismatch_diagnosis: "错配诊断",
  tradeoff_decision: "取舍决策",
  risk_decomposition: "风险拆解",
  comparison_benchmark: "横向比较",
  planning_reality_check: "规划校验",
  cycle_timing: "周期判断",
  buyer_persona_split: "买家分型",
};

function formatArgumentShape(shape: string) {
  return argumentShapeLabels[shape] ?? shape.replaceAll("_", " ");
}

function getRiskChipTone(status: ReviewSeverity) {
  if (status === "fail") {
    return "danger";
  }
  if (status === "warn") {
    return "warning";
  }
  return "success";
}

function formatInspectorReviewStatus(status: ReviewSeverity) {
  if (status === "pass") {
    return "通过";
  }
  if (status === "fail") {
    return "需重修";
  }
  return "提醒";
}

function getRiskItems(entries: VitalityCheckEntry[], isThinkCardComplete: boolean, isStyleCoreComplete: boolean) {
  const urgencyItems = entries
    .filter((entry) => entry.status !== "pass")
    .slice(0, 1)
    .map((entry) => ({
      title: entry.title,
      detail: entry.detail,
      status: entry.status,
    }));

  if (urgencyItems.length > 0) {
    return urgencyItems;
  }

  if (!isThinkCardComplete) {
    return [
      {
        title: "选题判断还没补齐",
        detail: "主判断、题值理由和读者收获没填完整时，后面的判断依据会发虚。",
        status: "warn" as ReviewSeverity,
      },
    ];
  }

  if (!isStyleCoreComplete) {
    return [
      {
        title: "表达策略还没补齐",
        detail: "风格动作不完整时，双稿容易只剩结构，没有明显作者像。",
        status: "warn" as ReviewSeverity,
      },
    ];
  }

  return [];
}

function uniqueInspectorValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getInspectorOutlineFlags(section: OutlineSection, reviewReport: ProjectBundle["reviewReport"]) {
  if (!reviewReport) {
    return [];
  }
  const flags: Array<{ id: string; title: string; detail: string; tone: "warning" | "danger" }> = [];
  const sectionScore = reviewReport.sectionScores.find((score) => score.heading === section.heading && score.status !== "pass");
  if (sectionScore) {
    flags.push({
      id: "section-score",
      title: sectionScore.status === "fail" ? "质检失败" : "质检提醒",
      detail: sectionScore.issues.join("；") || "章节分数需要复查。",
      tone: sectionScore.status === "fail" ? "danger" : "warning",
    });
  }
  for (const flag of reviewReport.continuityFlags?.filter((item) => item.sectionIds.includes(section.id)) ?? []) {
    flags.push({
      id: `continuity-${flag.type}`,
      title: "连续性问题",
      detail: flag.reason || flag.suggestedAction,
      tone: flag.severity === "fail" ? "danger" : "warning",
    });
  }
  for (const flag of reviewReport.argumentQualityFlags?.filter((item) => item.sectionIds.includes(section.id)) ?? []) {
    flags.push({
      id: `argument-${flag.type}`,
      title: "论证问题",
      detail: flag.reason || flag.suggestedAction,
      tone: flag.severity === "fail" ? "danger" : "warning",
    });
  }
  for (const intent of reviewReport.structuralRewriteIntents?.filter((item) => item.affectedSectionIds.includes(section.id)) ?? []) {
    flags.push({
      id: `rewrite-${intent.issueTypes.join("-")}`,
      title: "结构重写",
      detail: intent.whyItFails,
      tone: "danger",
    });
  }
  for (const flag of reviewReport.paragraphFlags.filter((item) => item.sectionHeading === section.heading)) {
    flags.push({
      id: `paragraph-${flag.paragraphIndex}-${flag.issueTypes.join("-")}`,
      title: "段落问题",
      detail: flag.detail,
      tone: "warning",
    });
  }
  return flags.slice(0, 6);
}

function getInspectorOutlineMissingItems(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: Array<{ id: string; title: string; detail: string; tone: "warning" | "danger" }>,
) {
  const items: Array<{ id: string; title: string; detail: string; tone: "accent" | "warning" | "danger" }> = [];
  if (evidenceCount === 0) {
    items.push({ id: "missing-evidence", title: "缺少支撑资料", detail: "没有资料卡支撑，正文很容易变成空判断。", tone: "danger" });
  }
  if (requiredEvidenceCount === 0) {
    items.push({ id: "missing-required", title: "缺少必要证据", detail: "建议指定至少一条必须使用的证据。", tone: "warning" });
  }
  if (!continuityBeat) {
    items.push({ id: "missing-continuity", title: "缺少连续性", detail: "没有记录上一段问题、本段回答和下一段必要性。", tone: "warning" });
  }
  if (!section.sceneOrCost.trim()) {
    items.push({ id: "missing-scene", title: "缺少场景或代价", detail: "建议补一个读者能感知的场景、成本或冲突。", tone: "accent" });
  }
  if (flags.some((flag) => flag.tone === "danger")) {
    items.push({ id: "hard-flag", title: "有硬性复查项", detail: "Review 已标记这一段需要优先处理。", tone: "danger" });
  }
  return items.slice(0, 5);
}

function getInspectorOutlineSuggestions(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: Array<{ id: string; title: string; detail: string; tone: "warning" | "danger" }>,
) {
  const suggestions: Array<{ id: string; title: string; detail: string; tone: "accent" | "success" | "warning" | "danger" }> = [];
  if (flags.length > 0) {
    suggestions.push({
      id: "review-first",
      title: "先处理质检提示",
      detail: flags[0]?.detail || "先消除结构或论证风险。",
      tone: flags.some((flag) => flag.tone === "danger") ? "danger" : "warning",
    });
  }
  if (evidenceCount === 0) {
    suggestions.push({ id: "add-source", title: "补直接资料", detail: "从资料卡库选择能证明本段主判断的材料。", tone: "warning" });
  } else if (requiredEvidenceCount === 0) {
    suggestions.push({ id: "promote-source", title: "提升关键资料权重", detail: "把最关键的一条证据设为必要证据。", tone: "accent" });
  }
  if (!continuityBeat) {
    suggestions.push({ id: "add-chain", title: "补章节链路", detail: "说明这一段为什么必须接在上一段后面。", tone: "accent" });
  }
  if (!section.readerUsefulness.trim()) {
    suggestions.push({ id: "reader-use", title: "补读者用途", detail: "明确读者看完这一段能获得什么判断。", tone: "accent" });
  }
  if (suggestions.length === 0) {
    suggestions.push({ id: "keep", title: "可进入正文", detail: "当前章节结构、证据和连续性相对完整。", tone: "success" });
  }
  return suggestions.slice(0, 5);
}

function getInspectorOutlineHealthScore(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: Array<{ id: string; title: string; detail: string; tone: "warning" | "danger" }>,
) {
  let score = 100;
  if (evidenceCount === 0) score -= 28;
  if (requiredEvidenceCount === 0) score -= 18;
  if (!continuityBeat) score -= 18;
  if (!section.mainlineSentence.trim()) score -= 10;
  if (!section.sceneOrCost.trim()) score -= 8;
  if (!section.readerUsefulness.trim()) score -= 8;
  for (const flag of flags) {
    score -= flag.tone === "danger" ? 22 : 10;
  }
  return Math.max(0, Math.min(100, score));
}

function formatInspectorHealthLabel(score: number) {
  if (score >= 86) return "优秀";
  if (score >= 72) return "良好";
  if (score >= 52) return "待补强";
  return "有阻塞";
}

function formatSupportLevel(level: string) {
  const labels: Record<string, string> = {
    high: "强支撑",
    medium: "中支撑",
    low: "弱支撑",
  };
  return labels[level] ?? level;
}

function formatSourceType(value: string) {
  const labels: Record<string, string> = {
    official: "官方来源",
    media: "媒体报道",
    commentary: "评论观点",
    interview: "访谈",
    observation: "实地观察",
  };
  return labels[value] ?? value;
}

function formatClaimType(value: string) {
  const labels: Record<string, string> = {
    fact: "事实",
    observation: "观察",
    judgement: "判断",
    counterevidence: "反证",
    quote: "引用",
  };
  return labels[value] ?? value;
}

function formatTimeSensitivity(value: string) {
  const labels: Record<string, string> = {
    evergreen: "长期有效",
    timely: "阶段有效",
    volatile: "易过期",
  };
  return labels[value] ?? value;
}

function getSourceCardStrength(sourceCard: ProjectBundle["sourceCards"][number]) {
  const supportScore = sourceCard.supportLevel === "high" ? 3 : sourceCard.supportLevel === "medium" ? 2 : 1;
  const credibilityScore = sourceCard.credibility === "高" ? 2 : sourceCard.credibility === "中" ? 1 : 0;
  return Math.max(1, Math.min(5, supportScore + credibilityScore));
}
