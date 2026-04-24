import type { SignalBrief } from "./types";

export function buildSignalBriefGaps(input: {
  mode: "input_only" | "search_enabled" | "url_enriched";
  signalBrief: SignalBrief;
}): string[] {
  const gaps: string[] = [];
  const { signalBrief } = input;

  if (signalBrief.signals.length < 3) {
    gaps.push("当前信号还偏少，建议继续补规划、成交或供给侧材料。");
  }

  if (!signalBrief.signals.some((signal) => Boolean(signal.url))) {
    gaps.push("当前还缺少可回查原始链接，正式写作前最好补 1-2 条来源。");
  }

  if (!signalBrief.signals.some((signal) => Boolean(signal.publishedAt))) {
    gaps.push("大部分信号缺少明确时间，引用前要二次核对时点。");
  }

  if (input.mode === "input_only") {
    gaps.unshift("当前只使用用户输入，没有联网搜索或链接正文补充。");
  }

  if (input.mode === "search_enabled" && signalBrief.queries.length === 0) {
    gaps.unshift("搜索查询为空，后续需要重新生成查询词。");
  }

  return Array.from(new Set(gaps)).slice(0, 4);
}

export function buildFreshnessNote(input: {
  mode: "input_only" | "search_enabled" | "url_enriched";
  signalBrief: SignalBrief;
  searchError?: string | null;
}): string {
  const datedSignals = input.signalBrief.signals
    .map((signal) => signal.publishedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const latest = datedSignals[datedSignals.length - 1];

  if (input.searchError) {
    return `已尝试联网补信号，但搜索阶段失败：${input.searchError}`;
  }

  if (latest) {
    return `当前 Signal Brief 中可识别的最新信号日期是 ${latest}，正式写作前仍需核验是否有更新。`;
  }

  if (input.mode === "search_enabled") {
    return "已执行联网搜索，但当前保留下来的结果多数缺少明确日期，写作前需要再核对最新时点。";
  }

  if (input.mode === "url_enriched") {
    return "当前主要依赖输入里的链接正文，没有额外联网搜索补充。";
  }

  return "当前只根据用户输入整理信号，时间新鲜度尚未联网核验。";
}

export function formatSignalBriefForPrompt(signalBrief: SignalBrief): string {
  return [
    `Signal Brief 查询：${signalBrief.queries.length > 0 ? signalBrief.queries.join(" | ") : "未执行联网搜索"}`,
    `Signal Brief 新鲜度：${signalBrief.freshnessNote}`,
    signalBrief.signals.length > 0
      ? `Signal Brief 信号：\n${signalBrief.signals
          .map((signal, index) => {
            const meta = [signal.source, signal.publishedAt, signal.url].filter(Boolean).join(" | ");
            return `${index + 1}. [${signal.signalType}] ${signal.title}${meta ? ` (${meta})` : ""}\n   摘要：${signal.summary}\n   为什么重要：${signal.whyItMatters}`;
          })
          .join("\n")}`
      : "Signal Brief 信号：暂无",
    `Signal Brief 缺口：${signalBrief.gaps.join("；") || "暂无"}`,
  ].join("\n");
}
