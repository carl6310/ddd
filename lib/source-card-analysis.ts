import { runStructuredTask } from "@/lib/llm";
import { generateSourceSummary, sanitizeSourceText, type GeneratedSourceSummary } from "@/lib/source-summary";

export async function analyzeSourceMaterial(
  rawText: string,
  fallbackTitle = "未命名资料",
  options: { audit?: { jobId?: string | null; projectId?: string | null } } = {},
): Promise<GeneratedSourceSummary> {
  const cleanedText = sanitizeSourceText(rawText);
  const finalText = cleanedText.length >= 80 ? cleanedText : rawText.trim();

  if (!finalText) {
    return generateSourceSummary(rawText, fallbackTitle);
  }

  try {
    return await runStructuredTask<GeneratedSourceSummary>(
      "source_card_summarizer",
      {
        topic: fallbackTitle,
        rawMaterials: finalText,
      },
      {
        audit: options.audit
          ? {
              ...options.audit,
              promptVersion: "source_card_summarizer:v1",
            }
          : undefined,
      },
    );
  } catch {
    return generateSourceSummary(finalText, fallbackTitle);
  }
}
