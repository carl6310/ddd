import { generateOutlineStep } from "@/lib/services/steps/generate-outline";
import type { JobExecutionContext } from "../types";

export async function runOutlineJob(context: JobExecutionContext) {
  await generateOutlineStep({
    projectId: context.job.projectId,
    forceProceed: context.job.payload.forceProceed,
    context,
  });
}
