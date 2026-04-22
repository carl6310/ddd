import { fail, failWithData, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getArticleDraft, getOutlineDraft, getProject, getSectorModel, listSourceCards, saveArticleDraft } from "@/lib/repository";
import type { ArticleDraft } from "@/lib/types";
import { canGenerateDraft } from "@/lib/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as { forceProceed?: boolean };
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }
    const gate = canGenerateDraft(project, body.forceProceed);
    if (!gate.ok) {
      if (gate.gate.needsForce) {
        return failWithData(gate.gate.message, 409, { needsConfirmation: true, gate: gate.gate });
      }
      return fail(gate.gate.message, 400);
    }

    const sourceCards = listSourceCards(id);
    if (sourceCards.length === 0) {
      return fail("无资料卡时，系统禁止直接生成正式初稿。");
    }

    const sectorModel = getSectorModel(id);
    const outlineDraft = getOutlineDraft(id);
    if (!sectorModel || !outlineDraft) {
      return fail("请先完成板块建模和提纲生成。");
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "drafts",
      payload: {
        forceProceed: Boolean(body.forceProceed),
      },
    });

    return ok(
      {
        job: {
          id: result.job.id,
          step: result.job.step,
          status: result.job.status,
          deduped: result.deduped,
        },
      },
      { status: 202 },
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "正文任务入队失败。", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const project = getProject(id);
    if (!project) {
      return fail("项目不存在。", 404);
    }

    const currentDraft = getArticleDraft(id);
    if (!currentDraft) {
      return fail("当前还没有初稿。");
    }

    const body = (await request.json()) as Partial<ArticleDraft>;
    const nextDraft = saveArticleDraft(id, {
      analysisMarkdown: body.analysisMarkdown ?? currentDraft.analysisMarkdown,
      narrativeMarkdown: body.narrativeMarkdown ?? currentDraft.narrativeMarkdown,
      editedMarkdown: body.editedMarkdown ?? currentDraft.editedMarkdown,
    });

    return ok({ articleDraft: nextDraft });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "保存人工改写稿失败。", 500);
  }
}
