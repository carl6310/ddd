import {
  ARTICLE_PROTOTYPE_LABELS,
  TOPIC_ANGLE_TYPES,
  TOPIC_ANGLE_TYPE_LABELS,
  TOPIC_READER_PERSONA_LABELS,
  type ArticlePrototype,
  type TopicAngle,
  type TopicAngleDraft,
  type TopicHKRScore,
  type TopicReaderPersona,
  type TopicScorecard,
  type TopicAngleType,
  type TopicCoCreationCoverageSummary,
  type TopicCoCreationResult,
} from "@/lib/types";
import { createId } from "@/lib/utils";

const ANGLE_TYPE_ALIASES: Record<string, TopicAngleType> = {
  thesis: "thesis",
  "总判断型": "thesis",
  "总判断": "thesis",
  "核心判断": "thesis",
  "判断型": "thesis",

  counterintuitive: "counterintuitive",
  "反常识型": "counterintuitive",
  "反常识": "counterintuitive",
  "反直觉型": "counterintuitive",
  "反直觉": "counterintuitive",

  spatial_segmentation: "spatial_segmentation",
  "空间切割型": "spatial_segmentation",
  "空间结构": "spatial_segmentation",
  "切割线": "spatial_segmentation",
  "空间分界": "spatial_segmentation",

  buyer_segment: "buyer_segment",
  "客群视角型": "buyer_segment",
  "客群视角": "buyer_segment",
  "人群适配": "buyer_segment",
  "买家分层": "buyer_segment",

  transaction_micro: "transaction_micro",
  "交易微观型": "transaction_micro",
  "交易微观": "transaction_micro",
  "成交微观": "transaction_micro",

  supply_structure: "supply_structure",
  "供给结构型": "supply_structure",
  "供给结构": "supply_structure",
  "供地结构": "supply_structure",
  "供应结构": "supply_structure",

  policy_transmission: "policy_transmission",
  "政策传导型": "policy_transmission",
  "政策传导": "policy_transmission",
  "政策兑现": "policy_transmission",

  timing_window: "timing_window",
  "时间窗口型": "timing_window",
  "时间窗口": "timing_window",
  "节奏窗口": "timing_window",

  comparative: "comparative",
  "对比参照型": "comparative",
  "对比参照": "comparative",
  "横向对比": "comparative",

  risk_deconstruction: "risk_deconstruction",
  "风险拆解型": "risk_deconstruction",
  "风险拆解": "risk_deconstruction",
  "风险排查": "risk_deconstruction",

  decision_service: "decision_service",
  "决策服务型": "decision_service",
  "决策服务": "decision_service",
  "买房决策": "decision_service",

  narrative_upgrade: "narrative_upgrade",
  "叙事升级型": "narrative_upgrade",
  "叙事升级": "narrative_upgrade",
  "叙事提级": "narrative_upgrade",

  scene_character: "scene_character",
  "人物/场景型": "scene_character",
  "人物场景型": "scene_character",
  "人物场景": "scene_character",
  "场景人物": "scene_character",

  lifecycle: "lifecycle",
  "生命周期型": "lifecycle",
  "生命周期": "lifecycle",
  "发展阶段": "lifecycle",

  mismatch: "mismatch",
  "错配型": "mismatch",
  "错配": "mismatch",
  "结构错配": "mismatch",

  culture_psychology: "culture_psychology",
  "文化/心理型": "culture_psychology",
  "文化心理型": "culture_psychology",
  "文化心理": "culture_psychology",
  "情绪心理": "culture_psychology",
};

type PostprocessInput = {
  sector: string;
  rawAngles: TopicAngleDraft[];
  fallbackAngles?: TopicAngleDraft[];
  sourceBasis?: string[];
  recommendedCount?: number;
  longlistCount?: number;
  materialInsights?: TopicCoCreationResult["materialInsights"];
};

