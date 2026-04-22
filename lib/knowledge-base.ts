import type { ArticleType, AuthorLanguageAssetLibrary } from "@/lib/types";

export interface ArticleTypeProfile {
  articleType: ArticleType;
  positioning: string;
  outlineRules: string[];
  draftReminders: string[];
  specializedChecks: string[];
}

export const AUTHOR_LANGUAGE_ASSETS: AuthorLanguageAssetLibrary = {
  bannedPhrases: [
    "值得注意的是",
    "不难发现",
    "首先",
    "其次",
    "最后",
    "王炸板块",
    "闭眼买",
    "稀缺红利",
    "未来可期",
    "有望迎来价值重估",
    "配套还可以",
  ],
  preferredPatterns: [
    "不是 X，而是 Y",
    "真正决定它的，不是标签，而是结构",
    "如果一定要一句话概括",
    "更准确地说",
    "表面看是 A，底层其实是 B",
  ],
  namingPatterns: [
    "从认知错位切题",
    "从空间结构重新命名旧标签",
    "把片区差异变成判断抓手",
    "把门槛与代价写进标题意识",
    "优先用当前材料里的新矛盾命名",
  ],
  highSignalMoves: [
    "开头三段内立判断",
    "先纠偏再拆结构",
    "片区拆解必须有差异",
    "至少落一个具体生活场景",
    "中段主动打破一次平推节奏",
    "把板块放进更大的上海参照物里",
    "结尾必须回环，不要平着收",
    "明确写出门槛、等待或代价",
    "结尾回到购房者判断",
    "配图位要服务论证，不只是装饰",
  ],
  transitionPhrases: [
    "说真的",
    "坦率讲",
    "其实吧",
    "你想想看",
    "回到XX这块",
    "顺着上面这个逻辑",
    "先说一个很多人不知道的事",
    "这块需要注意一下",
    "说到这个",
    "但问题在于",
    "这就引出了另一个事",
    "再往下看你就会发现",
  ],
  emotionPhrases: [
    "说实话看到这个数据我是有点懵的",
    "这个结果真的挺意外的",
    "我当时看地图的时候愣了一下",
    "你如果实地走一遍就会发现",
    "这地方让人心情很复杂",
    "看完之后一时无语",
    "想想就觉得有点拧巴",
    "这个板块给我的感觉就是别扭",
  ],
  humblePhrases: [
    "说实话这个判断我自己也不确定",
    "我也不知道这么看对不对",
    "可能有些地方我观察的还不够",
    "这不是什么权威结论",
    "如果你觉得我说的不对，那可能真的不对",
    "这只是我个人的理解",
    "我自己也还在摸索这个问题",
  ],
};

export const ARTICLE_TYPE_PROFILES: Record<ArticleType, ArticleTypeProfile> = {
  断供型: {
    articleType: "断供型",
    positioning: "用供地和储备用地拆清楚到底是总量断供，还是结构性断供。",
    outlineRules: ["先抛断供结论", "回到控规和储备用地", "区分短中长期供给", "最后讲价格与预期会怎么被影响"],
    draftReminders: ["不要只报数字", "必须解释每块地意味着什么", "要区分核心区和边缘区的供给价值"],
    specializedChecks: ["是否区分总量断供和结构性断供", "是否讲清有效供给和无效供给", "是否落到价格/预期影响"],
  },
  价值重估型: {
    articleType: "价值重估型",
    positioning: "重写一个旧标签的定义，告诉读者为什么市场对这个板块定价过早或过浅。",
    outlineRules: ["先否定旧标签", "提出新的判断标准", "用通勤/资源/价格/规划验证", "最后给出新定位"],
    draftReminders: ["不能写成纯夸奖", "必须有新定义", "要把高估/低估的逻辑写尖锐"],
    specializedChecks: ["是否真正重写了旧标签", "是否把判断标准讲清楚", "是否避免沦为简单站队"],
  },
  规划拆解型: {
    articleType: "规划拆解型",
    positioning: "把地块、控规和未来供应讲成人能看懂的结构变化。",
    outlineRules: ["先给总量判断", "再拆片区和地块", "解释这些地对板块意味着什么", "最后讲未来节奏"],
    draftReminders: ["别只讲有多少地", "要写地块质量和兑现顺序", "要讲板块结构而不是规划口号"],
    specializedChecks: ["是否解释了地块意义", "是否区分短中长期变化", "是否避免变成公示摘要"],
  },
  误解纠偏型: {
    articleType: "误解纠偏型",
    positioning: "先讲大家为什么会看错，再把真实生活边界和板块内部差异拆出来。",
    outlineRules: ["先讲最典型误判", "解释误判来源", "搭空间骨架", "再做片区拆解", "最后回到适配人群"],
    draftReminders: ["误解必须具象", "不能只有观点没有地图感", "片区拆解要让人记住差异"],
    specializedChecks: ["是否讲清误判来源", "是否有真实生活边界", "是否把纠偏价值写出来"],
  },
  更新拆迁型: {
    articleType: "更新拆迁型",
    positioning: "不是只写‘要拆’，而是写旧结构为什么要动、动完会变成什么。",
    outlineRules: ["先讲旧结构和历史包袱", "再讲今天为什么必须动", "拆不同区域的更新逻辑", "最后讲改造的难点和代价"],
    draftReminders: ["不能只写拆迁刺激", "要讲更新后的城市形态", "要写兑现周期与代价"],
    specializedChecks: ["是否解释了为什么必须动", "是否说明拆完会变成什么", "是否讲清代价和难点"],
  },
};

export function getArticleTypeProfile(articleType: ArticleType | undefined): ArticleTypeProfile | null {
  if (!articleType) {
    return null;
  }

  return ARTICLE_TYPE_PROFILES[articleType] ?? null;
}

export function buildCoreConstraintPack(articleType: ArticleType | undefined) {
  const profile = getArticleTypeProfile(articleType);
  return {
    identity:
      "你不是中介，不是规划复读机，而是把上海板块的空间结构、供地节奏和购房者判断讲清楚的人。",
    languageAssets: AUTHOR_LANGUAGE_ASSETS,
    articleTypeProfile: profile,
  };
}
