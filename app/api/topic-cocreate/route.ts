import { fail, ok } from "@/lib/api";
import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference, getLatestTopicCoCreationRun, saveTopicCoCreationRun } from "@/lib/repository";
import type { SignalBrief, TopicCoCreationDepth, TopicCoCreationInput, TopicCoCreationModelResult, TopicCoCreationTimings } from "@/lib/types";
import {
  buildMaterialInsights,
  buildTopicCoCreateFallback,
} from "@/lib/topic-cocreate";
import { postprocessTopicCoCreateResult } from "@/lib/topic-cocreate-postprocess";
import { buildSignalBrief } from "@/lib/signals/provider";
import type { SignalProviderMode } from "@/lib/signals/types";
import { extractUrls } from "@/lib/utils";
import type { TaskName } from "@/lib/prompt-engine";

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
      depth?: TopicCoCreationDepth;
    };

    if (!body.sector?.trim()) {
      return fail("选题共创时必须先给一个板块。");
    }

    const startedAt = Date.now();
    const sector = body.sector.trim();
    const currentIntuition = body.currentIntuition?.trim() || "";
    const rawMaterials = body.rawMaterials?.trim() || "";
    const avoidAngles = body.avoidAngles?.trim() || "";
    const depth = resolveTopicCoCreateDepth(body.depth);
    const signalMode = resolveTopicCoCreateSignalMode({
      depth,
      requestedSignalMode: body.signalMode,
      rawMaterials,
    });
    const taskName = getTopicCoCreateTaskName(depth);

    const signalStartedAt = Date.now();
    const signalBundle = await buildSignalBrief({
      sector,
      currentIntuition,
      rawMaterials,
      mode: signalMode,
    });
    const signalMs = Date.now() - signalStartedAt;
    const materialInsights = buildMaterialInsights({
      currentIntuition,
      rawMaterials,
      sourceDigests: signalBundle.sourceDigests,
    });

    const modelStartedAt = Date.now();
    const rawResult = await runStructuredTask<TopicCoCreationModelResult>(taskName, buildTopicCoCreateModelInput({
      sector,
      currentIntuition,
      rawMaterials,
      avoidAngles,
      signalBrief: signalBundle.signalBrief,
      styleReference: buildStyleReference(sector, null),
    }));
    const modelMs = Date.now() - modelStartedAt;

    const postprocessStartedAt = Date.now();
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
      recommendedCount: depth === "fast" ? 6 : 6,
      longlistCount: depth === "fast" ? 8 : 16,
    });

    result.materialInsights = result.materialInsights ?? {
      themes: materialInsights.themes,
      tensions: materialInsights.tensions,
      blindSpots: materialInsights.blindSpots,
    };
    const postprocessMs = Date.now() - postprocessStartedAt;
    const timings: TopicCoCreationTimings = {
      signalMs,
      modelMs,
      postprocessMs,
      totalMs: Date.now() - startedAt,
    };

    const responsePayload = {
      depth,
      signalMode,
      signalBrief: signalBundle.signalBrief,
      result,
      sourceDigests: signalBundle.sourceDigests,
      timings,
    };

    saveTopicCoCreationRun({
      input: {
        sector,
        currentIntuition,
        rawMaterials,
        avoidAngles,
        signalMode,
        depth,
      } satisfies TopicCoCreationInput,
      response: responsePayload,
    });

    return ok(responsePayload);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "选题共创失败。", 500);
  }
}

export function resolveTopicCoCreateDepth(depth: unknown): TopicCoCreationDepth {
  return depth === "full" ? "full" : "fast";
}

export function resolveTopicCoCreateSignalMode(input: {
  depth: TopicCoCreationDepth;
  requestedSignalMode?: SignalProviderMode;
  rawMaterials: string;
}): SignalProviderMode {
  if (input.depth === "fast") {
    return "input_only";
  }
  return input.requestedSignalMode ?? (extractUrls(input.rawMaterials).length > 0 ? "url_enriched" : "input_only");
}

export function getTopicCoCreateTaskName(depth: TopicCoCreationDepth): TaskName {
  return depth === "fast" ? "topic_cocreate_fast" : "topic_cocreate";
}

export function buildTopicCoCreateModelInput(input: {
  sector: string;
  currentIntuition: string;
  rawMaterials: string;
  avoidAngles: string;
  signalBrief: SignalBrief;
  styleReference: string;
}) {
  return {
    sector: input.sector,
    currentIntuition: input.currentIntuition,
    rawMaterials: input.rawMaterials,
    avoidAngles: input.avoidAngles,
    signalBrief: input.signalBrief,
    styleReference: input.styleReference,
  };
}
