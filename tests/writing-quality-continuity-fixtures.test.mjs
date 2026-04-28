import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { runDeterministicReview } = await import("../lib/review.ts");

const fixtureFile = new URL("../evals/fixtures/writing-quality/continuity.json", import.meta.url);
const payload = JSON.parse(readFileSync(fixtureFile, "utf8"));

function runFixtureReview(fixture) {
  return runDeterministicReview({
    articleType: "价值重估型",
    thesis: "真正的问题不是热度，而是成本。",
    hamd: {
      hook: "不是热度回归",
      anchor: "为确定性付成本",
      mindMap: [],
      different: "连续判断链",
    },
    hkrr: {
      happy: "看懂误解",
      knowledge: "成本框架",
      resonance: "买房焦虑",
      rhythm: "连续推进",
      summary: "主线",
    },
    writingMoves: {
      freshObservation: "人群变化",
      narrativeDrive: "连续推进",
      breakPoint: "短句",
      signatureLine: "不是热度，而是成本",
      personalPosition: "我更愿意这样看",
      characterScene: "早高峰通勤",
      culturalLift: "上海结构",
      echoLine: "为确定性付成本",
      readerAddress: "你会发现",
      costSense: "门槛和代价",
    },
    outlineDraft: {
      hook: "开头",
      continuityLedger: fixture.continuityLedger,
      sections: [],
      closing: "结尾",
    },
    sectorModel: {
      summaryJudgement: "总判断",
      misconception: "误解",
      spatialBackbone: "骨架",
      cutLines: ["通勤"],
      zones: [],
      supplyObservation: "供应",
      futureWatchpoints: [],
      evidenceIds: ["sc_a", "sc_b", "sc_c", "sc_d"],
    },
    articleDraft: {
      analysisMarkdown: "",
      editedMarkdown: "",
      narrativeMarkdown: fixture.articleMarkdown,
    },
    sourceCards: ["sc_a", "sc_b", "sc_c", "sc_d"].map((id) => ({
      id,
      title: id,
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
  });
}

test("task-card writing quality fixture triggers continuity flags", () => {
  const fixture = payload.fixtures.find((item) => item.id === "task-card-article");
  const review = runFixtureReview(fixture);
  const types = new Set((review.continuityFlags ?? []).map((flag) => flag.type));

  for (const expected of fixture.expectedFlags) {
    assert.ok(types.has(expected), `expected ${expected}`);
  }
});

test("reader-question-chain fixture has no high-severity continuity flags", () => {
  const fixture = payload.fixtures.find((item) => item.id === "reader-question-chain");
  const review = runFixtureReview(fixture);
  const severe = (review.continuityFlags ?? []).filter((flag) => flag.severity === "fail");

  assert.equal(severe.length, 0);
});
