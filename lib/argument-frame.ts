import { ARGUMENT_SHAPES } from "@/lib/types";
import type { ArgumentFrame, ArgumentShape, ArgumentSupportingClaim, ArticleProject } from "@/lib/types";

const CLAIM_ROLES = ["open", "explain", "prove", "counter", "decision", "return"] as const;

type ClaimRole = ArgumentSupportingClaim["role"];

export function inferArgumentShapeFromTopic(input: { topic?: string; articleType?: string; thesis?: string; coreQuestion?: string } | string): ArgumentShape {
  const text =
    typeof input === "string"
      ? input
      : [input.topic, input.articleType, input.thesis, input.coreQuestion].filter(Boolean).join(" ");

  if (/高估|低估|值不值|还能不能买|泡沫|是否错过/.test(text)) {
    return "judgement_essay";
  }
  if (/大家都说|被误解|真相|不是你想的|误解纠偏型/.test(text)) {
    return "misread_correction";
  }
  if (/认购冷|成交热|挂牌多|去化慢|土拍冷|商业延期/.test(text)) {
    return /错配|供需|价格/.test(text) ? "mismatch_diagnosis" : "signal_reinterpretation";
  }
  if (/成熟|老牌|不讲故事|兑现完|天花板/.test(text)) {
    return "lifecycle_reframe";
  }
  if (/核心资产|普通资产|分化|哪类房子/.test(text)) {
    return "asset_tiering";
  }
  if (/风险|坑|站岗|接盘/.test(text)) {
    return "risk_decomposition";
  }
  if (/买不买|适合谁|怎么选/.test(text)) {
    return /谁|人群|画像|适合/.test(text) ? "buyer_persona_split" : "tradeoff_decision";
  }
  if (/规划|TOD|地铁|商业|产业|规划拆解型/.test(text)) {
    return "planning_reality_check";
  }
  if (/[A-Za-z0-9\u4e00-\u9fa5]+和[A-Za-z0-9\u4e00-\u9fa5]+怎么选/.test(text)) {
    return "comparison_benchmark";
  }
  if (/周期|时机|什么时候|现在/.test(text)) {
    return "cycle_timing";
  }
  return "judgement_essay";
}

export function buildFallbackArgumentFrame(input: {
  project: Pick<ArticleProject, "topic" | "articleType" | "thesis" | "coreQuestion"> & {
    thinkCard?: Partial<ArticleProject["thinkCard"]>;
  };
  evidenceIds?: string[];
  zones?: string[];
}): ArgumentFrame {
  const answer = firstText(input.project.thesis, input.project.thinkCard?.coreJudgement, input.project.coreQuestion, input.project.topic);
  const evidenceIds = input.evidenceIds ?? [];
  return {
    primaryShape: inferArgumentShapeFromTopic(input.project),
    secondaryShapes: [],
    centralTension: firstText(input.project.coreQuestion, input.project.thesis, input.project.topic),
    answer,
    notThis: ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录"],
    supportingClaims: [
      {
        id: "claim-1",
        claim: answer,
        role: "open",
        evidenceIds: evidenceIds.slice(0, 2),
        mustUseEvidenceIds: evidenceIds.slice(0, 1),
        zonesAsEvidence: input.zones?.slice(0, 3) ?? [],
        shouldNotBecomeSection: true,
      },
    ],
    strongestCounterArgument: "板块内部差异可能削弱总判断，不能把所有片区混成一个结论。",
    howToHandleCounterArgument: "承认片区差异，但把片区作为证据和判断边界，而不是章节目录。",
    readerDecisionFrame: "读者用预算、风险承受力、等待周期和替代选择来判断这篇文章的结论是否适合自己。",
  };
}

export function normalizeArgumentFrame(value: unknown, fallback?: ArgumentFrame): ArgumentFrame {
  const source = isRecord(value) ? value : {};
  const fallbackFrame = fallback ?? buildFallbackArgumentFrame({ project: { topic: "", articleType: "价值重估型", thesis: "", coreQuestion: "" } });
  const primaryShape = isArgumentShape(source.primaryShape) ? source.primaryShape : fallbackFrame.primaryShape;
  const secondaryShapes = arrayOfStrings(source.secondaryShapes).filter(isArgumentShape).filter((shape) => shape !== primaryShape).slice(0, 2);
  const supportingClaims = normalizeClaims(source.supportingClaims, fallbackFrame.supportingClaims);

  return {
    primaryShape,
    secondaryShapes,
    centralTension: stringOrFallback(source.centralTension, fallbackFrame.centralTension),
    answer: stringOrFallback(source.answer, fallbackFrame.answer),
    notThis: arrayOfStrings(source.notThis).length > 0 ? arrayOfStrings(source.notThis) : fallbackFrame.notThis,
    supportingClaims,
    strongestCounterArgument: stringOrFallback(source.strongestCounterArgument, fallbackFrame.strongestCounterArgument),
    howToHandleCounterArgument: stringOrFallback(source.howToHandleCounterArgument, fallbackFrame.howToHandleCounterArgument),
    readerDecisionFrame: stringOrFallback(source.readerDecisionFrame, fallbackFrame.readerDecisionFrame),
  };
}

function normalizeClaims(value: unknown, fallbackClaims: ArgumentSupportingClaim[]): ArgumentSupportingClaim[] {
  if (!Array.isArray(value)) {
    return fallbackClaims;
  }
  const claims = value
    .map((item, index) => normalizeClaim(item, index))
    .filter((claim): claim is ArgumentSupportingClaim => Boolean(claim));
  return claims.length > 0 ? claims : fallbackClaims;
}

function normalizeClaim(value: unknown, index: number): ArgumentSupportingClaim | null {
  if (!isRecord(value)) {
    return null;
  }
  const claim = stringOrFallback(value.claim, "");
  if (!claim) {
    return null;
  }
  return {
    id: stringOrFallback(value.id, `claim-${index + 1}`),
    claim,
    role: isClaimRole(value.role) ? value.role : "prove",
    evidenceIds: arrayOfStrings(value.evidenceIds),
    mustUseEvidenceIds: arrayOfStrings(value.mustUseEvidenceIds),
    zonesAsEvidence: arrayOfStrings(value.zonesAsEvidence),
    shouldNotBecomeSection: typeof value.shouldNotBecomeSection === "boolean" ? value.shouldNotBecomeSection : false,
  };
}

function isArgumentShape(value: unknown): value is ArgumentShape {
  return typeof value === "string" && (ARGUMENT_SHAPES as readonly string[]).includes(value);
}

function isClaimRole(value: unknown): value is ClaimRole {
  return typeof value === "string" && (CLAIM_ROLES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function firstText(...values: Array<string | null | undefined>) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() ?? "";
}
