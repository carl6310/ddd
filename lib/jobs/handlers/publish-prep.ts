import { preparePublishStep } from "@/lib/services/steps/prepare-publish";
import type { JobExecutionContext } from "../types";

export async function runPublishPrepJob(context: JobExecutionContext) {
  await preparePublishStep({
    projectId: context.job.projectId,
    context,
  });
}
