import { summarizeSourceCardStep } from "@/lib/services/steps/source-card-summarize";
import type { JobExecutionContext } from "../types";

export async function runSourceCardSummarizeJob(context: JobExecutionContext) {
  await summarizeSourceCardStep({
    projectId: context.job.projectId,
    rawText: context.job.payload.rawText,
    title: context.job.payload.title,
    context,
  });
}
