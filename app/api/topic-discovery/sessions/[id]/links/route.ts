import { fail, ok } from "@/lib/api";
import { getTopicDiscoverySession, listTopicDiscoveryLinks, replaceTopicDiscoveryLinks } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!getTopicDiscoverySession(id)) {
      return fail("选题发现会话不存在。", 404);
    }

    const body = (await request.json().catch(() => ({}))) as { urls?: string[] };
    const links = replaceTopicDiscoveryLinks(id, body.urls ?? []);
    return ok({ items: links });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "保存会话链接失败。", 500);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!getTopicDiscoverySession(id)) {
    return fail("选题发现会话不存在。", 404);
  }
  return ok({ items: listTopicDiscoveryLinks(id) });
}
