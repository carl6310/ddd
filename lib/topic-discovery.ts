import { createHash } from "node:crypto";
import { buildCardsFromLegacy, deriveLegacyFrames } from "@/lib/author-cards";
import { runStructuredTask } from "@/lib/llm";
import {
  buildStyleReference,
  createProject,
  createSourceCard,
  getSignalBrief,
  getTopicDiscoveryBundle,
  getTopicDiscoverySession,
  listPreSourceCards,
  listTopicAngleCandidates,
  replacePreSourceCards,
  replaceTopicAngleCandidates,
  saveSignalBrief,
  updateTopicDiscoveryLink,
  updateTopicDiscoverySession,
} from "@/lib/repository";
import { buildSignalBrief } from "@/lib/signals/provider";
import { postprocessTopicCoCreateResult } from "@/lib/topic-cocreate-postprocess";
import { createId, nowIso } from "@/lib/utils";
import { buildDefaultWritingMoves } from "@/lib/writing-moves";
import { extractArticleFromUrl } from "@/lib/url-extractor";
import type {
  ArticleProject,
  PersistedSignalBrief,
  PreSourceCard,
  SignalProviderMode,
  TopicAngle,
  TopicCoCreationResult,
  TopicDiscoveryDepth,
  TopicDiscoverySession,
} from "@/lib/types";

