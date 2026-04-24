import { fail, ok } from "@/lib/api";
import { getProjectBundle, saveOutlineDraft, saveResearchBrief, saveSectorModel, updateProject } from "@/lib/repository";
import type { HAMDFrame, HKRRFrame, OutlineDraft, ResearchBrief, SectorModel, ThinkCard, StyleCore, TopicMeta, VitalityCheck, WritingMovesFrame } from "@/lib/types";
import { isProjectFrameComplete } from "@/lib/workflow";
import { isStyleCoreComplete, isThinkCardComplete } from "@/lib/author-cards";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bundle = getProjectBundle(id);

  if (!bundle) {
    return fail("项目不存在。", 404);
  }

  return ok({ bundle });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bundle = getProjectBundle(id);

    if (!bundle) {
      return fail("项目不存在。", 404);
    }

    const body = (await request.json()) as {
      thesis?: string;
      coreQuestion?: string;
      notes?: string;
      topicMeta?: Partial<TopicMeta>;
      thinkCard?: Partial<ThinkCard>;
      styleCore?: Partial<StyleCore>;
      vitalityCheck?: VitalityCheck;
      researchBrief?: ResearchBrief;
      sectorModel?: SectorModel;
      outlineDraft?: OutlineDraft;
      hkrr?: Partial<HKRRFrame>;
      hamd?: Partial<HAMDFrame>;
      writingMoves?: Partial<WritingMovesFrame>;
    };

    const nextThinkCard = body.thinkCard
      ? {
          ...bundle.project.thinkCard,
          ...body.thinkCard,
          hkr: {
            ...bundle.project.thinkCard.hkr,
            ...(body.thinkCard.hkr ?? {}),
          },
          alternativeAngles: body.thinkCard.alternativeAngles ?? bundle.project.thinkCard.alternativeAngles,
        }
      : bundle.project.thinkCard;
    const nextStyleCore = body.styleCore
      ? {
          ...bundle.project.styleCore,
          ...body.styleCore,
        }
      : bundle.project.styleCore;

    const nextProject = updateProject(id, {
      thesis: body.thesis ?? bundle.project.thesis,
      coreQuestion: body.coreQuestion ?? bundle.project.coreQuestion,
      notes: body.notes ?? bundle.project.notes,
      topicMeta: body.topicMeta ? { ...bundle.project.topicMeta, ...body.topicMeta } : bundle.project.topicMeta,
      thinkCard: nextThinkCard,
      styleCore: nextStyleCore,
      vitalityCheck: body.vitalityCheck ?? bundle.project.vitalityCheck,
      hkrr: {
        ...bundle.project.hkrr,
        ...(body.hkrr ?? {}),
      },
      hamd: {
        ...bundle.project.hamd,
        ...(body.hamd ?? {}),
      },
      writingMoves: {
        ...bundle.project.writingMoves,
        ...(body.writingMoves ?? {}),
      },
      stage:
        bundle.project.stage === "选题定义" || bundle.project.stage === "ThinkCard / HKR" || bundle.project.stage === "StyleCore"
          ? isThinkCardComplete(nextThinkCard)
            ? isStyleCoreComplete(nextStyleCore)
              ? "StyleCore"
              : "ThinkCard / HKR"
            : "ThinkCard / HKR"
          : bundle.project.stage,
    });

    if (body.researchBrief) {
      saveResearchBrief(id, body.researchBrief);
    }

    if (body.sectorModel) {
      saveSectorModel(id, body.sectorModel);
    }

    if (body.outlineDraft) {
      saveOutlineDraft(id, body.outlineDraft);
    }

    return ok({ project: nextProject, bundle: getProjectBundle(id), frameComplete: isProjectFrameComplete(nextProject) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "保存选题判断 / 表达策略失败。", 500);
  }
}
