import { fail, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getProject, listSourceCards } from "@/lib/repository";

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

    const sourceCards = listSourceCards(id);
    if (sourceCards.length === 0) {
      return fail("没有资料卡时，不能生成板块建模。");
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "sector-model",
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
    return fail(error instanceof Error ? error.message : "板块建模任务入队失败。", 500);
  }
}
