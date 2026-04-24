import type { ArticleProject, PublishPackage, ResearchBrief, ReviewReport, SourceCard, VitalityCheck } from "@/lib/types";
import { getStyleCoreGate, getThinkCardGate, isStyleCoreComplete, isThinkCardComplete } from "@/lib/author-cards";

export function isProjectFrameComplete(project: ArticleProject): boolean {
  return Boolean(
    project.thesis.trim() &&
      project.coreQuestion.trim() &&
      isThinkCardComplete(project.thinkCard) &&
      isStyleCoreComplete(project.styleCore),
  );
}

export function canGenerateResearch(project: ArticleProject, forceProceed = false) {
  const gate = getThinkCardGate(project.thinkCard);
  if (gate.status === "pass") {
    return { ok: true, gate };
  }
  if (gate.status === "warn" && forceProceed) {
    return { ok: true, gate };
  }
  return { ok: false, gate };
}

export function canGenerateOutline(project: ArticleProject, forceProceed = false) {
  const thinkGate = getThinkCardGate(project.thinkCard);
  if (thinkGate.status === "fail") {
    return { ok: false, gate: thinkGate };
  }
  if (thinkGate.status === "warn" && !forceProceed) {
    return { ok: false, gate: thinkGate };
  }

  const styleGate = getStyleCoreGate(project.styleCore, "outline");
  if (styleGate.status === "pass") {
    return { ok: true, gate: styleGate };
  }
  if (styleGate.status === "warn" && forceProceed) {
    return { ok: true, gate: styleGate };
  }
  return { ok: false, gate: styleGate };
}

export function canGenerateDraft(project: ArticleProject, forceProceed = false) {
  const outlineGate = canGenerateOutline(project, forceProceed);
  if (!outlineGate.ok) {
    return outlineGate;
  }

  const styleGate = getStyleCoreGate(project.styleCore, "draft");
  if (styleGate.status === "pass") {
    return { ok: true, gate: styleGate };
  }
  if (styleGate.status === "warn" && forceProceed) {
    return { ok: true, gate: styleGate };
  }
  return { ok: false, gate: styleGate };
}

export function validateSourceCardInput(input: Pick<SourceCard, "title" | "summary" | "evidence" | "credibility" | "tags">) {
  if (!input.title.trim()) {
    throw new Error("资料卡标题不能为空。");
  }
  if (!input.summary.trim()) {
    throw new Error("资料卡摘要不能为空。");
  }
  if (!input.evidence.trim()) {
    throw new Error("资料卡证据片段不能为空。");
  }
  if (!input.credibility) {
    throw new Error("资料卡可信度不能为空。");
  }
  if (!input.tags.length) {
    throw new Error("资料卡至少要有一个标签。");
  }
}

export function getResearchGaps(researchBrief: ResearchBrief | null, sourceCards: SourceCard[]): string[] {
  if (!researchBrief) {
    return [];
  }

  const tags = new Set(sourceCards.flatMap((card) => card.tags));
  return researchBrief.mustResearch
    .filter((item) => {
      const keyword = item.dimension.replace(/[\/、]/g, "");
      return !Array.from(tags).some((tag) => tag.includes(keyword) || item.dimension.includes(tag));
    })
    .map((item) => item.dimension);
}

export function canPreparePublish(reviewReport: ReviewReport | null, vitalityCheck: VitalityCheck | null): boolean {
  if (!reviewReport || !vitalityCheck) {
    return false;
  }

  if (vitalityCheck.hardBlocked) {
    return false;
  }
  if (reviewReport.qualityPyramid?.some((layer) => layer.level === "L1" && layer.status === "fail")) {
    return false;
  }
  return true;
}

export function buildPublishChecklist(publishPackage: PublishPackage): string[] {
  return publishPackage.publishChecklist;
}
