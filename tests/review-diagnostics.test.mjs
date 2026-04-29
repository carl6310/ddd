import test from "node:test";
import assert from "node:assert/strict";

const { buildVitalityCheck, runDeterministicReview } = await import("../lib/review.ts");
const { MAX_STRUCTURAL_REWRITE_INTENTS_PER_PASS, selectStructuralRewriteCandidates } = await import("../lib/services/steps/generate-draft.ts");

function buildReviewWithOpening(openingParagraph) {
  return runDeterministicReview({
    articleType: "价值重估型",
    thesis: "塘桥的价值要回到生活结构里看。",
    hamd: {
      hook: "先把旧标签拧过来",
      anchor: "读者最后记住生活结构",
      mindMap: [],
      different: "不写泛板块介绍",
    },
    hkrr: {
      happy: "看懂板块",
      knowledge: "结构拆解",
      resonance: "买房焦虑",
      rhythm: "有推进",
      summary: "主判断",
    },
    writingMoves: {
      freshObservation: "生活结构里的新观察",
      narrativeDrive: "层层推进",
      breakPoint: "短句打断",
      signatureLine: "回到生活结构",
      personalPosition: "我更愿意这样看",
      characterScene: "早高峰通勤",
      culturalLift: "放到上海结构看",
      echoLine: "回到生活结构",
      readerAddress: "你会发现",
      costSense: "门槛和风险",
    },
    outlineDraft: {
      hook: "开头",
      sections: [
        {
          id: "s1",
          heading: "先把标签放下",
          purpose: "纠偏",
          sectionThesis: "塘桥的价值要回到生活结构里看。",
          singlePurpose: "先纠偏",
          mustLandDetail: "把主判断立住",
          sceneOrCost: "通勤和门槛",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
          tone: "快",
          move: "纠偏",
          break: "短句",
          bridge: "转骨架",
          transitionTarget: "空间骨架",
          counterPoint: "回应标签误读",
          styleObjective: "判断力",
          keyPoints: ["主判断"],
          expectedTakeaway: "知道不是看标签",
        },
      ],
      closing: "结尾",
    },
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误读",
      spatialBackbone: "骨架",
      cutLines: ["路"],
      zones: [
        { id: "z1", name: "北片", label: "错位核心", description: "说明", evidenceIds: ["sc_a"], strengths: ["优势"], risks: ["风险"], suitableBuyers: ["人群"] },
        { id: "z2", name: "南片", label: "安静睡城", description: "说明", evidenceIds: ["sc_b"], strengths: ["优势"], risks: ["风险"], suitableBuyers: ["人群"] },
      ],
      supplyObservation: "供应观察",
      futureWatchpoints: ["未来"],
      evidenceIds: ["sc_a"],
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: `# 标题\n\n${openingParagraph}\n\n## 先把标签放下\n先说生活结构，早高峰通勤和小区尺度会把选择拉开。[SC:sc_a]\n\n回到生活结构，最后看的还是每天怎么过日子。`,
    },
    sourceCards: [
      { id: "sc_a", title: "卡A", summary: "摘要", evidence: "证据", credibility: "高", sourceType: "media", supportLevel: "high", claimType: "fact", timeSensitivity: "timely", intendedSection: "先把标签放下", reliabilityNote: "", tags: [], zone: "", rawText: "", projectId: "p", url: "", note: "", publishedAt: "", createdAt: "" },
    ],
  });
}

function checkStatus(review, key) {
  return review.checks.find((check) => check.key === key)?.status;
}

function paragraphIssueTypes(review) {
  return review.paragraphFlags.flatMap((flag) => flag.issueTypes);
}

function baseReviewInput() {
  return {
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
      sections: [],
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
      ],
      supplyObservation: "供应判断",
      futureWatchpoints: ["未来"],
      evidenceIds: ["sc_a", "sc_b"],
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题不是位置，而是结构。[SC:sc_a]",
    },
    sourceCards: [
      { id: "sc_a", title: "卡A", summary: "摘要", evidence: "证据", credibility: "高", sourceType: "media", supportLevel: "high", claimType: "fact", timeSensitivity: "timely", intendedSection: "", reliabilityNote: "", tags: [], zone: "", rawText: "", projectId: "p", url: "", note: "", publishedAt: "", createdAt: "" },
      { id: "sc_b", title: "卡B", summary: "摘要", evidence: "证据", credibility: "中", sourceType: "official", supportLevel: "medium", claimType: "fact", timeSensitivity: "timely", intendedSection: "", reliabilityNote: "", tags: [], zone: "", rawText: "", projectId: "p", url: "", note: "", publishedAt: "", createdAt: "" },
    ],
  };
}

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

