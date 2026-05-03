import type { ArticleProject, ArgumentFrame, ContinuityBeat, OutlineSection, ProjectBundle, ProjectStage, ReviewSeverity, SourceCard } from "@/lib/types";
import type { WorkbenchView } from "./navigation";
import { deriveLegacyFrames } from "@/lib/author-cards";
import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";
import { canPreparePublish, getResearchGaps } from "@/lib/workflow";
import {
  buildDesignStageItems,
  DESIGN_STAGE_DEFINITIONS,
  type DesignActiveTab,
  type DesignStageItem,
  type DesignStaleArtifact,
  type DesignWorkspaceSection,
} from "./stages";
import { formatProjectStage } from "@/lib/project-stage-labels";

type JobSummary = {
  step: string;
  status: string;
};

export type DesignCardTone = "neutral" | "accent" | "success" | "warning" | "danger" | "stale";

export interface DesignMetric {
  label: string;
  value: string;
  detail: string;
}

export interface DesignCoreCard {
  id: "think-card" | "style-core" | "vitality-check";
  eyebrow: string;
  title: string;
  statusLabel: string;
  tone: DesignCardTone;
  body: string;
  detail: string;
  targetTab: "overview";
  targetSection: "overview-think-card" | "overview-style-core" | "overview-vitality";
}

export interface DesignSnapshotCard {
  id: "sources" | "outline" | "draft";
  label: string;
  value: string;
  detail: string;
  tone: DesignCardTone;
  targetTab: "research" | "structure" | "drafts";
  targetSection: "source-library" | "outline" | "drafts";
}

export interface DesignWorkspaceFocus {
  label: string;
  title: string;
  body: string;
  detail: string;
  tone: DesignCardTone;
}

export interface DesignWorkspaceLane {
  id: "research" | "structure" | "draft" | "publish";
  title: string;
  statusLabel: string;
  body: string;
  detail: string;
  tone: DesignCardTone;
  targetTab: DesignActiveTab;
  targetSection: DesignWorkspaceSection;
}

export interface DesignWorkspaceRisk {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
  targetTab: DesignActiveTab;
  targetSection: DesignWorkspaceSection;
}

export interface ProjectDashboardCard {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  stageLabel: string;
  stageIndex: number;
  progressLabel: string;
  progressPercent: number;
  updatedAtLabel: string;
  tone: DesignCardTone;
  isSelected: boolean;
}

export interface ProjectDashboardViewModel {
  projectCount: number;
  currentProject: ProjectDashboardCard;
  projectCards: ProjectDashboardCard[];
  recentProjects: ProjectDashboardCard[];
  currentStatus: {
    sourceCount: number;
    outlineSectionCount: number;
    draftCharacters: number;
    stageProgress: number;
    stageTotal: number;
    progressPercent: number;
    qualityScore: number;
    qualityLabel: string;
    qualityTone: DesignCardTone;
    citationCoverageLabel: string;
    vitalityLabel: string;
  };
  healthItems: Array<{
    label: string;
    value: string;
    tone: DesignCardTone;
  }>;
  stageDistribution: Array<{
    label: string;
    count: number;
  }>;
  queue: {
    activeCount: number;
    runningCount: number;
    queuedCount: number;
  };
}

export interface SourceLibraryCardViewModel {
  id: string;
  title: string;
  summary: string;
  evidence: string;
  url: string;
  sourceHost: string;
  sourceType: SourceCard["sourceType"];
  credibility: SourceCard["credibility"];
  supportLevel: SourceCard["supportLevel"];
  claimType: SourceCard["claimType"];
  timeSensitivity: SourceCard["timeSensitivity"];
  intendedSection: string;
  reliabilityNote: string;
  rawTextPreview: string;
  zone: string;
  tags: string[];
  isCited: boolean;
  isOrphan: boolean;
  publishedAtLabel: string;
  createdAtLabel: string;
}

export interface SourceLibraryViewModel {
  projectTitle: string;
  totalCount: number;
  citedCount: number;
  orphanCount: number;
  highCredibilityCount: number;
  officialSourceCount: number;
  strongSupportCount: number;
  citationCoverageLabel: string;
  sectionCoverageLabel: string;
  keyPointCoverageLabel: string;
  brokenCitationCount: number;
  cards: SourceLibraryCardViewModel[];
  zones: string[];
  supportLevels: SourceCard["supportLevel"][];
  credibilityLevels: SourceCard["credibility"][];
}

export interface ResearchBriefDimensionViewModel {
  id: string;
  index: number;
  dimension: string;
  reason: string;
  expectedEvidence: string;
  hasSourceSupport: boolean;
}

export interface ResearchIntakeViewModel {
  projectTitle: string;
  hasResearchBrief: boolean;
  canGenerateResearchBrief: boolean;
  sourceCount: number;
  researchGapCount: number;
  highCredibilityCount: number;
  citationCoverageLabel: string;
  sectionCoverageLabel: string;
  keyPointCoverageLabel: string;
  angle: string;
  questions: string[];
  blindSpots: string[];
  stageChecklist: string[];
  dimensions: ResearchBriefDimensionViewModel[];
  researchGaps: string[];
  recentSourceCards: Array<{
    id: string;
    title: string;
    summary: string;
    credibility: SourceCard["credibility"];
    supportLevel: SourceCard["supportLevel"];
  }>;
}

export interface SectorModelEvidenceViewModel {
  id: string;
  title: string;
  summary: string;
  credibility: SourceCard["credibility"];
  supportLevel: SourceCard["supportLevel"];
}

export interface SectorZoneViewModel {
  id: string;
  index: number;
  name: string;
  label: string;
  description: string;
  evidenceCount: number;
  strengths: string[];
  risks: string[];
  suitableBuyers: string[];
  evidenceCards: SectorModelEvidenceViewModel[];
  tone: DesignCardTone;
}

export interface SectorModelWorkspaceViewModel {
  projectTitle: string;
  hasSectorModel: boolean;
  canGenerateSectorModel: boolean;
  sourceCount: number;
  highCredibilityCount: number;
  zoneCount: number;
  modelEvidenceCount: number;
  orphanSourceCount: number;
  summaryJudgement: string;
  misconception: string;
  spatialBackbone: string;
  cutLines: string[];
  supplyObservation: string;
  futureWatchpoints: string[];
  zones: SectorZoneViewModel[];
  sourceCards: SectorModelEvidenceViewModel[];
}

export interface OutlineSourceReferenceViewModel {
  id: string;
  title: string;
  summary: string;
  credibility: SourceCard["credibility"] | "未知";
}

export interface OutlineSectionFlagViewModel {
  label: string;
  tone: DesignCardTone;
}

export interface OutlineSectionActionViewModel {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
}

export interface OutlineClaimViewModel {
  id: string;
  role: string;
  roleLabel: string;
  claim: string;
  evidenceCount: number;
  mustUseEvidenceCount: number;
  zonesAsEvidence: string[];
  shouldNotBecomeSection: boolean;
}

export interface OutlineContinuityViewModel {
  inheritedQuestion: string;
  answerThisSection: string;
  newInformation: string;
  leavesQuestionForNext: string;
  nextSectionNecessity: string;
}

export interface OutlineSectionViewModel {
  id: string;
  index: number;
  heading: string;
  purpose: string;
  thesis: string;
  singlePurpose: string;
  mustLandDetail: string;
  sceneOrCost: string;
  mainlineSentence: string;
  readerUsefulness: string;
  evidenceCount: number;
  requiredEvidenceCount: number;
  statusLabel: string;
  tone: DesignCardTone;
  healthScore: number;
  healthLabel: string;
  flags: OutlineSectionFlagViewModel[];
  missingItems: OutlineSectionActionViewModel[];
  optimizationSuggestions: OutlineSectionActionViewModel[];
  sourceReferences: OutlineSourceReferenceViewModel[];
  supportingClaim: OutlineClaimViewModel | null;
  continuity: OutlineContinuityViewModel | null;
}

export interface OutlineEditorViewModel {
  projectTitle: string;
  hasOutline: boolean;
  hook: string;
  closing: string;
  totalSections: number;
  linkedSectionCount: number;
  weakSectionCount: number;
  flaggedSectionCount: number;
  continuityCoverageLabel: string;
  sourceCount: number;
  canGenerateOutline: boolean;
  canGenerateDraft: boolean;
  argumentFrame: {
    primaryShapeLabel: string;
    secondaryShapeLabels: string[];
    centralTension: string;
    answer: string;
    notThis: string[];
    claims: OutlineClaimViewModel[];
  } | null;
  sections: OutlineSectionViewModel[];
}

export interface DraftEditorSectionViewModel {
  id: string;
  index: number;
  heading: string;
  thesis: string;
  evidenceCount: number;
  statusLabel: string;
  tone: DesignCardTone;
}

export interface DraftEditorReviewIssueViewModel {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
}

export interface DraftEditorViewModel {
  projectTitle: string;
  hasDraft: boolean;
  canGenerateDraft: boolean;
  canReview: boolean;
  editedMarkdown: string;
  narrativeMarkdown: string;
  analysisMarkdown: string;
  primaryMarkdown: string;
  characterCount: number;
  paragraphCount: number;
  citationCount: number;
  sourceCount: number;
  reviewPassCount: number;
  reviewTotalCount: number;
  continuityFlagCount: number;
  rewriteSuggestionCount: number;
  outlineSections: DraftEditorSectionViewModel[];
  activeStyle: {
    judgement: string;
    rhythm: string;
    breakPattern: string;
    knowledgeDrop: string;
    personalView: string;
  };
  vitality: {
    statusLabel: string;
    tone: DesignCardTone;
    verdict: string;
    issueCount: number;
  };
  reviewIssues: DraftEditorReviewIssueViewModel[];
  feedbackEvents: Array<{
    id: string;
    label: string;
    sectionHeading: string;
  }>;
  citationLabels: Array<{
    id: string;
    label: string;
  }>;
}

export interface JudgementWorkspaceIssueViewModel {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
  sourceLabel: string;
}