export async function extractPreSourceCardsForSession(sessionId: string) {
  const session = getTopicDiscoverySession(sessionId);
  if (!session) {
    throw new Error("选题发现会话不存在。");
  }

  const bundle = getTopicDiscoveryBundle(sessionId);
  const links = bundle?.links ?? [];
  const cards: PreSourceCard[] = [];

  updateTopicDiscoverySession(sessionId, { status: "running" });

  for (const link of links) {
    updateTopicDiscoveryLink(link.id, { status: "running", errorMessage: null });
    try {
      const extracted = await extractArticleFromUrl(link.url);
      updateTopicDiscoveryLink(link.id, { status: "ready", errorMessage: null });
      cards.push({
        id: createId("psc"),
        sessionId,
        linkId: link.id,
        url: link.url,
        sourceTitle: extracted.title,
        sourceType: inferPreSourceType(extracted.note),
        publishedAt: extracted.publishedAt,
        summary: extracted.summary,
        keyClaims: [extracted.evidence || extracted.summary].filter(Boolean),
        signalTags: extracted.tags.slice(0, 6),
        suggestedAngles: extracted.tags.slice(0, 3),
        riskHints: buildPreSourceRiskHints(extracted),
        extractStatus: "ready",
        rawContentRef: extracted.rawText.slice(0, 1200),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    } catch (error) {
      updateTopicDiscoveryLink(link.id, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "链接解析失败",
      });
      cards.push({
        id: createId("psc"),
        sessionId,
        linkId: link.id,
        url: link.url,
        sourceTitle: "抓取失败",
        sourceType: "media",
        publishedAt: "",
        summary: "",
        keyClaims: [],
        signalTags: [],
        suggestedAngles: [],
        riskHints: [error instanceof Error ? error.message : "链接解析失败"],
        extractStatus: "failed",
        rawContentRef: "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
  }

  replacePreSourceCards(sessionId, cards);
  updateTopicDiscoverySession(sessionId, { status: "draft" });
  return listPreSourceCards(sessionId);
}

export async function generateSignalBriefForSession(sessionId: string) {
  const session = getTopicDiscoverySession(sessionId);
  if (!session) {
    throw new Error("选题发现会话不存在。");
  }

  const preSourceCards = listPreSourceCards(sessionId);
  const inputHash = buildSignalBriefInputHash(session, preSourceCards);
  const existing = getSignalBrief(sessionId);
  if (existing?.inputHash === inputHash) {
    updateTopicDiscoverySession(sessionId, { status: "draft" });
    return existing;
  }
  updateTopicDiscoverySession(sessionId, { status: "running" });

  const signalBundle = await buildSignalBrief({
    sector: session.sector,
    currentIntuition: buildSessionIntuitionText(session, preSourceCards),
    rawMaterials: buildSessionRawMaterials(session, preSourceCards),
    mode: session.searchMode as SignalProviderMode,
  });

  const persisted: PersistedSignalBrief = {
    sessionId,
    queries: signalBundle.signalBrief.queries,
    signals: signalBundle.signalBrief.signals,
    gaps: signalBundle.signalBrief.gaps,
    freshnessNote: signalBundle.signalBrief.freshnessNote,
    generatedAt: nowIso(),
    inputHash,
  };
  saveSignalBrief(persisted);
  updateTopicDiscoverySession(sessionId, { status: "draft" });
  return persisted;
}

export async function generateTopicAnglesForSession(sessionId: string, options: { depth?: TopicDiscoveryDepth } = {}) {
  const session = getTopicDiscoverySession(sessionId);
  if (!session) {
    throw new Error("选题发现会话不存在。");
  }

  const preSourceCards = listPreSourceCards(sessionId);
  const signalBrief = getSignalBrief(sessionId);
  const depth = options.depth ?? "fast";
  updateTopicDiscoverySession(sessionId, { status: "running" });

  const rawResult = await runStructuredTask<{ sector: string; candidateAngles: TopicAngle[]; materialInsights?: TopicCoCreationResult["materialInsights"] }>(
    depth === "fast" ? "topic_cocreate_fast" : "topic_cocreate",
    {
      sector: session.sector,
      currentIntuition: buildSessionIntuitionText(session, preSourceCards),
      rawMaterials: buildSessionRawMaterials(session, preSourceCards),
      signalBrief: depth === "full" && signalBrief
        ? {
            queries: signalBrief.queries,
            signals: signalBrief.signals,
            gaps: signalBrief.gaps,
            freshnessNote: signalBrief.freshnessNote,
          }
        : null,
      avoidAngles: session.avoidAngles,
      styleReference: buildStyleReference(session.sector, null),
    },
  );

  const result = postprocessTopicCoCreateResult({
    sector: session.sector,
    rawAngles: rawResult.candidateAngles ?? [],
    sourceBasis: preSourceCards.filter((card) => card.extractStatus === "ready").map((card) => card.sourceTitle).slice(0, 3),
    recommendedCount: 6,
    longlistCount: depth === "fast" ? 8 : 16,
    materialInsights: rawResult.materialInsights,
  });

  replaceTopicAngleCandidates(sessionId, result.angleLonglist);
  updateTopicDiscoverySession(sessionId, { status: "ready" });
  return buildTopicAngleResult(session, listTopicAngleCandidates(sessionId));
}

export function buildSignalBriefInputHash(session: TopicDiscoverySession, cards: PreSourceCard[]) {
  const payload = {
    sector: session.sector,
    intuition: session.intuition,
    focusPoints: session.focusPoints,
    rawMaterials: session.rawMaterials,
    avoidAngles: session.avoidAngles,
    searchMode: session.searchMode,
    cards: cards
      .map((card) => ({
        id: card.id,
        url: card.url,
        sourceTitle: card.sourceTitle,
        summary: card.summary,
        keyClaims: card.keyClaims,
        signalTags: card.signalTags,
        riskHints: card.riskHints,
        extractStatus: card.extractStatus,
        updatedAt: card.updatedAt,
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function buildTopicAngleResult(session: TopicDiscoverySession, topicAngles: TopicAngle[]): TopicCoCreationResult {
  const recommendedAngles = topicAngles.slice(0, 6);
  const covered = new Set(topicAngles.map((angle) => angle.angleType));
  return {
    sector: session.sector,
    recommendedAngles,
    angleLonglist: topicAngles,
    coverageSummary: {
      includedTypes: Array.from(covered),
      missingTypes: [],
      duplicatesMerged: 0,
    },
    angles: recommendedAngles,
    candidateAngles: recommendedAngles,
    materialInsights: undefined,
  };
}

export function createProjectFromTopicDiscovery(input: {
  sessionId: string;
  candidateId: string;
  selectedPreSourceCardIds?: string[];
}) {
  const bundle = getTopicDiscoveryBundle(input.sessionId);
  if (!bundle) {
    throw new Error("选题发现会话不存在。");
  }

  const candidate = bundle.topicAngles.find((item) => item.id === input.candidateId);
  if (!candidate) {
    throw new Error("候选题不存在。");
  }

  const hkrr = {
    happy: candidate.counterIntuition,
    knowledge: candidate.readerValue,
    resonance: candidate.whyNow,
    rhythm: candidate.recommendedNextStep,
    summary: `${candidate.angleTypeLabel} + ${candidate.coreJudgement}`,
  };
  const writingMoves = buildDefaultWritingMoves({
    topic: candidate.title,
    articleType: candidate.articleType,
    thesis: candidate.coreJudgement,
  });
  const cards = buildCardsFromLegacy({
    topic: candidate.title,
    articleType: candidate.articleType,
    audience: "关注上海板块和买房决策的读者",
    thesis: candidate.coreJudgement,
    notes: buildCandidateNotes(candidate),
    hkrr,
    hamd: {
      hook: candidate.counterIntuition,
      anchor: candidate.creativeAnchor,
      mindMap: candidate.signalRefs,
      different: candidate.whyNow,
    },
    writingMoves,
    thinkCard: {
      articlePrototype: candidate.articlePrototype,
      targetReaderPersona: candidate.targetReaderPersona,
      creativeAnchor: candidate.creativeAnchor,
      decisionImplication: candidate.readerValue,
    },
  });
  const compatibility = deriveLegacyFrames({
    topic: candidate.title,
    articleType: candidate.articleType,
    thesis: candidate.coreJudgement,
    thinkCard: cards.thinkCard,
    styleCore: cards.styleCore,
    currentHAMD: {
      hook: candidate.counterIntuition,
      anchor: candidate.creativeAnchor,
      mindMap: candidate.signalRefs,
      different: candidate.whyNow,
    },
    currentWritingMoves: writingMoves,
  });

  const project: ArticleProject = {
    id: createId("proj"),
    topic: candidate.title,
    audience: "关注上海板块和买房决策的读者",
    articleType: candidate.articleType,
    stage: "ThinkCard / HKR",
    thesis: candidate.coreJudgement,
    coreQuestion: `这篇文章要回答，为什么“${candidate.counterIntuition}”会成立，以及读者现在该如何判断 ${candidate.title}。`,
    targetWords: 2600,
    notes: buildCandidateNotes(candidate),
    topicMeta: {
      signalMode: bundle.session.searchMode,
      signalBrief: bundle.signalBrief
        ? {
            queries: bundle.signalBrief.queries,
            signals: bundle.signalBrief.signals,
            gaps: bundle.signalBrief.gaps,
            freshnessNote: bundle.signalBrief.freshnessNote,
          }
        : null,
      topicScorecard: candidate.topicScorecard,
      readerLens: candidate.readerLens,
      selectedAngleId: candidate.id,
      selectedAngleTitle: candidate.title,
    },
    thinkCard: cards.thinkCard,
    styleCore: cards.styleCore,
    vitalityCheck: cards.vitalityCheck,
    hkrr: compatibility.hkrr,
    hamd: compatibility.hamd,
    writingMoves: compatibility.writingMoves,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  createProject(project);

  const selectedPreSourceCards =
    input.selectedPreSourceCardIds?.length
      ? bundle.preSourceCards.filter((card) => input.selectedPreSourceCardIds?.includes(card.id) && card.extractStatus === "ready")
      : bundle.preSourceCards.filter((card) => card.extractStatus === "ready");

  for (const card of selectedPreSourceCards) {
    createSourceCard({
      id: createId("sc"),
      projectId: project.id,
      title: card.sourceTitle,
      url: card.url,
      note: "topic discovery 导入",
      publishedAt: card.publishedAt,
      summary: card.summary,
      evidence: card.keyClaims[0] || card.summary,
      credibility: "中",
      sourceType: card.sourceType,
      supportLevel: "medium",
      claimType: "fact",
      timeSensitivity: card.publishedAt ? "timely" : "volatile",
      intendedSection: "",
      reliabilityNote: card.riskHints.join("；"),
      tags: card.signalTags,
      zone: "topic-discovery",
      rawText: card.rawContentRef,
      createdAt: nowIso(),
    });
  }

  return project;
}

function buildSessionIntuitionText(session: TopicDiscoverySession, cards: PreSourceCard[]) {
  const focusText = session.focusPoints.length > 0 ? `关注方向：${session.focusPoints.join("；")}` : "";
  const rawMaterialsText = session.rawMaterials ? `用户生肉材料：${session.rawMaterials}` : "";
  const cardText = cards
    .filter((card) => card.extractStatus === "ready")
    .map((card) => `${card.sourceTitle}：${card.summary}`)
    .slice(0, 4)
    .join("\n");

  return [session.intuition, focusText, rawMaterialsText, cardText].filter(Boolean).join("\n");
}

function buildSessionRawMaterials(session: TopicDiscoverySession, cards: PreSourceCard[]) {
  const focusText = session.focusPoints.length > 0 ? `关注方向：${session.focusPoints.join("；")}` : "";
  const rawMaterialsText = session.rawMaterials ? `用户生肉材料：\n${session.rawMaterials}` : "";
  const cardText = cards
    .map((card, index) =>
      `${index + 1}. ${card.sourceTitle} | ${card.url}\n摘要：${card.summary || "暂无"}\n关键判断：${card.keyClaims.join("；") || "暂无"}\n风险提示：${card.riskHints.join("；") || "暂无"}`,
    )
    .join("\n\n");
  return [focusText, rawMaterialsText, cardText].filter(Boolean).join("\n\n");
}

function inferPreSourceType(note: string) {
  if (note.includes("微信公众号")) {
    return "media";
  }
  if (note.includes("自动抓取自")) {
    return "commentary";
  }
  return "media";
}

function buildPreSourceRiskHints(input: { publishedAt: string; evidence: string; note: string }) {
  const hints: string[] = [];
  if (!input.publishedAt) {
    hints.push("缺少明确发布时间");
  }
  if (!input.evidence) {
    hints.push("缺少清晰证据片段");
  }
  if (input.note.includes("浏览器")) {
    hints.push("该链接依赖浏览器抓取，稳定性较弱");
  }
  return hints;
}

function buildCandidateNotes(candidate: TopicAngle) {
  return [
    `【角度类型】${candidate.angleTypeLabel}`,
    `【文章原型】${candidate.articlePrototype}`,
    `【目标读者】${candidate.targetReaderPersona}`,
    `【核心判断】${candidate.coreJudgement}`,
    `【反常识】${candidate.counterIntuition}`,
    `【读者价值】${candidate.readerValue}`,
    `【信号引用】${candidate.signalRefs.join("；") || "暂无"}`,
    `【创作锚点】${candidate.creativeAnchor}`,
  ].join("\n");
}