test("deterministic review accepts opening signal from 真正的问题", () => {
  const review = buildReviewWithOpening(
    "真正的问题，不在于塘桥有没有被看见，而在于读者有没有意识到这里的生活结构已经重新排过队。它看起来只是一个靠近核心区的名字，可真正影响选择的，是通勤、小区尺度、预算余量和每天怎么过日子的组合。",
  );

  assert.equal(checkStatus(review, "opening"), "pass");
  assert.equal(checkStatus(review, "anchor"), "pass");
  assert.ok(!paragraphIssueTypes(review).includes("missing_anchor"));
});

test("deterministic review accepts opening signal from 这次变化", () => {
  const review = buildReviewWithOpening(
    "这次变化，表面上是在讨论一个板块的热度，实际上是在提醒买房人重新看生活半径。它不只是价格表上的一行数字，还会落到每天出门、接娃、换乘和预算安全垫这些细节里。",
  );

  assert.equal(checkStatus(review, "opening"), "pass");
  assert.equal(checkStatus(review, "anchor"), "pass");
  assert.ok(!paragraphIssueTypes(review).includes("missing_anchor"));
});

test("deterministic review still flags long generic opening without judgment signal", () => {
  const review = buildReviewWithOpening(
    "上海楼市最近被反复讨论，塘桥也经常出现在各种板块介绍和成交记录里。沿线交通、周边配套、小区年份、价格区间、生活半径、上班路径和家庭预算都被放在一起比较，读者读完会得到很多信息，却很难马上记住作者到底要把哪句话立起来，也很难形成清楚的阅读抓手和判断顺序。",
  );

  assert.equal(checkStatus(review, "opening"), "warn");
  assert.equal(checkStatus(review, "anchor"), "warn");
  assert.ok(paragraphIssueTypes(review).includes("missing_anchor"));
});

test("deterministic review flags bad continuity ledger and creates structural rewrite intent", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底买什么",
        spine: {
          centralQuestion: "板块价值怎么判断",
          openingMisread: "误以为买热度",
          realProblem: "真实变量是资源排序",
          readerPromise: "给判断框架",
          finalReturn: "回到成本",
        },
        beats: [
          {
            sectionId: "s2",
            heading: "资源重估",
            role: "show_difference",
            inheritedQuestion: "热度背后的真实变量是什么",
            answerThisSection: "板块分化来自资源重估和价格排序",
            newInformation: "板块分化来自资源重估和价格排序",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "资源重估如何影响价格",
            nextSectionNecessity: "需要解释价格",
            mustNotRepeat: [],
          },
          {
            sectionId: "s3",
            heading: "价格排序",
            role: "show_difference",
            inheritedQuestion: "另一个并列信息是什么",
            answerThisSection: "价格排序还是来自资源重估和板块分化",
            newInformation: "价格排序还是来自资源重估和板块分化",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "购房者怎么选择",
            nextSectionNecessity: "需要给建议",
            mustNotRepeat: ["资源重估"],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度，而是资源排序。",
        "",
        "## 资源重估",
        "再看，资源重估会带来板块分化和价格排序。[SC:sc_a]",
        "",
        "## 价格排序",
        "另外，价格排序还是来自资源重估和板块分化。[SC:sc_b]",
      ].join("\n"),
    },
  });

  const types = new Set(review.continuityFlags?.map((flag) => flag.type));
  assert.ok(types.has("repeated_claim"));
  assert.ok(types.has("no_new_information"));
  assert.ok(types.has("can_be_swapped"));
  assert.ok((review.structuralRewriteIntents ?? []).length >= 1);
});

test("does_not_answer_previous continuity flag triggers structural rewrite even as warning", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为只看距离",
          realProblem: "真实变量是预算安全垫",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算安全垫",
            role: "break_misread",
            inheritedQuestion: "距离近为什么不等于确定性",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "预算安全垫决定了改善家庭能否承接",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "预算安全垫会怎样改变片区选择",
            nextSectionNecessity: "下一节落到片区选择",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是位置，而是结构。",
        "",
        "## 预算安全垫",
        "真正变量是预算安全垫，它决定改善家庭能否承接。[SC:sc_a]",
      ].join("\n"),
    },
  });

  const answerFlag = review.continuityFlags?.find((flag) => flag.type === "does_not_answer_previous");
  assert.ok(answerFlag);
  assert.equal(answerFlag.severity, "warn");
  assert.ok((review.structuralRewriteIntents ?? []).some((intent) => intent.issueTypes.includes("does_not_answer_previous")));
});

