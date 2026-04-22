import { fail, ok } from "@/lib/api";
import { listProjectJobs } from "@/lib/jobs/repository";
import { getProject } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const project = getProject(id);
  if (!project) {
    return fail("项目不存在。", 404);
  }

  const jobs = listProjectJobs(id).map((job) => ({
    id: job.id,
    projectId: job.projectId,
    step: job.step,
    status: job.status,
    progressStage: job.progressStage,
    progressMessage: job.progressMessage,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  }));

  return ok({ items: jobs });
}
