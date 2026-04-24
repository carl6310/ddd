import type {
  ArticleType,
  ArticlePrototype,
  HAMDFrame,
  HKRFrame,
  HKRRFrame,
  ThinkCard,
  TopicMeta,
  TopicReaderPersona,
  ReviewSeverity,
  StyleCore,
  VitalityCheck,
  VitalityCheckEntry,
  WritingMovesFrame,
} from "@/lib/types";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";

const DEFAULT_AI_ROLE =
  "AI 只负责整理素材、对比角度、提醒盲点和生成初稿启发，不替代作者自己的核心角度、真实立场和最终判断。";

function defaultReaderPersona(): TopicReaderPersona {
  return "risk_aware_reader";
}

function defaultArticlePrototype(articleType: ArticleType): ArticlePrototype {
  switch (articleType) {
    case "规划拆解型":
      return "spatial_segmentation";
    case "价值重估型":
      return "total_judgement";
    case "误解纠偏型":
      return "risk_deconstruction";
    case "断供型":
      return "decision_service";
    case "更新拆迁型":
      return "scene_character";
  }
}

export function defaultTopicMeta(): TopicMeta {
  return {
    signalMode: null,
    signalBrief: null,
    topicScorecard: null,
    readerLens: [],
    selectedAngleId: null,
    selectedAngleTitle: null,
  };
}

function buildPrototypeMoveLibrary(prototype: ArticlePrototype) {
  switch (prototype) {
    case "spatial_segmentation":
      return {
        openingMoves: ["先纠偏统一标签", "再抛出切割线"],
        transitionMoves: ["从地图跳到生活边界", "从片区差异过渡到决策"],
        endingEchoMoves: ["回到那条分界线", "回到真正该怎么判断"],
      };
    case "buyer_split":
      return {
        openingMoves: ["先问这是谁的板块", "先拆适配人群"],
        transitionMoves: ["从预算切到生活路径", "从人群切到风险边界"],
        endingEchoMoves: ["回到谁适合谁不适合", "回到读者当前这一步决策"],
      };
    case "transaction_observation":
      return {
        openingMoves: ["先落交易桌细节", "先讲成交微观异动"],
        transitionMoves: ["从交易现象转到结构原因", "从产品差异转到价格弹性"],
        endingEchoMoves: ["回到交易桌", "回到价格和接受度"],
      };
    case "decision_service":
      return {
        openingMoves: ["先抛一个判断题", "先把读者最关心的分叉点摆出来"],
        transitionMoves: ["从事实过渡到选择", "从风险过渡到适配"],
        endingEchoMoves: ["回到该不该继续看", "回到下一步该怎么做"],
      };
    case "risk_deconstruction":
      return {
        openingMoves: ["先拆最大误解", "先指出容易踩坑的地方"],
        transitionMoves: ["从亮点切到代价", "从误判切到不成立条件"],
        endingEchoMoves: ["回到代价", "回到这题为什么不能偷懒"],
      };
    case "scene_character":
      return {
        openingMoves: ["先落人物", "先落生活场景"],
        transitionMoves: ["从场景转到结构", "从人物切到板块命题"],
        endingEchoMoves: ["回到这个人", "回到这个场景里的选择"],
      };
    case "total_judgement":
    default:
      return {
        openingMoves: ["先给反常识总判断", "先把旧标签拧过来"],
        transitionMoves: ["从总判断切到结构骨架", "从结构骨架切到读者决策"],
        endingEchoMoves: ["回到总判断", "回到为什么现在值得写"],
      };
  }
}

function withFallback(value: string | undefined, fallback: string) {
  const next = value?.trim();
  return next ? next : fallback;
}

export function defaultHKR(): HKRFrame {
  return {
    happy: "",
    knowledge: "",
    resonance: "",
    summary: "",
  };
}

