import test from "node:test";
import assert from "node:assert/strict";

const postprocessModule = await import("../lib/topic-cocreate-postprocess.ts");

test("normalizeAngleType maps aliases and heuristics to canonical buckets", () => {
  assert.equal(postprocessModule.normalizeAngleType("反常识型"), "counterintuitive");
  assert.equal(postprocessModule.normalizeAngleType("空间结构"), "spatial_segmentation");
  assert.equal(postprocessModule.normalizeAngleType("unknown", "这条题最容易被忽略的是谁适合买"), "buyer_segment");
  assert.equal(postprocessModule.normalizeAngleType("unknown", "真正要拆开的其实是风险和代价"), "risk_deconstruction");
});

test("postprocess dedupes near-duplicate angles and builds coverage summary", () => {
  const rawAngles = [
    {
      title: "为什么唐镇明明不差，却总没长成大家以为的样子",
      angleType: "反常识型",
      articleType: "误解纠偏型",
      coreJudgement: "唐镇真正的问题，不是规划有没有，而是优势没有自然转成完整板块价值。",
      counterIntuition: "规划不差，不等于价值自然兑现。",
      readerValue: "帮助读者重新判断唐镇到底卡在哪。",
      whyNow: "最近市场还在用老标签理解它。",
      neededEvidence: ["规划兑现时间线", "片区差异"],
      riskOfMisfire: "如果不够具体，就会变成空泛纠偏。",
      recommendedNextStep: "先补规划兑现和片区差异证据。",
    },
    {
      title: "为什么唐镇明明不差，却总没长成大家以为的样子",
      angleType: "counterintuitive",
      articleType: "误解纠偏型",
      coreJudgement: "唐镇真正的问题，不是规划有没有，而是优势没有自然转成完整板块价值。",
      counterIntuition: "规划不差，不等于价值自然兑现。",
      readerValue: "帮助读者重新判断唐镇到底卡在哪。",
      whyNow: "旧标签还在主导判断。",
      neededEvidence: ["规划兑现时间线", "片区差异"],
      riskOfMisfire: "如果不够具体，就会变成空泛纠偏。",
      recommendedNextStep: "先补规划兑现和片区差异证据。",
    },
    {
      title: "唐镇真正该被看见的，不是统一标签，而是那条把价值切开的分界线",
      angleType: "空间切割型",
      articleType: "规划拆解型",
      coreJudgement: "唐镇最值得写的，不是统一标签，而是内部那条决定板块上限的分界线。",
      counterIntuition: "同一个板块里的不同片区，可能根本不是同一套逻辑。",
      readerValue: "帮助读者看懂为什么同板块也会买进不同世界。",
      whyNow: "现在最缺的是把空间边界写具体。",
      neededEvidence: ["分界线地图", "片区功能差异"],
      riskOfMisfire: "如果没有分界线，这条题会变抽象。",
      recommendedNextStep: "先落一张片区切割图。",
    },
    {
      title: "唐镇最容易被忽略的，不是值不值买，而是它到底更适合哪一类人",
      angleType: "buyer_segment",
      articleType: "价值重估型",
      coreJudgement: "唐镇真正该回答的，不只是值不值得买，而是它到底更适合哪类预算和生活路径的人。",
      counterIntuition: "不是所有贴着核心的板块，都适合所有想进核心的人。",
      readerValue: "帮助读者把板块判断落回人群适配。",
      whyNow: "读者真正缺的是决策，而不是再听一个标签。",
      neededEvidence: ["典型买家画像", "预算与通勤门槛"],
      riskOfMisfire: "如果没有生活体感和预算门槛，会变成泛泛购房建议。",
      recommendedNextStep: "先列出最适合和最不适合的两类买家。",
    },
  ];

  const result = postprocessModule.postprocessTopicCoCreateResult({
    sector: "唐镇",
    rawAngles,
    sourceBasis: ["一次带看记录"],
  });

  assert.equal(result.recommendedAngles.length, 3);
  assert.equal(result.angleLonglist.length, 3);
  assert.equal(result.coverageSummary.duplicatesMerged, 1);
  assert.deepEqual(result.coverageSummary.includedTypes, ["counterintuitive", "spatial_segmentation", "buyer_segment"]);
  assert.equal(result.angles.length, result.recommendedAngles.length);
  assert.ok(result.recommendedAngles.every((angle) => typeof angle.articlePrototype === "string"));
  assert.ok(result.recommendedAngles.every((angle) => typeof angle.hkr.total === "number"));
  assert.ok(result.recommendedAngles.every((angle) => typeof angle.topicScorecard.status === "string"));
});

test("filterAnglesByType returns the expected subset", () => {
  const angles = [
    {
      id: "a",
      title: "A",
      angleType: "counterintuitive",
      angleTypeLabel: "反常识型",
      articleType: "误解纠偏型",
      articlePrototype: "risk_deconstruction",
      targetReaderPersona: "risk_aware_reader",
      creativeAnchor: "风险拆解",
      coreJudgement: "A judgement",
      counterIntuition: "A intuition",
      readerValue: "A value",
      whyNow: "A now",
      hkr: { h: 4, k: 3, r: 4, total: 11 },
      readerLens: ["risk_aware_reader"],
      signalRefs: [],
      neededEvidence: ["A evidence"],
      riskOfMisfire: "A risk",
      recommendedNextStep: "A next",
      sourceBasis: [],
      topicScorecard: {
        status: "needs_more_signals",
        hkr: { h: 4, k: 3, r: 4, total: 11 },
        readerValueSummary: "A value",
        signalCoverageSummary: "A coverage",
        evidenceRisk: "A risk",
        recommendation: "A recommendation",
        canForceProceed: true,
      },
    },
    {
      id: "b",
      title: "B",
      angleType: "comparative",
      angleTypeLabel: "对比参照型",
      articleType: "价值重估型",
      articlePrototype: "total_judgement",
      targetReaderPersona: "busy_relocator",
      creativeAnchor: "比较锚点",
      coreJudgement: "B judgement",
      counterIntuition: "B intuition",
      readerValue: "B value",
      whyNow: "B now",
      hkr: { h: 4, k: 4, r: 3, total: 11 },
      readerLens: ["busy_relocator"],
      signalRefs: [],
      neededEvidence: ["B evidence"],
      riskOfMisfire: "B risk",
      recommendedNextStep: "B next",
      sourceBasis: [],
      topicScorecard: {
        status: "ready_to_open",
        hkr: { h: 4, k: 4, r: 3, total: 11 },
        readerValueSummary: "B value",
        signalCoverageSummary: "B coverage",
        evidenceRisk: "B risk",
        recommendation: "B recommendation",
        canForceProceed: false,
      },
    },
  ];

  assert.equal(postprocessModule.filterAnglesByType(angles, "all").length, 2);
  assert.deepEqual(postprocessModule.filterAnglesByType(angles, "comparative").map((angle) => angle.id), ["b"]);
});
