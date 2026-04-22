import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getArticleDraft, getProject, getSectorModel, listSourceCards, saveReviewReport, updateProject } from "@/lib/repository";
import { buildVitalityCheck, runDeterministicReview } from "@/lib/review";
import type { ReviewReport } from "@/lib/types";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function runReviewStep(input: { projectId: string; context: JobExecutionContext }) {
  const { projectId, context } = input;

  context.setProgress("loading_bundle", "正在读取正文和检查材料。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const articleDraft = getArticleDraft(projectId);
  const sectorModel = getSectorModel(projectId);
  const sourceCards = listSourceCards(projectId);
  if (!articleDraft) {
    throw new JobError("missing_draft", "请先生成初稿。");
  }
  context.log("info", "bundle_loaded", "已读取 Review 所需材料。", {
    sourceCardCount: sourceCards.length,
    hasSectorModel: Boolean(sectorModel),
  });

  const deterministicReview = runDeterministicReview({
    articleType: project.articleType,
    thesis: project.thesis,
    hkrr: project.hkrr,
    hamd: project.hamd,
    writingMoves: project.writingMoves,
    sectorModel,
    articleDraft,
    sourceCards,
  });
  context.log("info", "gate_checked", "已完成规则层质检。", {
    checkCount: deterministicReview.checks.length,
  });

  let reviewReport: ReviewReport;
  try {
    context.setProgress("calling_llm", "正在生成模型质检补充。");
    const modelReview = await runStructuredTask<ReviewReport>(
      "vitality_reviewer",
      {
        project,
        sectorModel,
        narrativeMarkdown: articleDraft.editedMarkdown || articleDraft.narrativeMarkdown,
        deterministicReview,
        styleReference: buildStyleReference(project.topic, project.articleType),
      },
      {
        audit: {
          jobId: context.job.id,
          projectId,
        },
      },
    );
    reviewReport = mergeReviews(deterministicReview, modelReview);
    context.log("info", "llm_call_finished", "模型质检补充已完成。", { task: "vitality_reviewer" });
  } catch (error) {
    reviewReport = {
      ...deterministicReview,
      overallVerdict: `${deterministicReview.overallVerdict} 远程编辑质检超时，本次先采用规则层质检结果。`,
      revisionSuggestions: Array.from(new Set([...deterministicReview.revisionSuggestions, "如果你需要更细的编辑建议，可以稍后再重试一次质检。"])),
    };
    context.log("warn", "llm_call_failed", "模型质检补充失败，已回退到规则层结果。", {
      message: error instanceof Error ? error.message : "未知错误",
    });
  }

  context.setProgress("saving_result", "正在保存质检结果。");
  saveReviewReport(projectId, reviewReport);
  const vitalityCheck = buildVitalityCheck({ reviewReport, sourceCards });
  updateProject(projectId, { stage: "VitalityCheck", vitalityCheck });
  context.log("info", "result_saved", "质检报告已保存。", {
    overallStatus: vitalityCheck.overallStatus,
  });
}

function mergeReviews(base: ReviewReport, extra: ReviewReport): ReviewReport {
  const mergedChecks = [...base.checks];

  for (const check of extra.checks) {
    if (!mergedChecks.find((item) => item.key === check.key)) {
      mergedChecks.push(check);
    }
  }

  return {
    overallVerdict: extra.overallVerdict || base.overallVerdict,
    completionScore: Math.round((base.completionScore + extra.completionScore) / 2),
    globalScore: Math.round(((base.globalScore ?? base.completionScore) + (extra.globalScore ?? extra.completionScore)) / 2),
    checks: mergedChecks,
    sectionScores: extra.sectionScores?.length ? extra.sectionScores : base.sectionScores,
    paragraphFlags: extra.paragraphFlags?.length ? extra.paragraphFlags : base.paragraphFlags,
    rewriteIntents: extra.rewriteIntents?.length ? extra.rewriteIntents : base.rewriteIntents,
    revisionSuggestions: Array.from(new Set([...base.revisionSuggestions, ...extra.revisionSuggestions])),
    preservedPatterns: Array.from(new Set([...base.preservedPatterns, ...extra.preservedPatterns])),
    missingPatterns: Array.from(new Set([...base.missingPatterns, ...extra.missingPatterns])),
  };
}
