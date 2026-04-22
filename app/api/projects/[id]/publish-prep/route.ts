import { fail, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getArticleDraft, getProject, getPublishPackage, getReviewReport } from "@/lib/repository";
import { canPreparePublish } from "@/lib/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return ok({ publishPackage: getPublishPackage(id) });
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }

    const reviewReport = getReviewReport(id);
    if (!canPreparePublish(reviewReport, project.vitalityCheck)) {
      return fail("生命力检查还没过线，暂时不能生成发布前整理稿。");
    }

    const articleDraft = getArticleDraft(id);
    if (!articleDraft) {
      return fail("请先生成正文。");
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "publish-prep",
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
    return fail(error instanceof Error ? error.message : "发布前整理任务入队失败。", 500);
  }
}
