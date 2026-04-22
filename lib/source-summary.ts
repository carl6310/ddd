import { firstNonEmptyLine, splitCommaValues, truncate } from "@/lib/utils";

const sentenceSplit = /(?<=[。！？!?\.])\s*/;
const domainKeywords = [
  "规划",
  "控规",
  "土地",
  "供应",
  "地铁",
  "商业",
  "学校",
  "医院",
  "拆迁",
  "旧改",
  "板块",
  "房价",
  "新房",
  "二手房",
  "产业",
  "通勤",
  "片区",
  "更新",
  "道路",
  "河流",
];
const boilerplatePatterns = [
  /点击.{0,12}(预约|查看|进入|报名|购买|咨询)/,
  /(马上|立即).{0,8}(预约|报名|查看|咨询)/,
  /(直播|直播间|视频号|预约直播)/,
  /(扫码|二维码|加微信|添加微信|私信|客服)/,
  /(点赞|转发|关注公众号|关注我们|欢迎收看)/,
  /(免责声明|仅供参考|版权归|文章来源|原标题)/,
  /(今晚|明晚)\s*\d{1,2}[:：点时]\d{0,2}/,
  /红色.?预约/,
];

export interface GeneratedSourceSummary {
  title: string;
  summary: string;
  evidence: string;
  tags: string[];
}

export function generateSourceSummary(rawText: string, fallbackTitle = "未命名资料"): GeneratedSourceSummary {
  const normalizedTitle = fallbackTitle.trim() && fallbackTitle !== "未命名资料" ? fallbackTitle.trim() : "";
  const sanitizedText = sanitizeSourceText(rawText);
  const baseText = sanitizedText || rawText.trim();
  const paragraphs = splitIntoParagraphs(baseText);
  const title = truncate(normalizedTitle || firstMeaningfulLine(baseText) || firstNonEmptyLine(rawText) || fallbackTitle, 60);
  const summarySource = paragraphs.slice(0, 2).join(" ");
  const evidenceSource = pickEvidenceParagraph(paragraphs);
  const tags = inferTags(baseText);

  return {
    title,
    summary: truncate(summarySource || truncate(baseText, 180), 180),
    evidence: truncate(evidenceSource || summarySource || truncate(baseText, 220), 220),
    tags,
  };
}

export function sanitizeSourceText(rawText: string): string {
  const paragraphs = splitIntoParagraphs(rawText);
  if (!paragraphs.length) {
    return rawText.trim();
  }

  const filtered = paragraphs.filter((paragraph, index, items) => {
    if (isBoilerplateParagraph(paragraph)) {
      return false;
    }

    // Drop exact duplicates and obvious echo paragraphs from noisy article shells.
    return items.indexOf(paragraph) === index;
  });

  return filtered.join("\n\n").trim();
}

function splitIntoParagraphs(value: string): string[] {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{1,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter((paragraph) => paragraph.length >= 8);
}

function firstMeaningfulLine(value: string): string {
  return splitIntoParagraphs(value).find((paragraph) => !isBoilerplateParagraph(paragraph)) ?? "";
}

function isBoilerplateParagraph(paragraph: string): boolean {
  if (paragraph.length < 12) {
    return true;
  }

  return boilerplatePatterns.some((pattern) => pattern.test(paragraph));
}

function pickEvidenceParagraph(paragraphs: string[]): string {
  const scored = paragraphs
    .map((paragraph) => ({
      paragraph,
      score: scoreParagraph(paragraph),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.paragraph ?? paragraphs[0] ?? "";
}

function scoreParagraph(paragraph: string): number {
  const keywordHits = domainKeywords.filter((keyword) => paragraph.includes(keyword)).length;
  const numberHits = (paragraph.match(/\d+/g) ?? []).length;
  const sentenceCount = paragraph.split(sentenceSplit).filter(Boolean).length;

  return keywordHits * 3 + numberHits * 2 + Math.min(sentenceCount, 4);
}

function inferTags(text: string): string[] {
  const found = domainKeywords.filter((keyword) => text.includes(keyword));
  return found.length ? found.slice(0, 5) : splitCommaValues("");
}
