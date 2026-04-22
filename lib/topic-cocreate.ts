import { createId, truncate } from "@/lib/utils";
import type { ArticleType, HKRRFrame, TopicCoCreationCandidate } from "@/lib/types";
import type { CoCreationSourceDigest } from "@/lib/co-creation-materials";

const THEME_RULES: Array<{ label: string; matches: string[] }> = [
  { label: "价格 / 估值", matches: ["高估", "低估", "房价", "价格", "跌", "洼地"] },
  { label: "规划 / 兑现", matches: ["规划", "控规", "定位", "国际社区", "示范镇", "兑现"] },
  { label: "供地 / 供应", matches: ["供应", "断供", "地块", "新房", "土地", "出让"] },
  { label: "空间结构", matches: ["高架", "河", "桥", "切割", "骨架", "分界线", "界线"] },
  { label: "承接 / 外溢", matches: ["陆家嘴", "张江", "前滩", "滨江", "承接", "外溢", "核心"] },
  { label: "产业 / 就业", matches: ["产业", "办公", "园区", "就业", "数据中心", "商办"] },
  { label: "界面 / 居住体感", matches: ["界面", "配套", "老镇", "生活", "居住", "烟火气", "社区"] },
];

export interface MaterialInsights {
  themes: string[];
  tensions: string[];
  blindSpots: string[];
  evidenceBullets: string[];
}

export function buildMaterialInsights(input: {
  currentIntuition: string;
  rawMaterials: string;
  sourceDigests: CoCreationSourceDigest[];
}): MaterialInsights {
  const combined = [input.currentIntuition, input.rawMaterials, ...input.sourceDigests.map((item) => `${item.title} ${item.summary}`)]
    .join("\n")
    .replace(/\s+/g, " ");

  const themes = THEME_RULES.filter((rule) => rule.matches.some((token) => combined.includes(token)))
    .map((rule) => rule.label)
    .slice(0, 5);

  const evidenceBullets = input.sourceDigests
    .filter((digest) => digest.ok)
    .slice(0, 5)
    .map((digest) => `${digest.title}：${truncate(digest.summary, 100)}`);

  return {
    themes: themes.length > 0 ? themes : ["板块认知偏差", "空间结构", "购房决策"],
    tensions: inferTensions(combined, input.sourceDigests),
    blindSpots: inferBlindSpots(combined),
    evidenceBullets,
  };
}

export function buildMaterialInsightsSummary(insights: MaterialInsights): string {
  return [
    `材料主题：${insights.themes.join("、") || "暂无"}`,
    `材料冲突：${insights.tensions.join("；") || "暂无"}`,
    `材料空白点：${insights.blindSpots.join("；") || "暂无"}`,
    insights.evidenceBullets.length > 0 ? `材料证据：\n${insights.evidenceBullets.map((item) => `- ${item}`).join("\n")}` : "材料证据：暂无",
  ].join("\n");
}

