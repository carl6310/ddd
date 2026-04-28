import test from "node:test";
import assert from "node:assert/strict";

const { buildPromptTask } = await import("../lib/prompt-engine.ts");

test("outline writer explicitly prevents coarse facts becoming pseudo-firsthand scenes", () => {
  const prompt = buildPromptTask("outline_writer", {
    project: { topic: "莘庄", thesis: "底商密集不等于亲历场景" },
    sectorModel: { summaryJudgement: "底商密集" },
    sourceCards: [{ id: "sc_a", title: "资料", summary: "底商密集", evidence: "底商密集" }],
  });

  assert.match(prompt.system, /底商密集/);
  assert.match(prompt.system, /生煎摊冒热气/);
  assert.match(prompt.system, /修鞋铺下午三点收工/);
  assert.ok(prompt.system.includes("[待作者补：具体场景]"));
});

test("draft writer and scene inserter require inferred scenes to be marked", () => {
  const draftPrompt = buildPromptTask("draft_writer", {
    project: { topic: "莘庄", thesis: "早晚高峰拥堵不等于亲历现场", coreQuestion: "如何判断" },
    sectorModel: { cutLines: [], zones: [], futureWatchpoints: [] },
    outlineDraft: { sections: [], closing: "" },
    sourceCards: [{ id: "sc_a", title: "资料", summary: "早晚高峰拥堵", evidence: "早晚高峰拥堵" }],
  });
  const scenePrompt = buildPromptTask("scene_inserter", {
    project: { topic: "莘庄", thesis: "场景必须有出处" },
    paragraphText: "这里需要生活体感。",
    sourceCards: [{ id: "sc_a", title: "资料", summary: "早晚高峰拥堵", evidence: "早晚高峰拥堵" }],
  });

  assert.match(draftPrompt.system, /source_inference/);
  assert.ok(draftPrompt.system.includes("从资料看 / 更像 / 需要实地确认"));
  assert.match(draftPrompt.system, /不得编造买家原话/);
  assert.match(draftPrompt.system, /早上七点半报春路电动车接送孩子/);
  assert.match(scenePrompt.system, /scene_inserter/);
  assert.match(scenePrompt.system, /不得新增资料卡没有出现的感官细节/);
  assert.match(scenePrompt.system, /早上七点半报春路电动车接送孩子/);
  assert.ok(scenePrompt.system.includes("[待作者补：具体场景]"));
});