test("review flags section text that does not deliver ledger newInformation", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为只看热度",
          realProblem: "真实变量是预算安全垫",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算安全垫",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "首改成交周期正在拉长",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "预算变化如何改变片区选择",
            nextSectionNecessity: "下一节落到片区选择",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 预算安全垫",
        "真正变量是预算安全垫，但这一段只停在抽象判断，没有写具体人群怎么变。",
      ].join("\n"),
    },
  });

  const types = new Set(review.continuityFlags?.map((flag) => flag.type));
  assert.ok(types.has("section_does_not_deliver_new_information"));
  const intent = review.structuralRewriteIntents?.find((item) => item.issueTypes.includes("section_does_not_deliver_new_information"));
  assert.ok(intent);
  assert.notEqual(intent.suggestedRewriteMode, "delete_redundant_section");
});

test("review accepts paraphrased newInformation when section answers ledger and cites required evidence", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为只看热度",
          realProblem: "真实变量是预算安全垫",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算安全垫",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "首改成交周期正在拉长",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "周期变化如何改变选择",
            nextSectionNecessity: "下一节落到选择",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [
        {
          id: "s1",
          heading: "预算安全垫",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
        },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 预算安全垫",
        "真正变量是预算安全垫，改善买家现在要等更久，才轮到合适的房源和价格。[SC:sc_a]",
      ].join("\n"),
    },
  });

  const types = new Set(review.continuityFlags?.map((flag) => flag.type));
  assert.ok(!types.has("section_does_not_deliver_new_information"));
  assert.ok(!types.has("section_missing_required_evidence"));
});

test("review fails missing mustUseEvidenceIds in the matching section", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为只看热度",
          realProblem: "真实变量是预算安全垫",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算安全垫",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "预算安全垫决定改善家庭能否承接",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "预算如何改变片区选择",
            nextSectionNecessity: "下一节落到片区选择",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [
        {
          id: "s1",
          heading: "预算安全垫",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
        },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 预算安全垫",
        "真正变量是预算安全垫，预算安全垫决定改善家庭能否承接。",
      ].join("\n"),
    },
  });

  const evidenceFlag = review.continuityFlags?.find((flag) => flag.type === "section_missing_required_evidence");
  assert.ok(evidenceFlag);
  assert.equal(evidenceFlag.severity, "fail");
  assert.ok((review.structuralRewriteIntents ?? []).some((intent) => intent.issueTypes.includes("section_missing_required_evidence")));
});

test("review warns when optional ledger evidenceIds are not cited", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为只看热度",
          realProblem: "真实变量是预算安全垫",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算安全垫",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "预算安全垫决定改善家庭能否承接",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "预算如何改变片区选择",
            nextSectionNecessity: "下一节落到片区选择",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [
        {
          id: "s1",
          heading: "预算安全垫",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: [],
        },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 预算安全垫",
        "真正变量是预算安全垫，预算安全垫决定改善家庭能否承接。",
      ].join("\n"),
    },
  });

  const evidenceFlag = review.continuityFlags?.find((flag) => flag.type === "section_missing_optional_evidence");
  assert.ok(evidenceFlag);
  assert.equal(evidenceFlag.severity, "warn");
  assert.ok(!(review.continuityFlags ?? []).some((flag) => flag.type === "section_missing_required_evidence"));
  assert.ok(!(review.structuralRewriteIntents ?? []).some((intent) => intent.issueTypes.includes("section_missing_optional_evidence")));
});

test("same-role sections sharing only one broad domain token do not trigger repeated_claim", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "成本怎么判断",
          openingMisread: "误以为成本只有价格",
          realProblem: "真实变量是不同成本维度",
          readerPromise: "拆开不同成本",
          finalReturn: "回到选择",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "通勤成本",
            role: "show_cost",
            inheritedQuestion: "第一个成本是什么",
            answerThisSection: "第一个成本是通勤时间",
            newInformation: "通勤时间会改变每天可支配时间",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "还有什么成本",
            nextSectionNecessity: "下一节解释资金",
            mustNotRepeat: [],
          },
          {
            sectionId: "s2",
            heading: "资金成本",
            role: "show_cost",
            inheritedQuestion: "还有什么成本",
            answerThisSection: "第二个成本是资金占用",
            newInformation: "首付占用会压缩家庭安全垫",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "读者如何选择",
            nextSectionNecessity: "下一节给框架",
            mustNotRepeat: ["通勤时间"],
          },
        ],
      },
      sections: [
        { id: "s1", heading: "通勤成本", evidenceIds: ["sc_a"], mustUseEvidenceIds: ["sc_a"] },
        { id: "s2", heading: "资金成本", evidenceIds: ["sc_b"], mustUseEvidenceIds: ["sc_b"] },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是价格，而是成本。",
        "",
        "## 通勤成本",
        "第一个成本是通勤时间，它会改变每天可支配时间。[SC:sc_a]",
        "",
        "## 资金成本",
        "还有什么成本？第二个成本是资金占用，首付占用会压缩家庭安全垫。[SC:sc_b]",
      ].join("\n"),
    },
  });

  assert.ok(!(review.continuityFlags ?? []).some((flag) => flag.type === "repeated_claim"));
});

