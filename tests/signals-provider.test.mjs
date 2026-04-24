import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const providerModule = await import("../lib/signals/provider.ts");

test("buildSignalBrief returns input-only signals without external fetches", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = async (...args) => {
    fetchCalls += 1;
    return originalFetch(...args);
  };

  try {
    const result = await providerModule.buildSignalBrief({
      sector: "唐镇",
      currentIntuition: "看上去热度还在，但兑现速度和体感未必匹配。",
      rawMaterials: "供地、通勤、学校和二手房成交都有分化。",
      mode: "input_only",
    });

    assert.equal(fetchCalls, 0);
    assert.equal(result.signalBrief.queries.length, 0);
    assert.ok(result.signalBrief.signals.length > 0);
    assert.equal(result.sourceDigests.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("buildSignalBrief searches and enriches matched urls in search mode", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.startsWith("https://html.duckduckgo.com/html/")) {
      return new Response(
        `
          <div class="result">
            <a class="result__a" href="https://example.com/tangzhen-news">唐镇规划兑现提速</a>
            <div class="result__snippet">轨交、学校与社区界面正在同步推进。</div>
          </div>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } },
      );
    }

    if (url === "https://example.com/tangzhen-news") {
      return new Response(
        `
          <html>
            <head>
              <title>唐镇规划兑现提速</title>
              <meta property="article:published_time" content="2026-04-20" />
            </head>
            <body>
              <article>
                唐镇轨交、学校、商业界面正在推进，市场开始重新讨论它的兑现速度和生活体感。
                这段正文足够长，可以让提取器正常摘要。唐镇轨交、学校、商业界面正在推进，市场开始重新讨论它的兑现速度和生活体感。
                同时，片区里的商业兑现、学校建设和次新房成交反馈，也在改变市场对这个板块的旧标签。
                如果只看热度，不看兑现链路和真实生活体感，就很容易把这类板块写成空泛概念稿。
              </article>
            </body>
          </html>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } },
      );
    }

    return originalFetch(input, init);
  };

  try {
    const result = await providerModule.buildSignalBrief({
      sector: "唐镇",
      currentIntuition: "感觉这里的兑现链路比市场想象更关键。",
      rawMaterials: "",
      mode: "search_enabled",
    });

    assert.ok(result.signalBrief.queries.length > 0);
    assert.ok(result.signalBrief.signals.some((signal) => signal.url === "https://example.com/tangzhen-news"));
    assert.ok(result.sourceDigests.some((item) => item.url === "https://example.com/tangzhen-news" && item.ok));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
