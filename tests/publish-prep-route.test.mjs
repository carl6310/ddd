import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const publishPrepRoute = await import("../app/api/projects/[id]/publish-prep/route.ts");
const { buildCardsFromLegacy } = await import("../lib/author-cards.ts");
const { createProject, saveArticleDraft, saveReviewReport } = await import("../lib/repository.ts");
const { getDb } = await import("../lib/db.ts");

function createBlockedProject() {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const projectId = `proj_publish_blocked_${suffix}`;
  const base = {
    topic: "莘庄外环外价格为什么高",
    articleType: "价值重估型",
    audience: "关注上海板块和买房决策的读者",
    thesis: "莘庄不是外环外便宜逻辑，而是外环外成熟兑现逻辑。",
    notes: "publish-prep route test",
  };
  const cards = buildCardsFromLegacy(base);

  createProject({
    id: projectId,
    ...base,
    stage: "VitalityCheck",
    coreQuestion: "莘庄外环外价格为什么高？",
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

  saveArticleDraft(projectId, {
    analysisMarkdown: "## 分析\n莘庄的价格来自成熟兑现。",
    narrativeMarkdown: "## 正文\n莘庄的价格来自成熟兑现，但这里没有有效资料卡引用。",
    editedMarkdown: "",
  });
  saveReviewReport(projectId, {
    overallVerdict: "当前稿件仍需返工。",
    completionScore: 58,
    globalScore: 58,
    checks: [],
    qualityPyramid: [
      {
        level: "L1",
        title: "WritingLint",
        status: "fail",
        summary: "发现不可靠场景。",
        mustFix: ["Unsupported Scene：检测到 unsupported scene：exact unsupported time/place/action。"],
        shouldFix: [],
        optionalPolish: [],
      },
    ],
    sectionScores: [],
    paragraphFlags: [],
    rewriteIntents: [],
    revisionSuggestions: [],
    preservedPatterns: [],
    missingPatterns: [],
  });

  return projectId;
}

test("publish-prep route returns concrete quality blockers", async (t) => {
  const projectId = createBlockedProject();
  t.after(() => {
    getDb().prepare("DELETE FROM article_projects WHERE id = ?").run(projectId);
  });

  const response = await publishPrepRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/publish-prep`, { method: "POST" }),
    { params: Promise.resolve({ id: projectId }) },
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /写作质量门槛未通过/);
  assert.match(payload.error, /关键段缺证据|WritingLint 必修/);
  assert.ok(Array.isArray(payload.mustFix));
  assert.ok(payload.mustFix.some((item) => item.title === "WritingLint 必修"));
  assert.equal(payload.qualityGate.overallStatus, "fail");
  assert.equal(payload.vitalityCheck.hardBlocked, false);
});
