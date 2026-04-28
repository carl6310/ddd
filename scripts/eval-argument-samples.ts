import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { runDeterministicReview } from "@/lib/review";
import type {
  ArgumentFrame,
  ArticleType,
  ContinuityLedger,
  OutlineDraft,
  OutlineSection,
  ReviewReport,
  SectorModel,
  SourceCard,
} from "@/lib/types";

type PartialSourceCard = Partial<SourceCard> & { id: string };

interface ArgumentHumanEvalFixture {
  id: string;
  label?: string;
  topic: string;
  articleType?: ArticleType;
  thesis?: string;
  articleMarkdown: string;
  argumentFrame?: ArgumentFrame;
  outlineHeadings?: string[];
  sectorZones?: string[];
  sourceCards?: PartialSourceCard[];
  continuityLedger?: ContinuityLedger;
  humanNotes?: unknown;
}

interface ArgumentHumanEvalReport {
  generatedAt: string;
  fixtureFile: string;
  samples: ArgumentHumanEvalSampleReport[];
  summary: {
    sampleCount: number;
    argumentQualityFailCount: number;
    continuityFailCount: number;
    structuralRewriteIntentCount: number;
  };
}

interface ArgumentHumanEvalSampleReport {
  id: string;
  label: string;
  topic: string;
  primaryShape: string;
  argumentQualityFlags: ReviewReport["argumentQualityFlags"];
  continuityFlags: ReviewReport["continuityFlags"];
  structuralRewriteIntents: ReviewReport["structuralRewriteIntents"];
  highSeverityCounts: {
    argumentQualityFail: number;
    continuityFail: number;
    structuralRewriteIntent: number;
  };
  humanNotes?: unknown;
}

const DEFAULT_ARTICLE_TYPE: ArticleType = "价值重估型";
const DEFAULT_SOURCE_IDS = ["sc_a", "sc_b", "sc_c", "sc_d"];

function readFixtures(fixtureFile: string): ArgumentHumanEvalFixture[] {
  const payload = JSON.parse(readFileSync(fixtureFile, "utf8")) as { fixtures?: ArgumentHumanEvalFixture[] };
  if (!Array.isArray(payload.fixtures)) {
    throw new Error(`Invalid fixture file: ${fixtureFile}`);
  }
  return payload.fixtures;
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function extractMarkdownHeadings(markdown: string) {
  return markdown
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, "").trim())
    .filter(Boolean);
}

function normalizeSourceCards(fixture: ArgumentHumanEvalFixture): SourceCard[] {
  const fallbackCards: PartialSourceCard[] = DEFAULT_SOURCE_IDS.map((id) => ({
    id,
    title: `资料 ${id}`,
    summary: `${fixture.topic} 的样例资料。`,
    evidence: `${fixture.topic} 的样例资料。`,
  }));
  const cards: PartialSourceCard[] = fixture.sourceCards?.length
    ? fixture.sourceCards
    : fallbackCards;

  return cards.map((card, index) => ({
    id: card.id,
    projectId: card.projectId ?? fixture.id,
    title: card.title ?? `资料 ${index + 1}`,
    url: card.url ?? "",
    note: card.note ?? "",
    publishedAt: card.publishedAt ?? "",
    summary: card.summary ?? card.evidence ?? "",
    evidence: card.evidence ?? card.summary ?? "",
    credibility: card.credibility ?? "高",
    sourceType: card.sourceType ?? "media",
    supportLevel: card.supportLevel ?? "high",
    claimType: card.claimType ?? "fact",
    timeSensitivity: card.timeSensitivity ?? "timely",
    intendedSection: card.intendedSection ?? "",
    reliabilityNote: card.reliabilityNote ?? "",
    tags: card.tags ?? [],
    zone: card.zone ?? "",
    rawText: card.rawText ?? card.evidence ?? card.summary ?? "",
    createdAt: card.createdAt ?? "",
  }));
}

function buildFallbackArgumentFrame(fixture: ArgumentHumanEvalFixture, sourceCards: SourceCard[]): ArgumentFrame {
  const thesis = fixture.thesis?.trim() || "这篇文章需要给出一个明确判断。";
  return {
    primaryShape: "judgement_essay",
    secondaryShapes: [],
    centralTension: fixture.topic,
    answer: thesis,
    notThis: ["不要写成板块分区说明书", "不要把片区直接变成章节目录"],
    supportingClaims: [
      {
        id: "claim-1",
        claim: thesis,
        role: "prove",
        evidenceIds: sourceCards.slice(0, 2).map((card) => card.id),
        mustUseEvidenceIds: [],
        zonesAsEvidence: fixture.sectorZones ?? [],
        shouldNotBecomeSection: true,
      },
    ],
    strongestCounterArgument: "",
    howToHandleCounterArgument: "",
    readerDecisionFrame: "读者读完后应能判断是否值得继续关注。",
  };
}

