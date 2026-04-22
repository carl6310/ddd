import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";
import { analyzeEvidenceCoverage } from "@/lib/evidence/coverage";
import type { ProjectBundle } from "@/lib/types";
import { buildWritingQualityGate } from "./gate";
import { buildWritingQualityScorecard } from "./scorecard";

export interface WritingQualitySummarySnapshot {
  overallScore: number | null;
  citationCoverage: number | null;
  sectionEvidenceCoverage: number | null;
  hookAnchorEchoPass: number | null;
  rewriteHotspotCount: number | null;
  humanEditDelta: number | null;
  vitalityPassRate: number | null;
  editorialEventCount: number;
  editorialEventTypes: Record<string, number>;
  qualityGate: ReturnType<typeof buildWritingQualityGate>;
  notes: string[];
}

function toPercent(value: number | null) {
  if (value === null) {
    return "n/a";
  }
  return `${Math.round(value * 100)}%`;
}

export function buildWritingQualitySnapshot(bundle: ProjectBundle): WritingQualitySummarySnapshot {
  const scorecard = buildWritingQualityScorecard({
    fixture: {
      id: "live-bundle",
      label: "当前项目",
      projectId: bundle.project.id,
      expectation: "standard_flow",
    },
    bundle,
  });
  const evidence = analyzeEvidenceCoverage(bundle);
  const editorialEvents =
    bundle.articleDraft?.editedMarkdown?.trim()
      ? classifyEditorialFeedbackEvents({
          projectId: bundle.project.id,
          narrativeMarkdown: bundle.articleDraft.narrativeMarkdown,
          editedMarkdown: bundle.articleDraft.editedMarkdown,
        })
      : [];

  return {
    overallScore: scorecard.overallScore,
    citationCoverage: scorecard.metrics?.citationCoverage ?? null,
    sectionEvidenceCoverage: scorecard.metrics?.sectionEvidenceCoverage ?? null,
    hookAnchorEchoPass: scorecard.metrics?.hookAnchorEchoPass ?? null,
    rewriteHotspotCount: scorecard.metrics?.rewriteHotspotCount ?? null,
    humanEditDelta: scorecard.metrics?.humanEditDelta ?? null,
    vitalityPassRate: scorecard.metrics?.vitalityPassRate ?? null,
    editorialEventCount: editorialEvents.length,
    editorialEventTypes: editorialEvents.reduce<Record<string, number>>((acc, event) => {
      acc[event.eventType] = (acc[event.eventType] ?? 0) + 1;
      return acc;
    }, {}),
    qualityGate: buildWritingQualityGate(bundle),
    notes: [
      ...scorecard.notes.slice(0, 6),
      evidence.criticalJudgementAlerts.length > 0 ? `关键证据缺口：${evidence.criticalJudgementAlerts.length}` : "",
    ].filter(Boolean),
  };
}

export function buildWritingQualitySummaryLines(bundle: ProjectBundle): string[] {
  const summary = buildWritingQualitySnapshot(bundle);

  return [
    `- 总体质量分：${summary.overallScore ?? "n/a"}`,
    `- 引用覆盖率：${toPercent(summary.citationCoverage)}`,
    `- 分段证据覆盖率：${toPercent(summary.sectionEvidenceCoverage)}`,
    `- Hook / Anchor / Echo：${toPercent(summary.hookAnchorEchoPass)}`,
    `- Rewrite hotspot：${summary.rewriteHotspotCount ?? "n/a"}`,
    `- Human edit delta：${toPercent(summary.humanEditDelta)}`,
    `- Vitality pass rate：${toPercent(summary.vitalityPassRate)}`,
    `- 编辑反馈事件数：${summary.editorialEventCount}`,
    `- Quality gate：${summary.qualityGate.overallStatus} (${summary.qualityGate.mode})`,
    ...summary.notes.map((note) => `- ${note}`),
  ];
}
