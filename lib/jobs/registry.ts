import { runDraftsJob } from "./handlers/drafts";
import { runOutlineJob } from "./handlers/outline";
import { runPublishPrepJob } from "./handlers/publish-prep";
import { runResearchBriefJob } from "./handlers/research-brief";
import { runReviewJob } from "./handlers/review";
import { runSectorModelJob } from "./handlers/sector-model";
import { runSourceCardExtractJob } from "./handlers/source-card-extract";
import { runSourceCardSummarizeJob } from "./handlers/source-card-summarize";
import type { JobExecutionContext, JobStep } from "./types";

export const jobRegistry: Record<JobStep, (context: JobExecutionContext) => Promise<void>> = {
  "research-brief": runResearchBriefJob,
  "sector-model": runSectorModelJob,
  outline: runOutlineJob,
  drafts: runDraftsJob,
  review: runReviewJob,
  "publish-prep": runPublishPrepJob,
  "source-card-extract": runSourceCardExtractJob,
  "source-card-summarize": runSourceCardSummarizeJob,
};