export function buildTopicCoCreateFallback(
  sector: string,
  currentIntuition: string,
  rawMaterials: string,
  sourceDigests: CoCreationSourceDigest[] = [],
): TopicCoCreationCandidate[] {
  const insights = buildMaterialInsights({
    currentIntuition,
    rawMaterials,
    sourceDigests,
  });
  const tensions = insights.tensions;
  const sourceBasis = sourceDigests.filter((item) => item.ok).map((item) => item.title).slice(0, 3);

  return [
    createCandidate({
      articleType: "误解纠偏型",
      title: `为什么${sector}明明贴着核心区，却一直没长成大家以为的那个板块`,
      thesis: `${sector} 最值得纠偏的，不是位置认知，而是它明明靠近核心，却始终没长成核心外溢板块的结构原因。`,
      whyItWorks: `这个角度直接围绕“${tensions[0] || "核心区邻近性和真实板块价值之间的错位"}”展开，更像从材料里长出来。`,
      risk: "如果不把“为什么没长成”写透，容易只剩感受没有结构。",
      hook: `明明贴着核心区，为什么 ${sector} 还是没长成大家以为的样子？`,
      anchor: "地段上的靠近，不等于板块价值上的继承。",
      different: "不是回答值不值得买，而是拆它为什么一直没长成那个预期中的样子。",
      recommendation: "high",
      sourceBasis,
      tension: tensions[0] || "核心区邻近性和真实板块价值之间的错位",
    }),
    createCandidate({
      articleType: "价值重估型",
      title: `${sector}最大的尴尬，不是便宜，而是优势始终没能转化成完整板块价值`,
      thesis: `${sector} 真正尴尬的，不是便宜或贵，而是它的局部优势始终没能转化成完整板块价值。`,
      whyItWorks: `这个问题意识来自“${tensions[1] || "高定位和慢兑现之间的落差"}”，不像旧的高估/低估母题。`,
      risk: "需要更多供地、配套和空间结构证据来支撑“没转化”这件事。",
      hook: `${sector} 最大的问题，不是贵，也不是便宜，而是优势没长成价值。`,
      anchor: `${sector} 最值钱的那一部分，未必真的带得动整个板块。`,
      different: "不是重讲高估，而是追问“优势为什么没转化”。",
      recommendation: "high",
      sourceBasis,
      tension: tensions[1] || "高定位和慢兑现之间的落差",
    }),
    createCandidate({
      articleType: "规划拆解型",
      title: `${sector}真正该被看见的，不是标签，而是那条决定板块上限的分界线`,
      thesis: `${sector} 现在最该被看见的，不是统一标签，而是内部那条决定板块上限的关键分界线。`,
      whyItWorks: "如果材料里有高架、河道、轨交、界面差异，这个切口会更具体，也更像新题。",
      risk: "如果分界线讲得不够具体，会变成抽象结构分析。",
      hook: `${sector} 最被忽略的，不是亮点，而是那条把板块切开的线。`,
      anchor: "看懂那条分界线，才算真正看懂这个板块。",
      different: "不是笼统拆片区，而是先抓决定上限的那条线。",
      recommendation: "high",
      sourceBasis,
      tension: tensions[2] || "交通利好和内部空间切割之间的冲突",
    }),
    createCandidate({
      articleType: "断供型",
      title: `${sector}的下半场，不是还有没有故事，而是还有没有真正能兑现的筹码`,
      thesis: `${sector} 后续走势真正要看的，不是热度和故事，而是还有没有真正能兑现的筹码。`,
      whyItWorks: "这个角度把供给写成“筹码”，比直接问有没有新增供应更像材料驱动的新问题。",
      risk: "如果资料里缺少地块和供应信息，撑不住全文。",
      hook: `${sector} 真正要看的，不是它热不热，而是它还剩多少筹码。`,
      anchor: "不是所有看上去还在的东西，都还能继续支撑板块故事。",
      different: "不是数地块，而是判断哪部分还能真正支撑下半场。",
      recommendation: insights.themes.includes("供地 / 供应") ? "high" : "medium",
      sourceBasis,
      tension: tensions.find((item) => item.includes("供应")) || "总量和有效供给之间可能不是一回事",
    }),
  ];
}

export function hydrateTopicCandidates(
  rawCandidates: Array<
    Pick<TopicCoCreationCandidate, "title" | "articleType" | "thesis" | "hook" | "different" | "tension"> &
      Partial<Pick<TopicCoCreationCandidate, "whyItWorks" | "risk" | "anchor">> &
      Partial<Pick<TopicCoCreationCandidate, "id">>
  >,
  sourceDigests: CoCreationSourceDigest[],
): TopicCoCreationCandidate[] {
  const sourceBasis = sourceDigests.filter((item) => item.ok).map((item) => item.title).slice(0, 3);

  return rawCandidates.slice(0, 3).map((candidate, index) => {
    const anchor =
      candidate.anchor ||
      candidate.thesis.split("，").slice(-1)[0] ||
      candidate.tension ||
      "这条题抓住的是板块内部最容易被忽略的结构问题。";
    const whyItWorks =
      candidate.whyItWorks || `这条题直接围绕“${candidate.tension}”展开，更像从这次材料里长出来。`;
    const risk =
      candidate.risk || `如果后续资料不能把“${candidate.tension}”讲透，这条题会显得判断悬空。`;

    return {
      id: candidate.id || createId(`angle${index + 1}`),
      title: candidate.title,
      articleType: candidate.articleType,
      thesis: candidate.thesis,
      whyItWorks,
      risk,
      hook: candidate.hook,
      anchor,
      different: candidate.different,
      tension: candidate.tension,
      sourceBasis,
      recommendation: index === 0 ? "high" : index === 1 ? "medium" : "medium",
      hkrr: buildHKRR(candidate.articleType, candidate.tension, anchor, candidate.hook),
    };
  });
}

