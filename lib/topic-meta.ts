import type { TopicMeta, TopicReaderPersona } from "@/lib/types";

export function getTopicReaderLens(topicMeta: Partial<TopicMeta> | null | undefined): TopicReaderPersona[] {
  return Array.isArray(topicMeta?.readerLens) ? topicMeta.readerLens : [];
}
