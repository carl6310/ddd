import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession } from "@/lib/repository";
import { extractPreSourceCardsForSession } from "@/lib/topic-discovery";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!getTopicDiscoverySession(id)) {
      return fail("选题发现会话不存在。", 404);
    }
    const items = await extractPreSourceCardsForSession(id);
    return ok({ items });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "抽取预资料卡失败。", 500);
  }
}
