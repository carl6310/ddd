import { extractArticleFromUrl } from "@/lib/url-extractor";
import { getProject } from "@/lib/repository";
import type { JobExecutionContext } from "@/lib/jobs/types";
import { JobError } from "@/lib/jobs/types";

export async function extractSourceCardStep(input: { projectId: string; url?: string; context: JobExecutionContext }) {
  const { projectId, url, context } = input;

  context.setProgress("loading_bundle", "正在校验链接和项目。");
  const project = getProject(projectId);
  if (!project) {
    throw new JobError("project_missing", "项目不存在。");
  }
  if (!url?.trim()) {
    throw new JobError("missing_url", "请先提供要抓取的链接。");
  }

  context.setProgress("calling_llm", "正在抓取链接正文并整理摘要。");
  const extracted = await extractArticleFromUrl(url.trim(), {
    audit: {
      jobId: context.job.id,
      projectId,
    },
  });
  context.log("info", "llm_call_finished", "链接正文抓取完成。", { title: extracted.title });

  context.setProgress("saving_result", "正在整理抓取结果。");
  context.setResult(extracted as unknown as Record<string, unknown>);
  context.log("info", "result_saved", "链接正文结果已挂到任务详情。");
}
