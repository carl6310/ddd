import { fail, ok } from "@/lib/api";
import { listSourceCards } from "@/lib/repository";
import { createProjectFromTopicDiscovery } from "@/lib/topic-discovery";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      candidateId?: string;
      selectedPreSourceCardIds?: string[];
    };

    if (!body.candidateId?.trim()) {
      return fail("创建正式项目时必须选择一个候选题。");
    }

    const project = createProjectFromTopicDiscovery({
      sessionId: id,
      candidateId: body.candidateId.trim(),
      selectedPreSourceCardIds: body.selectedPreSourceCardIds ?? [],
    });
    const importedSourceCardCount = listSourceCards(project.id).length;

    return ok({ project, importedSourceCardCount }, { status: 201 });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "从选题发现创建项目失败。", 500);
  }
}
