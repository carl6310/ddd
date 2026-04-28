import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession } from "@/lib/repository";
import { generateTopicAnglesForSession } from "@/lib/topic-discovery";
import type { TopicDiscoveryDepth } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!getTopicDiscoverySession(id)) {
      return fail("选题发现会话不存在。", 404);
    }
    const body = (await request.json().catch(() => ({}))) as { depth?: TopicDiscoveryDepth };
    const result = await generateTopicAnglesForSession(id, { depth: body.depth === "full" ? "full" : "fast" });
    return ok({ result });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "生成候选选题失败。", 500);
  }
}