export function defaultThinkCard(input: {
  topic: string;
  articleType: ArticleType;
  thesis?: string;
  notes?: string;
  hkrr?: HKRRFrame;
  hamd?: HAMDFrame;
  audience?: string;
}): ThinkCard {
  const { topic, articleType, thesis, notes, hkrr, hamd, audience } = input;
  return {
    materialDigest: withFallback(notes, `${topic} 这篇先从现有素材里找最硬的冲突，再决定值不值得写。`),
    topicVerdict: thesis?.trim() ? "strong" : "rework",
    verdictReason: withFallback(thesis, `${topic} 目前最值得写的是“市场标签和真实结构的错位”。`),
    coreJudgement: withFallback(thesis, `${topic} 真正决定价值的不是热度，而是结构。`),
    articlePrototype: defaultArticlePrototype(articleType),
    targetReaderPersona: defaultReaderPersona(),
    creativeAnchor: withFallback(hamd?.anchor, `${topic} 真正要记住的，不是标签，而是结构。`),
    counterIntuition: withFallback(hamd?.different, `${topic} 最容易被看错的，不是表面位置，而是内部错位。`),
    readerPayoff: withFallback(hkrr?.knowledge, `读者会更清楚 ${topic} 为什么会被误判，以及应该怎么判断它。`),
    decisionImplication: `看完 ${topic} 这篇，读者应该知道什么人适合继续看、什么人应该谨慎绕开。`,
    excludedTakeaways: ["不要把它简单归类为“靠核心区近就天然成立”", "不要把这篇写成泛板块介绍或销售话术"],
    hkr: {
      happy: withFallback(hkrr?.happy, `让读者先感到“原来 ${topic} 真正该看的不是表面那层”。`),
      knowledge: withFallback(hkrr?.knowledge, `把 ${topic} 的空间结构、切割线和适配人群讲清楚。`),
      resonance: withFallback(hkrr?.resonance, `击中 ${audience || "买房读者"} 对买错片区、买错预期的焦虑。`),
      summary: withFallback(hkrr?.summary, `${topic} 这篇先立判断，再用结构和体感压实。`),
    },
    rewriteSuggestion: withFallback(
      hamd?.different,
      `如果这一题不够尖，就回到 ${topic} 最硬的材料冲突，改成“大家为什么会看错它”。`,
    ),
    alternativeAngles: hamd?.mindMap?.slice(0, 3) ?? [],
    aiRole: DEFAULT_AI_ROLE,
  };
}

export function defaultStyleCore(input: {
  topic: string;
  articleType: ArticleType;
  articlePrototype?: ArticlePrototype;
  thesis?: string;
  hkrr?: HKRRFrame;
  hamd?: HAMDFrame;
  writingMoves?: WritingMovesFrame;
}): StyleCore {
  const moves =
    input.writingMoves ??
    buildDefaultWritingMoves({
      topic: input.topic,
      articleType: input.articleType,
      thesis: input.thesis,
    });
  const prototypeMoves = buildPrototypeMoveLibrary(input.articlePrototype ?? defaultArticlePrototype(input.articleType));

  return {
    rhythm: withFallback(moves.narrativeDrive, withFallback(input.hkrr?.rhythm, "开头立判断，中段拆结构，结尾回到代价。")),
    breakPattern: withFallback(moves.breakPoint, "在平推资料之前，用生活场景或反面代价主动打断。"),
    openingMoves: prototypeMoves.openingMoves,
    transitionMoves: prototypeMoves.transitionMoves,
    endingEchoMoves: prototypeMoves.endingEchoMoves,
    knowledgeDrop: withFallback(input.hkrr?.knowledge, `${input.topic} 的知识点要顺手掏出来，而不是写成资料堆。`),
    personalView: withFallback(moves.personalPosition, `我对 ${input.topic} 的判断来自长期观察，不来自销售想象。`),
    judgement: withFallback(input.thesis, `${input.topic} 真正决定价值的不是热度，而是结构。`),
    counterView: withFallback(input.hamd?.different, `要把 ${input.topic} 的对立面也讲出来，不能只站一边。`),
    allowedMoves: ["先纠偏", "再搭骨架", "再拆片区", "落人物场景", "补代价", "结尾回环"],
    forbiddenMoves: ["先讲配套再找判断", "平铺资料卡", "只写单边好处", "直接喊口号"],
    allowedMetaphors: ["几种生活路径", "被切开的拼图", "错位承接", "纸面核心"],
    emotionCurve: withFallback(input.hkrr?.resonance, "开头拉住，中段压实，结尾收出代价和余味。"),
    personalStake: withFallback(moves.personalPosition, `作者必须亲自下场说清楚 ${input.topic} 为什么值得这样判断。`),
    characterPortrait: withFallback(moves.characterScene, `至少写一个真实人物或生活场景，让 ${input.topic} 从地图变成生活。`),
    culturalLift: withFallback(moves.culturalLift, `把 ${input.topic} 放进更大的上海结构里再看。`),
    sentenceBreak: withFallback(moves.signatureLine, `${input.topic} 不是一个板块，而是几种生活路径挤在一起。`),
    echo: withFallback(moves.echoLine, `结尾回扣 ${input.topic} 开头那一下判断。`),
    humbleSetup: withFallback(moves.personalPosition, "先承认判断带体感，再把证据和结构铺出来。"),
    toneCeiling: "像长期观察者，不像老师批卷，也不像中介卖房。",
    concretenessRequirement: "每一段都要有具体判断、具体场景或具体代价，不能只写抽象词。",
    costSense: withFallback(moves.costSense, `把 ${input.topic} 的门槛、等待和代价写透。`),
    forbiddenFabrications: ["禁止把推测写成亲历", "没有证据支撑时不要写具体现场细节", "不要编造来源里不存在的时间点和人物动作"],
    genericLanguageBlackList: ["赋能", "多维度", "全方位", "系统性提升", "打造闭环", "高质量发展"],
    unsupportedSceneDetector: "如果人物、场景、通勤或生活细节没有真实材料支撑，请标成待作者补，不要直接写成亲历。",
  };
}

