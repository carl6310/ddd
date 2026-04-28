import type { SignalBrief, SignalProviderMode, SignalSourceDigest } from "@/lib/signals/types";

export { SIGNAL_PROVIDER_MODES, SIGNAL_TYPES } from "@/lib/signals/types";
export type { SignalBrief, SignalBriefSignal, SignalProviderMode, SignalSourceDigest, SignalType } from "@/lib/signals/types";

export const ARTICLE_TYPES = [
  "断供型",
  "价值重估型",
  "规划拆解型",
  "误解纠偏型",
  "更新拆迁型",
] as const;

export const PROJECT_STAGES = [
  "选题定义",
  "ThinkCard / HKR",
  "StyleCore",
  "研究清单",
  "资料卡整理",
  "板块建模",
  "提纲生成",
  "正文生成",
  "VitalityCheck",
  "发布前整理",
] as const;

export const SOURCE_CREDIBILITIES = ["高", "中", "低"] as const;
export const SOURCE_TYPES = ["official", "media", "commentary", "interview", "observation"] as const;
export const SOURCE_SUPPORT_LEVELS = ["high", "medium", "low"] as const;
export const SOURCE_CLAIM_TYPES = ["fact", "observation", "judgement", "counterevidence", "quote"] as const;
export const SOURCE_TIME_SENSITIVITIES = ["evergreen", "timely", "volatile"] as const;

export const REVIEW_SEVERITIES = ["pass", "warn", "fail"] as const;
export const TOPIC_VERDICTS = ["strong", "rework", "weak"] as const;
export const TOPIC_SCORECARD_STATUSES = ["ready_to_open", "needs_more_signals", "weak_topic"] as const;
export const ARTICLE_PROTOTYPES = [
  "total_judgement",
  "spatial_segmentation",
  "buyer_split",
  "transaction_observation",
  "decision_service",
  "risk_deconstruction",
  "scene_character",
] as const;
export const TOPIC_READER_PERSONAS = ["busy_relocator", "improver_buyer", "risk_aware_reader", "local_life_reader"] as const;
export const QUALITY_PYRAMID_LEVELS = ["L1", "L2", "L3", "L4"] as const;
export const ARGUMENT_SHAPES = [
  "judgement_essay",
  "misread_correction",
  "signal_reinterpretation",
  "lifecycle_reframe",
  "asset_tiering",
  "mismatch_diagnosis",
  "tradeoff_decision",
  "risk_decomposition",
  "comparison_benchmark",
  "planning_reality_check",
  "cycle_timing",
  "buyer_persona_split",
] as const;
export const SECTION_BEAT_ROLES = [
  "raise_misread",
  "break_misread",
  "explain_mechanism",
  "show_difference",
  "show_cost",
  "give_decision_frame",
  "return_to_opening",
] as const;
export const CONTINUITY_ISSUE_TYPES = [
  "does_not_answer_previous",
  "no_new_information",
  "can_be_swapped",
  "section_redundant",
  "repeated_claim",
  "fake_bridge",
  "section_does_not_deliver_new_information",
  "section_does_not_answer_ledger",
  "section_missing_required_evidence",
  "section_missing_optional_evidence",
  "unlinked_adjacency",
] as const;
export const ARGUMENT_QUALITY_ISSUE_TYPES = [
  "headline_not_answered",
  "thesis_too_generic",
  "map_tour_in_judgement_essay",
  "zones_used_as_structure_not_evidence",
  "counterargument_missing",
  "decision_frame_weak",
  "too_much_background_before_answer",
  "evidence_without_argument",
  "claim_without_consequence",
] as const;

