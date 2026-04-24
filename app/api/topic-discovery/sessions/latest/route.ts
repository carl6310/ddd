import { fail, ok } from "@/lib/api";
import { getLatestTopicDiscoverySession, getTopicDiscoveryBundle } from "@/lib/repository";

export async function GET() {
  try {
    const session = getLatestTopicDiscoverySession();
    return ok({
      session,
      bundle: session ? getTopicDiscoveryBundle(session.id) : null,
    });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "读取最近一次选题发现会话失败。", 500);
  }
}
