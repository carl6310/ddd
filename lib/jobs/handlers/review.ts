import { runReviewStep } from "@/lib/services/steps/run-review";
import type { JobExecutionContext } from "../types";

export async function runReviewJob(context: JobExecutionContext) {
  await runReviewStep({
    projectId: context.job.projectId,
    context,
  });
}
