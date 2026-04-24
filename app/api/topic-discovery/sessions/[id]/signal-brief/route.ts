import { fail, ok } from "@/lib/api";
import { getSignalBrief, getTopicDiscoverySession } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!getTopicDiscoverySession(id)) {
    return fail("选题发现会话不存在。", 404);
  }
  return ok({ signalBrief: getSignalBrief(id) });
}
