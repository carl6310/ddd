import { fail, ok } from "@/lib/api";
import { retryJob } from "@/lib/jobs/queue";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { jobId } = await context.params;
    const result = retryJob(jobId);

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
    return fail(error instanceof Error ? error.message : "任务重试失败。", 400);
  }
}
