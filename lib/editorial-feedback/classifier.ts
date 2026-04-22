import { createId, nowIso } from "@/lib/utils";
import type { EditorialFeedbackEvent } from "@/lib/types";

function splitParagraphs(markdown: string) {
  return markdown
    .split(/\n\s*\n/)
    .map((paragraph) =>
      paragraph
        .replace(/^##\s+.*$/gm, "")
        .trim(),
    )
    .filter(Boolean)
}

function extractSectionHeading(markdown: string, paragraph: string) {
  const sections = markdown
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.replace(/^##\s+/, "").trim());
  return sections.find((heading) => markdown.includes(`## ${heading}`) && markdown.includes(paragraph.slice(0, Math.min(20, paragraph.length)))) ?? "未定位段落";
}

function classifyEventType(beforeText: string, afterText: string): EditorialFeedbackEvent["eventType"] | null {
  const before = beforeText.trim();
  const after = afterText.trim();

  if (!before && !after) {
    return null;
  }
  if (before && !after) {
    return "delete_fluff";
  }
  if (/\[SC:[a-zA-Z0-9_-]+\]/.test(after) && !/\[SC:[a-zA-Z0-9_-]+\]/.test(before)) {
    return "add_evidence";
  }
  if (["代价", "门槛", "风险", "不成立", "成本"].some((token) => after.includes(token) && !before.includes(token))) {
    return "add_cost";
  }
  if (["不是", "真正", "问题在于", "更准确地说"].some((token) => after.includes(token) && !before.includes(token))) {
    return "rewrite_opening";
  }
  if (["回到开头", "最后还是", "真正决定", "不是标签"].some((token) => after.includes(token) && !before.includes(token))) {
    return "tighten_ending";
  }
  return "reorder_paragraph";
}

export function classifyEditorialFeedbackEvents(input: {
  projectId: string;
  narrativeMarkdown: string;
  editedMarkdown: string;
  draftRevisionId?: string;
}): EditorialFeedbackEvent[] {
  const beforeParagraphs = splitParagraphs(input.narrativeMarkdown);
  const afterParagraphs = splitParagraphs(input.editedMarkdown);
  const maxLength = Math.max(beforeParagraphs.length, afterParagraphs.length);
  const draftRevisionId = input.draftRevisionId ?? createId("draftrev");

  const events: EditorialFeedbackEvent[] = [];
  for (let index = 0; index < maxLength; index += 1) {
    const beforeText = beforeParagraphs[index] ?? "";
    const afterText = afterParagraphs[index] ?? "";
    if (beforeText === afterText) {
      continue;
    }

    const eventType = classifyEventType(beforeText, afterText);
    if (!eventType) {
      continue;
    }

    events.push({
      id: createId("efe"),
      projectId: input.projectId,
      draftRevisionId,
      eventType,
      sectionHeading: extractSectionHeading(input.editedMarkdown || input.narrativeMarkdown, afterText || beforeText),
      beforeText,
      afterText,
      detail: {
        paragraphIndex: index,
        beforeLength: beforeText.length,
        afterLength: afterText.length,
      },
      createdAt: nowIso(),
    });
  }

  return events;
}