test("structural rewrite candidate selection is capped and explicit", () => {
  const candidates = selectStructuralRewriteCandidates({
    structuralRewriteIntents: [
      {
        issueTypes: ["section_does_not_answer_ledger"],
        affectedSectionIds: ["s1"],
        whyItFails: "ledger delivery",
        suggestedRewriteMode: "rewrite_opening_and_next_section",
      },
      {
        issueTypes: ["repeated_claim"],
        affectedSectionIds: ["s2", "s3"],
        whyItFails: "redundancy",
        suggestedRewriteMode: "merge_sections",
      },
    ],
  });

  assert.equal(MAX_STRUCTURAL_REWRITE_INTENTS_PER_PASS, 1);
  assert.equal(candidates.length, 1);
  assert.deepEqual(candidates[0].issueTypes, ["section_does_not_answer_ledger"]);
});

test("structural rewrite intents split ledger delivery and redundancy groups", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为看热度",
          realProblem: "真实变量是资源排序",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "资源重估",
            role: "show_difference",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "板块分化来自资源重估和价格排序",
            newInformation: "板块分化来自资源重估和价格排序",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "资源重估如何影响价格",
            nextSectionNecessity: "下一节解释价格",
            mustNotRepeat: [],
          },
          {
            sectionId: "s2",
            heading: "价格排序",
            role: "show_difference",
            inheritedQuestion: "资源重估如何影响价格",
            answerThisSection: "价格排序还是来自资源重估和板块分化",
            newInformation: "价格排序还是来自资源重估和板块分化",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "读者如何选择",
            nextSectionNecessity: "下一节给建议",
            mustNotRepeat: ["资源重估"],
          },
        ],
      },
      sections: [
        {
          id: "s1",
          heading: "资源重估",
          evidenceIds: ["sc_a"],
          mustUseEvidenceIds: ["sc_a"],
        },
        {
          id: "s2",
          heading: "价格排序",
          evidenceIds: ["sc_b"],
          mustUseEvidenceIds: [],
        },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度，而是资源排序。",
        "",
        "## 资源重估",
        "再看，资源重估会带来板块分化和价格排序。",
        "",
        "## 价格排序",
        "另外，价格排序还是来自资源重估和板块分化。[SC:sc_b]",
      ].join("\n"),
    },
  });

  const intents = review.structuralRewriteIntents ?? [];
  assert.equal(intents.length, 2);
  assert.ok(intents.some((intent) => intent.issueTypes.includes("section_missing_required_evidence")));
  assert.ok(intents.some((intent) => intent.issueTypes.includes("repeated_claim") || intent.issueTypes.includes("no_new_information")));
  assert.ok(!intents.some((intent) => intent.issueTypes.includes("section_missing_required_evidence") && intent.issueTypes.includes("repeated_claim")));
});

test("review warns for a single section opening that does not answer previous ending question", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为看热度",
          realProblem: "真实变量是预算",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "预算变化",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "预算安全垫会影响选择",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "预算如何影响选择",
            nextSectionNecessity: "下一节解释选择",
            mustNotRepeat: [],
          },
          {
            sectionId: "s2",
            heading: "片区选择",
            role: "give_decision_frame",
            inheritedQuestion: "预算如何影响选择",
            answerThisSection: "预算余量会把片区选择分开",
            newInformation: "预算余量会把片区分开",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "读者如何使用这套框架",
            nextSectionNecessity: "结尾给判断工具",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [
        { id: "s1", heading: "预算变化", evidenceIds: ["sc_a"], mustUseEvidenceIds: ["sc_a"] },
        { id: "s2", heading: "片区选择", evidenceIds: ["sc_b"], mustUseEvidenceIds: ["sc_b"] },
      ],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 预算变化",
        "真正变量是预算安全垫，预算安全垫会影响选择。[SC:sc_a]",
        "",
        "## 片区选择",
        "先看片区，不同家庭会走向不同生活半径。[SC:sc_b]",
        "",
        "预算如何影响选择，答案是预算余量会把片区选择分开，最后变成不同的成本承受方式。",
      ].join("\n"),
    },
  });

  const textFlag = review.continuityFlags?.find((flag) => flag.reason.includes("开头没有回答"));
  assert.ok(textFlag);
  assert.equal(textFlag.severity, "warn");
  assert.ok(!(review.structuralRewriteIntents ?? []).some((intent) => intent.issueTypes.includes("unlinked_adjacency")));
});

