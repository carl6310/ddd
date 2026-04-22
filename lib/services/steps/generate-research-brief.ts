import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getProject, saveResearchBrief, updateProject } from "@/lib/repository";
import type { ResearchBrief } from "@/lib/types";
import { canGenerateResearch } from "@/lib/workflow";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function generateResearchBriefStep(input: { projectId: string; forceProceed?: boolean; context: JobExecutionContext }) {
  const { projectId, forceProceed = false, context } = input;

  context.setProgress("loading_bundle", "正在读取项目定义。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }

  const gate = canGenerateResearch(project, forceProceed);
  if (!gate.ok) {
    throw new JobError("gate_failed", gate.gate.message);
  }
  context.log("info", "gate_checked", "研究清单前置校验通过。");

  context.setProgress("calling_llm", "正在生成研究清单。");
  const researchBrief = await runStructuredTask<ResearchBrief>(
    "research_brief",
    {
      project,
      styleReference: buildStyleReference(project.topic, project.articleType),
    },
    {
      audit: {
        jobId: context.job.id,
        projectId,
      },
    },
  );
  context.log("info", "llm_call_finished", "研究清单生成完成。", { task: "research_brief" });

  context.setProgress("saving_result", "正在保存研究清单。");
  saveResearchBrief(projectId, researchBrief);
  updateProject(projectId, { stage: "研究清单" });
  context.log("info", "result_saved", "研究清单已保存。");
}
