import { runStructuredTask } from "@/lib/llm";
import { buildFallbackArgumentFrame, normalizeArgumentFrame } from "@/lib/argument-frame";
import { normalizeProjectIntent } from "@/lib/project-intent";
import { buildStyleReference, getProject, getResearchBrief, getSectorModel, listSourceCards, saveOutlineDraft, updateProject } from "@/lib/repository";
import type { ArgumentFrame, OutlineDraft } from "@/lib/types";
import { canGenerateOutline } from "@/lib/workflow";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function generateOutlineStep(input: { projectId: string; forceProceed?: boolean; context: JobExecutionContext }) {
  const { projectId, forceProceed = false, context } = input;

  context.setProgress("loading_bundle", "正在读取板块建模和资料卡。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const gate = canGenerateOutline(project, forceProceed);
  if (!gate.ok) {
    throw new JobError("gate_failed", gate.gate.message);
  }

  const sectorModel = getSectorModel(projectId);
  if (!sectorModel) {
    throw new JobError("missing_prerequisites", "请先生成板块建模。");
  }

  const sourceCards = listSourceCards(projectId);
  const researchBrief = getResearchBrief(projectId);
  const projectIntent = normalizeProjectIntent(project);
  context.log("info", "bundle_loaded", "已读取提纲生成所需材料。", {
    sourceCardCount: sourceCards.length,
    zoneCount: sectorModel.zones.length,
    hasResearchBrief: Boolean(researchBrief),
  });

  const argumentFrameFallback = buildFallbackArgumentFrame({
    project,
    evidenceIds: sectorModel.evidenceIds,
    zones: sectorModel.zones.map((zone) => zone.name),
  });
  let argumentFrame = argumentFrameFallback;
  try {
    context.setProgress("calling_llm", "正在生成论证框架。");
    const rawArgumentFrame = await runStructuredTask<ArgumentFrame>(
      "argument_framer",
      {
        project,
        projectIntent,
        researchBrief,
        sectorModel,
        sourceCards,
        styleReference: buildStyleReference(project.topic, project.articleType),
      },
      {
        audit: {
          jobId: context.job.id,
          projectId,
        },
      },
    );
    argumentFrame = normalizeArgumentFrame(rawArgumentFrame, argumentFrameFallback);
    context.log("info", "llm_call_finished", "论证框架生成完成。", {
      task: "argument_framer",
      primaryShape: argumentFrame.primaryShape,
    });
  } catch (error) {
    context.log("warn", "argument_frame_fallback", "论证框架生成失败，已使用确定性兜底。", {
      error: error instanceof Error ? error.message : String(error),
      primaryShape: argumentFrame.primaryShape,
    });
  }

  context.setProgress("calling_llm", "正在生成提纲。");
  const outlineDraft = await runStructuredTask<OutlineDraft>(
    "outline_writer",
    {
      project,
      projectIntent,
      researchBrief,
      sectorModel,
      argumentFrame,
      sourceCards,
      styleReference: buildStyleReference(project.topic, project.articleType),
    },
    {
      audit: {
        jobId: context.job.id,
        projectId,
      },
    },
  );
  context.log("info", "llm_call_finished", "提纲生成完成。", { task: "outline_writer" });

  context.setProgress("saving_result", "正在保存提纲。");
  saveOutlineDraft(projectId, { ...outlineDraft, argumentFrame });
  updateProject(projectId, { stage: "提纲生成" });
  context.log("info", "result_saved", "提纲已保存。");
}