function buildSectorModel(fixture: ArgumentHumanEvalFixture, sourceCards: SourceCard[]): SectorModel {
  const zones = fixture.sectorZones?.length
    ? fixture.sectorZones
    : Array.from(new Set(extractMarkdownHeadings(fixture.articleMarkdown))).slice(0, 4);
  const sourceIds = sourceCards.map((card) => card.id);

  return {
    summaryJudgement: fixture.thesis ?? fixture.argumentFrame?.answer ?? fixture.topic,
    misconception: fixture.argumentFrame?.centralTension ?? fixture.topic,
    spatialBackbone: zones.length > 0 ? zones.join(" / ") : "样例片区结构",
    cutLines: [],
    zones: zones.map((zone, index) => ({
      id: `z${index + 1}`,
      name: zone,
      label: zone,
      description: `${zone} 的样例资料。`,
      evidenceIds: [sourceIds[index % Math.max(sourceIds.length, 1)]].filter(Boolean),
      strengths: [],
      risks: [],
      suitableBuyers: [],
    })),
    supplyObservation: "",
    futureWatchpoints: [],
    evidenceIds: sourceIds,
  };
}

function buildOutlineSection(heading: string, index: number, fixture: ArgumentHumanEvalFixture, sourceCards: SourceCard[]): OutlineSection {
  const evidenceId = sourceCards[index % Math.max(sourceCards.length, 1)]?.id;

  return {
    id: `s${index + 1}`,
    heading,
    purpose: "服务论证",
    sectionThesis: fixture.thesis ?? fixture.argumentFrame?.answer ?? fixture.topic,
    singlePurpose: "推进一个判断",
    mustLandDetail: "只使用资料或作者笔记中存在的信息",
    sceneOrCost: "",
    mainlineSentence: fixture.argumentFrame?.answer ?? fixture.thesis ?? "",
    callbackTarget: "",
    microStoryNeed: "",
    discoveryTurn: "",
    opposingView: "",
    readerUsefulness: "帮助读者形成判断",
    evidenceIds: evidenceId ? [evidenceId] : [],
    mustUseEvidenceIds: [],
    tone: "",
    move: "",
    break: "",
    bridge: "",
    transitionTarget: "",
    counterPoint: "",
    styleObjective: "",
    keyPoints: [],
    expectedTakeaway: "形成可使用的判断",
  };
}

function buildOutlineDraft(fixture: ArgumentHumanEvalFixture, sourceCards: SourceCard[], argumentFrame: ArgumentFrame): OutlineDraft {
  const headings = fixture.outlineHeadings?.length ? fixture.outlineHeadings : extractMarkdownHeadings(fixture.articleMarkdown);

  return {
    hook: fixture.topic,
    argumentFrame,
    continuityLedger: fixture.continuityLedger,
    sections: headings.map((heading, index) => buildOutlineSection(heading, index, fixture, sourceCards)),
    closing: "结尾回到读者决策。",
  };
}

function runSample(fixture: ArgumentHumanEvalFixture): ArgumentHumanEvalSampleReport {
  const sourceCards = normalizeSourceCards(fixture);
  const argumentFrame = fixture.argumentFrame ?? buildFallbackArgumentFrame(fixture, sourceCards);
  const review = runDeterministicReview({
    articleType: fixture.articleType ?? DEFAULT_ARTICLE_TYPE,
    thesis: fixture.thesis ?? argumentFrame.answer,
    hkrr: {
      happy: "看懂判断",
      knowledge: "证据与框架",
      resonance: "买房决策焦虑",
      rhythm: "逐段推进",
      summary: "围绕主判断展开",
    },
    hamd: {
      hook: fixture.topic,
      anchor: argumentFrame.answer,
      mindMap: [],
      different: argumentFrame.centralTension,
    },
    writingMoves: {
      freshObservation: argumentFrame.centralTension,
      narrativeDrive: "围绕主判断推进",
      breakPoint: "短句打断",
      signatureLine: argumentFrame.answer,
      personalPosition: "我更愿意这样看",
      characterScene: "",
      culturalLift: "放回上海结构看",
      echoLine: argumentFrame.answer,
      readerAddress: "你会发现",
      costSense: "风险、代价和门槛",
    },
    outlineDraft: buildOutlineDraft(fixture, sourceCards, argumentFrame),
    sectorModel: buildSectorModel(fixture, sourceCards),
    articleDraft: {
      analysisMarkdown: "",
      narrativeMarkdown: fixture.articleMarkdown,
      editedMarkdown: "",
    },
    sourceCards,
  });
  const argumentQualityFlags = review.argumentQualityFlags ?? [];
  const continuityFlags = review.continuityFlags ?? [];
  const structuralRewriteIntents = review.structuralRewriteIntents ?? [];

  return {
    id: fixture.id,
    label: fixture.label ?? fixture.id,
    topic: fixture.topic,
    primaryShape: argumentFrame.primaryShape,
    argumentQualityFlags,
    continuityFlags,
    structuralRewriteIntents,
    highSeverityCounts: {
      argumentQualityFail: argumentQualityFlags.filter((flag) => flag.severity === "fail").length,
      continuityFail: continuityFlags.filter((flag) => flag.severity === "fail").length,
      structuralRewriteIntent: structuralRewriteIntents.length,
    },
    humanNotes: fixture.humanNotes,
  };
}