export interface JudgementWorkspaceViewModel {
  projectTitle: string;
  thinkCardCompletion: {
    filled: number;
    total: number;
    label: string;
    tone: DesignCardTone;
  };
  styleCoreCompletion: {
    filled: number;
    total: number;
    label: string;
    tone: DesignCardTone;
  };
  vitality: {
    statusLabel: string;
    tone: DesignCardTone;
    verdict: string;
    issueCount: number;
    hardBlocked: boolean;
    canRunReview: boolean;
    canPreparePublish: boolean;
  };
  topicScorecard: {
    statusLabel: string;
    hkrLabel: string;
    signalCoverage: string;
  } | null;
  signalBrief: {
    signalCount: number;
    gapCount: number;
    freshnessNote: string;
  } | null;
  styleHighlights: Array<{
    id: string;
    label: string;
    value: string;
    tone: DesignCardTone;
  }>;
  qualityPyramid: Array<{
    level: string;
    title: string;
    statusLabel: string;
    summary: string;
    tone: DesignCardTone;
  }>;
  issues: JudgementWorkspaceIssueViewModel[];
}

export interface CompatibilityFieldViewModel {
  id: string;
  label: string;
  sourceLabel: string;
  storedValue: string;
  canonicalValue: string;
  statusLabel: string;
  tone: DesignCardTone;
}

export interface CompatibilityGroupViewModel {
  id: "hkrr" | "hamd" | "writingMoves";
  title: string;
  subtitle: string;
  filled: number;
  total: number;
  alignedCount: number;
  differenceCount: number;
  missingCount: number;
  summary: string;
  tone: DesignCardTone;
  fields: CompatibilityFieldViewModel[];
}

export interface CompatibilityWorkspaceViewModel {
  projectTitle: string;
  summary: string;
  completionLabel: string;
  alignedCount: number;
  differenceCount: number;
  missingCount: number;
  totalFieldCount: number;
  tone: DesignCardTone;
  groups: CompatibilityGroupViewModel[];
}

export interface PublishCenterQualityItemViewModel {
  id: string;
  title: string;
  detail: string;
  tone: DesignCardTone;
}

export interface PublishCenterChecklistItemViewModel {
  id: string;
  label: string;
  tone: DesignCardTone;
}

export interface PublishCenterExportOptionViewModel {
  id: "markdown" | "docx" | "wechat" | "xiaohongshu";
  label: string;
  detail: string;
  statusLabel: string;
  tone: DesignCardTone;
  state: "ready" | "blocked" | "planned";
}

export interface PublishCenterViewModel {
  projectTitle: string;
  hasDraft: boolean;
  hasReview: boolean;
  hasPublishPackage: boolean;
  canGeneratePublishPrep: boolean;
  canExportMarkdown: boolean;
  statusLabel: string;
  statusTone: DesignCardTone;
  statusDetail: string;
  gateModeLabel: string;
  previewLabel: string;
  previewMarkdown: string;
  titleOptions: Array<{
    title: string;
    rationale: string;
    isPrimary: boolean;
  }>;
  summary: string;
  imageCues: Array<{
    id: string;
    placement: string;
    purpose: string;
    brief: string;
    imageType: string;
    layout: string;
    context: string;
    captionGoal: string;
  }>;
  checklist: PublishCenterChecklistItemViewModel[];
  qualityItems: PublishCenterQualityItemViewModel[];
  qualityPyramid: Array<{
    level: string;
    title: string;
    statusLabel: string;
    summary: string;
    tone: DesignCardTone;
  }>;
  exportOptions: PublishCenterExportOptionViewModel[];
  citationLabels: Array<{
    id: string;
    label: string;
  }>;
}

export interface WorkbenchDesignViewModel {
  activeView: WorkbenchView;
  projectTitle: string;
  projectSubtitle: string;
  pageTitle: string;
  currentStage: ProjectStage;
  updatedAtLabel: string;
  healthLabel: string;
  healthDetail: string;
  healthTone: DesignCardTone;
  completedStageCount: number;
  totalStageCount: number;
  metrics: DesignMetric[];
  stageItems: DesignStageItem[];
  coreCards: DesignCoreCard[];
  snapshots: DesignSnapshotCard[];
  focus: DesignWorkspaceFocus;
  lanes: DesignWorkspaceLane[];
  risks: DesignWorkspaceRisk[];
}

export function buildWorkbenchDesignViewModel({
  activeView,
  projects,
  selectedBundle,
  jobs,
  staleArtifacts,
}: {
  activeView: WorkbenchView;
  projects: Array<{ id: string }>;
  selectedBundle: ProjectBundle;
  jobs: JobSummary[];
  staleArtifacts: DesignStaleArtifact[];
}): WorkbenchDesignViewModel {
  const stageItems = buildDesignStageItems({ selectedBundle, jobs, staleArtifacts });
  const completedStageCount = stageItems.filter((stage) => stage.status === "complete").length;
  const health = getProjectHealth(selectedBundle, staleArtifacts);

  return {
    activeView,
    projectTitle: selectedBundle.project.topic || "未命名项目",
    projectSubtitle: getProjectSubtitle(selectedBundle),
    pageTitle: getPageTitle(activeView),
    currentStage: selectedBundle.project.stage,
    updatedAtLabel: formatUpdatedAt(selectedBundle.project.updatedAt),
    healthLabel: health.label,
    healthDetail: health.detail,
    healthTone: health.tone,
    completedStageCount,
    totalStageCount: stageItems.length,
    metrics: [
      {
        label: "项目",
        value: `${projects.length}`,
        detail: "本地项目数",
      },
      {
        label: "资料",
        value: `${selectedBundle.sourceCards.length}`,
        detail: selectedBundle.researchBrief ? "研究链路已启动" : "等待研究清单",
      },
      {
        label: "提纲",
        value: `${selectedBundle.outlineDraft?.sections.length ?? 0}`,
        detail: selectedBundle.sectorModel ? "结构骨架已形成" : "等待板块建模",
      },
      {
        label: "正文",
        value: `${countDraftCharacters(selectedBundle)}`,
        detail: "正文字符",
      },
    ],
    stageItems,
    coreCards: buildCoreCards(selectedBundle),
    snapshots: buildSnapshots(selectedBundle),
    focus: buildWorkspaceFocus(selectedBundle),
    lanes: buildWorkspaceLanes(selectedBundle),
    risks: buildWorkspaceRisks(selectedBundle, staleArtifacts),
  };
}

export function buildProjectDashboardViewModel({
  projects,
  selectedBundle,
  queue,
}: {
  projects: ArticleProject[];
  selectedBundle: ProjectBundle;
  queue: {
    activeCount: number;
    runningCount: number;
    queuedCount: number;
  };
}): ProjectDashboardViewModel {
  const projectCards = projects.map((project) => buildProjectDashboardCard(project, selectedBundle.project.id));
  const currentProject = buildProjectDashboardCard(selectedBundle.project, selectedBundle.project.id);
  const sourceCount = selectedBundle.sourceCards.length;
  const outlineSectionCount = selectedBundle.outlineDraft?.sections.length ?? 0;
  const draftCharacters = countDraftCharacters(selectedBundle);
  const stageProgress = getProjectStageProgress(selectedBundle.project.stage);
  const stageTotal = DESIGN_STAGE_DEFINITIONS.length;
  const progressPercent = Math.round((stageProgress / stageTotal) * 100);
  const evidence = analyzeEvidenceCoverage(selectedBundle);
  const citationCoverageLabel = formatPercent(evidence.summary.citationCoverage);
  const qualityScore = getProjectQualityScore(selectedBundle, progressPercent);
  const qualityTone = getQualityTone(qualityScore, selectedBundle.project.vitalityCheck.overallStatus);

  return {
    projectCount: projects.length,
    currentProject,
    projectCards,
    recentProjects: projectCards.slice(0, 6),
    currentStatus: {
      sourceCount,
      outlineSectionCount,
      draftCharacters,
      stageProgress,
      stageTotal,
      progressPercent,
      qualityScore,
      qualityLabel: formatQualityLabel(qualityScore),
      qualityTone,
      citationCoverageLabel,
      vitalityLabel: formatReviewStatus(selectedBundle.project.vitalityCheck.overallStatus),
    },
    healthItems: [
      {
        label: "资料完整度",
        value: sourceCount > 0 ? citationCoverageLabel : "待补",
        tone: sourceCount > 0 ? "success" : "warning",
      },
      {
        label: "结构完整度",
        value: outlineSectionCount > 0 ? `${outlineSectionCount} 节` : "待生成",
        tone: outlineSectionCount > 0 ? "success" : selectedBundle.sectorModel ? "accent" : "neutral",
      },
      {
        label: "写作进度",
        value: draftCharacters > 0 ? `${draftCharacters.toLocaleString("zh-CN")} 字` : `${progressPercent}%`,
        tone: draftCharacters > 0 ? "success" : progressPercent >= 50 ? "accent" : "neutral",
      },
    ],
    stageDistribution: buildStageDistribution(projects),
    queue,
  };
}

export function buildSourceLibraryViewModel(selectedBundle: ProjectBundle): SourceLibraryViewModel {
  const evidence = analyzeEvidenceCoverage(selectedBundle);
  const citedIds = new Set(evidence.validCitationIds);
  const orphanIds = new Set(evidence.orphanSourceCardIds);
  const cards = selectedBundle.sourceCards.map((card) => ({
    id: card.id,
    title: card.title || "未命名资料卡",
    summary: card.summary || card.note || "这张资料卡还没有摘要。",
    evidence: card.evidence || "还没有提炼证据片段。",
    url: card.url,
    sourceHost: formatSourceHost(card.url),
    sourceType: card.sourceType,
    credibility: card.credibility,
    supportLevel: card.supportLevel,
    claimType: card.claimType,
    timeSensitivity: card.timeSensitivity,
    intendedSection: card.intendedSection,
    reliabilityNote: card.reliabilityNote,
    rawTextPreview: truncateText(card.rawText || card.note || card.evidence || "", 180),
    zone: card.zone || "未分区",
    tags: card.tags,
    isCited: citedIds.has(card.id),
    isOrphan: orphanIds.has(card.id),
    publishedAtLabel: card.publishedAt ? formatUpdatedAt(card.publishedAt) : "未标注",
    createdAtLabel: formatUpdatedAt(card.createdAt),
  }));

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    totalCount: cards.length,
    citedCount: cards.filter((card) => card.isCited).length,
    orphanCount: cards.filter((card) => card.isOrphan).length,
    highCredibilityCount: cards.filter((card) => card.credibility === "高").length,
    officialSourceCount: cards.filter((card) => card.sourceType === "official").length,
    strongSupportCount: cards.filter((card) => card.supportLevel === "high").length,
    citationCoverageLabel: formatPercent(evidence.summary.citationCoverage),
    sectionCoverageLabel: formatPercent(evidence.summary.sectionEvidenceCoverage),
    keyPointCoverageLabel: formatPercent(evidence.summary.keyPointCoverage),
    brokenCitationCount: evidence.summary.brokenCitationCount,
    cards,
    zones: uniqueSorted(cards.map((card) => card.zone)),
    supportLevels: uniqueSorted(cards.map((card) => card.supportLevel)),
    credibilityLevels: uniqueSorted(cards.map((card) => card.credibility)),
  };
}