test("review escalates repeated unlinked adjacency to structural rewrite", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底看什么",
        spine: {
          centralQuestion: "核心变量是什么",
          openingMisread: "误以为看热度",
          realProblem: "真实变量是成本",
          readerPromise: "给判断框架",
          finalReturn: "回到选择成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "热度误读",
            role: "raise_misread",
            inheritedQuestion: "读者为什么会误判",
            answerThisSection: "误判来自把热度当价值",
            newInformation: "热度只能解释关注度",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "真正变量是什么",
            nextSectionNecessity: "下一节解释真实变量",
            mustNotRepeat: [],
          },
          {
            sectionId: "s2",
            heading: "预算变量",
            role: "break_misread",
            inheritedQuestion: "学校资源如何变化",
            answerThisSection: "真正变量是预算安全垫",
            newInformation: "预算安全垫决定承接能力",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "预算如何改变选择",
            nextSectionNecessity: "下一节落到选择",
            mustNotRepeat: [],
          },
          {
            sectionId: "s3",
            heading: "片区选择",
            role: "give_decision_frame",
            inheritedQuestion: "交通半径为什么重要",
            answerThisSection: "选择要看生活半径",
            newInformation: "生活半径决定真实成本",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "最后如何决策",
            nextSectionNecessity: "下一节收束",
            mustNotRepeat: [],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度。",
        "",
        "## 热度误读",
        "误判来自把热度当价值，热度只能解释关注度。[SC:sc_a]",
        "",
        "## 预算变量",
        "真正变量是预算安全垫，它决定承接能力。[SC:sc_b]",
        "",
        "## 片区选择",
        "选择要看生活半径，因为生活半径决定真实成本。[SC:sc_b]",
      ].join("\n"),
    },
  });

  const adjacencyFlags = (review.continuityFlags ?? []).filter((flag) => flag.type === "unlinked_adjacency");
  assert.equal(adjacencyFlags.length, 2);
  assert.ok(adjacencyFlags.every((flag) => flag.severity === "fail"));
  assert.ok((review.structuralRewriteIntents ?? []).some((intent) => intent.issueTypes.includes("unlinked_adjacency")));
});

test("deterministic review keeps good continuity chain mostly clean", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    outlineDraft: {
      hook: "开头",
      continuityLedger: {
        articleQuestion: "到底该看什么",
        spine: {
          centralQuestion: "价值变量是什么",
          openingMisread: "误解是热度回归",
          realProblem: "真实变量是人群变化",
          readerPromise: "给决策框架",
          finalReturn: "回到成本",
        },
        beats: [
          {
            sectionId: "s1",
            heading: "误解是热度回归",
            role: "raise_misread",
            inheritedQuestion: "读者为什么会误判",
            answerThisSection: "误解是把热度当作价值回归",
            newInformation: "热度只能解释关注度，不能解释成交承接",
            evidenceIds: ["sc_a"],
            leavesQuestionForNext: "真正变量是什么",
            nextSectionNecessity: "下一节解释真实变量",
            mustNotRepeat: [],
          },
          {
            sectionId: "s2",
            heading: "真实变量是人群变化",
            role: "break_misread",
            inheritedQuestion: "真正变量是什么",
            answerThisSection: "真正变量是人群变化",
            newInformation: "首改和改善人群的预算安全垫变了",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "人群变化如何改变片区",
            nextSectionNecessity: "需要落到片区分化",
            mustNotRepeat: ["热度"],
          },
          {
            sectionId: "s3",
            heading: "人群变化导致片区分化",
            role: "show_difference",
            inheritedQuestion: "人群变化如何改变片区",
            answerThisSection: "不同预算的人会选择不同生活半径",
            newInformation: "片区差异来自生活半径和预算约束",
            evidenceIds: ["sc_b"],
            leavesQuestionForNext: "片区分化如何变成购房成本",
            nextSectionNecessity: "需要解释成本",
            mustNotRepeat: ["人群变化"],
          },
        ],
      },
      sections: [],
      closing: "结尾",
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: [
        "# 标题",
        "",
        "真正的问题不是热度，而是人群和成本。",
        "",
        "## 误解是热度回归",
        "真正的误解，是把热度当作价值回归；热度只能解释关注度，不能解释成交承接。[SC:sc_a]",
        "",
        "## 真实变量是人群变化",
        "问题在于，真正变量是人群变化，首改和改善的预算安全垫已经不同。[SC:sc_b]",
        "",
        "## 人群变化导致片区分化",
        "再往下看，人群变化如何改变片区，答案落在生活半径和预算约束。[SC:sc_b]",
      ].join("\n"),
    },
  });

  const severe = (review.continuityFlags ?? []).filter((flag) => flag.severity === "fail");
  assert.equal(severe.length, 0);
});

