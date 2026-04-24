import { extractUrls } from "@/lib/utils";

export function buildSignalQueries(input: {
  sector: string;
  currentIntuition: string;
  rawMaterials: string;
}): string[] {
  const combined = `${input.currentIntuition} ${input.rawMaterials}`.replace(/\s+/g, " ");
  const queries = [
    `${input.sector} 板块 规划 成交 供应`,
    `${input.sector} 新房 二手房 地铁 学校`,
  ];

  if (/(规划|控规|政策|配套|学校|地铁|轨交)/.test(combined)) {
    queries.push(`${input.sector} 规划 控规 政策 配套`);
  }
  if (/(成交|议价|二手|带看|新盘|去化|认购)/.test(combined)) {
    queries.push(`${input.sector} 成交 二手房 新盘 去化`);
  }
  if (/(供地|供应|地块|土地|断供)/.test(combined)) {
    queries.push(`${input.sector} 供地 土地 供应 地块`);
  }
  if (/(通勤|生活|烟火气|界面|社区)/.test(combined)) {
    queries.push(`${input.sector} 通勤 生活 配套 社区`);
  }

  if (extractUrls(input.rawMaterials).length > 0) {
    queries.push(`${input.sector} 板块 最新进展`);
  }

  return Array.from(new Set(queries.map((item) => item.trim()).filter(Boolean))).slice(0, 4);
}
