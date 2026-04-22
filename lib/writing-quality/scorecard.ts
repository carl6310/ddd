import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";
import type { ProjectBundle } from "@/lib/types";
import { nowIso } from "@/lib/utils";
import type {
  WritingQualityFixture,
  WritingQualityLLMStats,
  WritingQualityMetrics,
  WritingQualityRunReport,
  WritingQualityScorecard,
} from "./types";

const HOTSPOT_KEYS = [
  "opening",
  "hook",
  "anchor",
  "echo",
  "transitions",
  "emotional-arc",
  "character-scene",
  "cost-sense",
  "cultural-lift",
  "fresh-observation",
  "ai-tone",
  "soft-sell",
];

function clamp01(value: number) {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function computeHookAnchorEchoPass(bundle: ProjectBundle): number | null {
  const checks = bundle.reviewReport?.checks ?? [];
  const targetKeys = ["opening", "hook", "anchor", "echo"];
  const targetChecks = targetKeys.map((key) => checks.find((check) => check.key === key)).filter(Boolean);
  if (targetChecks.length === 0) {
    return null;
  }
  const passed = targetChecks.filter((check) => check?.status === "pass").length;
  return clamp01(passed / targetChecks.length);
}

function computeRewriteHotspotCount(bundle: ProjectBundle): number | null {
  const checks = bundle.reviewReport?.checks ?? [];
  if (checks.length === 0) {
    return null;
  }
  return checks.filter((check) => HOTSPOT_KEYS.includes(check.key) && check.status !== "pass").length;
}

function getBigramMap(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  const map = new Map<string, number>();
  if (normalized.length < 2) {
    return map;
  }
  for (let index = 0; index < normalized.length - 1; index += 1) {
    const key = normalized.slice(index, index + 2);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export function computeHumanEditDelta(narrativeMarkdown: string, editedMarkdown: string): number | null {
  const narrative = narrativeMarkdown.trim();
  const edited = editedMarkdown.trim();
  if (!narrative || !edited) {
    return null;
  }

  const left = getBigramMap(narrative);
  const right = getBigramMap(edited);
  const intersection = Array.from(left.entries()).reduce((total, [key, count]) => total + Math.min(count, right.get(key) ?? 0), 0);
  const leftCount = Array.from(left.values()).reduce((total, count) => total + count, 0);
  const rightCount = Array.from(right.values()).reduce((total, count) => total + count, 0);

  if (leftCount === 0 || rightCount === 0) {
    return null;
  }

  const similarity = (2 * intersection) / (leftCount + rightCount);
  return clamp01(1 - similarity);
}

function computeVitalityPassRate(bundle: ProjectBundle): number | null {
  if (!bundle.reviewReport) {
    return null;
  }
  return bundle.project.vitalityCheck.overallStatus === "pass" && !bundle.project.vitalityCheck.hardBlocked ? 1 : 0;
}

export function buildWritingQualityScorecard(input: {
  fixture: WritingQualityFixture;
  bundle: ProjectBundle | null;
  llmStats?: WritingQualityLLMStats | null;
}): WritingQualityScorecard {
  const generatedAt = nowIso();
  const bundle = input.bundle;

  if (!bundle) {
    return {
      fixture: input.fixture,
      generatedAt,
      available: false,
      projectStage: null,
      topic: null,
      overallScore: null,
      metrics: null,
      sectionCoverage: [],
      keyPointCoverage: [],
      criticalJudgementAlerts: [],
      missingArtifacts: ["project_bundle"],
      notes: ["找不到对应项目，无法生成质量基线。"],
      llmStats: input.llmStats ?? null,
    };
  }

  const missingArtifacts: string[] = [];
  if (!bundle.articleDraft) {
    missingArtifacts.push("article_draft");
  }
  if (!bundle.reviewReport) {
    missingArtifacts.push("review_report");
  }
  if (!bundle.outlineDraft) {
    missingArtifacts.push("outline_draft");
  }
  if (bundle.sourceCards.length === 0) {
    missingArtifacts.push("source_cards");
  }

  const evidence = analyzeEvidenceCoverage(bundle);

  const llmStats = input.llmStats ?? null;
  const polisherTriggerRate =
    llmStats && llmStats.draftWriterCalls > 0 ? clamp01(llmStats.draftPolisherCalls / llmStats.draftWriterCalls) : null;

  const humanEditDelta = bundle.articleDraft
    ? computeHumanEditDelta(bundle.articleDraft.narrativeMarkdown, bundle.articleDraft.editedMarkdown)
    : null;

  const metrics: WritingQualityMetrics = {
    citationCoverage: evidence.summary.citationCoverage,
    brokenCitationCount: evidence.summary.brokenCitationCount,
    sectionEvidenceCoverage: evidence.summary.sectionEvidenceCoverage,
    hookAnchorEchoPass: computeHookAnchorEchoPass(bundle),
    rewriteHotspotCount: computeRewriteHotspotCount(bundle),
    polisherTriggerRate,
    humanEditDelta,
    vitalityPassRate: computeVitalityPassRate(bundle),
  };

  const metricValues = [
    evidence.summary.citationCoverage,
    1 - clamp01(evidence.summary.brokenCitationCount / Math.max(evidence.validCitationIds.length + evidence.summary.brokenCitationCount, 1)),
    evidence.summary.sectionEvidenceCoverage,
    metrics.hookAnchorEchoPass,
    metrics.rewriteHotspotCount === null ? null : 1 - clamp01(metrics.rewriteHotspotCount / 8),
    metrics.polisherTriggerRate === null ? null : 1 - metrics.polisherTriggerRate,
    metrics.humanEditDelta === null ? null : 1 - metrics.humanEditDelta,
    metrics.vitalityPassRate,
  ].filter((value): value is number => typeof value === "number");

  const overallScore =
    metricValues.length > 0 ? Math.round((metricValues.reduce((total, value) => total + value, 0) / metricValues.length) * 100) : null;

  const notes: string[] = [];
  if (evidence.summary.brokenCitationCount > 0) {
    notes.push(`发现 ${evidence.summary.brokenCitationCount} 处无效引用。`);
  }
  if (metrics.rewriteHotspotCount && metrics.rewriteHotspotCount > 0) {
    notes.push(`存在 ${metrics.rewriteHotspotCount} 个需要重点返工的弱点位。`);
  }
  if (humanEditDelta !== null && humanEditDelta > 0.35) {
    notes.push("人工终稿与模型叙事稿差异较大，返工成本偏高。");
  }
  if (evidence.orphanSourceCardIds.length > 0) {
    notes.push(`有 ${evidence.orphanSourceCardIds.length} 张资料卡尚未进入任何正文引用或提纲要求。`);
  }
  if (evidence.criticalJudgementAlerts.length > 0) {
    notes.push(...evidence.criticalJudgementAlerts.map((item) => item.detail));
  }
  if (missingArtifacts.length > 0) {
    notes.push(`当前缺少 ${missingArtifacts.join("、")}，部分指标仅能做部分评估。`);
  }

  return {
    fixture: input.fixture,
    generatedAt,
    available: true,
    projectStage: bundle.project.stage,
    topic: bundle.project.topic,
    overallScore,
    metrics,
    sectionCoverage: evidence.sectionCoverage,
    keyPointCoverage: evidence.keyPointCoverage,
    criticalJudgementAlerts: evidence.criticalJudgementAlerts,
    missingArtifacts,
    notes,
    llmStats,
  };
}

function average(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number");
  if (filtered.length === 0) {
    return null;
  }
  return Number((filtered.reduce((total, value) => total + value, 0) / filtered.length).toFixed(4));
}

export function buildWritingQualitySummary(scorecards: WritingQualityScorecard[]): WritingQualityRunReport["summary"] {
  const available = scorecards.filter((item) => item.available && item.metrics);
  return {
    fixtureCount: scorecards.length,
    availableCount: available.length,
    averages: {
      citationCoverage: average(available.map((item) => item.metrics?.citationCoverage ?? null)),
      brokenCitationCount: average(available.map((item) => item.metrics?.brokenCitationCount ?? null)),
      sectionEvidenceCoverage: average(available.map((item) => item.metrics?.sectionEvidenceCoverage ?? null)),
      hookAnchorEchoPass: average(available.map((item) => item.metrics?.hookAnchorEchoPass ?? null)),
      rewriteHotspotCount: average(available.map((item) => item.metrics?.rewriteHotspotCount ?? null)),
      polisherTriggerRate: average(available.map((item) => item.metrics?.polisherTriggerRate ?? null)),
      humanEditDelta: average(available.map((item) => item.metrics?.humanEditDelta ?? null)),
      vitalityPassRate: average(available.map((item) => item.metrics?.vitalityPassRate ?? null)),
      overallScore: average(available.map((item) => item.overallScore)),
    },
  };
}
