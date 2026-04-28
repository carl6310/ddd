import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const { ARGUMENT_SHAPES } = await import("../lib/types.ts");
const { buildPromptTask } = await import("../lib/prompt-engine.ts");
const { runStructuredTask } = await import("../lib/llm.ts");
const { buildFallbackArgumentFrame, inferArgumentShapeFromTopic, normalizeArgumentFrame } = await import("../lib/argument-frame.ts");
const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");
const { generateOutlineStep } = await import("../lib/services/steps/generate-outline.ts");
const {
  createProject,
  createSourceCard,
  getOutlineDraft,
  saveResearchBrief,
  saveSectorModel,
} = await import("../lib/repository.ts");

function projectFixture(patch = {}) {
  return {
    topic: "莘庄房价高估了吗？",
    thesis: "莘庄房价不是简单高估，而是支撑强但安全边际不厚。",
    coreQuestion: "莘庄房价高估了吗？",
    articleType: "价值重估型",
    thinkCard: {
      materialDigest: "",
      topicVerdict: "strong",
      verdictReason: "",
      coreJudgement: "不是简单高估。",
      articlePrototype: "total_judgement",
      targetReaderPersona: "risk_aware_reader",
      creativeAnchor: "",
      counterIntuition: "",
      readerPayoff: "",
      decisionImplication: "",
      excludedTakeaways: [],
      hkr: { happy: "", knowledge: "", resonance: "", summary: "" },
      rewriteSuggestion: "",
      alternativeAngles: [],
      aiRole: "",
    },
    styleCore: {
      rhythm: "",
      breakPattern: "",
      openingMoves: [],
      transitionMoves: [],
      endingEchoMoves: [],
      knowledgeDrop: "",
      personalView: "",
      judgement: "",
      counterView: "",
      allowedMoves: [],
      forbiddenMoves: [],
      allowedMetaphors: [],
      emotionCurve: "",
      personalStake: "",
      characterPortrait: "",
      culturalLift: "",
      sentenceBreak: "",
      echo: "",
      humbleSetup: "",
      toneCeiling: "",
      concretenessRequirement: "",
      costSense: "",
      forbiddenFabrications: [],
      genericLanguageBlackList: [],
      unsupportedSceneDetector: "",
    },
    topicMeta: {
      signalMode: null,
      signalBrief: null,
      topicScorecard: {
        status: "ready_to_open",
        hkr: { h: 4, k: 4, r: 4, total: 12 },
        readerValueSummary: "帮助读者判断莘庄是否值得买。",
        signalCoverageSummary: "有房价和供应信号。",
        evidenceRisk: "需要避免片区导览。",
        recommendation: "进入判断文。",
        canForceProceed: false,
      },
      readerLens: [],
      selectedAngleId: null,
      selectedAngleTitle: null,
    },
    ...patch,
  };
}

function sourceCard(id) {
  return {
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
    zone: "北广场",
    rawText: "",
    projectId: "p",
    url: "",
    note: "",
    publishedAt: "",
    createdAt: "",
  };
}

const sectorModel = {
  summaryJudgement: "莘庄房价有支撑，但安全边际不厚。",
  misconception: "只把莘庄看成外环外贵价板块。",
  spatialBackbone: "南北广场、商务区和春申共同构成价格支撑。",
  cutLines: ["铁路", "沪闵路"],
  zones: [
    { id: "z1", name: "北广场", label: "学区支撑", description: "学区和次新支撑价格。", evidenceIds: ["sc_a"], strengths: ["学区"], risks: ["贵"], suitableBuyers: ["改善"] },
    { id: "z2", name: "南广场", label: "老城底盘", description: "老城生活底盘强。", evidenceIds: ["sc_b"], strengths: ["成熟"], risks: ["房龄"], suitableBuyers: ["刚需"] },
  ],
  supplyObservation: "新增供应有限。",
  futureWatchpoints: ["TOD"],
  evidenceIds: ["sc_a", "sc_b"],
};

const fourZoneSectorModel = {
  ...sectorModel,
  zones: [
    ...sectorModel.zones,
    { id: "z3", name: "商务区", label: "TOD预期", description: "商务区承接规划预期。", evidenceIds: ["sc_c"], strengths: ["TOD"], risks: ["兑现慢"], suitableBuyers: ["改善"] },
    { id: "z4", name: "春申", label: "外溢承接", description: "春申承接外溢需求。", evidenceIds: ["sc_d"], strengths: ["承接"], risks: ["通勤"], suitableBuyers: ["首改"] },
  ],
  evidenceIds: ["sc_a", "sc_b", "sc_c", "sc_d"],
};

