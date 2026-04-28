import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession } from "@/lib/repository";
import { enqueueTopicDiscoveryJob, listTopicDiscoveryJobs, reapStaleTopicDiscoveryJobs, runTopicDiscoveryJobNow } from "@/lib/topic-discovery-jobs";
import type { TopicDiscoveryDepth, TopicDiscoveryJobStep } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function reapStaleJobsBeforeRead() {
  const staleAfterMs = Number(process.env.TOPIC_DISCOVERY_JOB_STALE_AFTER_MS ?? process.env.JOB_WORKER_STALE_AFTER_MS ?? 120000);
  reapStaleTopicDiscoveryJobs(staleAfterMs);
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!getTopicDiscoverySession(id)) {
    return fail("选题发现会话不存在。", 404);
  }
  reapStaleJobsBeforeRead();
  return ok({ items: listTopicDiscoveryJobs(id) });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!getTopicDiscoverySession(id)) {
      return fail("选题发现会话不存在。", 404);
    }
    reapStaleJobsBeforeRead();

    const body = (await request.json().catch(() => ({}))) as { step?: TopicDiscoveryJobStep; depth?: TopicDiscoveryDepth };
    if (!body.step) {
      return fail("创建选题发现任务时必须给出 step。");
    }

    const result = enqueueTopicDiscoveryJob({
      sessionId: id,
      step: body.step,
      payload: body.step === "topic-discovery-cocreate" ? { depth: body.depth === "full" ? "full" : "fast" } : undefined,
    });

    // Run queued jobs immediately for v1; an atomic claim prevents duplicate execution on deduped clicks.
    void runTopicDiscoveryJobNow(result.job.id);

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
    return fail(error instanceof Error ? error.message : "创建选题发现任务失败。", 500);
  }
}
