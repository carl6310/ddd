import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession, listPreSourceCards } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!getTopicDiscoverySession(id)) {
    return fail("选题发现会话不存在。", 404);
  }
  return ok({ items: listPreSourceCards(id) });
}