function judgementArgumentFrame(patch = {}) {
  return {
    primaryShape: "judgement_essay",
    secondaryShapes: ["risk_decomposition"],
    centralTension: "价格支撑和安全边际之间的张力。",
    answer: "不是简单高估，但安全边际不厚。",
    notThis: ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录"],
    supportingClaims: [
      {
        id: "claim-1",
        claim: "价格支撑来自成熟配套和供应约束。",
        role: "prove",
        evidenceIds: ["sc_a"],
        mustUseEvidenceIds: ["sc_a"],
        zonesAsEvidence: ["北广场", "南广场"],
        shouldNotBecomeSection: true,
      },
    ],
    strongestCounterArgument: "板块内部差异太大，不能一概而论。",
    howToHandleCounterArgument: "承认差异，并把差异作为判断边界。",
    readerDecisionFrame: "读者按预算、等待周期和风险承受力判断。",
    ...patch,
  };
}

function assertArgumentFrameSchema(frame) {
  assert.ok(ARGUMENT_SHAPES.includes(frame.primaryShape));
  assert.ok(Array.isArray(frame.secondaryShapes));
  assert.ok(frame.secondaryShapes.length <= 2);
  for (const shape of frame.secondaryShapes) {
    assert.ok(ARGUMENT_SHAPES.includes(shape));
  }
  assert.equal(typeof frame.centralTension, "string");
  assert.equal(typeof frame.answer, "string");
  assert.ok(Array.isArray(frame.notThis));
  assert.ok(Array.isArray(frame.supportingClaims));
  assert.ok(frame.supportingClaims.length >= 1);
  for (const claim of frame.supportingClaims) {
    assert.equal(typeof claim.id, "string");
    assert.equal(typeof claim.claim, "string");
    assert.ok(["open", "explain", "prove", "counter", "decision", "return"].includes(claim.role));
    assert.ok(Array.isArray(claim.evidenceIds));
    assert.ok(Array.isArray(claim.mustUseEvidenceIds));
    assert.ok(claim.zonesAsEvidence === undefined || Array.isArray(claim.zonesAsEvidence));
    assert.ok(claim.shouldNotBecomeSection === undefined || typeof claim.shouldNotBecomeSection === "boolean");
  }
  assert.equal(typeof frame.strongestCounterArgument, "string");
  assert.equal(typeof frame.howToHandleCounterArgument, "string");
  assert.equal(typeof frame.readerDecisionFrame, "string");
}

function sectionFixture(id = "section-1") {
  return {
    id,
    heading: "判断先行",
    purpose: "回答标题问题",
    sectionThesis: "不是简单高估。",
    singlePurpose: "先给答案",
    mustLandDetail: "价格支撑和风险边界。",
    sceneOrCost: "",
    mainlineSentence: "回到判断本身。",
    callbackTarget: "",
    microStoryNeed: "",
    discoveryTurn: "",
    opposingView: "",
    readerUsefulness: "读者知道如何判断。",
    evidenceIds: [],
    mustUseEvidenceIds: [],
    tone: "",
    move: "",
    break: "",
    bridge: "",
    transitionTarget: "",
    counterPoint: "",
    styleObjective: "",
    keyPoints: [],
    expectedTakeaway: "形成条件化判断。",
  };
}

test("argument shapes expose the milestone 1 shape list", () => {
  assert.deepEqual(ARGUMENT_SHAPES, [
    "judgement_essay",
    "misread_correction",
    "signal_reinterpretation",
    "lifecycle_reframe",
    "asset_tiering",
    "mismatch_diagnosis",
    "tradeoff_decision",
    "risk_decomposition",
    "comparison_benchmark",
    "planning_reality_check",
    "cycle_timing",
    "buyer_persona_split",
  ]);
});

test("outline draft remains valid without argumentFrame", () => {
  const outlineDraft = {
    hook: "先回答问题。",
    sections: [sectionFixture()],
    closing: "回到读者决策。",
  };

  assert.equal(outlineDraft.argumentFrame, undefined);
  assert.equal(outlineDraft.sections[0].id, "section-1");
});