export function buildResearchIntakeViewModel(selectedBundle: ProjectBundle): ResearchIntakeViewModel {
  const evidence = analyzeEvidenceCoverage(selectedBundle);
  const researchGaps = getResearchGapsForDesign(selectedBundle);
  const sourceTags = new Set(selectedBundle.sourceCards.flatMap((card) => card.tags));

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    hasResearchBrief: Boolean(selectedBundle.researchBrief),
    canGenerateResearchBrief: Boolean(selectedBundle.project.thesis || selectedBundle.project.coreQuestion || selectedBundle.project.thinkCard.coreJudgement),
    sourceCount: selectedBundle.sourceCards.length,
    researchGapCount: researchGaps.length,
    highCredibilityCount: selectedBundle.sourceCards.filter((card) => card.credibility === "高").length,
    citationCoverageLabel: formatPercent(evidence.summary.citationCoverage),
    sectionCoverageLabel: formatPercent(evidence.summary.sectionEvidenceCoverage),
    keyPointCoverageLabel: formatPercent(evidence.summary.keyPointCoverage),
    angle: selectedBundle.researchBrief?.angle ?? "",
    questions: selectedBundle.researchBrief?.questions ?? [],
    blindSpots: selectedBundle.researchBrief?.blindSpots ?? [],
    stageChecklist: selectedBundle.researchBrief?.stageChecklist ?? [],
    dimensions:
      selectedBundle.researchBrief?.mustResearch.map((item, index) => {
        const keyword = item.dimension.replace(/[\/、\s]/g, "");
        const hasSourceSupport = Array.from(sourceTags).some((tag) => tag.includes(keyword) || item.dimension.includes(tag));
        return {
          id: `${index}-${item.dimension}`,
          index,
          dimension: item.dimension,
          reason: item.reason,
          expectedEvidence: item.expectedEvidence,
          hasSourceSupport,
        };
      }) ?? [],
    researchGaps,
    recentSourceCards: selectedBundle.sourceCards.slice(0, 4).map((card) => ({
      id: card.id,
      title: card.title || "未命名资料卡",
      summary: card.summary || card.evidence || "还没有摘要。",
      credibility: card.credibility,
      supportLevel: card.supportLevel,
    })),
  };
}

export function buildSectorModelWorkspaceViewModel(selectedBundle: ProjectBundle): SectorModelWorkspaceViewModel {
  const sectorModel = selectedBundle.sectorModel;
  const sourceCardMap = new Map(selectedBundle.sourceCards.map((card) => [card.id, card]));
  const modelEvidenceIds = new Set([...(sectorModel?.evidenceIds ?? []), ...(sectorModel?.zones.flatMap((zone) => zone.evidenceIds) ?? [])]);
  const zones: SectorZoneViewModel[] = sectorModel?.zones.map((zone, index) => {
    const evidenceCards = zone.evidenceIds.map((id) => sourceCardMap.get(id)).filter((card): card is SourceCard => Boolean(card)).map(toSectorEvidenceCard);
    return {
      id: zone.id,
      index,
      name: zone.name || "未命名片区",
      label: zone.label || "未设置标签",
      description: zone.description || "还没有片区描述。",
      evidenceCount: countUnique(zone.evidenceIds),
      strengths: zone.strengths,
      risks: zone.risks,
      suitableBuyers: zone.suitableBuyers,
      evidenceCards,
      tone: zone.evidenceIds.length > 0 ? "success" : "warning",
    };
  }) ?? [];

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    hasSectorModel: Boolean(sectorModel),
    canGenerateSectorModel: Boolean(selectedBundle.researchBrief && selectedBundle.sourceCards.length > 0),
    sourceCount: selectedBundle.sourceCards.length,
    highCredibilityCount: selectedBundle.sourceCards.filter((card) => card.credibility === "高").length,
    zoneCount: zones.length,
    modelEvidenceCount: modelEvidenceIds.size,
    orphanSourceCount: selectedBundle.sourceCards.filter((card) => !modelEvidenceIds.has(card.id)).length,
    summaryJudgement: sectorModel?.summaryJudgement ?? "",
    misconception: sectorModel?.misconception ?? "",
    spatialBackbone: sectorModel?.spatialBackbone ?? "",
    cutLines: sectorModel?.cutLines ?? [],
    supplyObservation: sectorModel?.supplyObservation ?? "",
    futureWatchpoints: sectorModel?.futureWatchpoints ?? [],
    zones,
    sourceCards: selectedBundle.sourceCards.map(toSectorEvidenceCard),
  };
}

export function buildOutlineEditorViewModel(selectedBundle: ProjectBundle): OutlineEditorViewModel {
  const outline = selectedBundle.outlineDraft;
  const sourceCardMap = new Map(selectedBundle.sourceCards.map((card) => [card.id, card]));
  const argumentClaims = outline?.argumentFrame ? buildOutlineClaims(outline.argumentFrame) : [];
  const sections = outline?.sections.map((section, index) =>
    buildOutlineSectionViewModel({
      section,
      index,
      sourceCardMap,
      argumentFrame: outline.argumentFrame ?? null,
      continuityBeat: outline.continuityLedger?.beats.find((beat) => beat.sectionId === section.id) ?? null,
      reviewReport: selectedBundle.reviewReport,
    }),
  ) ?? [];
  const linkedSectionCount = sections.filter((section) => section.evidenceCount > 0).length;
  const weakSectionCount = sections.filter((section) => section.evidenceCount === 0 || section.requiredEvidenceCount === 0).length;
  const flaggedSectionCount = sections.filter((section) => section.flags.length > 0).length;

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    hasOutline: Boolean(outline),
    hook: outline?.hook ?? "",
    closing: outline?.closing ?? "",
    totalSections: sections.length,
    linkedSectionCount,
    weakSectionCount,
    flaggedSectionCount,
    continuityCoverageLabel: formatPercent(sections.length ? (outline?.continuityLedger?.beats.length ?? 0) / sections.length : 0),
    sourceCount: selectedBundle.sourceCards.length,
    canGenerateOutline: Boolean(selectedBundle.sectorModel),
    canGenerateDraft: Boolean(outline && selectedBundle.sourceCards.length > 0),
    argumentFrame: outline?.argumentFrame
      ? {
          primaryShapeLabel: formatArgumentShape(outline.argumentFrame.primaryShape),
          secondaryShapeLabels: outline.argumentFrame.secondaryShapes.map(formatArgumentShape),
          centralTension: outline.argumentFrame.centralTension,
          answer: outline.argumentFrame.answer,
          notThis: outline.argumentFrame.notThis,
          claims: argumentClaims,
        }
      : null,
    sections,
  };
}

export function buildDraftEditorViewModel(selectedBundle: ProjectBundle): DraftEditorViewModel {
  const draft = selectedBundle.articleDraft;
  const primaryMarkdown = draft?.editedMarkdown || draft?.narrativeMarkdown || draft?.analysisMarkdown || "";
  const styleCore = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    hasDraft: Boolean(draft),
    canGenerateDraft: Boolean(selectedBundle.outlineDraft && selectedBundle.sectorModel && selectedBundle.sourceCards.length > 0),
    canReview: Boolean(draft),
    editedMarkdown: draft?.editedMarkdown ?? "",
    narrativeMarkdown: draft?.narrativeMarkdown ?? "",
    analysisMarkdown: draft?.analysisMarkdown ?? "",
    primaryMarkdown,
    characterCount: countTextCharacters(primaryMarkdown),
    paragraphCount: countMarkdownParagraphs(primaryMarkdown),
    citationCount: countMarkdownCitations(primaryMarkdown),
    sourceCount: selectedBundle.sourceCards.length,
    reviewPassCount: vitality.entries.filter((entry) => entry.status === "pass").length,
    reviewTotalCount: vitality.entries.length,
    continuityFlagCount: selectedBundle.reviewReport?.continuityFlags?.length ?? 0,
    rewriteSuggestionCount: selectedBundle.reviewReport?.rewriteIntents?.length ?? 0,
    outlineSections: (selectedBundle.outlineDraft?.sections ?? []).map((section, index) => ({
      id: section.id,
      index,
      heading: section.heading || `段落 ${index + 1}`,
      thesis: section.sectionThesis || section.purpose || "这段还没有主判断。",
      evidenceCount: countUnique([...section.mustUseEvidenceIds, ...section.evidenceIds]),
      statusLabel: section.mustUseEvidenceIds.length > 0 ? "必要证据" : section.evidenceIds.length > 0 ? "有证据" : "缺证据",
      tone: section.mustUseEvidenceIds.length > 0 ? "success" : section.evidenceIds.length > 0 ? "accent" : "warning",
    })),
    activeStyle: {
      judgement: styleCore.judgement || styleCore.personalView || "还没有明确作者站位。",
      rhythm: styleCore.rhythm || "还没有节奏策略。",
      breakPattern: styleCore.breakPattern || "还没有断句策略。",
      knowledgeDrop: styleCore.knowledgeDrop || "还没有知识落点。",
      personalView: styleCore.personalView || "还没有个人判断姿态。",
    },
    vitality: {
      statusLabel: formatReviewStatus(vitality.overallStatus),
      tone: reviewStatusToTone(vitality.overallStatus),
      verdict: vitality.overallVerdict || "正文生成后再运行 VitalityCheck。",
      issueCount: vitality.entries.filter((entry) => entry.status !== "pass").length,
    },
    reviewIssues: buildDraftReviewIssues(selectedBundle),
    feedbackEvents: selectedBundle.editorialFeedbackEvents.slice(0, 4).map((event) => ({
      id: event.id,
      label: getEditorialFeedbackLabel(event.eventType),
      sectionHeading: event.sectionHeading || "未定位段落",
    })),
    citationLabels: selectedBundle.sourceCards.map((card) => ({
      id: card.id,
      label: card.title || "资料卡",
    })),
  };
}