test("weak transition rewrite advice rejects standalone bridge sentences", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题是结构。\n\n第二段没有任何承接也没有证据，只是在平铺材料。",
    },
  });

  const transitionIntent = review.rewriteIntents.find((intent) => intent.issueType === "weak_transition");
  assert.ok(transitionIntent);
  assert.match(transitionIntent.suggestedRewriteMode, /不要补独立转场句/);
  assert.match(transitionIntent.suggestedRewriteMode, /上一节结尾和下一节开头/);
  assert.doesNotMatch(transitionIntent.suggestedRewriteMode, /补过渡句/);
});

test("horizontal rules are ignored by paragraph flags", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题不是标签，而是结构。[SC:sc_a]\n\n---\n\n## 第一段\n问题在于，结构会影响每天怎么选择。[SC:sc_a]\n\n回到开头，真正决定价值的是结构。",
    },
  });

  assert.ok(!review.paragraphFlags.some((flag) => flag.preview.includes("---")));
});

test("unsupported scene allows author-needed and source-inference markers", () => {
  const authorNeeded = runDeterministicReview({
    ...baseReviewInput(),
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题不是标签，而是结构。[SC:sc_a]\n\n[待作者补：北广场早高峰体感]\n\n## 第一段\n从资料看，这里更像老城生活型片区，需要实地确认早高峰通勤的体感。[SC:sc_a]\n\n回到开头，真正决定价值的是结构。",
    },
  });

  assert.equal(checkStatus(authorNeeded, "unsupported-scene"), "pass");
});

test("unsupported scene fails exact buyer quote not present in sources", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题不是标签，而是结构。[SC:sc_a]\n\n## 第一段\n早上七点半，报春路边有买家说“这里上学方便，所以我必须买”。[SC:sc_a]\n\n回到开头，真正决定价值的是结构。",
    },
  });

  const sceneCheck = review.checks.find((check) => check.key === "unsupported-scene");
  assert.equal(sceneCheck?.status, "fail");
  assert.match(sceneCheck?.detail ?? "", /exact unsupported quote/);
  assert.match(sceneCheck?.detail ?? "", /exact unsupported time\/place\/action/);
});

test("unsupported scene fails upgraded peak-hour pseudo-firsthand detail", () => {
  const review = runDeterministicReview({
    ...baseReviewInput(),
    sourceCards: [
      {
        id: "sc_a",
        title: "交通资料",
        summary: "早晚高峰拥堵。",
        evidence: "早晚高峰拥堵。",
        credibility: "高",
        sourceType: "media",
        supportLevel: "high",
        claimType: "fact",
        timeSensitivity: "timely",
        intendedSection: "第一段",
        reliabilityNote: "",
        tags: [],
        zone: "",
        rawText: "早晚高峰拥堵。",
        projectId: "p",
        url: "",
        note: "",
        publishedAt: "",
        createdAt: "",
      },
    ],
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: "# 标题\n\n真正的问题不是标签，而是结构。[SC:sc_a]\n\n## 第一段\n早上七点半，报春路电动车接送孩子的队伍把路口堵住，这就是这里每天的生活成本。[SC:sc_a]\n\n回到开头，真正决定价值的是结构。",
    },
  });

  const sceneCheck = review.checks.find((check) => check.key === "unsupported-scene");
  assert.equal(sceneCheck?.status, "fail");
  assert.match(sceneCheck?.detail ?? "", /exact unsupported time\/place\/action/);
});

