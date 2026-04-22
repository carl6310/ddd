import { fail, ok } from "@/lib/api";
import { createSourceCard, getProject, listSourceCards, updateProject } from "@/lib/repository";
import type { SourceCard } from "@/lib/types";
import { createId, nowIso, splitCommaValues } from "@/lib/utils";
import { validateSourceCardInput } from "@/lib/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return ok({ sourceCards: listSourceCards(id) });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }

    const body = (await request.json()) as Partial<SourceCard> & { rawText?: string; tagsText?: string };
    const rawText = body.rawText?.trim() || "";

    const card: SourceCard = {
      id: createId("sc"),
      projectId: id,
      title: body.title?.trim() || "未命名资料",
      url: body.url?.trim() || "",
      note: body.note?.trim() || "",
      publishedAt: body.publishedAt?.trim() || "",
      summary: body.summary?.trim() || "",
      evidence: body.evidence?.trim() || "",
      credibility: body.credibility || "中",
      tags: body.tags ?? splitCommaValues(body.tagsText || ""),
      zone: body.zone?.trim() || "",
      rawText,
      createdAt: nowIso(),
    };

    validateSourceCardInput(card);
    createSourceCard(card);
    updateProject(id, { stage: "资料卡整理" });

    return ok({ sourceCard: card }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "保存资料卡失败。", 500);
  }
}
