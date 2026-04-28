import test from "node:test";
import assert from "node:assert/strict";

const { runDeterministicReview } = await import("../lib/review.ts");

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
            answerThisSection: "板块分化来自资源重估",
            newInformation: "板块分化来自资源重估",
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
            answerThisSection: "价格背后是资源重新排序",
            newInformation: "价格背后是资源重新排序",
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
        "再看，资源重估会带来板块分化。[SC:sc_a]",
        "",
        "## 价格排序",
        "另外，价格背后也是资源重新排序。[SC:sc_b]",
      ].join("\n"),
    },
  });

  const types = new Set(review.continuityFlags?.map((flag) => flag.type));
  assert.ok(types.has("repeated_claim"));
  assert.ok(types.has("no_new_information"));
  assert.ok(types.has("can_be_swapped"));
  assert.ok((review.structuralRewriteIntents ?? []).length >= 1);
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
        "真正的误解，是把热度当作价值回归。[SC:sc_a]",
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
  assert.match(transitionIntent.suggestedRewriteMode, /不要补独立过渡句/);
  assert.match(transitionIntent.suggestedRewriteMode, /上一节结尾和下一节开头/);
  assert.doesNotMatch(transitionIntent.suggestedRewriteMode, /补过渡句/);
});
