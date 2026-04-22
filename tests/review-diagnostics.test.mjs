import test from "node:test";
import assert from "node:assert/strict";

const { runDeterministicReview } = await import("../lib/review.ts");

test("deterministic review emits section scores, paragraph flags, and rewrite intents", () => {
  const review = runDeterministicReview({
    articleType: "价值重估型",
    thesis: "塘桥真正的问题不是位置，而是结构。",
    hamd: {
      hook: "不是近就等于红利",
      anchor: "不是一个板块，而是几种生活路径",
      mindMap: [],
      different: "纠偏地图误解",
    },
    hkrr: {
      happy: "看懂板块",
      knowledge: "结构拆解",
      resonance: "买房焦虑",
      rhythm: "有推进",
      summary: "主判断",
    },
    writingMoves: {
      freshObservation: "不是一个板块，而是几种生活路径",
      narrativeDrive: "层层推进",
      breakPoint: "短句打断",
      signatureLine: "真正决定价值的是结构",
      personalPosition: "我更愿意这样看",
      characterScene: "早高峰通勤",
      culturalLift: "放到上海结构看",
      echoLine: "回到开头",
      readerAddress: "你会发现",
      costSense: "代价和门槛",
    },
    outlineDraft: {
      hook: "开头",
      sections: [
        {
          id: "s1",
          heading: "先把误解拨开",
          purpose: "纠偏",
          sectionThesis: "真正的问题不是位置，而是结构。",
          singlePurpose: "先纠偏",
          mustLandDetail: "把主判断立住",
          sceneOrCost: "先落一个误判场景",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
          tone: "快",
          move: "纠偏",
          break: "短句",
          bridge: "转骨架",
          transitionTarget: "空间骨架",
          counterPoint: "回应位置误判",
          styleObjective: "判断力",
          keyPoints: ["误解", "主判断"],
          expectedTakeaway: "知道不是看标签",
        },
      ],
      closing: "结尾",
    },
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [
        { id: "z1", name: "北片", label: "错位核心", description: "说明", evidenceIds: ["sc_a"], strengths: ["优势"], risks: ["风险"], suitableBuyers: ["人群"] },
        { id: "z2", name: "南片", label: "安静睡城", description: "说明", evidenceIds: ["sc_b"], strengths: ["优势"], risks: ["风险"], suitableBuyers: ["人群"] },
        { id: "z3", name: "东片", label: "过渡带", description: "说明", evidenceIds: ["sc_c"], strengths: ["优势"], risks: ["风险"], suitableBuyers: ["人群"] },
      ],
      supplyObservation: "供应判断",
      futureWatchpoints: ["未来"],
      evidenceIds: ["sc_a", "sc_b"],
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown:
        "# 标题\n\n大家都觉得塘桥离核心近，所以天然该涨。\n\n## 先把误解拨开\n很多人看到地图就下判断，但这段没有真正把证据织进去，也没有承接下一段。\n\n最后收得也很平。",
    },
    sourceCards: [
      { id: "sc_a", title: "卡A", summary: "摘要", evidence: "证据", credibility: "高", sourceType: "media", supportLevel: "high", claimType: "fact", timeSensitivity: "timely", intendedSection: "先把误解拨开", reliabilityNote: "", tags: [], zone: "", rawText: "", projectId: "p", url: "", note: "", publishedAt: "", createdAt: "" },
      { id: "sc_b", title: "卡B", summary: "摘要", evidence: "证据", credibility: "中", sourceType: "official", supportLevel: "medium", claimType: "fact", timeSensitivity: "timely", intendedSection: "", reliabilityNote: "", tags: [], zone: "", rawText: "", projectId: "p", url: "", note: "", publishedAt: "", createdAt: "" },
    ],
  });

  assert.ok(review.globalScore >= 0);
  assert.ok(review.sectionScores.length >= 1);
  assert.ok(review.paragraphFlags.length >= 1);
  assert.ok(review.rewriteIntents.length >= 1);
});
