import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium, type Page } from "playwright";
import { sanitizeSourceText } from "@/lib/source-summary";
import type { ExtractedArticle } from "@/lib/url-extractor";
import { runAppleScript } from "@/lib/apple-script";
import { analyzeSourceMaterial } from "@/lib/source-card-analysis";

export async function extractWechatArticleWithBrowser(url: string): Promise<ExtractedArticle> {
  try {
    return await extractWechatArticleViaPlaywright(url);
  } catch {
    return await extractWechatArticleViaChromeTab(url);
  }
}

async function extractWechatArticleViaChromeTab(url: string): Promise<ExtractedArticle> {
  const escapedUrl = url.replace(/"/g, '\\"');

  const openScript = `
tell application "Google Chrome"
  activate
  if (count of windows) = 0 then
    make new window
  end if
  tell front window
    set newTab to make new tab at end of tabs with properties {URL:"${escapedUrl}"}
    set active tab index to (count of tabs)
  end tell
end tell
  `;
  await runAppleScript(openScript);

  const pollScript = `
tell application "Google Chrome"
  set tries to 0
  repeat while tries < 45
    set tries to tries + 1
    if (count of windows) = 0 then error "Chrome 没有可用窗口"
    tell front window
      set tabRef to active tab
      set currentURL to URL of tabRef
      set pageTitle to execute tabRef javascript "document.title"
      set pageText to execute tabRef javascript "(document.body.innerText || '').slice(0, 8000)"
      set contentText to execute tabRef javascript "(document.querySelector('#js_content')?.innerText || '')"
      set nickname to execute tabRef javascript "(document.querySelector('#js_name')?.innerText || '')"
      set publishTime to execute tabRef javascript "(document.querySelector('#publish_time')?.innerText || '')"
      if ((length of contentText) > 120) then
        return currentURL & linefeed & "===CUT===" & linefeed & pageTitle & linefeed & "===CUT===" & linefeed & nickname & linefeed & "===CUT===" & linefeed & publishTime & linefeed & "===CUT===" & linefeed & contentText
      end if
      if (pageText contains "环境异常") or (pageText contains "完成验证后即可继续访问") or (pageText contains "访问过于频繁") then
        error "Chrome 当前打开的是公众号验证/保护页"
      end if
    end tell
    delay 2
  end repeat
end tell
error "等待 90 秒后，Chrome 标签页里仍然没有露出可提取正文"
  `;

  const result = await runAppleScript(pollScript);
  const parts = result.split("\n===CUT===\n");
  const [, title, nickname, publishAt, contentText] = parts;

  if (!contentText || contentText.trim().length < 120) {
    throw new Error("Chrome 标签页没有返回足够正文。");
  }

  const cleanedText = sanitizeSourceText(contentText);
  const finalText = cleanedText.length >= 80 ? cleanedText : contentText.trim();
  const generated = await analyzeSourceMaterial(finalText, title || "微信公众号文章");
  return {
    title: (title || "微信公众号文章").trim(),
    url,
    note: nickname?.trim() ? `Chrome 标签页抓取自 ${nickname.trim()}` : "Chrome 标签页抓取自微信公众号",
    publishedAt: (publishAt || "").trim(),
    rawText: finalText,
    summary: generated.summary,
    evidence: generated.evidence,
    tags: generated.tags,
  };
}

async function extractWechatArticleViaPlaywright(url: string): Promise<ExtractedArticle> {
  const CHROME_EXECUTABLE = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const tempProfileDir = await mkdtemp(join(tmpdir(), "ddd-wechat-browser-"));
  const browser = await chromium.launchPersistentContext(tempProfileDir, {
    channel: "chrome",
    executablePath: CHROME_EXECUTABLE,
    headless: true,
    viewport: { width: 1440, height: 960 },
  });

  try {
    const page = browser.pages()[0] ?? (await browser.newPage());
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    const article = await waitForWechatArticle(page, 90000);
    if (!article.contentText || article.contentText.length < 120) {
      throw new Error("浏览器模式没有提取到足够正文。");
    }

    const cleanedText = sanitizeSourceText(article.contentText);
    const finalText = cleanedText.length >= 80 ? cleanedText : article.contentText.trim();
    const generated = await analyzeSourceMaterial(finalText, article.title);
    return {
      title: article.title,
      url,
      note: article.nickname ? `浏览器自动抓取自 ${article.nickname}` : "浏览器自动抓取自微信公众号",
      publishedAt: article.publishAt,
      rawText: finalText,
      summary: generated.summary,
      evidence: generated.evidence,
      tags: generated.tags,
    };
  } finally {
    await browser.close();
    await rm(tempProfileDir, { recursive: true, force: true });
  }
}

async function waitForWechatArticle(
  page: Page,
  timeoutMs: number,
): Promise<{ title: string; nickname: string; publishAt: string; contentText: string }> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const snapshot = await page.evaluate(() => {
      const text = document.body.innerText || "";
      const title =
        (document.querySelector("#activity-name")?.textContent || document.title || "微信公众号文章").trim();
      const nickname = (document.querySelector("#js_name")?.textContent || "").trim();
      const publishAt = (document.querySelector("#publish_time")?.textContent || "").trim();
      const contentText = (document.querySelector("#js_content")?.textContent || "").trim();
      const hasVerify = text.includes("环境异常") || text.includes("完成验证后即可继续访问") || text.includes("访问过于频繁");
      return { text, title, nickname, publishAt, contentText, hasVerify };
    });

    if (snapshot.contentText && snapshot.contentText.length >= 120 && !snapshot.hasVerify) {
      return {
        title: snapshot.title,
        nickname: snapshot.nickname,
        publishAt: snapshot.publishAt,
        contentText: snapshot.contentText,
      };
    }

    await page.waitForTimeout(2000);
  }

  throw new Error("浏览器模式在等待 90 秒后，公众号页面仍然没有露出可提取正文，可能仍处在验证/保护状态。");
}
