import type { ArticleType, TopicAngleDraft, TopicAngleType } from "@/lib/types";
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
    .map((digest) => `${digest.title}：${summariseEvidence(digest.summary)}`);

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
): TopicAngleDraft[] {
  const insights = buildMaterialInsights({
    currentIntuition,
    rawMaterials,
    sourceDigests,
  });
  const sourceBasis = sourceDigests.filter((item) => item.ok).map((item) => item.title).slice(0, 3);
  const [primaryTension, secondaryTension, tertiaryTension] = [
    insights.tensions[0] || "板块标签和真实结构之间存在错位",
    insights.tensions[1] || "局部优势未必能自然传导成整个板块价值",
    insights.tensions[2] || "很多判断缺的不是热度，而是能落地的证据链",
  ];

  return [
    createAngleDraft({
      angleType: "thesis",
      articleType: "规划拆解型",
      title: `${sector}真正该怎么判断，不是看单点热度，而是先看它的结构主命题`,
      coreJudgement: `${sector} 真正值得写的，不是零散亮点，而是先把决定板块上限的主命题说透。`,
      counterIntuition: `很多人看 ${sector} 先看热度和标签，但真正有用的判断必须先回到结构主命题。`,
      readerValue: "帮助读者先抓住这篇文章最该回答的总判断，避免后面越看越散。",
      whyNow: `因为当前材料里最突出的问题就是“${primaryTension}”，需要一条总判断先把材料收口。`,
      neededEvidence: buildNeededEvidence(["板块主命题最直接的规划或成交支撑", "能证明判断成立的结构性证据"], insights),
      riskOfMisfire: "如果主命题不够具体，这条题会滑成大而空的板块总论。",
      recommendedNextStep: "先补一条能压住全文的主证据，再决定正文结构。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "counterintuitive",
      articleType: "误解纠偏型",
      title: `为什么${sector}明明看上去条件不差，却总是没长成大家以为的那个板块`,
      coreJudgement: `${sector} 最值得纠偏的，不是位置想象，而是它为什么一直没长成市场以为会长成的样子。`,
      counterIntuition: `贴着核心、规划不差，不等于这个板块就会自然长成核心外溢板块。`,
      readerValue: "把读者从现成标签里拽出来，重新判断这个板块到底是哪里出了问题。",
      whyNow: `因为“${primaryTension}”本身就是最强反常识入口。`,
      neededEvidence: buildNeededEvidence(["兑现慢在哪里", "结构上为什么承接失败"], insights),
      riskOfMisfire: "如果只写“没长成”但没有写清楚为什么，会变成情绪判断。",
      recommendedNextStep: "优先补规划兑现与空间边界的硬证据。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "spatial_segmentation",
      articleType: "规划拆解型",
      title: `${sector}真正该被看见的，不是统一标签，而是那条把价值切开的分界线`,
      coreJudgement: `${sector} 现在最该被写透的，不是统一板块标签，而是内部那条决定价值上限的分界线。`,
      counterIntuition: "同一个板块里的不同片区，可能根本不是同一套逻辑。",
      readerValue: "帮助读者看懂“买在同一板块”为什么仍然可能买进完全不同的世界。",
      whyNow: `因为材料里已经暴露出“${tertiaryTension}”，而空间切割往往就是证据最集中的落点。`,
      neededEvidence: buildNeededEvidence(["分界线地图", "片区功能或价格差异"], insights),
      riskOfMisfire: "如果没有具体切割线，这条题会变成泛泛拆片区。",
      recommendedNextStep: "把关键道路、河道、轨交和片区价差先落成一张图。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "buyer_segment",
      articleType: "价值重估型",
      title: `${sector}最容易被忽略的，不是值不值买，而是它到底更适合哪一类人`,
      coreJudgement: `${sector} 真正该回答的，不只是值不值得买，而是它到底更适合哪类预算、通勤和生活路径的人。`,
      counterIntuition: "不是所有贴着核心的板块，都适合所有想进核心的人。",
      readerValue: "把板块判断落回人群适配，而不是只停在空泛的高估低估。",
      whyNow: "因为读者真正拿走的是决策，而不是再记住一个口号式结论。",
      neededEvidence: buildNeededEvidence(["典型买家画像", "预算与生活半径约束"], insights),
      riskOfMisfire: "如果缺少生活体感和预算门槛，这条题会变成泛泛购房建议。",
      recommendedNextStep: "先把最适合与最不适合的两类买家写出来。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "transaction_micro",
      articleType: "价值重估型",
      title: `${sector}真正影响判断的，可能不是宏观故事，而是交易桌上的那几件小事`,
      coreJudgement: `${sector} 的真实价格和判断，很可能更受成交细节、议价空间和产品结构影响，而不是口号级板块叙事。`,
      counterIntuition: "决定板块感受的，不一定是大叙事，往往是交易微观层面的真实约束。",
      readerValue: "帮助读者把“板块值不值”落到更可执行的交易判断上。",
      whyNow: "当宏观故事已经被说烂时，交易微观细节往往更能拉开判断差距。",
      neededEvidence: buildNeededEvidence(["成交节奏", "典型产品议价或去化反馈"], insights),
      riskOfMisfire: "如果缺成交和产品信息，这条题会显得像想当然。",
      recommendedNextStep: "优先补一组成交与产品侧的微观样本。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "supply_structure",
      articleType: "断供型",
      title: `${sector}的下半场，不是还有没有故事，而是还有没有真正能兑现的供给筹码`,
      coreJudgement: `${sector} 后续走势真正要看的，不是热度和故事，而是还有没有真正能兑现的供给筹码。`,
      counterIntuition: "不是所有看起来还在的供地和产品，都还能继续支撑板块故事。",
      readerValue: "把“还有没有下半场”拆成供给结构问题，而不是笼统问热不热。",
      whyNow: `因为“${secondaryTension}”如果继续写不透，最后大概率要回到供给结构。`,
      neededEvidence: buildNeededEvidence(["地块与供应节奏", "有效供给与伪供给的区别"], insights),
      riskOfMisfire: "如果缺少供地与供应数据，这条题会悬空。",
      recommendedNextStep: "把已兑现、在路上和可能落空的供给分三层梳理。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "policy_transmission",
      articleType: "规划拆解型",
      title: `${sector}真正值得问的，不是有没有政策利好，而是政策到底传导到了哪一层`,
      coreJudgement: `${sector} 政策与规划真正要看的，不是有没有，而是它到底传导到了价格、界面和生活体感的哪一层。`,
      counterIntuition: "政策落在文件里，不代表它已经落进板块价值里。",
      readerValue: "帮助读者把“政策利好”从口号拆成真实传导链路。",
      whyNow: "很多板块稿最容易偷懒的地方，就是把政策存在直接写成价值存在。",
      neededEvidence: buildNeededEvidence(["政策原文", "兑现链路", "落地结果"], insights),
      riskOfMisfire: "如果只摘政策原文不看落地，这条题会重新掉回宣传稿。",
      recommendedNextStep: "先做政策原文、兑现节点和现实结果的三段式对照。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "timing_window",
      articleType: "价值重估型",
      title: `${sector}现在值不值得重看，关键不在标签，而在它处在什么时间窗口`,
      coreJudgement: `${sector} 当下能不能重估，关键要看它处在兑现、供给和预期的哪个时间窗口。`,
      counterIntuition: "同一个板块，时间窗口不对，判断就会完全反过来。",
      readerValue: "帮助读者把“现在值不值”拆成时点判断，而不是永恒判断。",
      whyNow: "现在讨论板块时，最容易忽略的就是时间窗口一换，结论也会换。",
      neededEvidence: buildNeededEvidence(["兑现时间点", "供应节奏时间线", "市场预期变化"], insights),
      riskOfMisfire: "如果没有时间线，这条题会只剩抽象的“再等等”。",
      recommendedNextStep: "先拉一条过去到未来 2-3 年的关键时间轴。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "comparative",
      articleType: "价值重估型",
      title: `${sector}真正该拿来比的，不是所有热门板块，而是那几个最容易把它比穿的参照物`,
      coreJudgement: `${sector} 要想看清楚，不能孤立写，必须找那几个最容易把它比穿的参照物。`,
      counterIntuition: "比较不是为了抬高自己，而是为了看清它真正输赢在哪里。",
      readerValue: "帮助读者通过参照物更快理解这个板块的边界和位置。",
      whyNow: "单写一个板块很容易自说自话，对比能直接暴露结构差异。",
      neededEvidence: buildNeededEvidence(["最强参照板块", "可比维度数据"], insights),
      riskOfMisfire: "如果参照物选错，会把文章带偏。",
      recommendedNextStep: "先确定两个最该横比的板块，再定义对比维度。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "risk_deconstruction",
      articleType: "误解纠偏型",
      title: `${sector}最该替读者拆开的，不是亮点，而是那些最容易被忽略的风险和代价`,
      coreJudgement: `${sector} 真正有价值的写法，不是继续讲亮点，而是替读者把最容易忽略的风险和代价拆开。`,
      counterIntuition: "很多人不是看不到风险，而是把风险写得太轻了。",
      readerValue: "帮助读者在真正做决策前，把最容易误伤自己的部分先看清楚。",
      whyNow: "当前市场里最稀缺的不是更乐观的叙事，而是更诚实的风险拆解。",
      neededEvidence: buildNeededEvidence(["真实代价", "失败场景", "判断不成立条件"], insights),
      riskOfMisfire: "如果代价感不够具体，会滑成常识性风险提示。",
      recommendedNextStep: "先列出最会误伤读者的三个风险，再逐个找证据。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "decision_service",
      articleType: "价值重估型",
      title: `${sector}最实用的写法，也许不是下结论，而是直接告诉读者这一步该怎么判断`,
      coreJudgement: `${sector} 这篇最实用的价值，可能不在于下一个总结论，而在于直接服务读者当前这一步判断。`,
      counterIntuition: "好文章不一定先给答案，很多时候先把判断框架搭出来更有用。",
      readerValue: "把文章直接做成判断服务，而不是只做观点输出。",
      whyNow: "因为读者更需要的是可执行判断，而不是又一个宏大总评。",
      neededEvidence: buildNeededEvidence(["决策分叉点", "判断框架"], insights),
      riskOfMisfire: "如果没有清晰框架，这条题会显得像咨询话术。",
      recommendedNextStep: "先明确读者当下最需要回答的三个判断题。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "narrative_upgrade",
      articleType: "误解纠偏型",
      title: `${sector}这篇如果还按常规板块稿去写，最可能被浪费掉的其实是叙事层级`,
      coreJudgement: `${sector} 这篇文章最值得升级的，不一定是材料数量，而是叙事层级：不能再按常规板块稿那样写。`,
      counterIntuition: "很多题不是没料，而是写法太平，把真正有价值的冲突写没了。",
      readerValue: "帮助作者和读者把这篇题从普通板块稿里拔出来，形成更强记忆点。",
      whyNow: "当材料本身已经有张力时，叙事升级决定了它会不会被写成旧题新写。",
      neededEvidence: buildNeededEvidence(["最强冲突", "最适合升级的叙事抓手"], insights),
      riskOfMisfire: "如果没有真实冲突支撑，叙事升级会变成空转包装。",
      recommendedNextStep: "先确定这篇最该升级的叙事抓手，再反推标题和开头。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "scene_character",
      articleType: "误解纠偏型",
      title: `${sector}真正能把这篇写活的，可能不是数据，而是那个最典型的人和场景`,
      coreJudgement: `${sector} 很多结构判断要真正成立，最后都得落回一个典型人物和场景里。`,
      counterIntuition: "不是所有板块判断都该从规划或房价写起，有时从人和生活场景进去更有穿透力。",
      readerValue: "让读者把抽象结构判断和真实生活体验接上电。",
      whyNow: "当结构分析已经很多时，人物/场景视角更容易把文章写出体感。",
      neededEvidence: buildNeededEvidence(["典型人物样本", "真实场景"], insights),
      riskOfMisfire: "如果场景太虚，会显得像编故事。",
      recommendedNextStep: "先补一个最典型的人物样本，再决定是否用人物视角开头。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "lifecycle",
      articleType: "规划拆解型",
      title: `${sector}现在最该问的，也许不是当下好不好，而是它到底处在板块生命周期的哪一段`,
      coreJudgement: `${sector} 要想把判断讲透，往往得先判断它现在处在生命周期的哪一段。`,
      counterIntuition: "同样的优缺点，放在不同生命周期里，结论会完全不同。",
      readerValue: "帮助读者把“现在如何”放进更长周期里理解，不至于只看眼前。",
      whyNow: "很多争议其实不是结论冲突，而是站在不同生命周期切片上说话。",
      neededEvidence: buildNeededEvidence(["过去角色", "当前阶段", "未来变量"], insights),
      riskOfMisfire: "如果生命周期判断太抽象，会变成套模型。",
      recommendedNextStep: "先把过去、现在、未来三个阶段的转折点列出来。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "mismatch",
      articleType: "价值重估型",
      title: `${sector}真正难受的，也许不是弱，而是那些看似成立的东西彼此根本没对上`,
      coreJudgement: `${sector} 真正的问题，可能不是单点弱，而是位置、产品、通勤、界面和预期之间根本没对上。`,
      counterIntuition: "板块最致命的，不一定是短板，而是看似都还行，但彼此不匹配。",
      readerValue: "帮助读者识别那种最容易被忽略的“结构错配”风险。",
      whyNow: `因为“${secondaryTension}”本质上往往就是错配。`,
      neededEvidence: buildNeededEvidence(["错配最明显的两三个环节", "读者最容易忽略的错位"], insights),
      riskOfMisfire: "如果错配点讲不具体，会变成一个抽象的大词。",
      recommendedNextStep: "把最关键的两组错配先具体化成可观察现象。",
      sourceBasis,
    }),
    createAngleDraft({
      angleType: "culture_psychology",
      articleType: "误解纠偏型",
      title: `${sector}最该被拆开的，不只是价格或规划，还有大家为什么总爱这样想它`,
      coreJudgement: `${sector} 很多市场判断的根子，不在事实层，而在大家为什么总爱用某种心理和文化想象去看它。`,
      counterIntuition: "一个板块被看错，常常不是因为资料太少，而是因为想象太强。",
      readerValue: "帮助读者把集体想象和真实判断拆开，避免被标签裹挟。",
      whyNow: "越是被反复传播的板块标签，越值得从心理和文化想象层面拆一次。",
      neededEvidence: buildNeededEvidence(["典型标签来源", "集体想象如何形成"], insights),
      riskOfMisfire: "如果没有真实标签样本，这条题会显得飘。",
      recommendedNextStep: "先收集最典型的传播标签和对应的现实反例。",
      sourceBasis,
    }),
  ];
}