test("L1 failure hard blocks vitality and L2 failure semi blocks vitality", () => {
  const l1Vitality = buildVitalityCheck({
    sourceCards: [],
    reviewReport: {
      overallVerdict: "fail",
      completionScore: 50,
      globalScore: 50,
      checks: [],
      qualityPyramid: [{ level: "L1", title: "WritingLint", status: "fail", summary: "fail", mustFix: ["Unsupported Scene"], shouldFix: [], optionalPolish: [] }],
      sectionScores: [],
      paragraphFlags: [],
      rewriteIntents: [],
      revisionSuggestions: [],
      preservedPatterns: [],
      missingPatterns: [],
    },
  });
  assert.equal(l1Vitality.hardBlocked, true);
  assert.equal(l1Vitality.semiBlocked, true);

  const l2Vitality = buildVitalityCheck({
    sourceCards: [],
    reviewReport: {
      overallVerdict: "warn",
      completionScore: 70,
      globalScore: 70,
      checks: [],
      qualityPyramid: [{ level: "L2", title: "StructureFlow", status: "fail", summary: "fail", mustFix: ["转场失败"], shouldFix: [], optionalPolish: [] }],
      sectionScores: [],
      paragraphFlags: [],
      rewriteIntents: [],
      revisionSuggestions: [],
      preservedPatterns: [],
      missingPatterns: [],
    },
  });
  assert.equal(l2Vitality.hardBlocked, false);
  assert.equal(l2Vitality.semiBlocked, true);
});

function argumentReviewInput({
  headings,
  answer = "莘庄不是简单高估，但安全边际不厚。",
  counter = "反方认为片区差异太大，不能一概而论。",
  markdownBody = "",
  openingParagraph = answer,
  primaryShape = "judgement_essay",
} = {}) {
  const outlineSections = headings.map((heading, index) => ({
    id: `s${index + 1}`,
    heading,
    purpose: "论证判断",
    sectionThesis: "服务主判断",
    singlePurpose: "推进论证",
    mustLandDetail: "价格支撑和风险边界",
    sceneOrCost: "",
    mainlineSentence: "回到高估问题",
    callbackTarget: "",
    microStoryNeed: "",
    discoveryTurn: "",
    opposingView: "",
    readerUsefulness: "帮助读者判断",
    evidenceIds: [`sc_${index + 1}`],
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
  const body =
    markdownBody ||
    headings
      .map((heading, index) => `## ${heading}\n${answer} 这一节说明价格支撑和风险边界。[SC:sc_${index + 1}]`)
      .join("\n\n");

  return {
    ...baseReviewInput(),
    thesis: answer,
    outlineDraft: {
      hook: "开头",
      argumentFrame: {
        primaryShape,
        secondaryShapes: [],
        centralTension: "价格支撑和安全边际之间的张力。",
        answer,
        notThis: ["不要写成板块分区说明书", "不要把 SectorModel.zones 直接变成章节目录"],
        supportingClaims: [
          {
            id: "claim-1",
            claim: "价格支撑来自成熟配套和供应约束。",
            role: "prove",
            evidenceIds: ["sc_1"],
            mustUseEvidenceIds: ["sc_1"],
            zonesAsEvidence: ["北广场", "南广场"],
            shouldNotBecomeSection: true,
          },
        ],
        strongestCounterArgument: counter,
        howToHandleCounterArgument: "承认片区差异，但把片区作为判断边界。",
        readerDecisionFrame: "读者按预算、等待周期和风险承受力判断。",
      },
      sections: outlineSections,
      closing: "结尾",
    },
    sectorModel: {
      summaryJudgement: "莘庄房价有支撑，但安全边际不厚。",
      misconception: "只把莘庄看成外环外贵价板块。",
      spatialBackbone: "南北广场、商务区和春申共同构成价格支撑。",
      cutLines: ["铁路", "沪闵路"],
      zones: [
        { id: "z1", name: "北广场", label: "学区支撑", description: "学区和次新支撑价格。", evidenceIds: ["sc_1"], strengths: ["学区"], risks: ["贵"], suitableBuyers: ["改善"] },
        { id: "z2", name: "南广场", label: "老城底盘", description: "老城生活底盘强。", evidenceIds: ["sc_2"], strengths: ["成熟"], risks: ["房龄"], suitableBuyers: ["刚需"] },
        { id: "z3", name: "商务区", label: "TOD预期", description: "商务区承接规划预期。", evidenceIds: ["sc_3"], strengths: ["TOD"], risks: ["兑现慢"], suitableBuyers: ["改善"] },
        { id: "z4", name: "春申", label: "外溢承接", description: "春申承接外溢。", evidenceIds: ["sc_4"], strengths: ["承接"], risks: ["通勤"], suitableBuyers: ["首改"] },
      ],
      supplyObservation: "新增供应有限。",
      futureWatchpoints: ["TOD"],
      evidenceIds: ["sc_1", "sc_2", "sc_3", "sc_4"],
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: `# 莘庄房价高估了吗？\n\n${openingParagraph}\n\n${body}\n\n最后，读者要看预算、等待周期和风险承受力。`,
    },
    sourceCards: ["sc_1", "sc_2", "sc_3", "sc_4"].map((id) => ({
      id,
      title: `资料${id}`,
      summary: "摘要",
      evidence: "证据",
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
    })),
  };
}

test("judgement essay zone-heading tour triggers argument quality map tour flag and structural rewrite", () => {
  const review = runDeterministicReview(argumentReviewInput({ headings: ["北广场", "南广场", "商务区", "春申"] }));
  const flag = review.argumentQualityFlags?.find((item) => item.type === "map_tour_in_judgement_essay");

  assert.equal(flag?.severity, "fail");
  assert.ok(review.argumentQualityFlags?.some((item) => item.type === "zones_used_as_structure_not_evidence"));
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.issueTypes.includes("map_tour_in_judgement_essay")));
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.suggestedRewriteMode === "rewrite_section_roles" || intent.suggestedRewriteMode === "merge_sections"));
});

