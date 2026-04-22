import type { ProjectBundle } from "@/lib/types";
import type {
  CriticalJudgementAlert,
  EvidenceAnalysisResult,
  EvidenceKeyPointCoverage,
  EvidenceSectionCoverage,
} from "./types";

function clamp01(value: number) {
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function extractCitationIds(markdown: string): string[] {
  return Array.from(new Set(markdown.match(/\[SC:([a-zA-Z0-9_-]+)\]/g)?.map((token) => token.slice(4, -1)) ?? []));
}

function extractDraftForAnalysis(bundle: ProjectBundle) {
  return bundle.articleDraft?.editedMarkdown?.trim() || bundle.articleDraft?.narrativeMarkdown?.trim() || "";
}

function extractSectionText(markdown: string, heading: string, nextHeading?: string) {
  const startMarker = `## ${heading}`;
  const startIndex = markdown.indexOf(startMarker);
  if (startIndex < 0) {
    return "";
  }
  const contentStart = startIndex + startMarker.length;
  const endIndex = nextHeading ? markdown.indexOf(`## ${nextHeading}`, contentStart) : -1;
  return markdown.slice(startIndex, endIndex >= 0 ? endIndex : undefined);
}

function analyzeSectionCoverage(bundle: ProjectBundle, draft: string): EvidenceSectionCoverage[] {
  const sourceIds = new Set(bundle.sourceCards.map((card) => card.id));
  const sections = bundle.outlineDraft?.sections ?? [];

  return sections.map((section, index) => {
    const nextHeading = sections[index + 1]?.heading;
    const sectionText = extractSectionText(draft, section.heading, nextHeading);
    const expectedEvidenceIds = Array.from(new Set(section.evidenceIds.filter(Boolean)));
    const citedEvidenceIds = extractCitationIds(sectionText).filter((id) => sourceIds.has(id));
    const brokenCitationIds = extractCitationIds(sectionText).filter((id) => !sourceIds.has(id));
    const missingEvidenceIds = expectedEvidenceIds.filter((id) => !citedEvidenceIds.includes(id));

    return {
      heading: section.heading,
      expectedEvidenceIds,
      citedEvidenceIds,
      missingEvidenceIds,
      brokenCitationIds,
      coverageScore: expectedEvidenceIds.length === 0 ? 1 : clamp01((expectedEvidenceIds.length - missingEvidenceIds.length) / expectedEvidenceIds.length),
    };
  });
}

function analyzeKeyPointCoverage(sectionCoverage: EvidenceSectionCoverage[], bundle: ProjectBundle): EvidenceKeyPointCoverage[] {
  const sections = bundle.outlineDraft?.sections ?? [];
  return sections.flatMap((section) => {
    const coverage = sectionCoverage.find((item) => item.heading === section.heading);
    const expectedEvidenceIds = coverage?.expectedEvidenceIds ?? [];
    const citedEvidenceIds = coverage?.citedEvidenceIds ?? [];
    const keyPoints = section.keyPoints.length > 0 ? section.keyPoints : [section.purpose || section.heading];

    return keyPoints.map((keyPoint) => ({
      heading: section.heading,
      keyPoint,
      expectedEvidenceIds,
      citedEvidenceIds,
      covered: expectedEvidenceIds.length === 0 ? citedEvidenceIds.length > 0 : expectedEvidenceIds.some((id) => citedEvidenceIds.includes(id)),
    }));
  });
}

function analyzeCriticalJudgementAlerts(bundle: ProjectBundle, sectionCoverage: EvidenceSectionCoverage[], validCitationIds: string[]): CriticalJudgementAlert[] {
  const alerts: CriticalJudgementAlert[] = [];
  const thesis = bundle.project.thesis?.trim() ?? "";

  if (thesis && validCitationIds.length === 0) {
    alerts.push({
      target: "thesis",
      label: thesis,
      missingEvidenceIds: [],
      detail: "正文还没有用任何有效资料卡支撑主判断。",
    });
  }

  for (const item of sectionCoverage) {
    if (item.missingEvidenceIds.length === 0) {
      continue;
    }
    alerts.push({
      target: "section",
      label: item.heading,
      missingEvidenceIds: item.missingEvidenceIds,
      detail: `${item.heading} 缺少 ${item.missingEvidenceIds.length} 条预期证据支撑。`,
    });
  }

  return alerts;
}

export function analyzeEvidenceCoverage(bundle: ProjectBundle): EvidenceAnalysisResult {
  const draft = extractDraftForAnalysis(bundle);
  const citationIds = extractCitationIds(draft);
  const sourceIds = new Set(bundle.sourceCards.map((card) => card.id));
  const validCitationIds = citationIds.filter((id) => sourceIds.has(id));
  const brokenCitationIds = citationIds.filter((id) => !sourceIds.has(id));
  const sectionCoverage = analyzeSectionCoverage(bundle, draft);
  const keyPointCoverage = analyzeKeyPointCoverage(sectionCoverage, bundle);
  const expectedEvidenceIds = Array.from(new Set(sectionCoverage.flatMap((item) => item.expectedEvidenceIds)));
  const orphanSourceCardIds = bundle.sourceCards
    .map((card) => card.id)
    .filter((id) => !validCitationIds.includes(id) && !expectedEvidenceIds.includes(id));
  const missingExpectedEvidenceIds = Array.from(new Set(sectionCoverage.flatMap((item) => item.missingEvidenceIds)));
  const criticalJudgementAlerts = analyzeCriticalJudgementAlerts(bundle, sectionCoverage, validCitationIds);

  const citationCoverage =
    expectedEvidenceIds.length > 0
      ? clamp01(expectedEvidenceIds.filter((id) => validCitationIds.includes(id)).length / expectedEvidenceIds.length)
      : validCitationIds.length > 0
        ? 1
        : 0;
  const sectionEvidenceCoverage =
    sectionCoverage.length > 0 ? sectionCoverage.reduce((total, item) => total + item.coverageScore, 0) / sectionCoverage.length : 0;
  const keyPointCoverageScore =
    keyPointCoverage.length > 0 ? keyPointCoverage.filter((item) => item.covered).length / keyPointCoverage.length : 0;

  return {
    citationIds,
    validCitationIds,
    brokenCitationIds,
    orphanSourceCardIds,
    missingExpectedEvidenceIds,
    sectionCoverage,
    keyPointCoverage,
    criticalJudgementAlerts,
    summary: {
      citationCoverage,
      brokenCitationCount: brokenCitationIds.length,
      sectionEvidenceCoverage,
      keyPointCoverage: keyPointCoverageScore,
      orphanSourceCardCount: orphanSourceCardIds.length,
    },
  };
}
