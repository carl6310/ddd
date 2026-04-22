import type { CriticalJudgementAlert, EvidenceKeyPointCoverage } from "@/lib/evidence/types";
import type { ProjectBundle } from "@/lib/types";

export interface WritingQualityFixture {
  id: string;
  label: string;
  projectId: string;
  expectation: "standard_flow" | "forced_continue" | "rewrite_heavy";
  note?: string;
}

export interface WritingQualityLLMStats {
  draftWriterCalls: number;
  draftPolisherCalls: number;
}

export interface WritingQualitySectionCoverage {
  heading: string;
  expectedEvidenceIds: string[];
  citedEvidenceIds: string[];
  missingEvidenceIds: string[];
  brokenCitationIds: string[];
  coverageScore: number;
}

export interface WritingQualityMetrics {
  citationCoverage: number;
  brokenCitationCount: number;
  sectionEvidenceCoverage: number;
  hookAnchorEchoPass: number | null;
  rewriteHotspotCount: number | null;
  polisherTriggerRate: number | null;
  humanEditDelta: number | null;
  vitalityPassRate: number | null;
}

export interface WritingQualityScorecard {
  fixture: WritingQualityFixture;
  generatedAt: string;
  available: boolean;
  projectStage: ProjectBundle["project"]["stage"] | null;
  topic: string | null;
  overallScore: number | null;
  metrics: WritingQualityMetrics | null;
  sectionCoverage: WritingQualitySectionCoverage[];
  keyPointCoverage: EvidenceKeyPointCoverage[];
  criticalJudgementAlerts: CriticalJudgementAlert[];
  missingArtifacts: string[];
  notes: string[];
  llmStats: WritingQualityLLMStats | null;
}

export interface WritingQualityRunReport {
  generatedAt: string;
  fixtureFile: string;
  scorecards: WritingQualityScorecard[];
  summary: {
    fixtureCount: number;
    availableCount: number;
    averages: {
      citationCoverage: number | null;
      brokenCitationCount: number | null;
      sectionEvidenceCoverage: number | null;
      hookAnchorEchoPass: number | null;
      rewriteHotspotCount: number | null;
      polisherTriggerRate: number | null;
      humanEditDelta: number | null;
      vitalityPassRate: number | null;
      overallScore: number | null;
    };
  };
}
