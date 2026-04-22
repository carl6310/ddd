import { buildStyleReference, getArticleDraft, getOutlineDraft, getProject, getResearchBrief, getReviewReport, getSectorModel, listSourceCards, savePublishPackage, updateProject } from "@/lib/repository";
import { runStructuredTask } from "@/lib/llm";
import { canPreparePublish } from "@/lib/workflow";
import type { PublishPackage } from "@/lib/types";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";
import { buildWritingQualityGate } from "@/lib/writing-quality/gate";

export async function preparePublishStep(input: { projectId: string; context: JobExecutionContext }) {
  const { projectId, context } = input;

  context.setProgress("loading_bundle", "正在读取发布前整理材料。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const reviewReport = getReviewReport(projectId);
  if (!canPreparePublish(reviewReport, project.vitalityCheck)) {
    throw new JobError("gate_failed", "生命力检查还没过线，暂时不能生成发布前整理稿。");
  }

  const articleDraft = getArticleDraft(projectId);
  const sectorModel = getSectorModel(projectId);
  const outlineDraft = getOutlineDraft(projectId);
  const researchBrief = getResearchBrief(projectId);
  const sourceCards = listSourceCards(projectId);
  if (!articleDraft) {
    throw new JobError("missing_draft", "请先生成正文。");
  }
  context.log("info", "bundle_loaded", "已读取发布前整理材料。", {
    hasReviewReport: Boolean(reviewReport),
    hasOutlineDraft: Boolean(outlineDraft),
  });

  const finalMarkdown = articleDraft.editedMarkdown || articleDraft.narrativeMarkdown;
  const qualityGate = buildWritingQualityGate({
    project,
    researchBrief,
    sourceCards,
    sectorModel,
    outlineDraft,
    articleDraft,
    reviewReport,
    publishPackage: null,
  });
  context.log("info", "gate_checked", "写作质量门槛已计算（warn-only）。", {
    mustFix: qualityGate.mustFix.length,
    shouldFix: qualityGate.shouldFix.length,
    optionalPolish: qualityGate.optionalPolish.length,
  });

  context.setProgress("calling_llm", "正在生成发布前整理。");
  const publishPackage = await runStructuredTask<PublishPackage>(
    "publish_prep",
    {
      project,
      finalMarkdown,
      sectorModel,
      outlineDraft,
      deterministicReview: reviewReport,
      styleReference: buildStyleReference(project.topic, project.articleType),
    },
    {
      audit: {
        jobId: context.job.id,
        projectId,
      },
    },
  );
  context.log("info", "llm_call_finished", "发布前整理已生成。", { task: "publish_prep" });

  if (needsSummaryRefinement(publishPackage.summary)) {
    try {
      context.setProgress("calling_llm", "正在优化发布摘要。");
      const refined = await runStructuredTask<{ summary: string }>(
        "publish_summary_refiner",
        {
          project,
          finalMarkdown: publishPackage.summary,
          narrativeMarkdown: finalMarkdown,
        },
        {
          audit: {
            jobId: context.job.id,
            projectId,
          },
        },
      );
      publishPackage.summary = refined.summary.trim() || publishPackage.summary;
      context.log("info", "llm_call_finished", "发布摘要优化完成。", { task: "publish_summary_refiner" });
    } catch (error) {
      context.log("warn", "llm_call_failed", "发布摘要优化失败，保留首轮结果。", {
        message: error instanceof Error ? error.message : "未知错误",
      });
    }
  }

  publishPackage.qualityGate = qualityGate;
  context.setProgress("saving_result", "正在保存发布前整理结果。");
  savePublishPackage(projectId, publishPackage);
  updateProject(projectId, { stage: "发布前整理" });
  context.log("info", "result_saved", "发布前整理结果已保存。");
}

function needsSummaryRefinement(summary: string) {
  const text = summary.trim();
  if (!text) {
    return true;
  }

  const metaPhrases = ["这篇文章", "本文", "这篇不是在", "告诉读者", "带你看懂", "这篇"];
  const sentenceCount = text.split(/(?<=[。！？!?])/).filter(Boolean).length;

  return metaPhrases.some((phrase) => text.includes(phrase)) || sentenceCount <= 1;
}
