import test from "node:test";
import assert from "node:assert/strict";

const { classifyEditorialFeedbackEvents } = await import("../lib/editorial-feedback/classifier.ts");

test("editorial feedback classifier identifies evidence, cost, and ending changes", () => {
  const events = classifyEditorialFeedbackEvents({
    projectId: "proj_test",
    narrativeMarkdown:
      "## 第一段\n这段判断很虚。\n\n## 第二段\n这里只是平着讲了一句。\n\n## 第三段\n最后收得很平。",
    editedMarkdown:
      "## 第一段\n这段判断很虚，但我补上了证据。[SC:sc_a]\n\n## 第二段\n这里只是平着讲了一句，但代价也摆在这里：门槛和风险不能跳过去。\n\n## 第三段\n最后收得很平。回到开头，真正决定它成立与否的，始终不是标签，而是结构。",
  });

  const eventTypes = events.map((item) => item.eventType);
  assert.ok(eventTypes.includes("add_evidence"));
  assert.ok(eventTypes.includes("add_cost"));
  assert.ok(eventTypes.includes("tighten_ending") || eventTypes.includes("rewrite_opening"));
});
