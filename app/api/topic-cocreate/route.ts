import { fail, ok } from "@/lib/api";
import { runStructuredTask } from "@/lib/llm";
import { buildStyleReference } from "@/lib/repository";
import type { TopicCoCreationResult } from "@/lib/types";
import { buildCoCreationMaterialBundle } from "@/lib/co-creation-materials";
import { buildMaterialInsights, buildMaterialInsightsSummary, hydrateTopicCandidates } from "@/lib/topic-cocreate";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sector?: string;
      currentIntuition?: string;
      rawMaterials?: string;
      avoidAngles?: string;
    };

    if (!body.sector?.trim()) {
      return fail("选题共创时必须先给一个板块。");
    }

    const sector = body.sector.trim();
    const currentIntuition = body.currentIntuition?.trim() || "";
    const rawMaterials = body.rawMaterials?.trim() || "";
    const materialBundle = await buildCoCreationMaterialBundle(rawMaterials);
    const materialInsights = buildMaterialInsights({
      currentIntuition,
      rawMaterials,
      sourceDigests: materialBundle.sourceDigests,
    });

    const result = await runStructuredTask<TopicCoCreationResult>("topic_cocreate", {
      sector,
      currentIntuition,
      rawMaterials: `${materialBundle.mergedContext}\n\n${buildMaterialInsightsSummary(materialInsights)}`,
      avoidAngles: body.avoidAngles?.trim() || "",
      styleReference: buildStyleReference(sector, null),
    });
    result.candidateAngles = hydrateTopicCandidates(result.candidateAngles, materialBundle.sourceDigests);
    result.materialInsights = result.materialInsights ?? {
      themes: materialInsights.themes,
      tensions: materialInsights.tensions,
      blindSpots: materialInsights.blindSpots,
    };

    return ok({ result, sourceDigests: materialBundle.sourceDigests });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "选题共创失败。", 500);
  }
}
