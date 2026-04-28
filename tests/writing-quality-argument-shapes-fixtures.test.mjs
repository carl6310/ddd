import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { ARGUMENT_SHAPES } = await import("../lib/types.ts");
const { runDeterministicReview } = await import("../lib/review.ts");

const fixtureFile = new URL("../evals/fixtures/writing-quality/argument-shapes.json", import.meta.url);
const docsFile = new URL("../docs/argument-shapes.md", import.meta.url);
const payload = JSON.parse(readFileSync(fixtureFile, "utf8"));
const docs = readFileSync(docsFile, "utf8");

function xinzhuangSectorModel() {
  return {
    summaryJudgement: "莘庄房价有支撑，但安全边际不厚。",
    misconception: "只把莘庄看成外环外贵价板块。",
    spatialBackbone: "南北广场、商务区和春申共同构成价格支撑。",
    cutLines: ["铁路", "沪闵路"],
    zones: [
      { id: "z1", name: "北广场", label: "学区支撑", description: "学区和次新支撑价格。", evidenceIds: ["sc_a"], strengths: ["学区"], risks: ["贵"], suitableBuyers: ["改善"] },
      { id: "z2", name: "南广场", label: "老城底盘", description: "老城生活底盘强。", evidenceIds: ["sc_b"], strengths: ["成熟"], risks: ["房龄"], suitableBuyers: ["刚需"] },
      { id: "z3", name: "商务区", label: "TOD预期", description: "商务区承接规划预期。", evidenceIds: ["sc_c"], strengths: ["TOD"], risks: ["兑现慢"], suitableBuyers: ["改善"] },
      { id: "z4", name: "春申", label: "外溢承接", description: "春申承接外溢需求。", evidenceIds: ["sc_d"], strengths: ["承接"], risks: ["通勤"], suitableBuyers: ["首改"] },
    ],
    supplyObservation: "新增供应有限。",
    futureWatchpoints: ["TOD"],
    evidenceIds: ["sc_a", "sc_b", "sc_c", "sc_d"],
  };
}

function sourceCards() {
  return ["sc_a", "sc_b", "sc_c", "sc_d"].map((id) => ({
    id,
    title: `资料 ${id}`,
    summary: "莘庄房价、供应和片区差异资料。",
    evidence: "莘庄房价、供应和片区差异资料。",
    credibility: "高",
    sourceType: "media",
    supportLevel: "high",
    claimType: "fact",
    timeSensitivity: "timely",
    intendedSection: "",
    reliabilityNote: "",
    tags: [],
    zone: "",
    rawText: "",
    projectId: "p",
    url: "",
    note: "",
    publishedAt: "",
    createdAt: "",
  }));
}

function runShapeReview(fixture, headings) {
  const sections = headings.map((heading, index) => ({
    id: `s${index + 1}`,
    heading,
    purpose: "推进论证",
    sectionThesis: fixture.answer,
    singlePurpose: "服务主判断",
    mustLandDetail: "价格支撑和风险边界",
    sceneOrCost: "",
    mainlineSentence: "回到主判断",
    callbackTarget: "",
    microStoryNeed: "",
    discoveryTurn: "",
    opposingView: "",
    readerUsefulness: "帮助读者判断",
    evidenceIds: [`sc_${String.fromCharCode(97 + Math.min(index, 3))}`],
    mustUseEvidenceIds: [],
    tone: "",
    move: "",
    break: "",
    bridge: "",
    transitionTarget: "",
    counterPoint: "",
    styleObjective: "",
    keyPoints: [],
    expectedTakeaway: "形成判断",
  }));
  const body = headings
    .map((heading, index) => {
      const citation = `sc_${String.fromCharCode(97 + Math.min(index, 3))}`;
      return `## ${heading}\n${fixture.answer} 这一节说明成熟确定性、资产分层和风险边界，所以读者要看预算与等待周期。[SC:${citation}]`;
    })
    .join("\n\n");

  return runDeterministicReview({
    articleType: "价值重估型",
    thesis: fixture.answer,
    hkrr: {
      happy: "看懂误解",
      knowledge: "判断框架",
      resonance: "买房焦虑",
      rhythm: "连续推进",
      summary: "主线",
    },
    hamd: {
      hook: fixture.topic,
      anchor: fixture.answer,
      mindMap: [],
      different: fixture.centralTension,
    },
    writingMoves: {
      freshObservation: fixture.centralTension,
      narrativeDrive: "连续推进",
      breakPoint: "短句",
      signatureLine: fixture.answer,
      personalPosition: "我更愿意这样看",
      characterScene: "",
      culturalLift: "上海结构",
      echoLine: fixture.answer,
      readerAddress: "你会发现",
      costSense: "门槛和代价",
    },
    outlineDraft: {
      hook: fixture.topic,
      argumentFrame: {
        primaryShape: fixture.primaryShape,
        secondaryShapes: fixture.secondaryShapes,
        centralTension: fixture.centralTension,
        answer: fixture.answer,
        notThis: fixture.notThis,
        supportingClaims: [
          {
            id: "claim-1",
            claim: fixture.answer,
            role: "prove",
            evidenceIds: ["sc_a"],
            mustUseEvidenceIds: [],
            zonesAsEvidence: ["北广场", "南广场", "商务区", "春申"],
            shouldNotBecomeSection: true,
          },
        ],
        strongestCounterArgument: "反方认为短期成交信号说明价格撑不住。",
        howToHandleCounterArgument: "承认短期压力，但把它限定到资产分层和安全边际。",
        readerDecisionFrame: "读者按预算、等待周期和风险承受力判断。",
      },
      sections,
      closing: "结尾",
    },
    sectorModel: xinzhuangSectorModel(),
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: `# ${fixture.topic}\n\n${fixture.answer}\n\n${body}\n\n最后，读者要看预算、等待周期和风险承受力。`,
    },
    sourceCards: sourceCards(),
  });
}

test("each argument shape has docs coverage", () => {
  for (const shape of ARGUMENT_SHAPES) {
    assert.match(docs, new RegExp(`### ${shape}\\b`), `missing docs for ${shape}`);
  }
});

test("each argument shape has a fixture", () => {
  const fixtureShapes = new Set(payload.fixtures.map((fixture) => fixture.primaryShape));

  for (const shape of ARGUMENT_SHAPES) {
    assert.ok(fixtureShapes.has(shape), `missing fixture for ${shape}`);
  }
});

test("no argument shape fixture has empty centralTension or answer", () => {
  for (const fixture of payload.fixtures) {
    assert.ok(fixture.centralTension.trim(), `${fixture.id} centralTension is empty`);
    assert.ok(fixture.answer.trim(), `${fixture.id} answer is empty`);
  }
});

test("judgement_essay bad fixture triggers map_tour", () => {
  const fixture = payload.fixtures.find((item) => item.primaryShape === "judgement_essay");
  const review = runShapeReview(fixture, fixture.badOutlineHeadings);
  const flags = new Set((review.argumentQualityFlags ?? []).map((flag) => flag.type));

  assert.ok(flags.has("map_tour_in_judgement_essay"));
  for (const expected of fixture.expectedFlags) {
    assert.ok(flags.has(expected), `expected ${expected}`);
  }
});

test("judgement_essay good fixture does not trigger map_tour", () => {
  const fixture = payload.fixtures.find((item) => item.primaryShape === "judgement_essay");
  const review = runShapeReview(fixture, fixture.goodOutlineHeadings);
  const flags = new Set((review.argumentQualityFlags ?? []).map((flag) => flag.type));

  assert.ok(!flags.has("map_tour_in_judgement_essay"));
});