export function postprocessTopicCoCreateResult(input: PostprocessInput): TopicCoCreationResult {
  const recommendedCount = clamp(input.recommendedCount ?? 6, 4, 6);
  const longlistCount = clamp(input.longlistCount ?? 16, 6, 16);
  const normalized = [...input.rawAngles, ...(input.fallbackAngles ?? [])]
    .map((angle, index) => normalizeTopicAngleDraft(angle, {
      sector: input.sector,
      sourceBasis: input.sourceBasis ?? [],
      index,
    }))
    .filter(Boolean);

  const { uniqueAngles, duplicatesMerged } = dedupeTopicAngles(normalized);
  const arranged = arrangeAnglesForCoverage(rankTopicAngles(uniqueAngles));
  const angleLonglist = arranged.slice(0, Math.min(longlistCount, arranged.length));
  const recommendedAngles = angleLonglist.slice(0, Math.min(recommendedCount, angleLonglist.length));
  const coverageSummary = buildCoverageSummary(angleLonglist, duplicatesMerged);

  return {
    sector: input.sector,
    recommendedAngles,
    angleLonglist,
    coverageSummary,
    angles: recommendedAngles,
    candidateAngles: recommendedAngles,
    materialInsights: input.materialInsights,
  };
}

export function normalizeAngleType(rawValue: string, hintText = ""): TopicAngleType {
  const normalizedRaw = rawValue.trim().toLowerCase();
  if (ANGLE_TYPE_ALIASES[rawValue]) {
    return ANGLE_TYPE_ALIASES[rawValue];
  }
  if (ANGLE_TYPE_ALIASES[normalizedRaw]) {
    return ANGLE_TYPE_ALIASES[normalizedRaw];
  }

  const combined = `${rawValue} ${hintText}`.toLowerCase();
  if (/(反常识|反直觉|不是.+而是|恰恰|反而)/.test(combined)) {
    return "counterintuitive";
  }
  if (/(分界线|切割|骨架|片区|界面)/.test(combined)) {
    return "spatial_segmentation";
  }
  if (/(谁适合|谁不适合|哪类人|预算|客群|买家)/.test(combined)) {
    return "buyer_segment";
  }
  if (/(成交|房东|挂牌|议价|交易)/.test(combined)) {
    return "transaction_micro";
  }
  if (/(供地|供应|地块|断供|筹码)/.test(combined)) {
    return "supply_structure";
  }
  if (/(政策|规划兑现|传导|规则)/.test(combined)) {
    return "policy_transmission";
  }
  if (/(窗口|节奏|现在|时点|下半场)/.test(combined)) {
    return "timing_window";
  }
  if (/(对比|参照|相比|横向)/.test(combined)) {
    return "comparative";
  }
  if (/(风险|代价|误伤|踩坑)/.test(combined)) {
    return "risk_deconstruction";
  }
  if (/(怎么判断|怎么选|决策|服务读者)/.test(combined)) {
    return "decision_service";
  }
  if (/(叙事|讲法|升级|换一种写法)/.test(combined)) {
    return "narrative_upgrade";
  }
  if (/(人物|场景|生活感|通勤|烟火气)/.test(combined)) {
    return "scene_character";
  }
  if (/(生命周期|阶段|上半场|下半场)/.test(combined)) {
    return "lifecycle";
  }
  if (/(错配|不匹配|落差|没转化)/.test(combined)) {
    return "mismatch";
  }
  if (/(文化|心理|想象|标签|情绪)/.test(combined)) {
    return "culture_psychology";
  }
  if (/(总判断|判断|主命题|该怎么看)/.test(combined)) {
    return "thesis";
  }
  return "thesis";
}

export function dedupeTopicAngles(angles: TopicAngle[]) {
  const uniqueAngles: TopicAngle[] = [];
  const seen = new Set<string>();
  let duplicatesMerged = 0;

  for (const angle of angles) {
    const key = buildAngleDedupeKey(angle);
    if (seen.has(key)) {
      duplicatesMerged += 1;
      continue;
    }
    seen.add(key);
    uniqueAngles.push(angle);
  }

  return { uniqueAngles, duplicatesMerged };
}

export function filterAnglesByType(angles: TopicAngle[], filter: TopicAngleType | "all") {
  if (filter === "all") {
    return angles;
  }
  return angles.filter((angle) => angle.angleType === filter);
}