function createCandidate(input: {
  articleType: ArticleType;
  title: string;
  thesis: string;
  whyItWorks: string;
  risk: string;
  hook: string;
  anchor: string;
  different: string;
  recommendation: "high" | "medium" | "low";
  sourceBasis: string[];
  tension: string;
}): TopicCoCreationCandidate {
  return {
    id: createId("angle"),
    articleType: input.articleType,
    title: input.title,
    thesis: input.thesis,
    whyItWorks: input.whyItWorks,
    risk: input.risk,
    hook: input.hook,
    anchor: input.anchor,
    different: input.different,
    recommendation: input.recommendation,
    sourceBasis: input.sourceBasis,
    tension: input.tension,
    hkrr: buildHKRR(input.articleType, input.tension, input.anchor, input.hook),
  };
}

function buildHKRR(articleType: ArticleType, tension: string, anchor: string, hook: string): HKRRFrame {
  return {
    happy: `用“${hook}”制造认知反转。`,
    knowledge: `围绕“${tension}”交付结构、供地和片区判断。`,
    resonance: `让读者在“${anchor}”这件事上建立代入。`,
    rhythm: "开头先纠偏或立问题，中段拆结构，尾段回到购房者判断。",
    summary: `${articleType} + 新问题意识 + 结构性判断。`,
  };
}

function inferTensions(text: string, sourceDigests: CoCreationSourceDigest[]): string[] {
  const tensions: string[] = [];
  if (text.includes("国际社区") && (text.includes("兑现") || text.includes("缓慢"))) {
    tensions.push("高定位和慢兑现之间的落差");
  }
  if ((text.includes("陆家嘴") || text.includes("张江") || text.includes("前滩") || text.includes("核心")) && (text.includes("低估") || text.includes("高估") || text.includes("洼地") || text.includes("没长成"))) {
    tensions.push("核心区邻近性和真实板块价值之间的错位");
  }
  if ((text.includes("新房") || text.includes("地块") || text.includes("供应")) && (text.includes("断供") || text.includes("少"))) {
    tensions.push("总量看似还有地，但有效供给可能很紧");
  }
  if ((text.includes("地铁") || text.includes("通勤")) && (text.includes("高架") || text.includes("河") || text.includes("切割") || text.includes("分界"))) {
    tensions.push("交通利好和内部空间切割之间的冲突");
  }
  if (text.includes("动迁") || text.includes("历史")) {
    tensions.push("历史角色和今天板块定位之间存在错位");
  }
  if (tensions.length === 0) {
    const titles = sourceDigests.filter((item) => item.ok).map((item) => item.title);
    if (titles.length > 1) {
      tensions.push(`材料之间最大的矛盾是：${titles[0]} 和 ${titles[1]} 对同一板块给出了不同理解`);
    } else {
      tensions.push("板块标签和真实生活边界之间存在落差");
    }
  }
  return tensions.slice(0, 4);
}

function inferBlindSpots(text: string): string[] {
  const blindSpots: string[] = [];
  if (!text.includes("地块") && !text.includes("供应")) {
    blindSpots.push("目前材料里对供地/新房供应的支撑偏弱");
  }
  if (!text.includes("高架") && !text.includes("河") && !text.includes("轨交")) {
    blindSpots.push("空间切割线和真实通勤结构还没讲透");
  }
  if (!text.includes("适合") && !text.includes("预算") && !text.includes("买房")) {
    blindSpots.push("购房者适配判断的材料还不够");
  }
  return blindSpots;
}