export type ArticleType = (typeof ARTICLE_TYPES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type SourceCredibility = (typeof SOURCE_CREDIBILITIES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceSupportLevel = (typeof SOURCE_SUPPORT_LEVELS)[number];
export type SourceClaimType = (typeof SOURCE_CLAIM_TYPES)[number];
export type SourceTimeSensitivity = (typeof SOURCE_TIME_SENSITIVITIES)[number];
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];
export type TopicVerdict = (typeof TOPIC_VERDICTS)[number];
export type TopicScorecardStatus = (typeof TOPIC_SCORECARD_STATUSES)[number];
export type ArticlePrototype = (typeof ARTICLE_PROTOTYPES)[number];
export type TopicReaderPersona = (typeof TOPIC_READER_PERSONAS)[number];
export type QualityPyramidLevel = (typeof QUALITY_PYRAMID_LEVELS)[number];
export type ArgumentShape = (typeof ARGUMENT_SHAPES)[number];
export type SectionBeatRole = (typeof SECTION_BEAT_ROLES)[number];
export type ContinuityIssueType = (typeof CONTINUITY_ISSUE_TYPES)[number];
export type ArgumentQualityIssueType = (typeof ARGUMENT_QUALITY_ISSUE_TYPES)[number];
export type StructuralRewriteIssueType = ContinuityIssueType | ArgumentQualityIssueType;

export interface ArgumentSupportingClaim {
  id: string;
  claim: string;
  role: "open" | "explain" | "prove" | "counter" | "decision" | "return";
  evidenceIds: string[];
  mustUseEvidenceIds: string[];
  zonesAsEvidence?: string[];
  shouldNotBecomeSection?: boolean;
}

export interface ArgumentFrame {
  primaryShape: ArgumentShape;
  secondaryShapes: ArgumentShape[];
  centralTension: string;
  answer: string;
  notThis: string[];
  supportingClaims: ArgumentSupportingClaim[];
  strongestCounterArgument: string;
  howToHandleCounterArgument: string;
  readerDecisionFrame: string;
}

export const ARTICLE_PROTOTYPE_LABELS: Record<ArticlePrototype, string> = {
  total_judgement: "总判断",
  spatial_segmentation: "空间切割",
  buyer_split: "客群切分",
  transaction_observation: "交易观察",
  decision_service: "决策服务",
  risk_deconstruction: "风险拆解",
  scene_character: "人物/场景",
};

export const TOPIC_READER_PERSONA_LABELS: Record<TopicReaderPersona, string> = {
  busy_relocator: "忙碌迁居者",
  improver_buyer: "改善型买家",
  risk_aware_reader: "风险敏感读者",
  local_life_reader: "本地生活读者",
};

export interface HKRRFrame {
  happy: string;
  knowledge: string;
  resonance: string;
  rhythm: string;
  summary: string;
}

export interface HAMDFrame {
  hook: string;
  anchor: string;
  mindMap: string[];
  different: string;
}

export interface WritingMovesFrame {
  freshObservation: string;
  narrativeDrive: string;
  breakPoint: string;
  signatureLine: string;
  personalPosition: string;
  characterScene: string;
  culturalLift: string;
  echoLine: string;
  readerAddress: string;
  costSense: string;
}

export interface HKRFrame {
  happy: string;
  knowledge: string;
  resonance: string;
  summary: string;
}

export interface ThinkCard {
  materialDigest: string;
  topicVerdict: TopicVerdict;
  verdictReason: string;
  coreJudgement: string;
  articlePrototype: ArticlePrototype;
  targetReaderPersona: TopicReaderPersona;
  creativeAnchor: string;
  counterIntuition: string;
  readerPayoff: string;
  decisionImplication: string;
  excludedTakeaways: string[];
  hkr: HKRFrame;
  rewriteSuggestion: string;
  alternativeAngles: string[];
  aiRole: string;
}

export interface StyleCore {
  rhythm: string;
  breakPattern: string;
  openingMoves: string[];
  transitionMoves: string[];
  endingEchoMoves: string[];
  knowledgeDrop: string;
  personalView: string;
  judgement: string;
  counterView: string;
  allowedMoves: string[];
  forbiddenMoves: string[];
  allowedMetaphors: string[];
  emotionCurve: string;
  personalStake: string;
  characterPortrait: string;
  culturalLift: string;
  sentenceBreak: string;
  echo: string;
  humbleSetup: string;
  toneCeiling: string;
  concretenessRequirement: string;
  costSense: string;
  forbiddenFabrications: string[];
  genericLanguageBlackList: string[];
  unsupportedSceneDetector: string;
}

export interface VitalityCheckEntry {
  key: string;
  title: string;
  status: ReviewSeverity;
  detail: string;
}

export interface VitalityCheck {
  overallStatus: ReviewSeverity;
  overallVerdict: string;
  semiBlocked: boolean;
  hardBlocked: boolean;
  entries: VitalityCheckEntry[];
}

export interface SampleArticle {
  id: string;
  title: string;
  sectorName: string;
  articleType: ArticleType;
  coreThesis: string;
  structureSummary: string;
  highlightLines: string[];
  metaphors: string[];
  openingPatterns: string[];
  sourcePath: string;
  bodyText: string;
  createdAt: string;
}

export interface AuthorLanguageAssetLibrary {
  bannedPhrases: string[];
  preferredPatterns: string[];
  namingPatterns: string[];
  highSignalMoves: string[];
  transitionPhrases: string[];
  emotionPhrases: string[];
  humblePhrases: string[];
}

export interface ArticleProject {
  id: string;
  topic: string;
  audience: string;
  articleType: ArticleType;
  stage: ProjectStage;
  thesis: string;
  coreQuestion: string;
  targetWords: number;
  notes: string;
  topicMeta: TopicMeta;
  thinkCard: ThinkCard;
  styleCore: StyleCore;
  vitalityCheck: VitalityCheck;
  hkrr: HKRRFrame;
  hamd: HAMDFrame;
  writingMoves: WritingMovesFrame;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectIntent {
  cleanTitle: string;
  cleanQuestion: string;
  cleanThesis: string;
  cleanReaderPayoff: string;
  forbiddenInternalPhrases: string[];
}

export interface ResearchDimension {
  dimension: string;
  reason: string;
  expectedEvidence: string;
}

export interface ResearchBrief {
  angle: string;
  mustResearch: ResearchDimension[];
  questions: string[];
  blindSpots: string[];
  stageChecklist: string[];
}

export interface SourceCard {
  id: string;
  projectId: string;
  title: string;
  url: string;
  note: string;
  publishedAt: string;
  summary: string;
  evidence: string;
  credibility: SourceCredibility;
  sourceType: SourceType;
  supportLevel: SourceSupportLevel;
  claimType: SourceClaimType;
  timeSensitivity: SourceTimeSensitivity;
  intendedSection: string;
  reliabilityNote: string;
  tags: string[];
  zone: string;
  rawText: string;
  createdAt: string;
}

export interface SectorZone {
  id: string;
  name: string;
  label: string;
  description: string;
  evidenceIds: string[];
  strengths: string[];
  risks: string[];
  suitableBuyers: string[];
}

export interface SectorModel {
  summaryJudgement: string;
  misconception: string;
  spatialBackbone: string;
  cutLines: string[];
  zones: SectorZone[];
  supplyObservation: string;
  futureWatchpoints: string[];
  evidenceIds: string[];
}

export interface OutlineSection {
  id: string;
  heading: string;
  purpose: string;
  sectionThesis: string;
  singlePurpose: string;
  mustLandDetail: string;
  sceneOrCost: string;
  mainlineSentence: string;
  callbackTarget: string;
  microStoryNeed: string;
  discoveryTurn: string;
  opposingView: string;
  readerUsefulness: string;
  evidenceIds: string[];
  mustUseEvidenceIds: string[];
  tone: string;
  move: string;
  break: string;
  bridge: string;
  transitionTarget: string;
  counterPoint: string;
  styleObjective: string;
  keyPoints: string[];
  expectedTakeaway: string;
}

export interface NarrativeSpine {
  centralQuestion: string;
  openingMisread: string;
  realProblem: string;
  readerPromise: string;
  finalReturn: string;
}

export interface ContinuityBeat {
  sectionId: string;
  heading: string;
  role: SectionBeatRole;
  inheritedQuestion: string;
  answerThisSection: string;
  newInformation: string;
  evidenceIds: string[];
  leavesQuestionForNext: string;
  nextSectionNecessity: string;
  mustNotRepeat: string[];
}

export interface ContinuityLedger {
  articleQuestion: string;
  spine: NarrativeSpine;
  beats: ContinuityBeat[];
}

export interface OutlineDraft {
  hook: string;
  sections: OutlineSection[];
  continuityLedger?: ContinuityLedger;
  argumentFrame?: ArgumentFrame;
  closing: string;
}

export interface ArticleDraft {
  analysisMarkdown: string;
  narrativeMarkdown: string;
  editedMarkdown: string;
}

export interface EditorialFeedbackEvent {
  id: string;
  projectId: string;
  draftRevisionId: string;
  eventType: "delete_fluff" | "add_evidence" | "add_cost" | "reorder_paragraph" | "rewrite_opening" | "tighten_ending";
  sectionHeading: string;
  beforeText: string;
  afterText: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface TitleOption {
  title: string;
  rationale: string;
  isPrimary: boolean;
}

export interface ImageCue {
  id: string;
  placement: string;
  purpose: string;
  brief: string;
  imageType: string;
  layout: string;
  context: string;
  captionGoal: string;
}

export interface PublishPackage {
  titleOptions: TitleOption[];
  summary: string;
  finalMarkdown: string;
  imageCues: ImageCue[];
  publishChecklist: string[];
  qualityGate?: WritingQualityGateResult;
}

export interface WritingQualityGateItem {
  code: string;
  title: string;
  detail: string;
}

export interface WritingQualityGateResult {
  mode: "warn-only" | "soft-block" | "hard-block";
  overallStatus: "pass" | "warn" | "fail";
  mustFix: WritingQualityGateItem[];
  shouldFix: WritingQualityGateItem[];
  optionalPolish: WritingQualityGateItem[];
}

export interface QualityPyramidLayer {
  level: QualityPyramidLevel;
  title: string;
  status: ReviewSeverity;
  summary: string;
  mustFix: string[];
  shouldFix: string[];
  optionalPolish: string[];
}

export interface ReviewCheck {
  key: string;
  title: string;
  status: ReviewSeverity;
  detail: string;
  evidenceIds: string[];
  layer?: QualityPyramidLevel;
}

export interface ReviewSectionScore {
  heading: string;
  score: number;
  status: ReviewSeverity;
  issues: string[];
  evidenceIds: string[];
}

export interface ReviewParagraphFlag {
  paragraphIndex: number;
  sectionHeading: string | null;
  preview: string;
  issueTypes: string[];
  detail: string;
  suggestedAction: "rewrite" | "split" | "move" | "trim";
}

export interface RewriteIntent {
  targetRange: string;
  issueType:
    | "weak_opening"
    | "missing_anchor"
    | "weak_transition"
    | "evidence_not_integrated"
    | "generic_language"
    | "missing_scene"
    | "missing_cost"
    | "weak_ending_echo";
  whyItFails: string;
  suggestedRewriteMode: string;
}

export interface ContinuityFlag {
  type: ContinuityIssueType;
  severity: ReviewSeverity;
  sectionIds: string[];
  reason: string;
  suggestedAction: string;
}

export interface ArgumentQualityFlag {
  type: ArgumentQualityIssueType;
  severity: ReviewSeverity;
  sectionIds: string[];
  reason: string;
  suggestedAction: string;
}

export interface StructuralRewriteIntent {
  issueTypes: StructuralRewriteIssueType[];
  affectedSectionIds: string[];
  whyItFails: string;
  suggestedRewriteMode:
    | "merge_sections"
    | "delete_redundant_section"
    | "reorder_sections"
    | "rewrite_section_roles"
    | "rewrite_opening_and_next_section";
}

export interface ReviewReport {
  overallVerdict: string;
  completionScore: number;
  globalScore: number;
  checks: ReviewCheck[];
  qualityPyramid: QualityPyramidLayer[];
  sectionScores: ReviewSectionScore[];
  paragraphFlags: ReviewParagraphFlag[];
  rewriteIntents: RewriteIntent[];
  continuityFlags?: ContinuityFlag[];
  argumentQualityFlags?: ArgumentQualityFlag[];
  structuralRewriteIntents?: StructuralRewriteIntent[];
  deferredStructuralRewriteIntents?: StructuralRewriteIntent[];
  revisionSuggestions: string[];
  preservedPatterns: string[];
  missingPatterns: string[];
}

export interface ProjectBundle {
  project: ArticleProject;
  researchBrief: ResearchBrief | null;
  sourceCards: SourceCard[];
  sectorModel: SectorModel | null;
  outlineDraft: OutlineDraft | null;
  articleDraft: ArticleDraft | null;
  editorialFeedbackEvents: EditorialFeedbackEvent[];
  reviewReport: ReviewReport | null;
  publishPackage: PublishPackage | null;
}

export interface TopicHKRScore {
  h: number;
  k: number;
  r: number;
  total: number;
}

export interface TopicScorecard {
  status: TopicScorecardStatus;
  hkr: TopicHKRScore;
  readerValueSummary: string;
  signalCoverageSummary: string;
  evidenceRisk: string;
  recommendation: string;
  canForceProceed: boolean;
}

export interface TopicMeta {
  signalMode: SignalProviderMode | null;
  signalBrief: SignalBrief | null;
  topicScorecard: TopicScorecard | null;
  readerLens: TopicReaderPersona[];
  selectedAngleId: string | null;
  selectedAngleTitle: string | null;
}

export interface TopicJudgeResult {
  articleType: ArticleType;
  thesis: string;
  coreQuestion: string;
  rationale: string;
  thinkCard: ThinkCard;
  styleCore: StyleCore;
  hkrr: HKRRFrame;
  hamd: HAMDFrame;
  writingMoves: WritingMovesFrame;
}

export const TOPIC_ANGLE_TYPES = [
  "thesis",
  "counterintuitive",
  "spatial_segmentation",
  "buyer_segment",
  "transaction_micro",
  "supply_structure",
  "policy_transmission",
  "timing_window",
  "comparative",
  "risk_deconstruction",
  "decision_service",
  "narrative_upgrade",
  "scene_character",
  "lifecycle",
  "mismatch",
  "culture_psychology",
] as const;

export type TopicAngleType = (typeof TOPIC_ANGLE_TYPES)[number];

export const TOPIC_ANGLE_TYPE_LABELS: Record<TopicAngleType, string> = {
  thesis: "总判断型",
  counterintuitive: "反常识型",
  spatial_segmentation: "空间切割型",
  buyer_segment: "客群视角型",
  transaction_micro: "交易微观型",
  supply_structure: "供给结构型",
  policy_transmission: "政策传导型",
  timing_window: "时间窗口型",
  comparative: "对比参照型",
  risk_deconstruction: "风险拆解型",
  decision_service: "决策服务型",
  narrative_upgrade: "叙事升级型",
  scene_character: "人物/场景型",
  lifecycle: "生命周期型",
  mismatch: "错配型",
  culture_psychology: "文化/心理型",
};

export interface TopicAngleDraft {
  id?: string;
  title: string;
  angleType: string;
  articleType: ArticleType;
  articlePrototype?: ArticlePrototype;
  targetReaderPersona?: TopicReaderPersona;
  creativeAnchor?: string;
  coreJudgement: string;
  counterIntuition: string;
  readerValue: string;
  whyNow: string;
  hkr?: TopicHKRScore;
  readerLens?: TopicReaderPersona[];
  signalRefs?: string[];
  neededEvidence: string[];
  riskOfMisfire: string;
  recommendedNextStep: string;
  angleTypeLabel?: string;
  sourceBasis?: string[];
  topicScorecard?: TopicScorecard;
}

export interface TopicAngle extends Omit<TopicAngleDraft, "id" | "angleType"> {
  id: string;
  angleType: TopicAngleType;
  angleTypeLabel: string;
  articlePrototype: ArticlePrototype;
  targetReaderPersona: TopicReaderPersona;
  creativeAnchor: string;
  hkr: TopicHKRScore;
  readerLens: TopicReaderPersona[];
  signalRefs: string[];
  sourceBasis: string[];
  topicScorecard: TopicScorecard;
}

export type TopicCoCreationCandidate = TopicAngle;

export interface TopicCoCreationCoverageSummary {
  includedTypes: TopicAngleType[];
  missingTypes: TopicAngleType[];
  duplicatesMerged: number;
}

export interface TopicCoCreationModelResult {
  sector: string;
  candidateAngles: TopicAngleDraft[];
  materialInsights?: {
    themes: string[];
    tensions: string[];
    blindSpots: string[];
  };
}

export interface TopicCoCreationResult {
  sector: string;
  recommendedAngles: TopicAngle[];
  angleLonglist: TopicAngle[];
  coverageSummary: TopicCoCreationCoverageSummary;
  angles: TopicAngle[];
  candidateAngles: TopicCoCreationCandidate[];
  materialInsights?: {
    themes: string[];
    tensions: string[];
    blindSpots: string[];
  };
}

export interface TopicCoCreationResponse {
  depth?: TopicCoCreationDepth;
  signalMode: SignalProviderMode;
  signalBrief: SignalBrief;
  result: TopicCoCreationResult;
  sourceDigests: SignalSourceDigest[];
  timings?: TopicCoCreationTimings;
}

export type TopicCoCreationDepth = "fast" | "full";

export interface TopicCoCreationTimings {
  signalMs: number;
  modelMs: number;
  postprocessMs: number;
  totalMs: number;
}

export interface TopicCoCreationInput {
  sector: string;
  currentIntuition: string;
  rawMaterials: string;
  avoidAngles: string;
  signalMode: SignalProviderMode;
  depth?: TopicCoCreationDepth;
}

export interface TopicCoCreationRun {
  id: string;
  input: TopicCoCreationInput;
  response: TopicCoCreationResponse;
  createdAt: string;
  updatedAt: string;
}

export const TOPIC_DISCOVERY_SESSION_STATUSES = ["draft", "running", "ready", "failed"] as const;
export const TOPIC_DISCOVERY_LINK_STATUSES = ["pending", "running", "ready", "failed"] as const;

export type TopicDiscoverySessionStatus = (typeof TOPIC_DISCOVERY_SESSION_STATUSES)[number];
export type TopicDiscoveryLinkStatus = (typeof TOPIC_DISCOVERY_LINK_STATUSES)[number];

export interface TopicDiscoverySession {
  id: string;
  sector: string;
  intuition: string;
  focusPoints: string[];
  rawMaterials: string;
  avoidAngles: string;
  status: TopicDiscoverySessionStatus;
  searchMode: SignalProviderMode;
  createdAt: string;
  updatedAt: string;
}

export interface TopicDiscoveryLink {
  id: string;
  sessionId: string;
  url: string;
  status: TopicDiscoveryLinkStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PreSourceCard {
  id: string;
  sessionId: string;
  linkId: string | null;
  url: string;
  sourceTitle: string;
  sourceType: SourceType;
  publishedAt: string;
  summary: string;
  keyClaims: string[];
  signalTags: string[];
  suggestedAngles: string[];
  riskHints: string[];
  extractStatus: TopicDiscoveryLinkStatus;
  rawContentRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersistedSignalBrief {
  sessionId: string;
  queries: string[];
  signals: SignalBrief["signals"];
  gaps: string[];
  freshnessNote: string;
  generatedAt: string;
  inputHash?: string;
}

export interface TopicDiscoveryBundle {
  session: TopicDiscoverySession;
  links: TopicDiscoveryLink[];
  preSourceCards: PreSourceCard[];
  signalBrief: PersistedSignalBrief | null;
  topicAngles: TopicAngle[];
}

export const TOPIC_DISCOVERY_JOB_STEPS = ["pre-source-extract", "signal-brief", "topic-discovery-cocreate"] as const;
export const TOPIC_DISCOVERY_JOB_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export const TOPIC_DISCOVERY_DEPTHS = ["fast", "full"] as const;

export type TopicDiscoveryJobStep = (typeof TOPIC_DISCOVERY_JOB_STEPS)[number];
export type TopicDiscoveryJobStatus = (typeof TOPIC_DISCOVERY_JOB_STATUSES)[number];
export type TopicDiscoveryDepth = (typeof TOPIC_DISCOVERY_DEPTHS)[number];

export interface TopicDiscoveryJobRun {
  id: string;
  sessionId: string;
  step: TopicDiscoveryJobStep;
  status: TopicDiscoveryJobStatus;
  dedupeKey: string;
  payload: Record<string, unknown>;
  progressStage: string | null;
  progressMessage: string | null;
  result: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  heartbeatAt: string | null;
  finishedAt: string | null;
}

export interface TopicDiscoveryJobLog {
  id: number;
  jobId: string;
  level: "info" | "warn" | "error";
  code: string;
  message: string;
  detail: Record<string, unknown>;
  createdAt: string;
}
