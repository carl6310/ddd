import type { ProjectBundle } from "@/lib/types";
import { analyzeEvidenceCoverage } from "./coverage";

export function buildEvidenceSummaryLines(bundle: ProjectBundle): string[] {
  const analysis = analyzeEvidenceCoverage(bundle);
  const lines = [
    `- 引用覆盖率：${Math.round(analysis.summary.citationCoverage * 100)}%`,
    `- 分段证据覆盖率：${Math.round(analysis.summary.sectionEvidenceCoverage * 100)}%`,
    `- 关键点覆盖率：${Math.round(analysis.summary.keyPointCoverage * 100)}%`,
    `- 无效引用数：${analysis.summary.brokenCitationCount}`,
    `- 孤立资料卡数：${analysis.summary.orphanSourceCardCount}`,
  ];

  if (analysis.criticalJudgementAlerts.length > 0) {
    lines.push(...analysis.criticalJudgementAlerts.slice(0, 5).map((alert) => `- 待补证据：${alert.detail}`));
  }

  return lines;
}

export function buildEvidenceSummaryText(bundle: ProjectBundle): string {
  return buildEvidenceSummaryLines(bundle).join("\n");
}