function buildSummary(samples: ArgumentHumanEvalSampleReport[]): ArgumentHumanEvalReport["summary"] {
  return {
    sampleCount: samples.length,
    argumentQualityFailCount: samples.reduce((sum, sample) => sum + sample.highSeverityCounts.argumentQualityFail, 0),
    continuityFailCount: samples.reduce((sum, sample) => sum + sample.highSeverityCounts.continuityFail, 0),
    structuralRewriteIntentCount: samples.reduce((sum, sample) => sum + sample.highSeverityCounts.structuralRewriteIntent, 0),
  };
}

function formatFlags(flags: Array<{ type: string; severity: string; reason: string; suggestedAction: string }>) {
  if (flags.length === 0) {
    return ["  - none"];
  }
  return flags.flatMap((flag) => [`  - ${flag.severity} · ${flag.type}`, `    - ${flag.reason}`, `    - ${flag.suggestedAction}`]);
}

function buildMarkdownReport(report: ArgumentHumanEvalReport) {
  const lines: string[] = [];
  lines.push("# Argument Human Eval Report");
  lines.push("");
  lines.push(`- Generated at: ${report.generatedAt}`);
  lines.push(`- Fixture file: ${report.fixtureFile}`);
  lines.push(`- Samples: ${report.summary.sampleCount}`);
  lines.push(`- Argument quality fails: ${report.summary.argumentQualityFailCount}`);
  lines.push(`- Continuity fails: ${report.summary.continuityFailCount}`);
  lines.push(`- Structural rewrite intents: ${report.summary.structuralRewriteIntentCount}`);
  lines.push("");

  for (const sample of report.samples) {
    lines.push(`## ${sample.id} · ${sample.label}`);
    lines.push("");
    lines.push(`- Topic: ${sample.topic}`);
    lines.push(`- primaryShape: ${sample.primaryShape}`);
    lines.push(`- high severity counts: argumentQuality=${sample.highSeverityCounts.argumentQualityFail}, continuity=${sample.highSeverityCounts.continuityFail}, structuralRewriteIntents=${sample.highSeverityCounts.structuralRewriteIntent}`);
    if (sample.humanNotes !== undefined) {
      lines.push(`- humanNotes: ${JSON.stringify(sample.humanNotes)}`);
    }
    lines.push("");
    lines.push("### argumentQualityFlags");
    lines.push(...formatFlags(sample.argumentQualityFlags ?? []));
    lines.push("");
    lines.push("### continuityFlags");
    lines.push(...formatFlags(sample.continuityFlags ?? []));
    lines.push("");
    lines.push("### structuralRewriteIntents");
    if ((sample.structuralRewriteIntents ?? []).length === 0) {
      lines.push("  - none");
    } else {
      for (const intent of sample.structuralRewriteIntents ?? []) {
        lines.push(`  - ${intent.suggestedRewriteMode} · ${intent.issueTypes.join(", ")}`);
        lines.push(`    - ${intent.whyItFails}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const fixtureFile = resolve(process.argv[2] ?? "evals/fixtures/writing-quality/argument-samples.json");
  const fixtures = readFixtures(fixtureFile);
  const samples = fixtures.map(runSample);
  const report: ArgumentHumanEvalReport = {
    generatedAt: new Date().toISOString(),
    fixtureFile,
    samples,
    summary: buildSummary(samples),
  };
  const outputDir = resolve("output/evals");
  mkdirSync(outputDir, { recursive: true });
  const outputFile = join(outputDir, `argument-human-eval-${timestampForFilename()}.json`);
  const latestFile = join(outputDir, "argument-human-eval-latest.json");

  writeFileSync(outputFile, JSON.stringify(report, null, 2));
  writeFileSync(latestFile, JSON.stringify(report, null, 2));

  console.log(buildMarkdownReport(report));
  console.log(`\nJSON written to: ${latestFile}`);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "argument human eval failed");
  process.exitCode = 1;
});
