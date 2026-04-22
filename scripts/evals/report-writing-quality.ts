import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { WritingQualityRunReport } from "@/lib/writing-quality/types";

function formatPercent(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null) {
  return value === null ? "n/a" : `${value}`;
}

function buildMarkdown(report: WritingQualityRunReport) {
  const lines: string[] = [];
  lines.push("# Writing Quality Report");
  lines.push("");
  lines.push(`- Generated at: ${report.generatedAt}`);
  lines.push(`- Fixture file: ${report.fixtureFile}`);
  lines.push(`- Fixtures available: ${report.summary.availableCount}/${report.summary.fixtureCount}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Overall score: ${formatNumber(report.summary.averages.overallScore)}`);
  lines.push(`- Citation coverage: ${formatPercent(report.summary.averages.citationCoverage)}`);
  lines.push(`- Broken citation count: ${formatNumber(report.summary.averages.brokenCitationCount)}`);
  lines.push(`- Section evidence coverage: ${formatPercent(report.summary.averages.sectionEvidenceCoverage)}`);
  lines.push(`- Hook / Anchor / Echo pass: ${formatPercent(report.summary.averages.hookAnchorEchoPass)}`);
  lines.push(`- Rewrite hotspot count: ${formatNumber(report.summary.averages.rewriteHotspotCount)}`);
  lines.push(`- Polisher trigger rate: ${formatPercent(report.summary.averages.polisherTriggerRate)}`);
  lines.push(`- Human edit delta: ${formatPercent(report.summary.averages.humanEditDelta)}`);
  lines.push(`- Vitality pass rate: ${formatPercent(report.summary.averages.vitalityPassRate)}`);
  lines.push("");
  lines.push("## Fixtures");
  lines.push("");

  for (const scorecard of report.scorecards) {
    lines.push(`### ${scorecard.fixture.id} · ${scorecard.fixture.label}`);
    lines.push("");
    lines.push(`- Project: ${scorecard.topic ?? scorecard.fixture.projectId}`);
    lines.push(`- Stage: ${scorecard.projectStage ?? "missing"}`);
    lines.push(`- Available: ${scorecard.available ? "yes" : "no"}`);
    lines.push(`- Overall score: ${formatNumber(scorecard.overallScore)}`);
    if (scorecard.metrics) {
      lines.push(`- Citation coverage: ${formatPercent(scorecard.metrics.citationCoverage)}`);
      lines.push(`- Broken citations: ${scorecard.metrics.brokenCitationCount}`);
      lines.push(`- Section evidence coverage: ${formatPercent(scorecard.metrics.sectionEvidenceCoverage)}`);
      lines.push(`- Hook / Anchor / Echo pass: ${formatPercent(scorecard.metrics.hookAnchorEchoPass)}`);
      lines.push(`- Rewrite hotspot count: ${formatNumber(scorecard.metrics.rewriteHotspotCount)}`);
      lines.push(`- Polisher trigger rate: ${formatPercent(scorecard.metrics.polisherTriggerRate)}`);
      lines.push(`- Human edit delta: ${formatPercent(scorecard.metrics.humanEditDelta)}`);
      lines.push(`- Vitality pass rate: ${formatPercent(scorecard.metrics.vitalityPassRate)}`);
    }
    if (scorecard.missingArtifacts.length > 0) {
      lines.push(`- Missing artifacts: ${scorecard.missingArtifacts.join(", ")}`);
    }
    if (scorecard.notes.length > 0) {
      lines.push("- Notes:");
      for (const note of scorecard.notes) {
        lines.push(`  - ${note}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const inputFile = resolve(process.argv[2] ?? "output/evals/writing-quality-latest.json");
  const outputFile = resolve(process.argv[3] ?? "output/evals/writing-quality-latest.md");
  const report = JSON.parse(readFileSync(inputFile, "utf8")) as WritingQualityRunReport;
  const markdown = buildMarkdown(report);
  writeFileSync(outputFile, markdown);
  console.log(markdown);
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "render writing quality report failed");
  process.exitCode = 1;
});
