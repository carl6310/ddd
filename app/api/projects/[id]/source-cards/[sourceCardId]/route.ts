import { fail, ok } from "@/lib/api";
import { deleteSourceCard, getProject } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string; sourceCardId: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, sourceCardId } = await context.params;
  const project = getProject(id);

  if (!project) {
    return fail("项目不存在。", 404);
  }

  deleteSourceCard(id, sourceCardId);
  return ok({ deleted: true });
}

