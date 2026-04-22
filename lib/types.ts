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

export type ArticleType = (typeof ARTICLE_TYPES)[number];
export type ProjectStage = (typeof PROJECT_STAGES)[number];
export type SourceCredibility = (typeof SOURCE_CREDIBILITIES)[number];
export type SourceType = (typeof SOURCE_TYPES)[number];
export type SourceSupportLevel = (typeof SOURCE_SUPPORT_LEVELS)[number];
export type SourceClaimType = (typeof SOURCE_CLAIM_TYPES)[number];
export type SourceTimeSensitivity = (typeof SOURCE_TIME_SENSITIVITIES)[number];
export type ReviewSeverity = (typeof REVIEW_SEVERITIES)[number];
export type TopicVerdict = (typeof TOPIC_VERDICTS)[number];

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
  thinkCard: ThinkCard;
  styleCore: StyleCore;
  vitalityCheck: VitalityCheck;
  hkrr: HKRRFrame;
  hamd: HAMDFrame;
  writingMoves: WritingMovesFrame;
  createdAt: string;
  updatedAt: string;
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

export interface OutlineDraft {
  hook: string;
  sections: OutlineSection[];
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

export interface ReviewCheck {
  key: string;
  title: string;
  status: ReviewSeverity;
  detail: string;
  evidenceIds: string[];
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

export interface ReviewReport {
  overallVerdict: string;
  completionScore: number;
  globalScore: number;
  checks: ReviewCheck[];
  sectionScores: ReviewSectionScore[];
  paragraphFlags: ReviewParagraphFlag[];
  rewriteIntents: RewriteIntent[];
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
  reviewReport: ReviewReport | null;
  publishPackage: PublishPackage | null;
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

export interface TopicCoCreationCandidate {
  id: string;
  title: string;
  articleType: ArticleType;
  thesis: string;
  hook: string;
  different: string;
  tension: string;
  whyItWorks: string;
  risk: string;
  anchor: string;
  hkrr: HKRRFrame;
  recommendation: "high" | "medium" | "low";
  sourceBasis: string[];
}

export interface TopicCoCreationResult {
  sector: string;
  candidateAngles: TopicCoCreationCandidate[];
  materialInsights?: {
    themes: string[];
    tensions: string[];
    blindSpots: string[];
  };
}

export interface TopicCoCreationResponse {
  result: TopicCoCreationResult;
  sourceDigests: Array<{
    url: string;
    title: string;
    summary: string;
    publishedAt: string;
    note: string;
    ok: boolean;
    error?: string;
  }>;
}
