import { extractSourceCardStep } from "@/lib/services/steps/source-card-extract";
import type { JobExecutionContext } from "../types";

export async function runSourceCardExtractJob(context: JobExecutionContext) {
  await extractSourceCardStep({
    projectId: context.job.projectId,
    url: context.job.payload.url,
    context,
  });
}
