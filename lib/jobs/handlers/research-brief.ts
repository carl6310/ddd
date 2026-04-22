import { generateResearchBriefStep } from "@/lib/services/steps/generate-research-brief";
import type { JobExecutionContext } from "../types";

export async function runResearchBriefJob(context: JobExecutionContext) {
  await generateResearchBriefStep({
    projectId: context.job.projectId,
    forceProceed: context.job.payload.forceProceed,
    context,
  });
}
