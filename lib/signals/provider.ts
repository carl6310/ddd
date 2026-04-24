import { extractArticleFromUrl } from "@/lib/url-extractor";
import { extractUrls } from "@/lib/utils";
import { buildSignalQueries } from "./query-builder";
import {
  buildInputOnlySignals,
  dedupeSignals,
  normalizeExtractedSignal,
  normalizeSearchHit,
  normalizeSourceDigest,
  type SearchHit,
} from "./normalize";
import { buildFreshnessNote, buildSignalBriefGaps } from "./summarize";
import type { SignalBrief, SignalProviderMode, SignalSourceDigest } from "./types";

export async function buildSignalBrief(input: {
  sector: string;
  currentIntuition: string;
  rawMaterials: string;
  mode: SignalProviderMode;
}): Promise<{
  signalBrief: SignalBrief;
  sourceDigests: SignalSourceDigest[];
}> {
  const queries = input.mode === "search_enabled" ? buildSignalQueries(input) : [];
  const sourceDigests: SignalSourceDigest[] = [];
  const signals = buildInputOnlySignals(input);
  let searchError: string | null = null;

  if (input.mode === "url_enriched" || input.mode === "search_enabled") {
    const explicitUrls = extractUrls(input.rawMaterials).slice(0, 4);
    const explicitUrlSignals = await enrichUrls(input.sector, explicitUrls);
    signals.push(...explicitUrlSignals.signals);
    sourceDigests.push(...explicitUrlSignals.sourceDigests);
  }

  if (input.mode === "search_enabled" && queries.length > 0) {
    try {
      const searchHits = await searchSignals(queries);
      signals.push(...searchHits.map((hit) => normalizeSearchHit(input.sector, hit)));

      const searchUrls = searchHits
        .map((hit) => hit.url)
        .filter((value, index, values) => value && values.indexOf(value) === index)
        .slice(0, 2);
      const searchUrlSignals = await enrichUrls(input.sector, searchUrls);
      signals.push(...searchUrlSignals.signals);
      sourceDigests.push(...searchUrlSignals.sourceDigests);
    } catch (error) {
      searchError = error instanceof Error ? error.message : "搜索失败";
    }
  }

  const signalBrief: SignalBrief = {
    queries,
    signals: dedupeSignals(signals, 8),
    gaps: [],
    freshnessNote: "",
  };

  signalBrief.gaps = buildSignalBriefGaps({
    mode: input.mode,
    signalBrief,
  });
  signalBrief.freshnessNote = buildFreshnessNote({
    mode: input.mode,
    signalBrief,
    searchError,
  });

  return {
    signalBrief,
    sourceDigests: dedupeSourceDigests(sourceDigests),
  };
}

async function enrichUrls(sector: string, urls: string[]) {
  const signals = [];
  const sourceDigests: SignalSourceDigest[] = [];

  for (const url of urls) {
    try {
      const article = await extractArticleFromUrl(url);
      signals.push(normalizeExtractedSignal(sector, article));
      sourceDigests.push(normalizeSourceDigest(article));
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

  return { signals, sourceDigests };
}

async function searchSignals(queries: string[]): Promise<SearchHit[]> {
  const batches = await Promise.all(queries.slice(0, 3).map((query) => searchDuckDuckGo(query)));
  const flat = batches.flat();
  const unique = new Map<string, SearchHit>();

  for (const hit of flat) {
    if (!unique.has(hit.url)) {
      unique.set(hit.url, hit);
    }
  }

  return Array.from(unique.values()).slice(0, 5);
}

async function searchDuckDuckGo(query: string): Promise<SearchHit[]> {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`搜索接口返回 ${response.status}`);
  }

  const html = await response.text();
  const results = parseDuckDuckGoResults(html);
  if (results.length === 0) {
    throw new Error("搜索结果为空");
  }
  return results;
}

function parseDuckDuckGoResults(html: string): SearchHit[] {
  const results: SearchHit[] = [];
  const pattern =
    /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1200}?(?:<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>|<div[^>]+class="[^"]*result__snippet[^"]*"[^>]*>)([\s\S]*?)(?:<\/a>|<\/div>)/gi;

  for (const match of html.matchAll(pattern)) {
    const href = decodeDuckDuckGoUrl(decodeHtml(match[1] || ""));
    if (!href.startsWith("http")) {
      continue;
    }

    results.push({
      title: decodeHtml(stripTags(match[2] || "")),
      url: href,
      snippet: decodeHtml(stripTags(match[3] || "")),
      source: new URL(href).hostname.replace(/^www\./, ""),
    });

    if (results.length >= 5) {
      break;
    }
  }

  return results;
}

function dedupeSourceDigests(sourceDigests: SignalSourceDigest[]) {
  const seen = new Set<string>();
  return sourceDigests.filter((item) => {
    const key = item.url || item.title;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function decodeDuckDuckGoUrl(url: string) {
  if (!url.includes("uddg=")) {
    return url;
  }

  const encoded = url.match(/[?&]uddg=([^&]+)/)?.[1];
  return encoded ? decodeURIComponent(encoded) : url;
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
