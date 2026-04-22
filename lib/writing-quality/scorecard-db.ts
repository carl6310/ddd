import { getDb } from "@/lib/db";
import type { WritingQualityLLMStats } from "./types";

export function getProjectLLMStats(projectId: string): WritingQualityLLMStats {
  const db = getDb();
  const rows = db
    .prepare(
      `
        SELECT task_type, COUNT(*) AS count
        FROM llm_calls
        WHERE project_id = ?
        GROUP BY task_type
      `,
    )
    .all(projectId) as Array<{ task_type: string; count: number }>;

  return {
    draftWriterCalls: rows.find((row) => row.task_type === "draft_writer")?.count ?? 0,
    draftPolisherCalls: rows.find((row) => row.task_type === "draft_polisher")?.count ?? 0,
  };
}
