import { fail, ok } from "@/lib/api";
import { getTopicDiscoveryBundle, updateTopicDiscoverySession } from "@/lib/repository";
import type { SignalProviderMode } from "@/lib/signals/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bundle = getTopicDiscoveryBundle(id);
  if (!bundle) {
    return fail("选题发现会话不存在。", 404);
  }
  return ok({ bundle });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      sector?: string;
      intuition?: string;
      focusPoints?: string[];
      rawMaterials?: string;
      avoidAngles?: string;
      searchMode?: SignalProviderMode;
      status?: "draft" | "running" | "ready" | "failed";
    };

    const session = updateTopicDiscoverySession(id, body);
    return ok({ session, bundle: getTopicDiscoveryBundle(id) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "更新选题发现会话失败。", 500);
  }
}