export function buildJudgementWorkspaceViewModel(selectedBundle: ProjectBundle): JudgementWorkspaceViewModel {
  const thinkCard = selectedBundle.project.thinkCard;
  const styleCore = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const topicScorecard = selectedBundle.project.topicMeta.topicScorecard;
  const signalBrief = selectedBundle.project.topicMeta.signalBrief;
  const thinkCardFilled = countFilledFields([
    selectedBundle.project.thesis,
    selectedBundle.project.coreQuestion,
    thinkCard.materialDigest,
    thinkCard.verdictReason,
    thinkCard.coreJudgement,
    thinkCard.articlePrototype,
    thinkCard.targetReaderPersona,
    thinkCard.creativeAnchor,
    thinkCard.counterIntuition,
    thinkCard.readerPayoff,
    thinkCard.decisionImplication,
    thinkCard.excludedTakeaways,
    thinkCard.hkr.happy,
    thinkCard.hkr.knowledge,
    thinkCard.hkr.resonance,
    thinkCard.hkr.summary,
    thinkCard.aiRole,
  ]);
  const styleCoreFilled = countFilledFields([
    styleCore.rhythm,
    styleCore.breakPattern,
    styleCore.openingMoves,
    styleCore.transitionMoves,
    styleCore.endingEchoMoves,
    styleCore.knowledgeDrop,
    styleCore.personalView,
    styleCore.judgement,
    styleCore.counterView,
    styleCore.allowedMoves,
    styleCore.forbiddenMoves,
    styleCore.allowedMetaphors,
    styleCore.emotionCurve,
    styleCore.personalStake,
    styleCore.characterPortrait,
    styleCore.culturalLift,
    styleCore.sentenceBreak,
    styleCore.echo,
    styleCore.humbleSetup,
    styleCore.toneCeiling,
    styleCore.concretenessRequirement,
    styleCore.costSense,
    styleCore.forbiddenFabrications,
    styleCore.genericLanguageBlackList,
    styleCore.unsupportedSceneDetector,
  ]);

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    thinkCardCompletion: {
      filled: thinkCardFilled,
      total: 17,
      label: `${thinkCardFilled}/17`,
      tone: completionToTone(thinkCardFilled, 17),
    },
    styleCoreCompletion: {
      filled: styleCoreFilled,
      total: 25,
      label: `${styleCoreFilled}/25`,
      tone: completionToTone(styleCoreFilled, 25),
    },
    vitality: {
      statusLabel: formatReviewStatus(vitality.overallStatus),
      tone: reviewStatusToTone(vitality.overallStatus),
      verdict: vitality.overallVerdict || "正文生成后再运行 VitalityCheck。",
      issueCount: vitality.entries.filter((entry) => entry.status !== "pass").length,
      hardBlocked: vitality.hardBlocked,
      canRunReview: Boolean(selectedBundle.articleDraft),
      canPreparePublish: canPreparePublish(selectedBundle.reviewReport, vitality),
    },
    topicScorecard: topicScorecard
      ? {
          statusLabel: topicScorecard.status,
          hkrLabel: `${topicScorecard.hkr.h}/${topicScorecard.hkr.k}/${topicScorecard.hkr.r}`,
          signalCoverage: topicScorecard.signalCoverageSummary,
        }
      : null,
    signalBrief: signalBrief
      ? {
          signalCount: signalBrief.signals.length,
          gapCount: signalBrief.gaps.length,
          freshnessNote: signalBrief.freshnessNote,
        }
      : null,
    styleHighlights: [
      {
        id: "rhythm",
        label: "节奏",
        value: styleCore.rhythm || "未填写",
        tone: styleCore.rhythm ? "accent" : "warning",
      },
      {
        id: "judgement",
        label: "判断力",
        value: styleCore.judgement || styleCore.personalView || "未填写",
        tone: styleCore.judgement || styleCore.personalView ? "accent" : "warning",
      },
      {
        id: "knowledge",
        label: "知识落点",
        value: styleCore.knowledgeDrop || "未填写",
        tone: styleCore.knowledgeDrop ? "accent" : "warning",
      },
    ],
    qualityPyramid:
      selectedBundle.reviewReport?.qualityPyramid.map((layer) => ({
        level: layer.level,
        title: layer.title,
        statusLabel: formatReviewStatus(layer.status),
        summary: layer.summary,
        tone: reviewStatusToTone(layer.status),
      })) ?? [],
    issues: buildJudgementIssues(selectedBundle),
  };
}

export function buildCompatibilityWorkspaceViewModel(selectedBundle: ProjectBundle): CompatibilityWorkspaceViewModel {
  const project = selectedBundle.project;
  const canonical = deriveLegacyFrames({
    topic: project.topic,
    articleType: project.articleType,
    thesis: project.thesis,
    thinkCard: project.thinkCard,
    styleCore: project.styleCore,
    currentHAMD: project.hamd,
    currentWritingMoves: project.writingMoves,
  });

  const groups: CompatibilityGroupViewModel[] = [
    buildCompatibilityGroup({
      id: "hkrr",
      title: "旧读者交付",
      subtitle: "传播快感、知识增量、共鸣和节奏的旧兼容层。",
      fields: [
        buildCompatibilityField("hkrr-happy", "情绪收益", "来自读者交付", project.hkrr.happy, canonical.hkrr.happy),
        buildCompatibilityField("hkrr-knowledge", "知识收益", "来自读者交付", project.hkrr.knowledge, canonical.hkrr.knowledge),
        buildCompatibilityField("hkrr-resonance", "共鸣收益", "来自读者交付", project.hkrr.resonance, canonical.hkrr.resonance),
        buildCompatibilityField("hkrr-rhythm", "节奏推进", "来自表达策略", project.hkrr.rhythm, canonical.hkrr.rhythm),
        buildCompatibilityField("hkrr-summary", "交付总结", "来自读者交付", project.hkrr.summary, canonical.hkrr.summary),
      ],
      summary: project.hkrr.summary || project.hkrr.knowledge || "旧 HKRR 仍为空。",
    }),
    buildCompatibilityGroup({
      id: "hamd",
      title: "旧开题卡",
      subtitle: "开头、锚点、心智地图和差异点的旧开题卡。",
      fields: [
        buildCompatibilityField("hamd-hook", "开头抓手", "来自表达策略和主判断", project.hamd.hook, canonical.hamd.hook),
        buildCompatibilityField("hamd-anchor", "创作锚点", "来自表达策略", project.hamd.anchor, canonical.hamd.anchor),
        buildCompatibilityField("hamd-mind-map", "心智地图", "来自替代角度", project.hamd.mindMap.join(" / "), canonical.hamd.mindMap.join(" / ")),
        buildCompatibilityField("hamd-different", "差异判断", "来自表达策略和选题理由", project.hamd.different, canonical.hamd.different),
      ],
      summary: project.hamd.anchor || project.hamd.hook || "旧 HAMD 仍为空。",
    }),
    buildCompatibilityGroup({
      id: "writingMoves",
      title: "旧动作卡",
      subtitle: "正文生成和质检仍会读取的旧写作动作兼容层。",
      fields: [
        buildCompatibilityField("moves-fresh-observation", "新鲜观察", "来自选题理由", project.writingMoves.freshObservation, canonical.writingMoves.freshObservation),
        buildCompatibilityField("moves-narrative-drive", "叙事推进", "来自表达节奏", project.writingMoves.narrativeDrive, canonical.writingMoves.narrativeDrive),
        buildCompatibilityField("moves-break-point", "打破惯性", "来自故意打破", project.writingMoves.breakPoint, canonical.writingMoves.breakPoint),
        buildCompatibilityField("moves-signature-line", "标志句", "来自句式断裂", project.writingMoves.signatureLine, canonical.writingMoves.signatureLine),
        buildCompatibilityField("moves-personal-position", "个人立场", "来自私人视角", project.writingMoves.personalPosition, canonical.writingMoves.personalPosition),
        buildCompatibilityField("moves-character-scene", "人物场景", "来自人物画像", project.writingMoves.characterScene, canonical.writingMoves.characterScene),
        buildCompatibilityField("moves-cultural-lift", "文化升维", "来自文化升维", project.writingMoves.culturalLift, canonical.writingMoves.culturalLift),
        buildCompatibilityField("moves-cost-sense", "现实代价", "来自现实代价", project.writingMoves.costSense, canonical.writingMoves.costSense),
        buildCompatibilityField("moves-echo-line", "回环句", "来自回环呼应", project.writingMoves.echoLine, canonical.writingMoves.echoLine),
        buildCompatibilityField("moves-reader-address", "读者称呼", "来自兼容兜底", project.writingMoves.readerAddress, canonical.writingMoves.readerAddress),
      ],
      summary: project.writingMoves.signatureLine || project.writingMoves.echoLine || project.writingMoves.freshObservation || "旧动作卡仍为空。",
    }),
  ];

  const totalFieldCount = groups.reduce((sum, group) => sum + group.total, 0);
  const alignedCount = groups.reduce((sum, group) => sum + group.alignedCount, 0);
  const differenceCount = groups.reduce((sum, group) => sum + group.differenceCount, 0);
  const missingCount = groups.reduce((sum, group) => sum + group.missingCount, 0);
  const filledCount = groups.reduce((sum, group) => sum + group.filled, 0);
  const tone: DesignCardTone = differenceCount > 0 ? "warning" : missingCount > 0 ? "accent" : "success";

  return {
    projectTitle: project.topic || "未命名项目",
    summary:
      differenceCount > 0
        ? "兼容层和当前判断核心有差异。保存 ThinkCard / StyleCore 后，仓储层会重新派生旧字段。"
        : missingCount > 0
          ? "兼容层仍有空字段，但当前主工作流可以继续使用新的判断核心。"
          : "旧兼容层已和当前判断核心保持对齐。",
    completionLabel: `${filledCount}/${totalFieldCount}`,
    alignedCount,
    differenceCount,
    missingCount,
    totalFieldCount,
    tone,
    groups,
  };
}

