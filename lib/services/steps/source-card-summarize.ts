import { analyzeSourceMaterial } from "@/lib/source-card-analysis";
import { getProject } from "@/lib/repository";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function summarizeSourceCard(input: {
  projectId: string;
  rawText?: string;
  title?: string;
  audit?: { jobId?: string | null; projectId?: string | null };
}) {
  const { projectId, rawText, title, audit } = input;

  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }
  if (!rawText?.trim()) {
    throw new JobError("missing_raw_text", "请先粘贴资料原文。");
  }

  return await analyzeSourceMaterial(rawText, title?.trim() || "未命名资料", { audit });
}

export async function summarizeSourceCardStep(input: { projectId: string; rawText?: string; title?: string; context: JobExecutionContext }) {
  const { projectId, rawText, title, context } = input;

  context.setProgress("loading_bundle", "正在校验资料原文。");
  context.setProgress("calling_llm", "正在生成资料摘要与证据。");
  const generated = await summarizeSourceCard({
    projectId,
    rawText,
    title,
    audit: {
      jobId: context.job.id,
      projectId,
    },
  });
  context.log("info", "llm_call_finished", "资料摘要生成完成。", { title: generated.title });

  context.setProgress("saving_result", "正在整理摘要结果。");
  context.setResult(generated as unknown as Record<string, unknown>);
  context.log("info", "result_saved", "资料摘要结果已挂到任务详情。");
}
