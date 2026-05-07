import test from "node:test";
import assert from "node:assert/strict";

const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");
const { buildPublishPackage } = await import("../lib/publish.ts");

function projectFixture() {
  const base = {
    topic: "莘庄-外环外价格最高",
    articleType: "价值重估型",
    audience: "关注上海板块和买房决策的读者",
    thesis: "莘庄的高房价不是泡沫，而是城市骨架外延和资源沉淀的自然结果。",
    notes: "",
  };
  const cards = buildCardsFromLegacy(base);
  return {
    id: "proj_publish_fixture",
    ...base,
    stage: "发布前整理",
    coreQuestion: "为什么莘庄作为外环外的板块，房价却能领跑外环外？",
    targetWords: 2200,
    topicMeta: {
      signalMode: null,
      signalBrief: null,
      topicScorecard: null,
      readerLens: [],
      selectedAngleId: null,
      selectedAngleTitle: null,
    },
    ...cards,
    hamd: {
      hook: "如：‘贵。但贵得有道理。’ 或 ‘代价。那就是成熟本身。’",
      anchor: "回扣环线困惑。",
      mindMap: [],
      different: "解释外环外误解。",
    },
    styleCore: {
      ...cards.styleCore,
      sentenceBreak: "如：‘贵。但贵得有道理。’ 或 ‘代价。那就是成熟本身。’",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

test("deterministic publish package filters placeholder title seeds", () => {
  const publishPackage = buildPublishPackage({
    project: projectFixture(),
    finalMarkdown: [
      "# 外环外最贵的板块，贵得有理吗？",
      "",
      "莘庄不是一个外环外的反常样本，而是一种更早熟的城市节点。",
      "",
      "真正要问的是：莘庄的贵，到底买的是房子本身，还是买一个已经兑现的城市位置？",
      "",
      "贵出来的部分不是为故事付费，而是为少一点不确定性付费。[SC:sc_a]",
    ].join("\n"),
  });

  assert.doesNotMatch(publishPackage.titleOptions[0].title, /^如[:：]/);
  assert.doesNotMatch(publishPackage.titleOptions[0].title, / 或 /);
  assert.match(publishPackage.titleOptions[0].title, /早熟城市节点|确定性|环线/);
  assert.doesNotMatch(publishPackage.summary, /\[SC:/);
  assert.match(publishPackage.summary, /真正要问的是/);
});

test("deterministic publish package aligns image cues with inserted placements", () => {
  const publishPackage = buildPublishPackage({
    project: projectFixture(),
    finalMarkdown: [
      "# 外环外最贵的板块，贵得有理吗？",
      "",
      "真正要问的是：莘庄的贵，到底买的是房子本身，还是买一个已经兑现的城市位置？",
      "",
      "## 不是睡城，而是城市节点：骨架是怎么搭起来的",
      "",
      "莘庄不只是交通，还包括成熟生活资源。[SC:sc_a]",
      "",
      "## 同板块内，每平米差2万：价差揭示了什么",
      "",
      "莘庄内部不是均质的。[SC:sc_b]",
      "",
      "## 成熟的代价：该怎么看莘庄的‘贵’",
      "",
      "它是确定性和代价的交换。[SC:sc_c]",
    ].join("\n"),
  });

  const placements = publishPackage.finalMarkdown.match(/\[配图位[^\]]+\]/g) ?? [];
  assert.equal(placements.length, publishPackage.imageCues.length);
  assert.deepEqual(placements, [
    "[配图位：环线误解 / 节点总图]",
    "[配图位：交通与生活资源叠加图]",
    "[配图位：内部产品与价格阶梯图]",
    "[配图位：确定性与代价对照卡]",
  ]);
});
