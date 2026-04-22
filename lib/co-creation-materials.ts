import { extractUrls, truncate } from "@/lib/utils";
import { extractArticleFromUrl } from "@/lib/url-extractor";

export interface CoCreationSourceDigest {
  url: string;
  title: string;
  summary: string;
  publishedAt: string;
  note: string;
  ok: boolean;
  error?: string;
}

export interface CoCreationMaterialBundle {
  sourceDigests: CoCreationSourceDigest[];
  mergedContext: string;
}

export async function buildCoCreationMaterialBundle(rawMaterials: string): Promise<CoCreationMaterialBundle> {
  const urls = extractUrls(rawMaterials);
  const sourceDigests: CoCreationSourceDigest[] = [];

  for (const url of urls.slice(0, 5)) {
    try {
      const extracted = await extractArticleFromUrl(url);
      sourceDigests.push({
        url,
        title: extracted.title,
        summary: truncate(extracted.summary, 180),
        publishedAt: extracted.publishedAt,
        note: extracted.note,
        ok: true,
      });
    } catch (error) {
      sourceDigests.push({
        url,
        title: "抓取失败",
        summary: "",
        publishedAt: "",
        note: "",
        ok: false,
        error: error instanceof Error ? error.message : "链接解析失败",
      });
    }
  }

  const mergedContext = [
    rawMaterials.trim(),
    sourceDigests.length > 0
      ? [
          "",
          "自动提取的链接摘要：",
          ...sourceDigests.map((digest, index) =>
            digest.ok
              ? `${index + 1}. ${digest.title} | ${digest.publishedAt || "时间未知"} | ${digest.summary}`
              : `${index + 1}. ${digest.url} | 抓取失败：${digest.error}`,
          ),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    sourceDigests,
    mergedContext,
  };
}
