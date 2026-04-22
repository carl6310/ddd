import { generateSectorModelStep } from "@/lib/services/steps/generate-sector-model";
import type { JobExecutionContext } from "../types";

export async function runSectorModelJob(context: JobExecutionContext) {
  await generateSectorModelStep({
    projectId: context.job.projectId,
    context,
  });
}