function createAngleDraft(input: {
  angleType: TopicAngleType;
  articleType: ArticleType;
  title: string;
  coreJudgement: string;
  counterIntuition: string;
  readerValue: string;
  whyNow: string;
  neededEvidence: string[];
  riskOfMisfire: string;
  recommendedNextStep: string;
  sourceBasis: string[];
}): TopicAngleDraft {
  return {
    title: input.title,
    angleType: input.angleType,
    articleType: input.articleType,
    coreJudgement: input.coreJudgement,
    counterIntuition: input.counterIntuition,
    readerValue: input.readerValue,
    whyNow: input.whyNow,
    neededEvidence: input.neededEvidence,
    riskOfMisfire: input.riskOfMisfire,
    recommendedNextStep: input.recommendedNextStep,
    sourceBasis: input.sourceBasis,
  };
}

function buildNeededEvidence(seedEvidence: string[], insights: MaterialInsights) {
  const evidence = [...seedEvidence];

  if (insights.evidenceBullets[0]) {
    evidence.push(insights.evidenceBullets[0]);
  }
  if (insights.blindSpots[0]) {
    evidence.push(`补齐：${insights.blindSpots[0]}`);
  }

  return evidence.slice(0, 4);
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
  if (text.includes("动迁") || text.includes("历史") || text.includes("老底子")) {
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
  return tensions.slice(0, 5);
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
  if (!text.includes("风险") && !text.includes("代价")) {
    blindSpots.push("风险和代价感的材料还不够具体");
  }
  return blindSpots;
}

function summariseEvidence(summary: string) {
  return summary.length > 100 ? `${summary.slice(0, 100)}…` : summary;
}
