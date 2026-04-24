import { fail, ok } from "@/lib/api";
import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getLatestTopicCoCreationRun, saveTopicCoCreationRun } from "@/lib/repository";
import type { TopicCoCreationInput, TopicCoCreationModelResult } from "@/lib/types";
import {
  buildMaterialInsights,
  buildTopicCoCreateFallback,
} from "@/lib/topic-cocreate";
import { postprocessTopicCoCreateResult } from "@/lib/topic-cocreate-postprocess";
import { buildSignalBrief } from "@/lib/signals/provider";
import { formatSignalBriefForPrompt } from "@/lib/signals/summarize";
import type { SignalProviderMode } from "@/lib/signals/types";
import { extractUrls } from "@/lib/utils";

export async function GET() {
  try {
    return ok({ latestRun: getLatestTopicCoCreationRun() });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "读取最近一次选题共创失败。", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sector?: string;
      currentIntuition?: string;
      rawMaterials?: string;
      avoidAngles?: string;
      signalMode?: SignalProviderMode;
    };

    if (!body.sector?.trim()) {
      return fail("选题共创时必须先给一个板块。");
    }

    const sector = body.sector.trim();
    const currentIntuition = body.currentIntuition?.trim() || "";
    const rawMaterials = body.rawMaterials?.trim() || "";
    const signalMode = body.signalMode ?? (extractUrls(rawMaterials).length > 0 ? "url_enriched" : "input_only");
    const signalBundle = await buildSignalBrief({
      sector,
      currentIntuition,
      rawMaterials,
      mode: signalMode,
    });
    const materialInsights = buildMaterialInsights({
      currentIntuition,
      rawMaterials,
      sourceDigests: signalBundle.sourceDigests,
    });

    const rawResult = await runStructuredTask<TopicCoCreationModelResult>("topic_cocreate", {
      sector,
      currentIntuition,
      rawMaterials: `${rawMaterials}\n\n${formatSignalBriefForPrompt(signalBundle.signalBrief)}`,
      avoidAngles: body.avoidAngles?.trim() || "",
      signalBrief: signalBundle.signalBrief,
      styleReference: buildStyleReference(sector, null),
    });

    const result = postprocessTopicCoCreateResult({
      sector,
      rawAngles: rawResult.candidateAngles ?? [],
      fallbackAngles: buildTopicCoCreateFallback(sector, currentIntuition, rawMaterials, signalBundle.sourceDigests),
      sourceBasis: signalBundle.sourceDigests.filter((item) => item.ok).map((item) => item.title).slice(0, 3),
      materialInsights: rawResult.materialInsights ?? {
        themes: materialInsights.themes,
        tensions: materialInsights.tensions,
        blindSpots: materialInsights.blindSpots,
      },
    });

    result.materialInsights = result.materialInsights ?? {
      themes: materialInsights.themes,
      tensions: materialInsights.tensions,
      blindSpots: materialInsights.blindSpots,
    };

    const responsePayload = {
      signalMode,
      signalBrief: signalBundle.signalBrief,
      result,
      sourceDigests: signalBundle.sourceDigests,
    };

    saveTopicCoCreationRun({
      input: {
        sector,
        currentIntuition,
        rawMaterials,
        avoidAngles: body.avoidAngles?.trim() || "",
        signalMode,
      } satisfies TopicCoCreationInput,
      response: responsePayload,
    });

    return ok(responsePayload);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "选题共创失败。", 500);
  }
}
