import { firstNonEmptyLine } from "@/lib/utils";
import { sanitizeSourceText } from "@/lib/source-summary";
import { extractWechatArticleWithBrowser } from "@/lib/browser-extractor";
import { analyzeSourceMaterial } from "@/lib/source-card-analysis";

export interface ExtractedArticle {
  title: string;
  url: string;
  note: string;
  publishedAt: string;
  rawText: string;
  summary: string;
  evidence: string;
  tags: string[];
}

type ExtractArticleOptions = {
  audit?: { jobId?: string | null; projectId?: string | null };
};

export async function extractArticleFromUrl(url: string, options: ExtractArticleOptions = {}): Promise<ExtractedArticle> {
  const target = new URL(url);
  let response: Response;
  try {
    response = await fetch(target.toString(), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30000),
    });
  } catch (error) {
    const httpError = error instanceof Error ? error.message : "HTTP 抓取失败";
    return await recoverWechatWithBrowser(url, target.hostname, httpError);
  }

  if (!response.ok) {
    return await recoverWechatWithBrowser(url, target.hostname, `链接抓取失败：${response.status}`);
  }

  const html = await response.text();
  let extracted: ExtractedArticle;
  try {
    extracted = target.hostname.includes("mp.weixin.qq.com")
      ? await extractWechatArticle(url, html, options)
      : await extractGenericArticle(url, html, target.hostname, options);
  } catch (error) {
    const httpModeError = error instanceof Error ? error.message : "页面解析失败";
    return await recoverWechatWithBrowser(url, target.hostname, httpModeError);
  }

  if (!extracted.rawText.trim()) {
    return await recoverWechatWithBrowser(url, target.hostname, "没有从链接里提取到正文。");
  }

  return extracted;
}

async function extractWechatArticle(url: string, html: string, options: ExtractArticleOptions = {}): Promise<ExtractedArticle> {
  if (isWechatProtectedPage(html)) {
    throw new Error("这个微信公众号链接当前返回的是验证/保护页，系统暂时抓不到正文。请把文章正文复制到“资料原文”区域。");
  }

  const title =
    extractByPatterns(html, [
      /var\s+msg_title\s*=\s*"([^"]+)"/,
      /<h1[^>]*id=["']activity-name["'][^>]*>([\s\S]*?)<\/h1>/i,
      /<title>([\s\S]*?)<\/title>/i,
    ]) || "微信公众号文章";
  const nickname =
    extractByPatterns(html, [
      /var\s+nickname\s*=\s*htmlDecode\("([^"]+)"\)/,
      /<strong[^>]*class=["']profile_nickname["'][^>]*>([\s\S]*?)<\/strong>/i,
    ]) || "微信公众号";
  const publishAt =
    extractByPatterns(html, [
      /var\s+publish_time\s*=\s*"([^"]+)"/,
      /var\s+ct\s*=\s*"([^"]+)"/,
    ]) || "";

  const contentHtml =
    extractByPatterns(html, [
      /<div[^>]*id=["']js_content["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div[^>]*class=["'][^"']*rich_media_content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ]) || "";

  const rawText = normaliseHtmlToText(contentHtml || html).trim();
  const cleanedText = sanitizeSourceText(rawText);
  const finalText = cleanedText.length >= 80 ? cleanedText : rawText;
  if (finalText.length < 120) {
    throw new Error("系统没有从这个微信公众号链接里提取到足够正文，建议直接复制文章正文。");
  }

  const generated = await analyzeSourceMaterial(finalText, title, options);
  return {
    title: cleanText(title),
    url,
    note: `自动抓取自 ${nickname}`,
    publishedAt: normalisePublishTime(publishAt),
    rawText: finalText,
    summary: generated.summary,
    evidence: generated.evidence,
    tags: generated.tags,
  };
}

async function extractGenericArticle(url: string, html: string, hostname: string, options: ExtractArticleOptions = {}): Promise<ExtractedArticle> {
  const title =
    extractByPatterns(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["']/i,
      /<title>([\s\S]*?)<\/title>/i,
    ]) || hostname;
  const publishedAt =
    extractByPatterns(html, [
      /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']pubdate["'][^>]+content=["']([^"']+)["']/i,
      /<time[^>]*datetime=["']([^"']+)["']/i,
    ]) || "";

  const articleHtml =
    extractByPatterns(html, [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
      /<body[^>]*>([\s\S]*?)<\/body>/i,
    ]) || html;
  const rawText = normaliseHtmlToText(articleHtml).trim();
  const cleanedText = sanitizeSourceText(rawText);
  const finalText = cleanedText.length >= 80 ? cleanedText : rawText;

  if (finalText.length < 120) {
    throw new Error("系统没有从这个链接里提取到足够正文。");
  }

  const generated = await analyzeSourceMaterial(finalText, title, options);
  return {
    title: cleanText(title),
    url,
    note: `自动抓取自 ${hostname}`,
    publishedAt: normalisePublishTime(publishedAt),
    rawText: finalText,
    summary: generated.summary,
    evidence: generated.evidence,
    tags: generated.tags,
  };
}

function extractByPatterns(html: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return cleanText(match[1]);
    }
  }

  return "";
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normaliseHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n +/g, "\n")
    .trim();
}

