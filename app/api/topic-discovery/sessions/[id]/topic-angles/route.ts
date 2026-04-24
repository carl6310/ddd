import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession, listTopicAngleCandidates } from "@/lib/repository";
import { buildTopicAngleResult } from "@/lib/topic-discovery";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = getTopicDiscoverySession(id);
  if (!session) {
    return fail("选题发现会话不存在。", 404);
  }
  return ok({ result: buildTopicAngleResult(session, listTopicAngleCandidates(id)) });
}
