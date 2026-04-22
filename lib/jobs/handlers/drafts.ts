import { generateDraftStep } from "@/lib/services/steps/generate-draft";
import type { JobExecutionContext } from "../types";

export async function runDraftsJob(context: JobExecutionContext) {
  await generateDraftStep({
    projectId: context.job.projectId,
    forceProceed: context.job.payload.forceProceed,
    context,
  });
}
