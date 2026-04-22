import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getProject, getResearchBrief, listSourceCards, saveSectorModel, updateProject } from "@/lib/repository";
import type { SectorModel } from "@/lib/types";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function generateSectorModelStep(input: { projectId: string; context: JobExecutionContext }) {
  const { projectId, context } = input;

  context.setProgress("loading_bundle", "正在读取研究材料和资料卡。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const sourceCards = listSourceCards(projectId);
  if (sourceCards.length === 0) {
    throw new JobError("missing_sources", "没有资料卡时，不能生成板块建模。");
  }

  const researchBrief = getResearchBrief(projectId);
  context.log("info", "bundle_loaded", "已读取板块建模所需材料。", {
    sourceCardCount: sourceCards.length,
    hasResearchBrief: Boolean(researchBrief),
  });

  context.setProgress("calling_llm", "正在生成板块建模。");
  const sectorModel = await runStructuredTask<SectorModel>(
    "sector_modeler",
    {
      project,
      researchBrief,
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
  context.log("info", "llm_call_finished", "板块建模生成完成。", { task: "sector_modeler" });

  context.setProgress("saving_result", "正在保存板块建模。");
  saveSectorModel(projectId, sectorModel);
  updateProject(projectId, { stage: "板块建模" });
  context.log("info", "result_saved", "板块建模已保存。");
}