test("outline draft accepts an embedded argumentFrame artifact", () => {
  const outlineDraft = {
    hook: "先回答问题。",
    sections: [sectionFixture()],
    argumentFrame: {
      primaryShape: "judgement_essay",
      secondaryShapes: ["risk_decomposition", "tradeoff_decision"],
      centralTension: "价格支撑和安全边际之间的张力。",
      answer: "不是简单高估，但安全边际不厚。",
      notThis: ["不要写成片区导览", "不要让每个 zone 自动变成章节"],
      supportingClaims: [
        {
          id: "claim-1",
          claim: "价格支撑来自成熟配套和供应约束。",
          role: "prove",
          evidenceIds: ["sc_1"],
          mustUseEvidenceIds: ["sc_1"],
          zonesAsEvidence: ["北广场"],
          shouldNotBecomeSection: true,
        },
      ],
      strongestCounterArgument: "板块内部差异太大，不能一概而论。",
      howToHandleCounterArgument: "承认差异，并把差异作为判断边界。",
      readerDecisionFrame: "读者按预算、等待周期和风险承受力判断。",
    },
    closing: "回到读者决策。",
  };

  assert.equal(outlineDraft.argumentFrame.primaryShape, "judgement_essay");
  assert.deepEqual(outlineDraft.argumentFrame.notThis, ["不要写成片区导览", "不要让每个 zone 自动变成章节"]);
  assert.equal(outlineDraft.argumentFrame.supportingClaims[0].role, "prove");
  assert.equal(outlineDraft.argumentFrame.supportingClaims[0].shouldNotBecomeSection, true);
});

test("argument_framer prompt contains all 12 shape names", () => {
  const task = buildPromptTask("argument_framer", {
    project: projectFixture(),
    sectorModel,
    sourceCards: [sourceCard("sc_a"), sourceCard("sc_b")],
    researchBrief: { angle: "莘庄房价高估了吗？", mustResearch: [], questions: [], blindSpots: [], stageChecklist: [] },
  });

  for (const shape of ARGUMENT_SHAPES) {
    assert.match(`${task.system}\n${task.user}`, new RegExp(shape));
  }
});

test("argument_framer prompt requires judgement essay for 高估 questions unless user asks for map", () => {
  const task = buildPromptTask("argument_framer", {
    project: projectFixture({ topic: "莘庄房价高估了吗？", coreQuestion: "莘庄房价高估了吗？" }),
    sectorModel,
    sourceCards: [sourceCard("sc_a")],
  });

  assert.match(task.system, /高估 \/ 低估 \/ 值不值 \/ 还能不能买 \/ 泡沫 \/ 是否错过/);
  assert.match(task.system, /primaryShape 必须优先选 judgement_essay，除非用户明确要求地图式板块导览/);
  assert.match(task.system, /如果 topic 是 judgement question，不要产出 map tour/);
});

test("outline_writer prompt makes ArgumentFrame higher priority than SectorModel", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    argumentFrame: judgementArgumentFrame(),
    sourceCards: [sourceCard("sc_a"), sourceCard("sc_b")],
  });
  const prompt = `${task.system}\n${task.user}`;

  assert.match(prompt, /ArgumentFrame 优先级高于 SectorModel/);
  assert.match(prompt, /SectorModel is evidence map, not article structure/);
  assert.match(prompt, /primaryShape 决定文章结构/);
});

test("outline_writer prompt forbids consecutive zone sections for judgement essays", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    argumentFrame: judgementArgumentFrame(),
    sourceCards: [sourceCard("sc_a"), sourceCard("sc_b")],
  });
  const prompt = `${task.system}\n${task.user}`;

  assert.match(prompt, /judgement_essay/);
  assert.match(prompt, /表面信号 -> 真正矛盾 -> 支撑判断 -> 反面风险 -> 买房人决策框架/);
  assert.match(prompt, /不要创建 3\+ consecutive zone-heading sections/);
  assert.match(prompt, /不要把北广场\/南广场\/商务区\/春申写成连续 section headings/);
});

test("outline_writer prompt allows empty mustUseEvidenceIds for evidence-light sections", () => {
  const task = buildPromptTask("outline_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    argumentFrame: judgementArgumentFrame(),
    sourceCards: [sourceCard("sc_a")],
  });
  const prompt = `${task.system}\n${task.user}`;

  assert.match(prompt, /A section without new facts may have empty mustUseEvidenceIds/);
  assert.match(prompt, /decision \/ return section 如果不引入新事实，可以 evidence-light，mustUseEvidenceIds 可以为空/);
  assert.doesNotMatch(prompt, /每个 section 的 mustUseEvidenceIds 至少 1 个/);
});

