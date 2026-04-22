import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getProject, getSectorModel, listSourceCards, saveOutlineDraft, updateProject } from "@/lib/repository";
import type { OutlineDraft } from "@/lib/types";
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
  context.log("info", "bundle_loaded", "已读取提纲生成所需材料。", {
    sourceCardCount: sourceCards.length,
    zoneCount: sectorModel.zones.length,
  });

  context.setProgress("calling_llm", "正在生成提纲。");
  const outlineDraft = await runStructuredTask<OutlineDraft>(
    "outline_writer",
    {
      project,
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
  context.log("info", "llm_call_finished", "提纲生成完成。", { task: "outline_writer" });

  context.setProgress("saving_result", "正在保存提纲。");
  saveOutlineDraft(projectId, outlineDraft);
  updateProject(projectId, { stage: "提纲生成" });
  context.log("info", "result_saved", "提纲已保存。");
}
