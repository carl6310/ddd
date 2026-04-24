import { fail, ok } from "@/lib/api";
import { createTopicDiscoverySession } from "@/lib/repository";
import type { SignalProviderMode } from "@/lib/signals/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      sector?: string;
      intuition?: string;
      focusPoints?: string[];
      rawMaterials?: string;
      avoidAngles?: string;
      searchMode?: SignalProviderMode;
    };

    if (!body.sector?.trim()) {
      return fail("创建选题发现会话时必须填写板块。");
    }

    const session = createTopicDiscoverySession({
      sector: body.sector,
      intuition: body.intuition,
      focusPoints: body.focusPoints,
      rawMaterials: body.rawMaterials,
      avoidAngles: body.avoidAngles,
      searchMode: body.searchMode ?? "input_only",
    });

    return ok({ session }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "创建选题发现会话失败。", 500);
  }
}
