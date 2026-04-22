import { classifyEditorialFeedbackEvents } from "@/lib/editorial-feedback/classifier";
import { getArticleDraft, getProject, listEditorialFeedbackEvents, replaceEditorialFeedbackEvents } from "@/lib/repository";

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    throw new Error("用法：node scripts/analyze-edit-diffs.ts <projectId>");
  }

  const project = getProject(projectId);
  if (!project) {
    throw new Error("项目不存在。");
  }

  const draft = getArticleDraft(projectId);
  if (!draft) {
    throw new Error("项目还没有正文。");
  }

  const events = classifyEditorialFeedbackEvents({
    projectId,
    narrativeMarkdown: draft.narrativeMarkdown,
    editedMarkdown: draft.editedMarkdown,
  });
  replaceEditorialFeedbackEvents(projectId, events);

  console.log(
    JSON.stringify(
      {
        projectId,
        eventCount: events.length,
        eventTypes: events.reduce<Record<string, number>>((acc, item) => {
          acc[item.eventType] = (acc[item.eventType] ?? 0) + 1;
          return acc;
        }, {}),
        storedCount: listEditorialFeedbackEvents(projectId).length,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "analyze edit diffs failed");
  process.exitCode = 1;
});