export function defaultVitalityCheck(): VitalityCheck {
  return {
    overallStatus: "warn",
    overallVerdict: "生命力检查尚未运行。",
    semiBlocked: true,
    hardBlocked: false,
    entries: [
      createVitalityEntry("cannot-fake", "不能假", "warn", "还没有检查正文里的真实姿态和经验落点。"),
      createVitalityEntry("cannot-invent", "不能编", "warn", "还没有检查事实与资料引用是否匹配。"),
      createVitalityEntry("true-position", "真实立场", "warn", "还没有检查作者是否真正下场表达。"),
      createVitalityEntry("character-warmth", "人物温度", "warn", "还没有检查人物或生活场景是否出现。"),
      createVitalityEntry("momentum", "推进感", "warn", "还没有检查节奏推进和中段掉速问题。"),
      createVitalityEntry("echo", "回环", "warn", "还没有检查结尾是否回扣前文。"),
      createVitalityEntry("cost-sense", "代价感", "warn", "还没有检查现实代价是否写透。"),
      createVitalityEntry("cultural-lift", "文化升维", "warn", "还没有检查更大的城市参照物。"),
      createVitalityEntry("not-old-copy", "不是旧稿复写", "warn", "还没有检查新观察是否足够具体。"),
    ],
  };
}

export function createVitalityEntry(
  key: string,
  title: string,
  status: ReviewSeverity,
  detail: string,
): VitalityCheckEntry {
  return { key, title, status, detail };
}

export function deriveLegacyFrames(input: {
  topic: string;
  articleType: ArticleType;
  thesis: string;
  thinkCard: ThinkCard;
  styleCore: StyleCore;
  currentHAMD?: HAMDFrame;
  currentWritingMoves?: WritingMovesFrame;
}): { hkrr: HKRRFrame; hamd: HAMDFrame; writingMoves: WritingMovesFrame } {
  const currentMoves = input.currentWritingMoves;
  const writingMoves: WritingMovesFrame = {
    freshObservation: input.thinkCard.verdictReason,
    narrativeDrive: input.styleCore.rhythm,
    breakPoint: input.styleCore.breakPattern,
    signatureLine: input.styleCore.sentenceBreak,
    personalPosition: input.styleCore.personalView,
    characterScene: input.styleCore.characterPortrait,
    culturalLift: input.styleCore.culturalLift,
    echoLine: input.styleCore.echo,
    readerAddress: currentMoves?.readerAddress || "直接点出最容易看错这篇的人，不要写成抽象读者。",
    costSense: input.styleCore.costSense,
  };

  return {
    hkrr: {
      happy: input.thinkCard.hkr.happy,
      knowledge: input.thinkCard.hkr.knowledge,
      resonance: input.thinkCard.hkr.resonance,
      rhythm: input.styleCore.rhythm,
      summary: input.thinkCard.hkr.summary,
    },
    hamd: {
      hook: input.styleCore.sentenceBreak || input.currentHAMD?.hook || input.thesis,
      anchor: input.styleCore.echo || input.currentHAMD?.anchor || input.styleCore.characterPortrait,
      different: input.styleCore.counterView || input.currentHAMD?.different || input.thinkCard.verdictReason,
      mindMap: input.thinkCard.alternativeAngles.length
        ? input.thinkCard.alternativeAngles
        : input.currentHAMD?.mindMap ?? [],
    },
    writingMoves,
  };
}

