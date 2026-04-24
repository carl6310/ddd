import { fail, ok } from "@/lib/api";
import { getTopicDiscoveryJob, listTopicDiscoveryJobLogs } from "@/lib/topic-discovery-jobs";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getTopicDiscoveryJob(jobId);
  if (!job) {
    return fail("选题发现任务不存在。", 404);
  }

  return ok({
    job,
    logsTail: listTopicDiscoveryJobLogs(jobId),
  });
}
