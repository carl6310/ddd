export interface EvidenceSectionCoverage {
  heading: string;
  expectedEvidenceIds: string[];
  citedEvidenceIds: string[];
  missingEvidenceIds: string[];
  brokenCitationIds: string[];
  coverageScore: number;
}

export interface EvidenceKeyPointCoverage {
  heading: string;
  keyPoint: string;
  expectedEvidenceIds: string[];
  citedEvidenceIds: string[];
  covered: boolean;
}

export interface CriticalJudgementAlert {
  target: "thesis" | "section";
  label: string;
  missingEvidenceIds: string[];
  detail: string;
}

export interface EvidenceAnalysisSummary {
  citationCoverage: number;
  brokenCitationCount: number;
  sectionEvidenceCoverage: number;
  keyPointCoverage: number;
  orphanSourceCardCount: number;
}

export interface EvidenceAnalysisResult {
  citationIds: string[];
  validCitationIds: string[];
  brokenCitationIds: string[];
  orphanSourceCardIds: string[];
  missingExpectedEvidenceIds: string[];
  sectionCoverage: EvidenceSectionCoverage[];
  keyPointCoverage: EvidenceKeyPointCoverage[];
  criticalJudgementAlerts: CriticalJudgementAlert[];
  summary: EvidenceAnalysisSummary;
}
