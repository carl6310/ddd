import type { ExtractedArticle } from "@/lib/url-extractor";
import { firstNonEmptyLine, truncate } from "@/lib/utils";
import type { SignalBriefSignal, SignalSourceDigest, SignalType } from "./types";

export interface SearchHit {
  title: string;
  url: string;
  snippet: string;
  source: string;
  publishedAt?: string;
}

export function buildInputOnlySignals(input: {
  sector: string;
  currentIntuition: string;
  rawMaterials: string;
}): SignalBriefSignal[] {
  const candidates = [
    {
      title: `${input.sector} 的当前直觉`,
      body: input.currentIntuition,
      source: "用户输入",
    },
    ...splitCandidateLines(input.rawMaterials).map((line, index) => ({
      title: `${input.sector} 输入材料 ${index + 1}`,
      body: line,
      source: "用户输入材料",
    })),
  ]
    .filter((item) => item.body.trim())
    .slice(0, 4);

  return candidates.map((item) => ({
    title: item.title,
    source: item.source,
    signalType: inferSignalType(`${item.title} ${item.body}`),
    summary: truncate(item.body.trim(), 140),
    whyItMatters: buildWhyItMatters(input.sector, inferSignalType(`${item.title} ${item.body}`), item.body.trim()),
  }));
}

export function normalizeSearchHit(signalSector: string, hit: SearchHit): SignalBriefSignal {
  const summary = truncate(cleanInlineText(hit.snippet) || cleanInlineText(hit.title), 160);
  const signalType = inferSignalType(`${hit.title} ${hit.snippet}`);

  return {
    title: cleanInlineText(hit.title) || "外部搜索结果",
    source: cleanInlineText(hit.source) || "搜索结果",
    url: hit.url,
    publishedAt: normalizePublishedAt(hit.publishedAt),
    signalType,
    summary,
    whyItMatters: buildWhyItMatters(signalSector, signalType, summary),
  };
}

export function normalizeExtractedSignal(signalSector: string, article: ExtractedArticle): SignalBriefSignal {
  const signalType = inferSignalType(`${article.title} ${article.summary} ${article.tags.join(" ")}`);

  return {
    title: article.title,
    source: article.note || "链接摘要",
    url: article.url,
    publishedAt: normalizePublishedAt(article.publishedAt),
    signalType,
    summary: truncate(article.summary || firstNonEmptyLine(article.rawText), 180),
    whyItMatters: buildWhyItMatters(signalSector, signalType, article.summary || article.evidence || article.rawText),
  };
}

export function normalizeSourceDigest(article: ExtractedArticle): SignalSourceDigest {
  return {
    url: article.url,
    title: article.title,
    summary: truncate(article.summary, 180),
    publishedAt: normalizePublishedAt(article.publishedAt) ?? "",
    note: article.note,
    ok: true,
  };
}

export function dedupeSignals(signals: SignalBriefSignal[], maxSignals = 8): SignalBriefSignal[] {
  const seen = new Set<string>();
  const unique: SignalBriefSignal[] = [];

  for (const signal of signals) {
    const key = `${signal.url || ""}::${signal.title}::${signal.signalType}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(signal);
    if (unique.length >= maxSignals) {
      break;
    }
  }

  return unique;
}

export function inferSignalType(text: string): SignalType {
  const normalized = text.toLowerCase();
  if (/(政策|新政|控规|规则|规划|配套|学校|地铁|轨交)/.test(normalized)) {
    return "policy";
  }
  if (/(成交|挂牌|议价|认购|去化|交易|总价|价格|二手房|新房)/.test(normalized)) {
    return "transaction";
  }
  if (/(供地|土地|供应|地块|断供|库存)/.test(normalized)) {
    return "supply";
  }
  if (/(建设|落地|兑现|片区|界面|通勤|产业|空间|骨架)/.test(normalized)) {
    return "planning";
  }
  if (/(口碑|吐槽|焦虑|热度|讨论|情绪|观点|体验)/.test(normalized)) {
    return "public_sentiment";
  }
  return "comparison";
}

export function normalizePublishedAt(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const dateMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
  if (dateMatch?.[0]) {
    return dateMatch[0];
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return undefined;
}

function buildWhyItMatters(sector: string, signalType: SignalType, body: string): string {
  const shortBody = truncate(cleanInlineText(body), 90);

  switch (signalType) {
    case "policy":
      return `这条信号更像 ${sector} 的规则/兑现约束，能帮助判断板块故事有没有落到现实。${shortBody ? `线索：${shortBody}` : ""}`.trim();
    case "transaction":
      return `这条信号更靠近交易桌，能帮助判断 ${sector} 的真实接受度和价格弹性。${shortBody ? `线索：${shortBody}` : ""}`.trim();
    case "supply":
      return `这条信号能补 ${sector} 的供应侧筹码，不容易把“热度”误写成“后续空间”。${shortBody ? `线索：${shortBody}` : ""}`.trim();
    case "planning":
      return `这条信号更适合拿来拆 ${sector} 的结构主命题，看空间、兑现和生活体感有没有对上。${shortBody ? `线索：${shortBody}` : ""}`.trim();
    case "public_sentiment":
      return `这条信号能补市场情绪或读者体感，适合判断 ${sector} 为什么容易被贴错标签。${shortBody ? `线索：${shortBody}` : ""}`.trim();
    case "comparison":
    default:
      return `这条信号适合拿来做对照，帮助判断 ${sector} 的位置感和边界。${shortBody ? `线索：${shortBody}` : ""}`.trim();
  }
}

function splitCandidateLines(rawMaterials: string) {
  return rawMaterials
    .split(/\n|。|；|;|!|！|\?|？/)
    .map((item) => cleanInlineText(item))
    .filter((item) => item.length >= 10);
}

function cleanInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
