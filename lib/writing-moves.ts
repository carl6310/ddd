import type { ArticleType, WritingMovesFrame } from "@/lib/types";

interface WritingMoveDefaults {
  narrativeDrive: string;
  breakPoint: string;
  culturalLift: string;
  costSense: string;
}

const ARTICLE_TYPE_MOVE_DEFAULTS: Record<ArticleType, WritingMoveDefaults> = {
  断供型: {
    narrativeDrive: "开头先把断供结论刺出来，中段拆总量和结构差异，后段落到价格预期和等待代价。",
    breakPoint: "讲完供应数字后，突然切到购房者真正会卡住的那一下，再把数字拉回生活判断。",
    culturalLift: "把断供放进上海成熟板块稀缺住宅补货越来越难的长期趋势里讲。",
    costSense: "写清总价、等待周期、供应质量分化和未来追高风险。",
  },
  价值重估型: {
    narrativeDrive: "先推翻旧标签，再建立新定义，中段用通勤资源价格错位把判断压实，结尾回到谁能吃到这波重估。",
    breakPoint: "在快要滑向夸奖的时候主动刹车，补一句它为什么仍然会让很多人住不顺手。",
    culturalLift: "把板块放进上海城市梯度、承接关系和认知滞后的大图景里。",
    costSense: "写清认知修复需要时间，便宜背后往往对应界面、产品或流动性的代价。",
  },
  规划拆解型: {
    narrativeDrive: "先给总量判断，中段逐块拆地和兑现顺序，再告诉读者这些地会把板块改造成什么样。",
    breakPoint: "讲完地块信息后，不要继续报表，改用一个生活场景告诉读者这些地到底改变什么。",
    culturalLift: "把地块变化放进城市更新和居住承接的更大系统里解释。",
    costSense: "写清兑现顺序、落地不确定性和规划变成生活之间的时间差。",
  },
  误解纠偏型: {
    narrativeDrive: "开头先挑破误解，中段搭地图和切割线，再拆几个真正不同的世界，结尾回到适配人群。",
    breakPoint: "在讲结构时故意切进一个购房者很容易踩坑的瞬间，再拉回主线。",
    culturalLift: "把误解放到上海行政边界、市场标签和真实生活边界经常错位的背景下讲。",
    costSense: "写清看懂这个板块之后仍然要付出的门槛、时间和居住妥协。",
  },
  更新拆迁型: {
    narrativeDrive: "先讲旧结构为什么顶不住了，再拆不同区域为什么必须动，最后讲拆完会变成什么和兑现代价。",
    breakPoint: "不要一路写更新红利，必须在中段插入现实阻力和推进难点。",
    culturalLift: "把更新放到上海存量改造、产业更替和居住代际切换的语境里。",
    costSense: "写清拆迁周期、兑现难度、原住民利益和新购房者等待成本。",
  },
};

function fallbackText(value: string | undefined, backup: string) {
  return value?.trim() || backup;
}

export function buildDefaultWritingMoves(input: {
  topic: string;
  articleType: ArticleType;
  thesis?: string;
}): WritingMovesFrame {
  const { topic, articleType, thesis } = input;
  const defaults = ARTICLE_TYPE_MOVE_DEFAULTS[articleType];
  const shortThesis = fallbackText(thesis, `${topic} 真正决定价值的不是热度，而是结构和代价。`);

  return {
    freshObservation: `${topic} 这篇最具体的新观察，不是表面标签，而是内部几个片区和生活成本根本不是一回事。`,
    narrativeDrive: defaults.narrativeDrive,
    breakPoint: defaults.breakPoint,
    signatureLine: `${topic} 不是一个板块，而是几种不同的人生路径被硬塞进同一张地图里。`,
    personalPosition: `承认这是一种带体感的判断，但这种体感来自长期看 ${topic} 的规划、界面、供地和通勤。`,
    characterScene: `至少写一个具体生活场景，比如早高峰通勤、接娃、逛商业或第一次看盘时的落差，让 ${topic} 从地图变成生活。`,
    culturalLift: defaults.culturalLift,
    echoLine: `结尾回扣开头那句“${shortThesis}”，不要平着收。`,
    readerAddress: `直接点名最容易看错 ${topic} 的那类人，不要只写抽象读者。`,
    costSense: defaults.costSense,
  };
}

export function mergeWritingMoves(current: WritingMovesFrame, patch?: Partial<WritingMovesFrame>): WritingMovesFrame {
  if (!patch) {
    return current;
  }

  return {
    ...current,
    ...patch,
  };
}

export function isWritingMovesComplete(moves: WritingMovesFrame): boolean {
  return Object.values(moves).every((value) => value.trim().length > 0);
}

export function formatWritingMoves(moves: WritingMovesFrame): string {
  return [
    `- 新观察：${moves.freshObservation}`,
    `- 推进节奏：${moves.narrativeDrive}`,
    `- 故意打破：${moves.breakPoint}`,
    `- 断裂句：${moves.signatureLine}`,
    `- 私人姿态：${moves.personalPosition}`,
    `- 人物 / 场景：${moves.characterScene}`,
    `- 文化升维：${moves.culturalLift}`,
    `- 回环句：${moves.echoLine}`,
    `- 读者直呼：${moves.readerAddress}`,
    `- 现实代价：${moves.costSense}`,
  ].join("\n");
}
