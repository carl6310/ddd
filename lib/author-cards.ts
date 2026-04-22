import type {
  ArticleType,
  HAMDFrame,
  HKRFrame,
  HKRRFrame,
  ThinkCard,
  ReviewSeverity,
  StyleCore,
  VitalityCheck,
  VitalityCheckEntry,
  WritingMovesFrame,
} from "@/lib/types";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";

const DEFAULT_AI_ROLE =
  "AI 只负责整理素材、对比角度、提醒盲点和生成初稿启发，不替代作者自己的核心角度、真实立场和最终判断。";

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
  thesis?: string;
  notes?: string;
  hkrr?: HKRRFrame;
  hamd?: HAMDFrame;
  audience?: string;
}): ThinkCard {
  const { topic, thesis, notes, hkrr, hamd, audience } = input;
  return {
    materialDigest: withFallback(notes, `${topic} 这篇先从现有素材里找最硬的冲突，再决定值不值得写。`),
    topicVerdict: thesis?.trim() ? "strong" : "rework",
    verdictReason: withFallback(thesis, `${topic} 目前最值得写的是“市场标签和真实结构的错位”。`),
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

  return {
    rhythm: withFallback(moves.narrativeDrive, withFallback(input.hkrr?.rhythm, "开头立判断，中段拆结构，结尾回到代价。")),
    breakPattern: withFallback(moves.breakPoint, "在平推资料之前，用生活场景或反面代价主动打断。"),
    knowledgeDrop: withFallback(input.hkrr?.knowledge, `${input.topic} 的知识点要顺手掏出来，而不是写成资料堆。`),
    personalView: withFallback(moves.personalPosition, `我对 ${input.topic} 的判断来自长期观察，不来自销售想象。`),
    judgement: withFallback(input.thesis, `${input.topic} 真正决定价值的不是热度，而是结构。`),
    counterView: withFallback(input.hamd?.different, `要把 ${input.topic} 的对立面也讲出来，不能只站一边。`),
    emotionCurve: withFallback(input.hkrr?.resonance, "开头拉住，中段压实，结尾收出代价和余味。"),
    personalStake: withFallback(moves.personalPosition, `作者必须亲自下场说清楚 ${input.topic} 为什么值得这样判断。`),
    characterPortrait: withFallback(moves.characterScene, `至少写一个真实人物或生活场景，让 ${input.topic} 从地图变成生活。`),
    culturalLift: withFallback(moves.culturalLift, `把 ${input.topic} 放进更大的上海结构里再看。`),
    sentenceBreak: withFallback(moves.signatureLine, `${input.topic} 不是一个板块，而是几种生活路径挤在一起。`),
    echo: withFallback(moves.echoLine, `结尾回扣 ${input.topic} 开头那一下判断。`),
    humbleSetup: withFallback(moves.personalPosition, "先承认判断带体感，再把证据和结构铺出来。"),
    costSense: withFallback(moves.costSense, `把 ${input.topic} 的门槛、等待和代价写透。`),
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
  const styleBase = defaultStyleCore(input);
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
    },
    styleCore: {
      ...styleBase,
      ...(input.styleCore ?? {}),
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
      card.hkr.happy.trim() &&
      card.hkr.knowledge.trim() &&
      card.hkr.resonance.trim() &&
      card.rewriteSuggestion.trim() &&
      card.aiRole.trim(),
  );
}

export function isStyleCoreComplete(core: StyleCore): boolean {
  return Object.values(core).every((value) => value.trim().length > 0);
}

export function countStyleCoreMissing(core: StyleCore) {
  const entries = Object.entries(core).filter(([, value]) => !value.trim());
  const keyFields: Array<keyof StyleCore> = ["rhythm", "characterPortrait", "culturalLift", "echo", "costSense"];
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
    `- 知识顺手掏出来：${core.knowledgeDrop}`,
    `- 私人视角：${core.personalView}`,
    `- 判断力：${core.judgement}`,
    `- 对立面理解：${core.counterView}`,
    `- 情绪递进：${core.emotionCurve}`,
    `- 亲自下场：${core.personalStake}`,
    `- 人物画像法：${core.characterPortrait}`,
    `- 文化升维：${core.culturalLift}`,
    `- 句式断裂：${core.sentenceBreak}`,
    `- 回环呼应：${core.echo}`,
    `- 谦逊铺垫法：${core.humbleSetup}`,
    `- 现实代价：${core.costSense}`,
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
