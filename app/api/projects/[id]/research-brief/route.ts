import { fail, failWithData, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getProject } from "@/lib/repository";
import { canGenerateResearch } from "@/lib/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const body = (await _request.json().catch(() => ({}))) as { forceProceed?: boolean };
    const { id } = await context.params;
    const project = getProject(id);

    if (!project) {
      return fail("项目不存在。", 404);
    }
    const gate = canGenerateResearch(project, body.forceProceed);
    if (!gate.ok) {
      if (gate.gate.needsForce) {
        return failWithData(gate.gate.message, 409, { needsConfirmation: true, gate: gate.gate });
      }
      return fail(gate.gate.message, 400);
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "research-brief",
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
    return fail(error instanceof Error ? error.message : "研究清单任务入队失败。", 500);
  }
}