export function buildCardsFromLegacy(input: {
  topic: string;
  articleType: ArticleType;
  audience?: string;
  thesis: string;
  notes?: string;
  hkrr?: HKRRFrame;
  hamd?: HAMDFrame;
  writingMoves?: WritingMovesFrame;
  thinkCard?: Partial<ThinkCard>;
  styleCore?: Partial<StyleCore>;
  vitalityCheck?: VitalityCheck;
}): { thinkCard: ThinkCard; styleCore: StyleCore; vitalityCheck: VitalityCheck } {
  const thinkBase = defaultThinkCard(input);
  const styleBase = defaultStyleCore({
    ...input,
    articlePrototype: input.thinkCard?.articlePrototype,
  });
  const vitalityBase = defaultVitalityCheck();

  return {
    thinkCard: {
      ...thinkBase,
      ...(input.thinkCard ?? {}),
      hkr: {
        ...thinkBase.hkr,
        ...(input.thinkCard?.hkr ?? {}),
      },
      alternativeAngles: input.thinkCard?.alternativeAngles ?? thinkBase.alternativeAngles,
      excludedTakeaways: input.thinkCard?.excludedTakeaways ?? thinkBase.excludedTakeaways,
    },
    styleCore: {
      ...styleBase,
      ...(input.styleCore ?? {}),
      allowedMoves: input.styleCore?.allowedMoves ?? styleBase.allowedMoves,
      forbiddenMoves: input.styleCore?.forbiddenMoves ?? styleBase.forbiddenMoves,
      allowedMetaphors: input.styleCore?.allowedMetaphors ?? styleBase.allowedMetaphors,
    },
    vitalityCheck: input.vitalityCheck
      ? {
          ...vitalityBase,
          ...input.vitalityCheck,
          entries: input.vitalityCheck.entries?.length ? input.vitalityCheck.entries : vitalityBase.entries,
        }
      : vitalityBase,
  };
}

export function isThinkCardComplete(card: ThinkCard): boolean {
  return Boolean(
    card.materialDigest.trim() &&
      card.topicVerdict &&
      card.verdictReason.trim() &&
      card.coreJudgement.trim() &&
      card.articlePrototype &&
      card.targetReaderPersona &&
      card.creativeAnchor.trim() &&
      card.counterIntuition.trim() &&
      card.readerPayoff.trim() &&
      card.decisionImplication.trim() &&
      card.excludedTakeaways.length > 0 &&
      card.hkr.happy.trim() &&
      card.hkr.knowledge.trim() &&
      card.hkr.resonance.trim() &&
      card.rewriteSuggestion.trim() &&
      card.aiRole.trim(),
  );
}

export function isStyleCoreComplete(core: StyleCore): boolean {
  return (
    core.rhythm.trim().length > 0 &&
    core.breakPattern.trim().length > 0 &&
    core.openingMoves.length > 0 &&
    core.transitionMoves.length > 0 &&
    core.endingEchoMoves.length > 0 &&
    core.knowledgeDrop.trim().length > 0 &&
    core.personalView.trim().length > 0 &&
    core.judgement.trim().length > 0 &&
    core.counterView.trim().length > 0 &&
    core.allowedMoves.length > 0 &&
    core.forbiddenMoves.length > 0 &&
    core.allowedMetaphors.length > 0 &&
    core.emotionCurve.trim().length > 0 &&
    core.personalStake.trim().length > 0 &&
    core.characterPortrait.trim().length > 0 &&
    core.culturalLift.trim().length > 0 &&
    core.sentenceBreak.trim().length > 0 &&
    core.echo.trim().length > 0 &&
    core.humbleSetup.trim().length > 0 &&
    core.toneCeiling.trim().length > 0 &&
    core.concretenessRequirement.trim().length > 0 &&
    core.costSense.trim().length > 0 &&
    core.forbiddenFabrications.length > 0 &&
    core.genericLanguageBlackList.length > 0 &&
    core.unsupportedSceneDetector.trim().length > 0
  );
}

