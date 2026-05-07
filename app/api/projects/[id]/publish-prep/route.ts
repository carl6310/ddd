import { fail, failWithData, ok } from "@/lib/api";
import { enqueueProjectJob } from "@/lib/jobs/queue";
import { getProjectBundle, getPublishPackage } from "@/lib/repository";
import type { ProjectBundle, WritingQualityGateResult } from "@/lib/types";
import { buildWritingQualityGate } from "@/lib/writing-quality/gate";
import { canPreparePublish } from "@/lib/workflow";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return ok({ publishPackage: getPublishPackage(id) });
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const bundle = getProjectBundle(id);
    if (!bundle) {
      return fail("项目不存在。", 404);
    }

    if (!bundle.articleDraft) {
      return fail("请先生成正文。");
    }

    if (!canPreparePublish(bundle.reviewReport, bundle.project.vitalityCheck)) {
      const qualityGate = buildWritingQualityGate(bundle);
      return failWithData(buildPublishBlockedMessage(bundle, qualityGate), 400, {
        qualityGate,
        mustFix: qualityGate.mustFix,
        shouldFix: qualityGate.shouldFix,
        vitalityCheck: {
          overallStatus: bundle.project.vitalityCheck.overallStatus,
          overallVerdict: bundle.project.vitalityCheck.overallVerdict,
          hardBlocked: bundle.project.vitalityCheck.hardBlocked,
        },
      });
    }

    const result = enqueueProjectJob({
      projectId: id,
      step: "publish-prep",
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
    return fail(error instanceof Error ? error.message : "发布包任务入队失败。", 500);
  }
}

function buildPublishBlockedMessage(bundle: ProjectBundle, qualityGate: WritingQualityGateResult) {
  if (!bundle.reviewReport) {
    return "请先运行质量检查，再生成发布包。";
  }

  const blockers = qualityGate.mustFix.map((item) => item.title).filter(Boolean);
  if (blockers.length > 0) {
    return `写作质量门槛未通过，暂时不能生成发布包。请先处理：${blockers.slice(0, 3).join("、")}。`;
  }

  const vitalityProblems = bundle.project.vitalityCheck.entries
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.title)
    .filter(Boolean);
  if (vitalityProblems.length > 0) {
    return `体检还有硬阻塞，暂时不能生成发布包。请先处理：${vitalityProblems.slice(0, 3).join("、")}。`;
  }

  return bundle.project.vitalityCheck.overallVerdict || "体检还没有过发布门槛，暂时不能生成发布包。";
}