test("outline_writer prompt includes all 12 shape-specific rules and notThis enforcement", () => {
  const frame = judgementArgumentFrame({
    notThis: ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录", "不要写成北广场南广场春申流水账"],
  });
  const task = buildPromptTask("outline_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    argumentFrame: frame,
    sourceCards: [sourceCard("sc_a")],
  });
  const prompt = `${task.system}\n${task.user}`;

  for (const shape of ARGUMENT_SHAPES) {
    assert.match(prompt, new RegExp(`${shape}：section`));
  }
  for (const item of frame.notThis) {
    assert.match(prompt, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(prompt, /outline_writer 必须显式避开 argumentFrame.notThis 里的每一项/);
});

test("draft_writer prompt includes ArgumentFrame and preserves ContinuityLedger priority", () => {
  const task = buildPromptTask("draft_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    outlineDraft: {
      hook: "开头",
      argumentFrame: judgementArgumentFrame(),
      continuityLedger: {
        articleQuestion: "莘庄房价高估了吗？",
        spine: {
          centralQuestion: "价格是否被高估？",
          openingMisread: "只看片区名。",
          realProblem: "价格支撑和风险边界。",
          readerPromise: "给读者决策框架。",
          finalReturn: "回到是否值得买。",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "表面信号",
            role: "raise_misread",
            inheritedQuestion: "为什么大家觉得高估？",
            answerThisSection: "因为价格看起来贵。",
            newInformation: "贵不等于高估。",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "那支撑是什么？",
            nextSectionNecessity: "必须进入支撑判断。",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [
        { ...sectionFixture("s1"), heading: "北广场" },
        { ...sectionFixture("s2"), heading: "南广场" },
        { ...sectionFixture("s3"), heading: "商务区" },
      ],
      closing: "结尾",
    },
    sourceCards: [sourceCard("sc_a")],
  });
  const prompt = `${task.system}\n${task.user}`;

  assert.match(prompt, /ArgumentFrame：/);
  assert.match(prompt, /ContinuityLedger：/);
  assert.match(prompt, /ArgumentFrame decides the article's argumentative shape/);
  assert.match(prompt, /ContinuityLedger decides section handoff/);
  assert.match(prompt, /Outline sections are draft plan, not a prison/);
  assert.match(prompt, /如果 Outline sections 和 ArgumentFrame 冲突，优先服从 ArgumentFrame/);
});

test("draft_writer prompt makes judgement essay zones evidence rather than sections", () => {
  const task = buildPromptTask("draft_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    outlineDraft: {
      hook: "开头",
      argumentFrame: judgementArgumentFrame(),
      continuityLedger: undefined,
      sections: [],
      closing: "结尾",
    },
    sourceCards: [sourceCard("sc_a")],
  });
  const prompt = `${task.system}\n${task.user}`;

  assert.match(prompt, /primaryShape=judgement_essay/);
  assert.match(prompt, /zone material 合并进 claim-led sections/);
  assert.match(prompt, /zones\/assets are evidence, not sections/);
  assert.match(prompt, /不要写 zone-by-zone board explanation/);
  assert.match(prompt, /开头必须抛出 centralTension，尽早回答 headline question/);
});