export function countStyleCoreMissing(core: StyleCore) {
  const entries = [
    ["rhythm", core.rhythm],
    ["breakPattern", core.breakPattern],
    ["openingMoves", core.openingMoves.join(" ")],
    ["transitionMoves", core.transitionMoves.join(" ")],
    ["endingEchoMoves", core.endingEchoMoves.join(" ")],
    ["knowledgeDrop", core.knowledgeDrop],
    ["personalView", core.personalView],
    ["judgement", core.judgement],
    ["counterView", core.counterView],
    ["allowedMoves", core.allowedMoves.join(" ")],
    ["forbiddenMoves", core.forbiddenMoves.join(" ")],
    ["allowedMetaphors", core.allowedMetaphors.join(" ")],
    ["emotionCurve", core.emotionCurve],
    ["personalStake", core.personalStake],
    ["characterPortrait", core.characterPortrait],
    ["culturalLift", core.culturalLift],
    ["sentenceBreak", core.sentenceBreak],
    ["echo", core.echo],
    ["humbleSetup", core.humbleSetup],
    ["toneCeiling", core.toneCeiling],
    ["concretenessRequirement", core.concretenessRequirement],
    ["costSense", core.costSense],
    ["forbiddenFabrications", core.forbiddenFabrications.join(" ")],
    ["genericLanguageBlackList", core.genericLanguageBlackList.join(" ")],
    ["unsupportedSceneDetector", core.unsupportedSceneDetector],
  ].filter(([, value]) => !value.trim());
  const keyFields: Array<keyof StyleCore> = ["rhythm", "openingMoves", "transitionMoves", "characterPortrait", "culturalLift", "echo", "costSense", "forbiddenFabrications"];
  const missingKeyFields = entries.filter(([key]) => keyFields.includes(key as keyof StyleCore)).map(([key]) => key);
  return {
    missingFields: entries.map(([key]) => key),
    missingKeyFields,
  };
}

export function getThinkCardGate(card: ThinkCard) {
  if (!isThinkCardComplete(card)) {
    return { status: "fail" as const, message: "ThinkCard 还没补完整，暂时不能继续。", needsForce: false };
  }

  if (card.topicVerdict === "strong") {
    return { status: "pass" as const, message: "ThinkCard 已过线。", needsForce: false };
  }

  if (card.topicVerdict === "rework") {
    return {
      status: "warn" as const,
      message: `这题建议先改方向：${card.verdictReason}${card.alternativeAngles.length ? `；替代角度：${card.alternativeAngles.join(" / ")}` : ""}`,
      needsForce: true,
    };
  }

  if (!card.rewriteSuggestion.trim()) {
    return { status: "fail" as const, message: "弱选题必须先补齐改方向建议。", needsForce: false };
  }

  return {
    status: "warn" as const,
    message: `这题当前偏弱，建议先改方向：${card.rewriteSuggestion}${card.alternativeAngles.length ? `；替代角度：${card.alternativeAngles.join(" / ")}` : ""}`,
    needsForce: true,
  };
}

export function getStyleCoreGate(core: StyleCore, mode: "outline" | "draft") {
  const { missingFields, missingKeyFields } = countStyleCoreMissing(core);
  if (missingFields.length === 0) {
    return { status: "pass" as const, message: "StyleCore 已过线。", needsForce: false };
  }

  if (mode === "draft" && missingKeyFields.length >= 2) {
    return {
      status: "fail" as const,
      message: `StyleCore 关键项缺失过多：${missingKeyFields.join("、")}。先补齐节奏/人物/升维/回环/代价，再生成正文。`,
      needsForce: false,
    };
  }

  return {
    status: "warn" as const,
    message: `StyleCore 还缺这些项：${missingFields.join("、")}。这次可以继续，但建议先补齐。`,
    needsForce: true,
  };
}

