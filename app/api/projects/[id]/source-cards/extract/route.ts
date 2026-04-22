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

    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim()) {
      return fail("请先提供要抓取的链接。");
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "source-card-extract",
      payload: {
        url: body.url.trim(),
      },
      dedupeScope: body.url.trim(),
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
    return fail(error instanceof Error ? error.message : "链接抓取任务入队失败。", 500);
  }
}