function normalizeTopicAngleDraft(
  draft: TopicAngleDraft,
  input: { sector: string; sourceBasis: string[]; index: number },
): TopicAngle {
  const title = draft.title?.trim() || `${input.sector} 的一个候选角度`;
  const coreJudgement =
    draft.coreJudgement?.trim() ||
    draft.counterIntuition?.trim() ||
    `${input.sector} 值得写的，不是标签本身，而是标签背后的结构判断。`;
  const counterIntuition =
    draft.counterIntuition?.trim() ||
    `${input.sector} 最容易被误判的，不是热度高低，而是结构性判断被简化了。`;
  const readerValue =
    draft.readerValue?.trim() ||
    "帮助读者把这个板块从口号和标签里拽出来，重新回到可执行的判断上。";
  const whyNow =
    draft.whyNow?.trim() ||
    "现在做这条题的价值，在于它能直接回应材料里最突出的一组判断错位。";
  const neededEvidence = normaliseEvidenceList(draft.neededEvidence);
  const riskOfMisfire =
    draft.riskOfMisfire?.trim() ||
    "如果证据不够硬，这条题会变成判断先行、材料补位。";
  const recommendedNextStep =
    draft.recommendedNextStep?.trim() ||
    `先把 ${neededEvidence.slice(0, 2).join("、")} 补齐，再决定是否正式立项。`;
  const angleType = normalizeAngleType(draft.angleType, `${title} ${coreJudgement} ${counterIntuition}`);
  const articlePrototype = draft.articlePrototype ?? inferArticlePrototype(angleType, draft.articleType, `${title} ${coreJudgement}`);
  const targetReaderPersona = draft.targetReaderPersona ?? inferTargetReaderPersona(angleType, `${title} ${readerValue}`);
  const readerLens = draft.readerLens?.length ? draft.readerLens : inferReaderLens(targetReaderPersona, angleType);
  const signalRefs = draft.signalRefs?.length ? draft.signalRefs : (draft.sourceBasis?.filter(Boolean) ?? input.sourceBasis).slice(0, 3);
  const hkr =
    draft.hkr ??
    buildTopicHKR({
      title,
      coreJudgement,
      counterIntuition,
      readerValue,
      whyNow,
      neededEvidence,
      signalRefs,
    });
  const topicScorecard =
    draft.topicScorecard ??
    buildTopicScorecard({
      hkr,
      readerValue,
      neededEvidence,
      riskOfMisfire,
      signalRefs,
      targetReaderPersona,
      articlePrototype,
      recommendedNextStep,
    });
  const creativeAnchor =
    draft.creativeAnchor?.trim() ||
    `${title.replace(input.sector, "").trim() || input.sector}：${ARTICLE_PROTOTYPE_LABELS[articlePrototype]} / ${TOPIC_READER_PERSONA_LABELS[targetReaderPersona]}`;

  return {
    id: draft.id?.trim() || createId("angle"),
    title,
    angleType,
    angleTypeLabel: TOPIC_ANGLE_TYPE_LABELS[angleType],
    articleType: draft.articleType,
    articlePrototype,
    targetReaderPersona,
    creativeAnchor,
    coreJudgement,
    counterIntuition,
    readerValue,
    whyNow,
    hkr,
    readerLens,
    signalRefs,
    neededEvidence,
    riskOfMisfire,
    recommendedNextStep,
    sourceBasis: draft.sourceBasis?.filter(Boolean) ?? input.sourceBasis,
    topicScorecard,
  };
}