export function buildPublishCenterViewModel(selectedBundle: ProjectBundle): PublishCenterViewModel {
  const draft = selectedBundle.articleDraft;
  const publishPackage = selectedBundle.publishPackage;
  const qualityGate = publishPackage?.qualityGate ?? null;
  const vitality = selectedBundle.project.vitalityCheck;
  const status = qualityGate?.overallStatus ?? vitality.overallStatus;
  const previewMarkdown = publishPackage?.finalMarkdown || draft?.editedMarkdown || draft?.narrativeMarkdown || draft?.analysisMarkdown || "";
  const hasReview = Boolean(selectedBundle.reviewReport);
  const canGeneratePublishPrep = canPreparePublish(selectedBundle.reviewReport, vitality);
  const canExportMarkdown = Boolean(draft || publishPackage);

  return {
    projectTitle: selectedBundle.project.topic || "未命名项目",
    hasDraft: Boolean(draft),
    hasReview,
    hasPublishPackage: Boolean(publishPackage),
    canGeneratePublishPrep,
    canExportMarkdown,
    statusLabel: formatReviewStatus(status),
    statusTone: reviewStatusToTone(status),
    statusDetail:
      qualityGate?.mustFix[0]?.detail ||
      vitality.overallVerdict ||
      (hasReview ? "发布前检查已完成，可以根据检查结果推进整理。" : "正文完成后先运行 VitalityCheck。"),
    gateModeLabel: qualityGate ? formatQualityGateMode(qualityGate.mode) : "等待发布包",
    previewLabel: publishPackage ? "发布包最终稿" : draft ? "正文草稿预览" : "等待正文",
    previewMarkdown,
    titleOptions: publishPackage?.titleOptions ?? [],
    summary: publishPackage?.summary ?? "",
    imageCues: publishPackage?.imageCues ?? [],
    checklist: buildPublishCenterChecklist(selectedBundle),
    qualityItems: buildPublishQualityItems(selectedBundle),
    qualityPyramid:
      selectedBundle.reviewReport?.qualityPyramid.map((layer) => ({
        level: layer.level,
        title: layer.title,
        statusLabel: formatReviewStatus(layer.status),
        summary: layer.summary,
        tone: reviewStatusToTone(layer.status),
      })) ?? [],
    exportOptions: [
      {
        id: "markdown",
        label: "Markdown",
        detail: "沿用现有本地导出接口，包含当前项目可导出的真实内容。",
        statusLabel: canExportMarkdown ? "可导出" : "需先生成正文",
        tone: canExportMarkdown ? "success" : "warning",
        state: canExportMarkdown ? "ready" : "blocked",
      },
      {
        id: "docx",
        label: "DOCX",
        detail: "排版文档导出仍在规划中，当前不生成文件。",
        statusLabel: "规划中",
        tone: "neutral",
        state: "planned",
      },
      {
        id: "wechat",
        label: "公众号排版",
        detail: "公众号样式适配仍在规划中，当前保留为空态。",
        statusLabel: "规划中",
        tone: "neutral",
        state: "planned",
      },
      {
        id: "xiaohongshu",
        label: "小红书图文",
        detail: "图文卡片资产仍在规划中，当前不使用模拟内容。",
        statusLabel: "规划中",
        tone: "neutral",
        state: "planned",
      },
    ],
    citationLabels: selectedBundle.sourceCards.map((card) => ({
      id: card.id,
      label: card.title || "资料卡",
    })),
  };
}

function uniqueSorted<T extends string>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN")) as T[];
}

