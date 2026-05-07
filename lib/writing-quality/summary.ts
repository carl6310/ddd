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
  qualityPyramid: Array<{ level: string; status: string; title: string }>;
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
    qualityPyramid: (bundle.reviewReport?.qualityPyramid ?? []).map((layer) => ({
      level: layer.level,
      status: layer.status,
      title: layer.title,
    })),
    notes: [
      ...scorecard.notes.slice(0, 6),
      ...(bundle.reviewReport?.qualityPyramid ?? []).map((layer) => `${layer.level} ${layer.title}：${layer.status}`),
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
    `- 开头抓手 / 论点锚点 / 结尾回环：${toPercent(summary.hookAnchorEchoPass)}`,
    `- 弱段定位数：${summary.rewriteHotspotCount ?? "n/a"}`,
    `- 人工编辑变化：${toPercent(summary.humanEditDelta)}`,
    `- 质量检查通过率：${toPercent(summary.vitalityPassRate)}`,
    `- 编辑反馈事件数：${summary.editorialEventCount}`,
    `- 质量门槛：${formatUserFacingWorkflowText(summary.qualityGate.overallStatus)} (${formatUserFacingWorkflowText(summary.qualityGate.mode)})`,
    ...summary.qualityPyramid.map((layer) => `- ${layer.level} ${formatUserFacingWorkflowText(layer.title)}：${formatUserFacingWorkflowText(layer.status)}`),
    ...summary.notes.map((note) => `- ${formatUserFacingWorkflowText(note)}`),
  ];
}

function formatUserFacingWorkflowText(value: string): string {
  return value
    .replaceAll("WritingLint", "写作硬伤")
    .replaceAll("StructureFlow", "结构推进")
    .replaceAll("ContentDepth", "内容深度")
    .replaceAll("HumanFeel", "人感")
    .replaceAll("Quality gate", "质量门槛")
    .replaceAll("warn-only", "仅提醒")
    .replaceAll("hard-block", "强阻塞")
    .replaceAll("pass", "通过")
    .replaceAll("warn", "提醒")
    .replaceAll("fail", "未通过");
}