function normaliseEvidenceList(items: string[] | undefined) {
  const cleaned = (items ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return cleaned.length > 0 ? cleaned : ["需要补一条能直接支撑核心判断的硬证据"];
}

function buildCoverageSummary(angles: TopicAngle[], duplicatesMerged: number): TopicCoCreationCoverageSummary {
  const includedTypeSet = new Set(angles.map((angle) => angle.angleType));
  return {
    includedTypes: TOPIC_ANGLE_TYPES.filter((type) => includedTypeSet.has(type)),
    missingTypes: TOPIC_ANGLE_TYPES.filter((type) => !includedTypeSet.has(type)),
    duplicatesMerged,
  };
}

function rankTopicAngles(angles: TopicAngle[]) {
  return [...angles]
    .map((angle, index) => ({
      angle,
      score: scoreTopicAngle(angle),
      index,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.angle);
}

function arrangeAnglesForCoverage(angles: TopicAngle[]) {
  const grouped = new Map<TopicAngleType, TopicAngle[]>();
  const arranged: TopicAngle[] = [];

  for (const angle of angles) {
    const current = grouped.get(angle.angleType) ?? [];
    current.push(angle);
    grouped.set(angle.angleType, current);
  }

  for (const type of TOPIC_ANGLE_TYPES) {
    const bucket = grouped.get(type);
    if (!bucket?.length) {
      continue;
    }
    arranged.push(bucket.shift()!);
  }

  let hasRemaining = true;
  while (hasRemaining) {
    hasRemaining = false;
    for (const type of TOPIC_ANGLE_TYPES) {
      const bucket = grouped.get(type);
      if (bucket && bucket.length > 0) {
        arranged.push(bucket.shift()!);
        hasRemaining = true;
      }
    }
  }

  return arranged;
}

function scoreTopicAngle(angle: TopicAngle) {
  const statusBonus =
    angle.topicScorecard.status === "ready_to_open" ? 6 : angle.topicScorecard.status === "needs_more_signals" ? 2 : -2;
  return scoreJudgementStrength(angle) + scoreNovelty(angle) + scoreEvidenceability(angle) + scoreReaderValue(angle) + angle.hkr.total + statusBonus;
}

function scoreJudgementStrength(angle: TopicAngle) {
  const text = `${angle.title} ${angle.coreJudgement}`;
  let score = 0;

  if (angle.coreJudgement.length >= 18) {
    score += 3;
  }
  if (/(不是|而是|真正|关键|核心|决定|本质)/.test(text)) {
    score += 3;
  }
  if (angle.angleType === "thesis" || angle.angleType === "counterintuitive") {
    score += 2;
  }

  return score;
}

function scoreNovelty(angle: TopicAngle) {
  const text = `${angle.title} ${angle.counterIntuition}`;
  let score = 0;

  if (/(反常识|反直觉|不是|而是|恰恰|反而|最容易被忽略)/.test(text)) {
    score += 4;
  }
  if (angle.angleType === "counterintuitive" || angle.angleType === "mismatch" || angle.angleType === "narrative_upgrade") {
    score += 3;
  }

  return score;
}

function scoreEvidenceability(angle: TopicAngle) {
  let score = Math.min(angle.neededEvidence.length, 4) * 2;
  if (angle.neededEvidence.some((item) => /规划|成交|供地|地图|通勤|租售|访谈|政策/.test(item))) {
    score += 2;
  }
  if (angle.neededEvidence.some((item) => /待补|需要补/.test(item))) {
    score -= 2;
  }
  return score;
}

function scoreReaderValue(angle: TopicAngle) {
  let score = 0;
  if (angle.readerValue.length >= 18) {
    score += 2;
  }
  if (/(读者|判断|买房|适合|风险|决策)/.test(`${angle.readerValue} ${angle.recommendedNextStep}`)) {
    score += 4;
  }
  if (angle.angleType === "buyer_segment" || angle.angleType === "decision_service" || angle.angleType === "risk_deconstruction") {
    score += 2;
  }
  return score;
}

function buildAngleDedupeKey(angle: TopicAngle) {
  return `${normaliseForKey(angle.title)}|${normaliseForKey(angle.coreJudgement)}`;
}

function normaliseForKey(value: string) {
  return value.replace(/\s+/g, "").replace(/[，。、“”"'：:？！!?（）()·/\\-]/g, "").toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function inferArticlePrototype(angleType: TopicAngleType, articleType: TopicAngle["articleType"], hintText: string): ArticlePrototype {
  if (angleType === "spatial_segmentation" || articleType === "规划拆解型") {
    return "spatial_segmentation";
  }
  if (angleType === "buyer_segment") {
    return "buyer_split";
  }
  if (angleType === "transaction_micro") {
    return "transaction_observation";
  }
  if (angleType === "decision_service") {
    return "decision_service";
  }
  if (angleType === "risk_deconstruction" || articleType === "误解纠偏型") {
    return "risk_deconstruction";
  }
  if (angleType === "scene_character") {
    return "scene_character";
  }
  if (/(谁适合|谁不适合|决策|怎么选)/.test(hintText)) {
    return "decision_service";
  }
  return "total_judgement";
}

function inferTargetReaderPersona(angleType: TopicAngleType, hintText: string): TopicReaderPersona {
  if (angleType === "buyer_segment" || /改善|预算|接盘|买家/.test(hintText)) {
    return "improver_buyer";
  }
  if (angleType === "risk_deconstruction" || /风险|门槛|踩坑|代价/.test(hintText)) {
    return "risk_aware_reader";
  }
  if (angleType === "scene_character" || /生活|通勤|社区|烟火气/.test(hintText)) {
    return "local_life_reader";
  }
  return "busy_relocator";
}

function inferReaderLens(targetReaderPersona: TopicReaderPersona, angleType: TopicAngleType): TopicReaderPersona[] {
  if (angleType === "risk_deconstruction") {
    return Array.from(new Set([targetReaderPersona, "risk_aware_reader"]));
  }
  if (angleType === "scene_character") {
    return Array.from(new Set([targetReaderPersona, "local_life_reader"]));
  }
  if (angleType === "buyer_segment" || angleType === "decision_service") {
    return Array.from(new Set([targetReaderPersona, "improver_buyer"]));
  }
  return [targetReaderPersona];
}

function buildTopicHKR(input: {
  title: string;
  coreJudgement: string;
  counterIntuition: string;
  readerValue: string;
  whyNow: string;
  neededEvidence: string[];
  signalRefs: string[];
}): TopicHKRScore {
  const h = clampInt(
    2 +
      (/不是|真正|为什么|明明/.test(`${input.title} ${input.counterIntuition}`) ? 2 : 0) +
      (input.whyNow.length >= 14 ? 1 : 0),
    1,
    5,
  );
  const k = clampInt(
    2 +
      (input.readerValue.length >= 16 ? 1 : 0) +
      (input.neededEvidence.length >= 2 ? 1 : 0) +
      (input.signalRefs.length > 0 ? 1 : 0),
    1,
    5,
  );
  const r = clampInt(
    2 +
      (/读者|适合|不适合|决策|门槛|代价/.test(`${input.readerValue} ${input.coreJudgement}`) ? 2 : 0) +
      (input.whyNow.length >= 14 ? 1 : 0),
    1,
    5,
  );

  return {
    h,
    k,
    r,
    total: h + k + r,
  };
}

function buildTopicScorecard(input: {
  hkr: TopicHKRScore;
  readerValue: string;
  neededEvidence: string[];
  riskOfMisfire: string;
  signalRefs: string[];
  targetReaderPersona: TopicReaderPersona;
  articlePrototype: ArticlePrototype;
  recommendedNextStep: string;
}): TopicScorecard {
  let status: TopicScorecard["status"] = input.hkr.total >= 12 ? "ready_to_open" : input.hkr.total >= 9 ? "needs_more_signals" : "weak_topic";
  if (status === "ready_to_open" && input.signalRefs.length === 0) {
    status = "needs_more_signals";
  }

  return {
    status,
    hkr: input.hkr,
    readerValueSummary: input.readerValue,
    signalCoverageSummary:
      input.signalRefs.length > 0 ? `已命中 ${input.signalRefs.length} 条信号，足够支撑第一轮开题。` : "当前还没有稳定信号来源，建议先补 1-2 条可回查依据。",
    evidenceRisk: input.riskOfMisfire || input.neededEvidence.join("；"),
    recommendation:
      status === "ready_to_open"
        ? `建议开题。下一步优先按 ${ARTICLE_PROTOTYPE_LABELS[input.articlePrototype]} 原型推进，并面向${TOPIC_READER_PERSONA_LABELS[input.targetReaderPersona]}落判断。`
        : status === "needs_more_signals"
          ? `建议补信号。先处理：${input.recommendedNextStep}`
          : "建议放弃或重写命题，再决定是否继续。",
    canForceProceed: status !== "ready_to_open",
  };
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
