import test from "node:test";
import assert from "node:assert/strict";

const {
  defaultThinkCard,
  defaultStyleCore,
  getThinkCardGate,
  isThinkCardComplete,
  isStyleCoreComplete,
} = await import("../lib/author-cards.ts");

test("default think card and style core include new decision fields", () => {
  const thinkCard = defaultThinkCard({
    topic: "塘桥为什么涨不动",
    articleType: "价值重估型",
    thesis: "真正的问题不是位置，而是结构。",
  });
  const styleCore = defaultStyleCore({
    topic: "塘桥为什么涨不动",
    articleType: "价值重估型",
    thesis: "真正的问题不是位置，而是结构。",
  });

  assert.ok(thinkCard.coreJudgement.length > 0);
  assert.ok(thinkCard.articlePrototype.length > 0);
  assert.ok(thinkCard.targetReaderPersona.length > 0);
  assert.ok(thinkCard.creativeAnchor.length > 0);
  assert.ok(thinkCard.counterIntuition.length > 0);
  assert.ok(thinkCard.readerPayoff.length > 0);
  assert.ok(thinkCard.decisionImplication.length > 0);
  assert.ok(thinkCard.excludedTakeaways.length > 0);

  assert.ok(styleCore.allowedMoves.length > 0);
  assert.ok(styleCore.forbiddenMoves.length > 0);
  assert.ok(styleCore.allowedMetaphors.length > 0);
  assert.ok(styleCore.openingMoves.length > 0);
  assert.ok(styleCore.transitionMoves.length > 0);
  assert.ok(styleCore.endingEchoMoves.length > 0);
  assert.ok(styleCore.toneCeiling.length > 0);
  assert.ok(styleCore.concretenessRequirement.length > 0);
  assert.ok(styleCore.forbiddenFabrications.length > 0);
  assert.ok(styleCore.genericLanguageBlackList.length > 0);
});

test("completeness checks account for new think card and style core fields", () => {
  const thinkCard = defaultThinkCard({
    topic: "塘桥为什么涨不动",
    articleType: "价值重估型",
    thesis: "真正的问题不是位置，而是结构。",
  });
  const styleCore = defaultStyleCore({
    topic: "塘桥为什么涨不动",
    articleType: "价值重估型",
    thesis: "真正的问题不是位置，而是结构。",
  });

  assert.equal(isThinkCardComplete(thinkCard), true);
  assert.equal(isStyleCoreComplete(styleCore), true);
});

test("strong think card can proceed without rewrite suggestion", () => {
  const thinkCard = defaultThinkCard({
    topic: "莘庄-外环外价格最高",
    articleType: "价值重估型",
    thesis: "外环外高价格与惯性认知强烈对冲。",
  });

  thinkCard.topicVerdict = "strong";
  thinkCard.rewriteSuggestion = "";

  assert.equal(isThinkCardComplete(thinkCard), true);
  assert.deepEqual(getThinkCardGate(thinkCard), {
    status: "pass",
    message: "选题判断已过线。",
    needsForce: false,
  });
});

test("rework or weak think card still requires rewrite suggestion", () => {
  const thinkCard = defaultThinkCard({
    topic: "莘庄-外环外价格最高",
    articleType: "价值重估型",
    thesis: "外环外高价格与惯性认知强烈对冲。",
  });

  thinkCard.topicVerdict = "rework";
  thinkCard.rewriteSuggestion = "";

  assert.equal(isThinkCardComplete(thinkCard), false);
  assert.deepEqual(getThinkCardGate(thinkCard), {
    status: "fail",
    message: "需要重做的选题必须先补齐改方向建议。",
    needsForce: false,
  });

  thinkCard.topicVerdict = "weak";

  assert.equal(isThinkCardComplete(thinkCard), false);
  assert.deepEqual(getThinkCardGate(thinkCard), {
    status: "fail",
    message: "弱选题必须先补齐改方向建议。",
    needsForce: false,
  });
});