function truncateText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}...`;
}

function formatSourceHost(value: string) {
  if (!value) {
    return "本地资料";
  }
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "外部来源";
  }
}

function countFilledFields(values: Array<string | string[] | null | undefined>) {
  return values.filter((value) => (Array.isArray(value) ? value.some((item) => item.trim()) : Boolean(value?.trim()))).length;
}

function completionToTone(filled: number, total: number): DesignCardTone {
  const ratio = total > 0 ? filled / total : 0;
  if (ratio >= 0.85) {
    return "success";
  }
  if (ratio >= 0.5) {
    return "accent";
  }
  return "warning";
}

function buildCompatibilityGroup({
  id,
  title,
  subtitle,
  fields,
  summary,
}: {
  id: CompatibilityGroupViewModel["id"];
  title: string;
  subtitle: string;
  fields: CompatibilityFieldViewModel[];
  summary: string;
}): CompatibilityGroupViewModel {
  const filled = fields.filter((field) => field.storedValue.trim()).length;
  const alignedCount = fields.filter((field) => field.statusLabel === "已对齐").length;
  const differenceCount = fields.filter((field) => field.statusLabel === "有差异").length;
  const missingCount = fields.filter((field) => field.statusLabel === "待同步").length;
  return {
    id,
    title,
    subtitle,
    filled,
    total: fields.length,
    alignedCount,
    differenceCount,
    missingCount,
    summary,
    tone: differenceCount > 0 ? "warning" : missingCount > 0 ? "accent" : "success",
    fields,
  };
}

function buildCompatibilityField(
  id: string,
  label: string,
  sourceLabel: string,
  storedValue: string,
  canonicalValue: string,
): CompatibilityFieldViewModel {
  const normalizedStored = normalizeCompatibilityValue(storedValue);
  const normalizedCanonical = normalizeCompatibilityValue(canonicalValue);
  const hasStored = Boolean(normalizedStored);
  const hasCanonical = Boolean(normalizedCanonical);
  const statusLabel = hasStored && normalizedStored === normalizedCanonical ? "已对齐" : !hasStored && hasCanonical ? "待同步" : hasStored && hasCanonical ? "有差异" : "待同步";
  return {
    id,
    label,
    sourceLabel,
    storedValue: storedValue || "待同步",
    canonicalValue: canonicalValue || "当前主字段为空",
    statusLabel,
    tone: statusLabel === "已对齐" ? "success" : statusLabel === "有差异" ? "warning" : "accent",
  };
}

function normalizeCompatibilityValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getResearchGapsForDesign(selectedBundle: ProjectBundle) {
  return getResearchGaps(selectedBundle.researchBrief, selectedBundle.sourceCards);
}

function buildOutlineSectionViewModel({
  section,
  index,
  sourceCardMap,
  argumentFrame,
  continuityBeat,
  reviewReport,
}: {
  section: OutlineSection;
  index: number;
  sourceCardMap: Map<string, SourceCard>;
  argumentFrame: ArgumentFrame | null;
  continuityBeat: ContinuityBeat | null;
  reviewReport: ProjectBundle["reviewReport"];
}): OutlineSectionViewModel {
  const evidenceIds = uniqueSorted([...section.mustUseEvidenceIds, ...section.evidenceIds]);
  const evidenceCount = evidenceIds.length;
  const requiredEvidenceCount = countUnique(section.mustUseEvidenceIds);
  const flags = buildOutlineSectionFlags(section, reviewReport);
  const supportingClaim = buildOutlineSectionClaim(section, argumentFrame, index);
  const missingItems = buildOutlineSectionMissingItems(section, evidenceCount, requiredEvidenceCount, continuityBeat, flags);
  const optimizationSuggestions = buildOutlineSectionSuggestions(section, evidenceCount, requiredEvidenceCount, continuityBeat, flags);
  const healthScore = getOutlineSectionHealthScore(section, evidenceCount, requiredEvidenceCount, continuityBeat, flags);

  return {
    id: section.id,
    index,
    heading: section.heading || `段落 ${index + 1}`,
    purpose: section.purpose || "这段还没有明确段落目的。",
    thesis: section.sectionThesis || "这段还没有主判断。",
    singlePurpose: section.singlePurpose || "这段还没有唯一推进动作。",
    mustLandDetail: section.mustLandDetail || "还没有必须落地的事实、场景或代价。",
    sceneOrCost: section.sceneOrCost || "还没有明确场景或代价。",
    mainlineSentence: section.mainlineSentence || "还没有主线句。",
    readerUsefulness: section.readerUsefulness || "还没有明确读者读完这一段能做什么判断。",
    evidenceCount,
    requiredEvidenceCount,
    statusLabel: getOutlineSectionStatusLabel(evidenceCount, requiredEvidenceCount, flags),
    tone: getOutlineSectionTone(evidenceCount, requiredEvidenceCount, flags),
    healthScore,
    healthLabel: getOutlineSectionHealthLabel(healthScore),
    flags,
    missingItems,
    optimizationSuggestions,
    sourceReferences: evidenceIds.map((id) => buildOutlineSourceReference(id, sourceCardMap)),
    supportingClaim,
    continuity: continuityBeat
      ? {
          inheritedQuestion: continuityBeat.inheritedQuestion,
          answerThisSection: continuityBeat.answerThisSection,
          newInformation: continuityBeat.newInformation,
          leavesQuestionForNext: continuityBeat.leavesQuestionForNext,
          nextSectionNecessity: continuityBeat.nextSectionNecessity,
        }
      : null,
  };
}

function buildOutlineClaims(argumentFrame: ArgumentFrame): OutlineClaimViewModel[] {
  return argumentFrame.supportingClaims.map(toOutlineClaimViewModel);
}

function toSectorEvidenceCard(card: SourceCard): SectorModelEvidenceViewModel {
  return {
    id: card.id,
    title: card.title || "未命名资料卡",
    summary: card.summary || card.evidence || "这张资料卡还没有摘要。",
    credibility: card.credibility,
    supportLevel: card.supportLevel,
  };
}

function buildOutlineSectionClaim(section: OutlineSection, argumentFrame: ArgumentFrame | null, index: number) {
  if (!argumentFrame?.supportingClaims.length) {
    return null;
  }

  const sectionEvidenceIds = new Set([...section.evidenceIds, ...section.mustUseEvidenceIds]);
  const evidenceMatch = argumentFrame.supportingClaims.find((claim) =>
    [...claim.evidenceIds, ...claim.mustUseEvidenceIds].some((evidenceId) => sectionEvidenceIds.has(evidenceId)),
  );
  if (evidenceMatch) {
    return toOutlineClaimViewModel(evidenceMatch);
  }

  const text = `${section.heading} ${section.sectionThesis} ${section.purpose}`;
  const textMatch = argumentFrame.supportingClaims.find((claim) => {
    const claimLead = claim.claim.slice(0, 10);
    return Boolean(claimLead && text.includes(claimLead));
  });
  return toOutlineClaimViewModel(textMatch ?? argumentFrame.supportingClaims[index] ?? argumentFrame.supportingClaims[0]);
}

function toOutlineClaimViewModel(claim: ArgumentFrame["supportingClaims"][number]): OutlineClaimViewModel {
  return {
    id: claim.id,
    role: claim.role,
    roleLabel: argumentRoleLabels[claim.role] ?? claim.role,
    claim: claim.claim,
    evidenceCount: countUnique([...claim.evidenceIds, ...claim.mustUseEvidenceIds]),
    mustUseEvidenceCount: countUnique(claim.mustUseEvidenceIds),
    zonesAsEvidence: claim.zonesAsEvidence ?? [],
    shouldNotBecomeSection: Boolean(claim.shouldNotBecomeSection),
  };
}

function buildOutlineSourceReference(id: string, sourceCardMap: Map<string, SourceCard>): OutlineSourceReferenceViewModel {
  const sourceCard = sourceCardMap.get(id);
  if (!sourceCard) {
    return {
      id,
      title: "未匹配资料卡",
      summary: "提纲引用了这条证据，但当前资料库里没有匹配卡片。",
      credibility: "未知",
    };
  }

  return {
    id,
    title: sourceCard.title || "未命名资料卡",
    summary: sourceCard.summary || sourceCard.evidence || "这张资料卡还没有摘要。",
    credibility: sourceCard.credibility,
  };
}

function buildOutlineSectionFlags(section: OutlineSection, reviewReport: ProjectBundle["reviewReport"]) {
  if (!reviewReport) {
    return [];
  }
  const flags: OutlineSectionFlagViewModel[] = [];
  const sectionScore = reviewReport.sectionScores.find((score) => score.heading === section.heading && score.status !== "pass");
  if (sectionScore) {
    flags.push({
      label: sectionScore.status === "fail" ? "质检失败" : "质检提醒",
      tone: sectionScore.status === "fail" ? "danger" : "warning",
    });
  }
  if (reviewReport.continuityFlags?.some((flag) => flag.sectionIds.includes(section.id))) {
    flags.push({ label: "连续性", tone: "warning" });
  }
  if (reviewReport.argumentQualityFlags?.some((flag) => flag.sectionIds.includes(section.id))) {
    flags.push({ label: "论证", tone: "warning" });
  }
  if (reviewReport.structuralRewriteIntents?.some((intent) => intent.affectedSectionIds.includes(section.id))) {
    flags.push({ label: "需重写", tone: "danger" });
  }
  if (reviewReport.paragraphFlags.some((flag) => flag.sectionHeading === section.heading)) {
    flags.push({ label: "段落", tone: "warning" });
  }
  return dedupeOutlineFlags(flags);
}

function dedupeOutlineFlags(flags: OutlineSectionFlagViewModel[]) {
  const seen = new Set<string>();
  return flags.filter((flag) => {
    if (seen.has(flag.label)) {
      return false;
    }
    seen.add(flag.label);
    return true;
  });
}

function buildOutlineSectionMissingItems(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: OutlineSectionFlagViewModel[],
): OutlineSectionActionViewModel[] {
  const items: OutlineSectionActionViewModel[] = [];
  if (evidenceCount === 0) {
    items.push({
      id: "missing-evidence",
      title: "缺少支撑资料",
      detail: "这一段还没有绑定可读资料卡，正文生成时会缺少事实落点。",
      tone: "danger",
    });
  }
  if (requiredEvidenceCount === 0) {
    items.push({
      id: "missing-required-evidence",
      title: "缺少必要证据",
      detail: "建议至少指定一条必须使用的资料，避免段落只停在判断层。",
      tone: "warning",
    });
  }
  if (!continuityBeat) {
    items.push({
      id: "missing-continuity",
      title: "缺少连续性账本",
      detail: "还没有明确上一段留下的问题、本段回答和下一段必要性。",
      tone: "warning",
    });
  }
  if (!section.sceneOrCost.trim()) {
    items.push({
      id: "missing-scene-cost",
      title: "缺少场景或代价",
      detail: "这一段需要一个具体场景、代价或读者可感知的冲突。",
      tone: "accent",
    });
  }
  if (flags.some((flag) => flag.tone === "danger")) {
    items.push({
      id: "hard-review-flag",
      title: "存在硬性复查项",
      detail: "Review 已标记这一段需要重写或结构处理。",
      tone: "danger",
    });
  }

  return items.slice(0, 5);
}

function buildOutlineSectionSuggestions(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: OutlineSectionFlagViewModel[],
): OutlineSectionActionViewModel[] {
  const suggestions: OutlineSectionActionViewModel[] = [];
  if (flags.length > 0) {
    suggestions.push({
      id: "review-flags",
      title: "先处理质检提示",
      detail: `当前有 ${flags.length} 个复查标签，优先消除会影响正文生成的结构问题。`,
      tone: flags.some((flag) => flag.tone === "danger") ? "danger" : "warning",
    });
  }
  if (evidenceCount === 0) {
    suggestions.push({
      id: "add-evidence",
      title: "补一张直接证据",
      detail: "从资料卡库选择一条能直接证明本段主判断的材料。",
      tone: "warning",
    });
  } else if (requiredEvidenceCount === 0) {
    suggestions.push({
      id: "promote-required-evidence",
      title: "把关键资料设为必要证据",
      detail: "把最能支撑本段主判断的资料标记为必须使用。",
      tone: "accent",
    });
  }
  if (!continuityBeat) {
    suggestions.push({
      id: "add-continuity",
      title: "补齐段落承接关系",
      detail: "明确上一段的问题、本段新增信息和下一段为什么必须出现。",
      tone: "accent",
    });
  }
  if (!section.mainlineSentence.trim()) {
    suggestions.push({
      id: "add-mainline",
      title: "补主线句",
      detail: "给这一段补一句可以直接进入正文的主线判断。",
      tone: "warning",
    });
  }
  if (!section.readerUsefulness.trim()) {
    suggestions.push({
      id: "add-reader-usefulness",
      title: "补读者用途",
      detail: "明确读者读完这一段能做出什么判断或取舍。",
      tone: "accent",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "keep-structure",
      title: "结构可进入正文",
      detail: "当前段落的证据、连续性和主线信息相对完整。",
      tone: "success",
    });
  }

  return suggestions.slice(0, 5);
}

function getOutlineSectionHealthScore(
  section: OutlineSection,
  evidenceCount: number,
  requiredEvidenceCount: number,
  continuityBeat: ContinuityBeat | null,
  flags: OutlineSectionFlagViewModel[],
) {
  let score = 100;
  if (evidenceCount === 0) {
    score -= 28;
  }
  if (requiredEvidenceCount === 0) {
    score -= 18;
  }
  if (!continuityBeat) {
    score -= 18;
  }
  if (!section.mainlineSentence.trim()) {
    score -= 10;
  }
  if (!section.sceneOrCost.trim()) {
    score -= 8;
  }
  if (!section.readerUsefulness.trim()) {
    score -= 8;
  }
  for (const flag of flags) {
    score -= flag.tone === "danger" ? 22 : 10;
  }
  return Math.max(0, Math.min(100, score));
}

function getOutlineSectionHealthLabel(score: number) {
  if (score >= 86) {
    return "优秀";
  }
  if (score >= 72) {
    return "良好";
  }
  if (score >= 52) {
    return "待补强";
  }
  return "有阻塞";
}

function getOutlineSectionStatusLabel(evidenceCount: number, requiredEvidenceCount: number, flags: OutlineSectionFlagViewModel[]) {
  if (flags.some((flag) => flag.tone === "danger")) {
    return "需重写";
  }
  if (flags.length > 0) {
    return "需复查";
  }
  if (evidenceCount === 0) {
    return "缺证据";
  }
  if (requiredEvidenceCount === 0) {
    return "可补强";
  }
  return "支撑完整";
}

function getOutlineSectionTone(evidenceCount: number, requiredEvidenceCount: number, flags: OutlineSectionFlagViewModel[]): DesignCardTone {
  if (flags.some((flag) => flag.tone === "danger")) {
    return "danger";
  }
  if (flags.length > 0 || evidenceCount === 0) {
    return "warning";
  }
  if (requiredEvidenceCount === 0) {
    return "accent";
  }
  return "success";
}

function countUnique(values: string[]) {
  return new Set(values.filter(Boolean)).size;
}

function countTextCharacters(value: string) {
  return value.replace(/\s/g, "").length;
}

function countMarkdownParagraphs(value: string) {
  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean).length;
}

function countMarkdownCitations(value: string) {
  return value.match(/\[SC:[^\]]+\]/g)?.length ?? 0;
}

function buildDraftReviewIssues(selectedBundle: ProjectBundle): DraftEditorReviewIssueViewModel[] {
  const issues: DraftEditorReviewIssueViewModel[] = [];

  for (const item of selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status !== "pass")) {
    issues.push({
      id: `vitality-${item.title}`,
      title: item.title,
      detail: item.detail,
      tone: reviewStatusToTone(item.status),
    });
  }

  for (const item of selectedBundle.reviewReport?.continuityFlags ?? []) {
    issues.push({
      id: `continuity-${item.type}-${issues.length}`,
      title: "连续性",
      detail: item.reason || item.suggestedAction,
      tone: reviewStatusToTone(item.severity),
    });
  }

  for (const item of selectedBundle.reviewReport?.argumentQualityFlags ?? []) {
    issues.push({
      id: `argument-${item.type}-${issues.length}`,
      title: "论证",
      detail: item.reason || item.suggestedAction,
      tone: reviewStatusToTone(item.severity),
    });
  }

  for (const item of selectedBundle.reviewReport?.rewriteIntents ?? []) {
    issues.push({
      id: `rewrite-${item.issueType}-${issues.length}`,
      title: "重写建议",
      detail: item.whyItFails || item.suggestedRewriteMode,
      tone: "warning",
    });
  }

  return issues.slice(0, 6);
}

function getEditorialFeedbackLabel(type: ProjectBundle["editorialFeedbackEvents"][number]["eventType"]) {
  switch (type) {
    case "delete_fluff":
      return "删掉空话";
    case "add_evidence":
      return "补充证据";
    case "add_cost":
      return "补充代价";
    case "reorder_paragraph":
      return "调整段落";
    case "rewrite_opening":
      return "重写开头";
    case "tighten_ending":
      return "收紧结尾";
  }
}

function buildPublishCenterChecklist(selectedBundle: ProjectBundle): PublishCenterChecklistItemViewModel[] {
  const publishChecklist = selectedBundle.publishPackage?.publishChecklist ?? [];
  if (publishChecklist.length > 0) {
    return publishChecklist.map((item, index) => ({
      id: `publish-checklist-${index}`,
      label: item,
      tone: "success",
    }));
  }

  const checklist: PublishCenterChecklistItemViewModel[] = [
    {
      id: "draft",
      label: selectedBundle.articleDraft ? "正文已生成" : "先生成正文",
      tone: selectedBundle.articleDraft ? "success" : "warning",
    },
    {
      id: "review",
      label: selectedBundle.reviewReport ? "VitalityCheck 已运行" : "先运行 VitalityCheck",
      tone: selectedBundle.reviewReport ? "success" : "warning",
    },
    {
      id: "gate",
      label: canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck) ? "发布门槛可通过" : "仍有发布阻塞",
      tone: canPreparePublish(selectedBundle.reviewReport, selectedBundle.project.vitalityCheck) ? "success" : "danger",
    },
  ];

  return checklist;
}

function buildPublishQualityItems(selectedBundle: ProjectBundle): PublishCenterQualityItemViewModel[] {
  const qualityGate = selectedBundle.publishPackage?.qualityGate;
  if (qualityGate) {
    return [
      ...qualityGate.mustFix.map((item) => ({
        id: `must-${item.code}`,
        title: `必须先修 / ${item.title}`,
        detail: item.detail,
        tone: "danger" as const,
      })),
      ...qualityGate.shouldFix.map((item) => ({
        id: `should-${item.code}`,
        title: `建议修正 / ${item.title}`,
        detail: item.detail,
        tone: "warning" as const,
      })),
      ...qualityGate.optionalPolish.map((item) => ({
        id: `optional-${item.code}`,
        title: `可选润色 / ${item.title}`,
        detail: item.detail,
        tone: "accent" as const,
      })),
    ].slice(0, 8);
  }

  const vitalityItems = selectedBundle.project.vitalityCheck.entries
    .filter((entry) => entry.status !== "pass")
    .map((entry) => ({
      id: `vitality-${entry.key}`,
      title: entry.title,
      detail: entry.detail,
      tone: reviewStatusToTone(entry.status),
    }));

  const reviewItems =
    selectedBundle.reviewReport?.checks
      .filter((check) => check.status !== "pass")
      .map((check) => ({
        id: `review-${check.key}`,
        title: check.title,
        detail: check.detail,
        tone: reviewStatusToTone(check.status),
      })) ?? [];

  return [...vitalityItems, ...reviewItems].slice(0, 8);
}

function buildJudgementIssues(selectedBundle: ProjectBundle): JudgementWorkspaceIssueViewModel[] {
  const issues: JudgementWorkspaceIssueViewModel[] = [];

  for (const entry of selectedBundle.project.vitalityCheck.entries.filter((item) => item.status !== "pass")) {
    issues.push({
      id: `vitality-${entry.key}`,
      title: entry.title,
      detail: entry.detail,
      tone: reviewStatusToTone(entry.status),
      sourceLabel: "VitalityCheck",
    });
  }

  for (const check of selectedBundle.reviewReport?.checks.filter((item) => item.status !== "pass") ?? []) {
    issues.push({
      id: `check-${check.key}`,
      title: check.title,
      detail: check.detail,
      tone: reviewStatusToTone(check.status),
      sourceLabel: check.layer ? `检查项 ${check.layer}` : "检查项",
    });
  }

  for (const flag of selectedBundle.reviewReport?.continuityFlags ?? []) {
    issues.push({
      id: `continuity-${flag.type}-${flag.sectionIds.join("-")}`,
      title: "连续性",
      detail: flag.reason || flag.suggestedAction,
      tone: reviewStatusToTone(flag.severity),
      sourceLabel: "连续性",
    });
  }

  for (const flag of selectedBundle.reviewReport?.argumentQualityFlags ?? []) {
    issues.push({
      id: `argument-${flag.type}-${flag.sectionIds.join("-")}`,
      title: "论证质量",
      detail: flag.reason || flag.suggestedAction,
      tone: reviewStatusToTone(flag.severity),
      sourceLabel: "论证",
    });
  }

  return issues.slice(0, 10);
}

function formatQualityGateMode(mode: ProjectBundle["publishPackage"] extends infer Package ? Package extends { qualityGate?: infer Gate } ? Gate extends { mode: infer Mode } ? Mode : never : never : never) {
  switch (mode) {
    case "hard-block":
      return "硬阻塞";
    case "soft-block":
      return "软阻塞";
    case "warn-only":
      return "仅提醒";
    default:
      return "等待发布包";
  }
}

const argumentRoleLabels: Record<string, string> = {
  open: "开场",
  explain: "解释",
  prove: "证明",
  counter: "反证",
  decision: "决策",
  return: "回环",
};

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

function buildProjectDashboardCard(project: ArticleProject, selectedProjectId: string): ProjectDashboardCard {
  const stageIndex = getProjectStageProgress(project.stage);
  const progressPercent = Math.round((stageIndex / DESIGN_STAGE_DEFINITIONS.length) * 100);

  return {
    id: project.id,
    title: project.topic || "未命名项目",
    subtitle: [project.articleType, project.audience].filter(Boolean).join(" / "),
    summary: project.coreQuestion || project.thesis || project.notes || "这个项目还缺一个可推进的核心问题。",
    stageLabel: formatProjectStage(project.stage),
    stageIndex,
    progressLabel: `${stageIndex}/${DESIGN_STAGE_DEFINITIONS.length}`,
    progressPercent,
    updatedAtLabel: formatUpdatedAt(project.updatedAt),
    tone: getProjectCardTone(project.stage),
    isSelected: project.id === selectedProjectId,
  };
}

function buildStageDistribution(projects: ArticleProject[]) {
  const counts = new Map<ProjectStage, number>();
  for (const project of projects) {
    counts.set(project.stage, (counts.get(project.stage) ?? 0) + 1);
  }

  return DESIGN_STAGE_DEFINITIONS.map((definition) => ({
    label: definition.shortLabel,
    count: counts.get(definition.stage) ?? 0,
  })).filter((item) => item.count > 0);
}

function getProjectStageProgress(stage: ProjectStage) {
  const index = DESIGN_STAGE_DEFINITIONS.findIndex((definition) => definition.stage === stage);
  return index === -1 ? 1 : index + 1;
}

function getProjectCardTone(stage: ProjectStage): DesignCardTone {
  const progress = getProjectStageProgress(stage);
  if (progress >= 9) {
    return "success";
  }
  if (progress >= 6) {
    return "accent";
  }
  if (progress >= 4) {
    return "warning";
  }
  return "neutral";
}

function getProjectQualityScore(selectedBundle: ProjectBundle, fallbackScore: number) {
  const explicitScore = selectedBundle.reviewReport?.globalScore ?? selectedBundle.reviewReport?.completionScore;
  if (typeof explicitScore === "number" && Number.isFinite(explicitScore)) {
    return Math.max(0, Math.min(100, Math.round(explicitScore)));
  }

  const vitality = selectedBundle.project.vitalityCheck.overallStatus;
  const vitalityBonus = vitality === "pass" ? 12 : vitality === "warn" ? 4 : 0;
  const evidence = analyzeEvidenceCoverage(selectedBundle);
  const evidenceScore = selectedBundle.sourceCards.length > 0 ? Math.round(evidence.summary.citationCoverage * 18) : 0;
  return Math.max(0, Math.min(100, Math.round(fallbackScore * 0.72 + vitalityBonus + evidenceScore)));
}

function getQualityTone(score: number, vitalityStatus: ReviewSeverity): DesignCardTone {
  if (vitalityStatus === "fail" || score < 55) {
    return "danger";
  }
  if (vitalityStatus === "warn" || score < 75) {
    return "warning";
  }
  if (score >= 88) {
    return "success";
  }
  return "accent";
}

function formatQualityLabel(score: number) {
  if (score >= 88) {
    return "优秀";
  }
  if (score >= 75) {
    return "良好";
  }
  if (score >= 55) {
    return "待优化";
  }
  return "需处理";
}

function getPageTitle(activeView: WorkbenchView) {
  switch (activeView) {
    case "projects":
      return "项目中控台";
    case "sources":
      return "研究资料库";
    case "outline":
      return "结构编辑器";
    case "draft":
      return "写作编辑器";
    case "publish":
      return "发布中心";
    case "settings":
      return "设置";
    case "workbench":
    default:
      return "写作驾驶舱";
  }
}

function getProjectSubtitle(selectedBundle: ProjectBundle) {
  const parts = [
    selectedBundle.project.articleType,
    selectedBundle.project.audience,
    selectedBundle.project.targetWords ? `${selectedBundle.project.targetWords} 字` : "",
  ].filter(Boolean);
  return parts.join(" / ");
}

function getProjectHealth(selectedBundle: ProjectBundle, staleArtifacts: DesignStaleArtifact[]) {
  if (staleArtifacts.length > 0) {
    return {
      label: "下游需更新",
      detail: "上游内容已修改，建议处理过期结果。",
      tone: "stale" as const,
    };
  }

  const vitalityStatus = selectedBundle.project.vitalityCheck.overallStatus;
  if (vitalityStatus === "fail") {
    return {
      label: "有硬伤",
      detail: selectedBundle.project.vitalityCheck.overallVerdict || "VitalityCheck 未通过。",
      tone: "danger" as const,
    };
  }
  if (vitalityStatus === "warn") {
    return {
      label: "需补强",
      detail: selectedBundle.project.vitalityCheck.overallVerdict || "仍有质量提醒。",
      tone: "warning" as const,
    };
  }
  if (!selectedBundle.researchBrief || selectedBundle.sourceCards.length === 0) {
    return {
      label: "资料不足",
      detail: "先补研究链路和资料卡。",
      tone: "warning" as const,
    };
  }
  return {
    label: "可继续推进",
    detail: "当前没有明显硬阻塞。",
    tone: "success" as const,
  };
}

function buildCoreCards(selectedBundle: ProjectBundle): DesignCoreCard[] {
  const thinkCard = selectedBundle.project.thinkCard;
  const styleCore = selectedBundle.project.styleCore;
  const vitality = selectedBundle.project.vitalityCheck;
  const isThinkReady = Boolean(thinkCard.coreJudgement && thinkCard.verdictReason && thinkCard.readerPayoff);
  const isStyleReady = Boolean(styleCore.rhythm && styleCore.breakPattern && styleCore.judgement && styleCore.knowledgeDrop);

  return [
    {
      id: "think-card",
      eyebrow: "选题判断",
      title: "ThinkCard",
      statusLabel: isThinkReady ? "已形成" : "待补齐",
      tone: isThinkReady ? "success" : "warning",
      body: thinkCard.coreJudgement || selectedBundle.project.thesis || "先把核心判断、题值理由和读者收获补齐。",
      detail: thinkCard.readerPayoff || thinkCard.verdictReason || "这是后续研究、提纲和正文的判断原点。",
      targetTab: "overview",
      targetSection: "overview-think-card",
    },
    {
      id: "style-core",
      eyebrow: "表达策略",
      title: "StyleCore",
      statusLabel: isStyleReady ? "已形成" : "待补齐",
      tone: isStyleReady ? "success" : "warning",
      body: styleCore.judgement || styleCore.personalView || "先定义节奏、断句、知识落点和作者立场。",
      detail: styleCore.rhythm || styleCore.breakPattern || "它决定正文不是模板稿，而是有作者动作的稿。",
      targetTab: "overview",
      targetSection: "overview-style-core",
    },
    {
      id: "vitality-check",
      eyebrow: "发布前质检",
      title: "VitalityCheck",
      statusLabel: formatReviewStatus(vitality.overallStatus),
      tone: reviewStatusToTone(vitality.overallStatus),
      body: vitality.overallVerdict || "正文生成后再运行质量检查。",
      detail: vitality.entries.filter((entry) => entry.status !== "pass")[0]?.detail || "检查连续性、证据、论证和发布风险。",
      targetTab: "overview",
      targetSection: "overview-vitality",
    },
  ];
}

function buildSnapshots(selectedBundle: ProjectBundle): DesignSnapshotCard[] {
  return [
    {
      id: "sources",
      label: "资料卡",
      value: `${selectedBundle.sourceCards.length}`,
      detail: selectedBundle.sourceCards[0]?.title || "还没有可用资料卡",
      tone: selectedBundle.sourceCards.length > 0 ? "success" : "warning",
      targetTab: "research",
      targetSection: "source-library",
    },
    {
      id: "outline",
      label: "提纲章节",
      value: `${selectedBundle.outlineDraft?.sections.length ?? 0}`,
      detail: selectedBundle.outlineDraft?.hook || "等待结构生成",
      tone: selectedBundle.outlineDraft?.sections.length ? "success" : "neutral",
      targetTab: "structure",
      targetSection: "outline",
    },
    {
      id: "draft",
      label: "正文状态",
      value: selectedBundle.articleDraft ? "已生成" : "未生成",
      detail: selectedBundle.articleDraft ? "可进入正文编辑或发布前检查" : "提纲完成后再生成正文",
      tone: selectedBundle.articleDraft ? "success" : "neutral",
      targetTab: "drafts",
      targetSection: "drafts",
    },
  ];
}

function buildWorkspaceFocus(selectedBundle: ProjectBundle): DesignWorkspaceFocus {
  const thinkCard = selectedBundle.project.thinkCard;
  const styleCore = selectedBundle.project.styleCore;
  const hasCoreQuestion = Boolean(selectedBundle.project.coreQuestion);
  const hasJudgement = Boolean(thinkCard.coreJudgement || selectedBundle.project.thesis);

  return {
    label: hasCoreQuestion ? "当前主问题" : "先补主问题",
    title: selectedBundle.project.coreQuestion || selectedBundle.project.topic || "未命名项目",
    body: thinkCard.coreJudgement || selectedBundle.project.thesis || "这篇文章还缺一个可推进的核心判断。",
    detail: styleCore.judgement || styleCore.personalView || "补齐作者站位和表达策略后，再推进研究、提纲和正文。",
    tone: hasCoreQuestion && hasJudgement ? "accent" : "warning",
  };
}

function buildWorkspaceLanes(selectedBundle: ProjectBundle): DesignWorkspaceLane[] {
  const outlineCount = selectedBundle.outlineDraft?.sections.length ?? 0;
  const draftCharacters = countDraftCharacters(selectedBundle);

  return [
    {
      id: "research",
      title: "资料与证据",
      statusLabel: selectedBundle.sourceCards.length > 0 ? "有资料" : selectedBundle.researchBrief ? "待补资料" : "待启动",
      body: selectedBundle.researchBrief
        ? `${selectedBundle.researchBrief.mustResearch.length} 个研究维度，${selectedBundle.sourceCards.length} 张资料卡`
        : "研究清单还没有生成。",
      detail: selectedBundle.sourceCards[0]?.title || "先建立研究问题，再补第一张可信资料卡。",
      tone: selectedBundle.sourceCards.length > 0 ? "success" : "warning",
      targetTab: "research",
      targetSection: selectedBundle.researchBrief ? "source-library" : "research-brief",
    },
    {
      id: "structure",
      title: "结构与论证",
      statusLabel: outlineCount > 0 ? "有提纲" : selectedBundle.sectorModel ? "待提纲" : "待建模",
      body: selectedBundle.sectorModel
        ? `${selectedBundle.sectorModel.zones.length} 个片区模型，${outlineCount} 个段落任务`
        : "板块模型还没有生成。",
      detail: selectedBundle.outlineDraft?.hook || selectedBundle.sectorModel?.summaryJudgement || "先把资料翻成空间骨架，再生成段落任务书。",
      tone: outlineCount > 0 ? "success" : selectedBundle.sectorModel ? "accent" : "neutral",
      targetTab: "structure",
      targetSection: outlineCount > 0 ? "outline" : "sector-model",
    },
    {
      id: "draft",
      title: "正文生产",
      statusLabel: selectedBundle.articleDraft ? "有正文" : "未生成",
      body: selectedBundle.articleDraft ? `${draftCharacters} 字正文内容` : "正文双稿还没有生成。",
      detail: selectedBundle.articleDraft ? "可以进入正文编辑，或先运行 VitalityCheck。" : "提纲完成后再生成分析版和成文版。",
      tone: selectedBundle.articleDraft ? "success" : "neutral",
      targetTab: "drafts",
      targetSection: "drafts",
    },
    {
      id: "publish",
      title: "检查与发布",
      statusLabel: selectedBundle.publishPackage ? "已整理" : selectedBundle.reviewReport ? "已质检" : "待质检",
      body: selectedBundle.publishPackage
        ? `${selectedBundle.publishPackage.titleOptions.length} 个标题候选`
        : selectedBundle.reviewReport
          ? "质检报告已生成，等待发布整理。"
          : "还没有运行发布前质量检查。",
      detail: selectedBundle.project.vitalityCheck.overallVerdict || "Markdown 导出已保留，其他发布形态仍是规划中。",
      tone: selectedBundle.publishPackage ? "success" : selectedBundle.reviewReport ? reviewStatusToTone(selectedBundle.project.vitalityCheck.overallStatus) : "warning",
      targetTab: selectedBundle.reviewReport ? "publish" : "overview",
      targetSection: selectedBundle.reviewReport ? "publish-prep" : "overview-vitality",
    },
  ];
}

function buildWorkspaceRisks(selectedBundle: ProjectBundle, staleArtifacts: DesignStaleArtifact[]): DesignWorkspaceRisk[] {
  const risks: DesignWorkspaceRisk[] = [];
  const vitalityIssues = selectedBundle.project.vitalityCheck.entries.filter((entry) => entry.status !== "pass");
  const reviewIssueCount =
    (selectedBundle.reviewReport?.continuityFlags?.length ?? 0) +
    (selectedBundle.reviewReport?.argumentQualityFlags?.length ?? 0) +
    (selectedBundle.reviewReport?.rewriteIntents.length ?? 0);

  if (staleArtifacts.length > 0) {
    risks.push({
      id: "stale-artifacts",
      label: "需重跑",
      title: "下游结果可能过期",
      detail: `${staleArtifacts.length} 个下游产物受上游修改影响。`,
      tone: "stale",
      targetTab: "overview",
      targetSection: "workbench-dashboard",
    });
  }

  if (selectedBundle.sourceCards.length === 0) {
    risks.push({
      id: "missing-sources",
      label: "资料",
      title: "缺少资料卡",
      detail: "没有资料卡时，板块建模、提纲和正文都会缺证据。",
      tone: "warning",
      targetTab: "research",
      targetSection: "source-library",
    });
  }

  if (!selectedBundle.outlineDraft?.sections.length) {
    risks.push({
      id: "missing-outline",
      label: "结构",
      title: "提纲还没形成",
      detail: selectedBundle.sectorModel ? "已有板块模型，下一步应生成段落任务书。" : "先完成板块建模，再生成提纲。",
      tone: selectedBundle.sectorModel ? "accent" : "neutral",
      targetTab: "structure",
      targetSection: selectedBundle.sectorModel ? "outline" : "sector-model",
    });
  }

  if (vitalityIssues.length > 0) {
    risks.push({
      id: "vitality-issues",
      label: "质检",
      title: `${vitalityIssues.length} 个 VitalityCheck 提醒`,
      detail: vitalityIssues[0]?.detail || "需要查看质检项。",
      tone: reviewStatusToTone(selectedBundle.project.vitalityCheck.overallStatus),
      targetTab: "overview",
      targetSection: "overview-vitality",
    });
  }

  if (reviewIssueCount > 0) {
    risks.push({
      id: "review-repairs",
      label: "修稿",
      title: `${reviewIssueCount} 个待修复项`,
      detail: "质检报告里仍有连续性、论证或重写建议。",
      tone: "warning",
      targetTab: "overview",
      targetSection: "overview-vitality",
    });
  }

  return risks.slice(0, 4);
}

function countDraftCharacters(selectedBundle: ProjectBundle) {
  const text =
    selectedBundle.articleDraft?.editedMarkdown ||
    selectedBundle.articleDraft?.narrativeMarkdown ||
    selectedBundle.articleDraft?.analysisMarkdown ||
    "";
  return text.replace(/\s/g, "").length;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "未记录";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReviewStatus(status: ReviewSeverity) {
  switch (status) {
    case "pass":
      return "通过";
    case "warn":
      return "提醒";
    case "fail":
      return "阻塞";
  }
}

function reviewStatusToTone(status: ReviewSeverity): DesignCardTone {
  switch (status) {
    case "pass":
      return "success";
    case "warn":
      return "warning";
    case "fail":
      return "danger";
  }
}