function normalisePublishTime(value: string): string {
  if (!value) {
    return "";
  }
  if (/^\d{10}$/.test(value)) {
    const date = new Date(Number(value) * 1000);
    return date.toISOString().slice(0, 10);
  }
  return firstNonEmptyLine(value);
}

function isWechatProtectedPage(html: string): boolean {
  const text = html.toLowerCase();
  return (
    text.includes("verify7d1900.css") ||
    text.includes("微信公众平台") ||
    text.includes("环境异常") ||
    text.includes("访问过于频繁") ||
    text.includes("需要验证") ||
    text.includes("请在微信客户端打开")
  );
}

function composeWechatError(browserError: string, fallbackError: string, hostname: string): string {
  if (!hostname.includes("mp.weixin.qq.com")) {
    return fallbackError;
  }

  const browserPart = browserError ? `浏览器模式失败：${browserError}` : "";
  const fallbackPart = `普通抓取失败：${fallbackError}`;
  return [browserPart, fallbackPart, "如果这个公众号链接你在浏览器里能正常打开，但系统仍然抓不到，我下一步会继续调整浏览器自动提取策略。"]
    .filter(Boolean)
    .join("；");
}

async function recoverWechatWithBrowser(url: string, hostname: string, fallbackError: string): Promise<ExtractedArticle> {
  if (!hostname.includes("mp.weixin.qq.com")) {
    throw new Error(fallbackError);
  }

  try {
    return await extractWechatArticleWithBrowser(url);
  } catch (error) {
    const browserError = simplifyBrowserError(error instanceof Error ? error.message : "浏览器模式失败");
    throw new Error(composeWechatError(browserError, fallbackError, hostname));
  }
}

function simplifyBrowserError(message: string): string {
  if (message.includes("ProcessSingleton") || message.includes("profile directory") || message.includes("profile is already in use")) {
    return "浏览器抓取会话启动失败，系统检测到本机 Chrome 用户目录正被占用，已自动改用隔离会话重试。";
  }

  if (message.includes("环境异常") || message.includes("验证/保护页") || message.includes("访问过于频繁")) {
    return "浏览器打开后仍然落在公众号验证/保护页。";
  }

  if (message.includes("等待 90 秒后") || message.includes("没有露出可提取正文")) {
    return "浏览器打开了链接，但在等待期内没有拿到可提取正文。";
  }

  if (message.includes("没有提取到足够正文")) {
    return "浏览器抓取没有拿到足够正文。";
  }

  return "浏览器模式失败。";
}
