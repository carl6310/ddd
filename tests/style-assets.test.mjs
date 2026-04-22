import test from "node:test";
import assert from "node:assert/strict";

const { extractSampleActionAssets } = await import("../lib/style-assets/extractor.ts");
const { buildStyleActionReference } = await import("../lib/style-assets/registry.ts");

test("sample action extractor pulls actionable snippets from sample article", () => {
  const assets = extractSampleActionAssets({
    id: "sample_1",
    title: "塘桥为什么总被看错",
    sectorName: "塘桥",
    articleType: "误解纠偏型",
    coreThesis: "真正决定塘桥的不是位置，而是结构。",
    structureSummary: "先纠偏，再拆骨架，再按片区拆解，最后回到代价。",
    highlightLines: ["很多人看到地图就下判断，但问题在于结构。"],
    metaphors: [],
    openingPatterns: ["很多人看塘桥，第一眼看到的是热度和标签。"],
    sourcePath: "wz/sample.docx",
    bodyText:
      "很多人看塘桥，第一眼看到的是热度和标签。\n问题在于，真正决定它的不是位置，而是结构。\n你把一个早高峰通勤、接娃买菜都压在这里的人放进去，就会明白差别。\n最后还是要回到具体片区、具体门槛和具体代价。",
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.ok(assets.some((asset) => asset.actionType === "opening_move"));
  assert.ok(assets.some((asset) => asset.actionType === "judgement_bridge"));
  assert.ok(assets.some((asset) => asset.actionType === "scene_grounding"));
  assert.ok(assets.some((asset) => asset.actionType === "closing_echo"));
});

test("style action reference groups assets by action type", () => {
  const reference = buildStyleActionReference([
    {
      id: "a1",
      sampleId: "sample_1",
      actionType: "opening_move",
      assetText: "很多人看塘桥，第一眼看到的是热度和标签。",
      rationale: "开头动作",
      weight: 5,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "a2",
      sampleId: "sample_1",
      actionType: "closing_echo",
      assetText: "最后还是要回到具体片区、具体门槛和具体代价。",
      rationale: "结尾动作",
      weight: 3,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ]);

  assert.match(reference, /开头动作/);
  assert.match(reference, /结尾回环/);
  assert.match(reference, /门槛和具体代价/);
});