test("draft_writer prompt enforces notThis, scene, and evidence discipline", () => {
  const frame = judgementArgumentFrame({
    notThis: ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录", "不要编造买家采访"],
  });
  const task = buildPromptTask("draft_writer", {
    project: projectFixture(),
    sectorModel: fourZoneSectorModel,
    outlineDraft: {
      hook: "开头",
      argumentFrame: frame,
      sections: [],
      closing: "结尾",
    },
    sourceCards: [sourceCard("sc_a")],
  });
  const prompt = `${task.system}\n${task.user}`;

  for (const item of frame.notThis) {
    assert.match(prompt, new RegExp(item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(prompt, /argumentFrame.notThis 里的每一项都是禁区/);
  assert.match(prompt, /\[待作者补：具体场景\]/);
  assert.match(prompt, /事实型 claim 需要 \[SC:id\] 引用，但不是每个段落都需要 citation/);
  assert.match(prompt, /不要把 optional evidence 强行塞进正文/);
});

test("argument_framer mock output matches ArgumentFrame schema", async () => {
  const frame = await runStructuredTask("argument_framer", {
    project: projectFixture(),
    sectorModel,
    sourceCards: [sourceCard("sc_a"), sourceCard("sc_b")],
    researchBrief: { angle: "莘庄房价高估了吗？", mustResearch: [], questions: [], blindSpots: [], stageChecklist: [] },
  });

  assertArgumentFrameSchema(frame);
  assert.equal(frame.primaryShape, "judgement_essay");
  assert.ok(frame.notThis.some((item) => /zone|目录|板块/.test(item)));
});

test("inferArgumentShapeFromTopic maps 高估 topics to judgement essay", () => {
  assert.equal(inferArgumentShapeFromTopic({ topic: "莘庄房价高估了吗", articleType: "价值重估型" }), "judgement_essay");
});

test("fallback ArgumentFrame normalizes invalid model output", () => {
  const fallback = buildFallbackArgumentFrame({
    project: projectFixture(),
    evidenceIds: ["sc_a", "sc_b"],
    zones: ["北广场", "南广场"],
  });
  const normalized = normalizeArgumentFrame(
    {
      primaryShape: "not_a_shape",
      secondaryShapes: ["risk_decomposition", "not_a_shape", "tradeoff_decision", "asset_tiering"],
      centralTension: "",
      supportingClaims: [{ id: "bad", role: "unknown", evidenceIds: "sc_a" }],
    },
    fallback,
  );

  assert.equal(normalized.primaryShape, "judgement_essay");
  assert.deepEqual(normalized.notThis, ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录"]);
  assert.equal(normalized.supportingClaims[0].id, "claim-1");
  assert.equal(normalized.supportingClaims[0].mustUseEvidenceIds[0], "sc_a");
});

test("generate-outline runs argument_framer before outline_writer and stores argumentFrame", async () => {
  const projectId = `proj_arg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const sourceA = `sc_arg_${Date.now()}_a_${Math.random().toString(16).slice(2)}`;
  const sourceB = `sc_arg_${Date.now()}_b_${Math.random().toString(16).slice(2)}`;
  const localSectorModel = {
    ...sectorModel,
    evidenceIds: [sourceA, sourceB],
    zones: sectorModel.zones.map((zone, index) => ({
      ...zone,
      evidenceIds: [index === 0 ? sourceA : sourceB],
    })),
  };
  const base = {
    topic: "莘庄房价高估了吗？",
    articleType: "价值重估型",
    audience: "关注上海板块和买房决策的读者",
    thesis: "莘庄房价不是简单高估，而是支撑强但安全边际不厚。",
    notes: "Milestone 3 test",
  };
  const cards = buildCardsFromLegacy(base);
  createProject({
    id: projectId,
    ...base,
    stage: "板块建模",
    coreQuestion: "莘庄房价高估了吗？",
    targetWords: 2400,
    topicMeta: projectFixture().topicMeta,
    ...cards,
    hkrr: { happy: "反常识", knowledge: "知识", resonance: "共鸣", rhythm: "节奏", summary: "总结" },
    hamd: { hook: "开头", anchor: "锚点", mindMap: ["价格"], different: "差异" },
    writingMoves: {
      freshObservation: "观察",
      narrativeDrive: "推进",
      breakPoint: "打断",
      signatureLine: "金句",
      personalPosition: "立场",
      characterScene: "场景",
      culturalLift: "升维",
      echoLine: "回环",
      readerAddress: "读者",
      costSense: "代价",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveResearchBrief(projectId, {
    angle: "莘庄房价高估了吗？",
    mustResearch: [],
    questions: ["房价支撑是什么？"],
    blindSpots: [],
    stageChecklist: [],
  });
  saveSectorModel(projectId, localSectorModel);
  createSourceCard({ ...sourceCard(sourceA), projectId });
  createSourceCard({ ...sourceCard(sourceB), projectId, zone: "南广场" });

  const logs = [];
  const context = {
    job: {
      id: null,
      projectId,
      step: "outline",
      status: "running",
      parentJobId: null,
      dedupeKey: "",
      payload: {},
      attemptCount: 1,
      maxAttempts: 1,
      progressStage: null,
      progressMessage: null,
      result: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      heartbeatAt: null,
      finishedAt: null,
    },
    setProgress(stage, message) {
      logs.push({ level: "progress", code: stage, message });
    },
    setResult() {},
    log(level, code, message, detail = {}) {
      logs.push({ level, code, message, detail });
    },
  };

  await generateOutlineStep({ projectId, forceProceed: true, context });

  const finishedTasks = logs.filter((entry) => entry.code === "llm_call_finished").map((entry) => entry.detail.task);
  assert.deepEqual(finishedTasks.slice(0, 2), ["argument_framer", "outline_writer"]);
  const outline = getOutlineDraft(projectId);
  assert.equal(outline.argumentFrame.primaryShape, "judgement_essay");
  assert.ok(outline.argumentFrame.notThis.length >= 1);
});
