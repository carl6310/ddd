import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { getProjectBundle } from "@/lib/repository";
import { getProjectLLMStats } from "@/lib/writing-quality/scorecard-db";
import { buildWritingQualityScorecard, buildWritingQualitySummary } from "@/lib/writing-quality/scorecard";
import type { WritingQualityFixture, WritingQualityRunReport } from "@/lib/writing-quality/types";

function readFixtures(fixtureFile: string): WritingQualityFixture[] {
  const payload = JSON.parse(readFileSync(fixtureFile, "utf8")) as { fixtures: WritingQualityFixture[] };
  return payload.fixtures;
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const fixtureFile = resolve(process.argv[2] ?? "evals/fixtures/writing-quality/default.json");
  const fixtures = readFixtures(fixtureFile);
  const scorecards = fixtures.map((fixture) =>
    buildWritingQualityScorecard({
      fixture,
      bundle: getProjectBundle(fixture.projectId),
      llmStats: getProjectBundle(fixture.projectId) ? getProjectLLMStats(fixture.projectId) : null,
    }),
  );

  const report: WritingQualityRunReport = {
    generatedAt: new Date().toISOString(),
    fixtureFile,
    scorecards,
    summary: buildWritingQualitySummary(scorecards),
  };

  const outputDir = resolve("output/evals");
  mkdirSync(outputDir, { recursive: true });
  const outputFile = join(outputDir, `writing-quality-${timestampForFilename()}.json`);
  const latestFile = join(outputDir, "writing-quality-latest.json");

  writeFileSync(outputFile, JSON.stringify(report, null, 2));
  writeFileSync(latestFile, JSON.stringify(report, null, 2));

  console.log(JSON.stringify({ outputFile, latestFile, summary: report.summary }, null, 2));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "writing quality eval failed");
  process.exitCode = 1;
});
