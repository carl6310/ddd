import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession } from "@/lib/repository";
import { generateSignalBriefForSession } from "@/lib/topic-discovery";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!getTopicDiscoverySession(id)) {
      return fail("选题发现会话不存在。", 404);
    }
    const signalBrief = await generateSignalBriefForSession(id);
    return ok({ signalBrief });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "生成 Signal Brief 失败。", 500);
  }
}
