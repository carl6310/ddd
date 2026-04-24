import { fail, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getProject } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }

    const body = (await request.json()) as { rawText?: string; title?: string };
    const rawText = body.rawText?.trim() || "";
    if (!rawText) {
      return fail("请先粘贴资料原文。");
    }

    const title = body.title?.trim() || "未命名资料";
    const result = enqueueProjectJob({
      projectId: id,
      step: "source-card-summarize",
      payload: {
        rawText,
        title,
      },
      dedupeScope: `${title}\n${rawText}`,
    });

    return ok(
      {
        job: {
          id: result.job.id,
          step: result.job.step,
          status: result.job.status,
          deduped: result.deduped,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "资料摘要任务入队失败。", 500);
  }
}
