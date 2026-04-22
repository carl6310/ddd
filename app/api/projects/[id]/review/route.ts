import { fail, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getArticleDraft, getProject } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }

    const articleDraft = getArticleDraft(id);
    if (!articleDraft) {
      return fail("请先生成初稿。");
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "review",
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
    return fail(error instanceof Error ? error.message : "质检任务入队失败。", 500);
  }
}