export function formatThinkCard(card: ThinkCard): string {
  return [
    `- 素材吃透：${card.materialDigest}`,
    `- 选题值：${card.topicVerdict}`,
    `- 判断原因：${card.verdictReason}`,
    `- 核心判断：${card.coreJudgement}`,
    `- 文章原型：${card.articlePrototype}`,
    `- 目标读者画像：${card.targetReaderPersona}`,
    `- 创作锚点：${card.creativeAnchor}`,
    `- 反直觉抓手：${card.counterIntuition}`,
    `- 读者收益：${card.readerPayoff}`,
    `- 决策影响：${card.decisionImplication}`,
    `- 明确不写：${card.excludedTakeaways.join(" / ") || "暂无"}`,
    `- HKR-Happy：${card.hkr.happy}`,
    `- HKR-Knowledge：${card.hkr.knowledge}`,
    `- HKR-Resonance：${card.hkr.resonance}`,
    `- HKR-总结：${card.hkr.summary}`,
    `- 改方向建议：${card.rewriteSuggestion}`,
    `- 替代角度：${card.alternativeAngles.join(" / ") || "暂无"}`,
    `- AI 角色：${card.aiRole}`,
  ].join("\n");
}

export function formatStyleCore(core: StyleCore): string {
  return [
    `- 节奏推进：${core.rhythm}`,
    `- 故意打破：${core.breakPattern}`,
    `- 开头动作：${core.openingMoves.join(" / ") || "暂无"}`,
    `- 转场动作：${core.transitionMoves.join(" / ") || "暂无"}`,
    `- 结尾回环动作：${core.endingEchoMoves.join(" / ") || "暂无"}`,
    `- 知识顺手掏出来：${core.knowledgeDrop}`,
    `- 私人视角：${core.personalView}`,
    `- 判断力：${core.judgement}`,
    `- 对立面理解：${core.counterView}`,
    `- 允许动作：${core.allowedMoves.join(" / ") || "暂无"}`,
    `- 禁止动作：${core.forbiddenMoves.join(" / ") || "暂无"}`,
    `- 可用比喻：${core.allowedMetaphors.join(" / ") || "暂无"}`,
    `- 情绪递进：${core.emotionCurve}`,
    `- 亲自下场：${core.personalStake}`,
    `- 人物画像法：${core.characterPortrait}`,
    `- 文化升维：${core.culturalLift}`,
    `- 句式断裂：${core.sentenceBreak}`,
    `- 回环呼应：${core.echo}`,
    `- 谦逊铺垫法：${core.humbleSetup}`,
    `- 语气上限：${core.toneCeiling}`,
    `- 具体性要求：${core.concretenessRequirement}`,
    `- 现实代价：${core.costSense}`,
    `- 禁止编造：${core.forbiddenFabrications.join(" / ") || "暂无"}`,
    `- 泛化黑名单：${core.genericLanguageBlackList.join(" / ") || "暂无"}`,
    `- unsupported scene 检测：${core.unsupportedSceneDetector}`,
  ].join("\n");
}

export function vitalityStatusFromEntries(entries: VitalityCheckEntry[]): VitalityCheck {
  const hardBlocked = entries.some((entry) => ["cannot-fake", "cannot-invent"].includes(entry.key) && entry.status === "fail");
  const hasWarn = entries.some((entry) => entry.status === "warn");

  return {
    overallStatus: hardBlocked ? "fail" : hasWarn ? "warn" : "pass",
    overallVerdict: hardBlocked
      ? "真实性或引用安全还不过线，暂时不能进入发布前整理。"
      : hasWarn
        ? "生命力检查给出了若干修改建议。你可以继续润色，也可以按当前稿进入发布前整理。"
        : "生命力检查已过线，可以进入发布前整理。",
    semiBlocked: hardBlocked,
    hardBlocked,
    entries,
  };
}
