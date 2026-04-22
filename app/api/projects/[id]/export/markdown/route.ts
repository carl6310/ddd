import { buildProjectMarkdown } from "@/lib/markdown";
import { fail } from "@/lib/api";
import { getProjectBundle } from "@/lib/repository";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const bundle = getProjectBundle(id);

  if (!bundle) {
    return fail("项目不存在。", 404);
  }

  const markdown = buildProjectMarkdown(bundle);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(bundle.project.topic)}.md"`,
    },
  });
}