test("judgement essay factor-heading tour triggers argument quality factor tour flag and structural rewrite", () => {
  const review = runDeterministicReview(argumentReviewInput({ headings: ["交通", "商业", "学区", "供应"] }));
  const flag = review.argumentQualityFlags?.find((item) => item.type === "factor_tour_in_judgement_essay");

  assert.equal(flag?.severity, "fail");
  assert.equal(flag?.suggestedAction, "把因素章节合并进 supportingClaims，不要按因素目录写判断稿。");
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.issueTypes.includes("factor_tour_in_judgement_essay")));
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.suggestedRewriteMode === "rewrite_section_roles"));
});

test("judgement essay claim-led headings do not trigger map tour flag", () => {
  const review = runDeterministicReview(argumentReviewInput({ headings: ["表面信号", "真正矛盾", "支撑判断", "反面风险", "买房人决策框架"] }));

  assert.ok(!(review.argumentQualityFlags ?? []).some((item) => item.type === "map_tour_in_judgement_essay"));
  assert.ok(!(review.argumentQualityFlags ?? []).some((item) => item.type === "factor_tour_in_judgement_essay"));
});

test("generic argument answer triggers thesis_too_generic", () => {
  const review = runDeterministicReview(argumentReviewInput({ headings: ["表面信号", "真正矛盾"], answer: "具体看情况" }));

  assert.equal(review.argumentQualityFlags?.find((item) => item.type === "thesis_too_generic")?.severity, "fail");
});

test("headline_not_answered produces structural rewrite intent", () => {
  const review = runDeterministicReview(
    argumentReviewInput({
      headings: ["背景信号", "市场资料"],
      answer: "核心资产还能撑价，但普通资产不能追高。",
      counter: "",
      openingParagraph: "市场上最近有很多不同信号，读者容易被成交和挂牌带着走。",
      markdownBody: "## 背景信号\n这一节只整理市场背景和成交资料。[SC:sc_1]\n\n## 市场资料\n这一节继续整理挂牌和供应资料。[SC:sc_2]",
    }),
  );

  assert.equal(review.argumentQualityFlags?.find((item) => item.type === "headline_not_answered")?.severity, "fail");
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.issueTypes.includes("headline_not_answered")));
  assert.ok(review.structuralRewriteIntents?.some((intent) => intent.suggestedRewriteMode === "rewrite_opening_and_next_section"));
});

test("comparison benchmark can use zone headings without judgement map tour fail", () => {
  const review = runDeterministicReview(
    argumentReviewInput({
      primaryShape: "comparison_benchmark",
      headings: ["北广场", "南广场", "商务区", "春申"],
      counter: "",
    }),
  );

  assert.ok(!(review.argumentQualityFlags ?? []).some((item) => item.type === "map_tour_in_judgement_essay"));
  assert.ok(!(review.argumentQualityFlags ?? []).some((item) => item.type === "zones_used_as_structure_not_evidence"));
});

test("counterargument_missing triggers when ArgumentFrame counterargument is not addressed", () => {
  const review = runDeterministicReview(
    argumentReviewInput({
      headings: ["表面信号", "真正矛盾"],
      counter: "反方认为新增供应会压低价格。",
      markdownBody: "## 表面信号\n莘庄不是简单高估，但安全边际不厚。[SC:sc_1]\n\n## 真正矛盾\n价格支撑来自成熟配套和供应约束，所以读者要看预算和风险。[SC:sc_2]",
    }),
  );

  assert.equal(review.argumentQualityFlags?.find((item) => item.type === "counterargument_missing")?.severity, "fail");
});
