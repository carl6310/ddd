import test from "node:test";
import assert from "node:assert/strict";

const { extractMarkdownParagraphs, replaceMarkdownParagraphAt } = await import("../lib/markdown-blocks.ts");

test("paragraph replacement preserves headings, order, citations, and non-paragraph blocks", () => {
  const markdown = [
    "# 主标题",
    "",
    "开头判断。[SC:sc_open]",
    "",
    "## 第一节",
    "",
    "第二段需要修。[SC:sc_target]",
    "",
    "- 列表项一 [SC:sc_list]",
    "- 列表项二",
    "",
    "> 引用块不能并进正文。[SC:sc_quote]",
    "",
    "第三段继续。",
  ].join("\n");

  const replaced = replaceMarkdownParagraphAt(markdown, 1, "第二段已经改好。");

  assert.match(replaced, /^# 主标题/m);
  assert.match(replaced, /^## 第一节/m);
  assert.match(replaced, /开头判断。\[SC:sc_open\]/);
  assert.match(replaced, /第二段已经改好。\s+\[SC:sc_target\]/);
  assert.match(replaced, /^- 列表项一 \[SC:sc_list\]$/m);
  assert.match(replaced, /^> 引用块不能并进正文。\[SC:sc_quote\]$/m);
  assert.deepEqual(extractMarkdownParagraphs(replaced), [
    "开头判断。[SC:sc_open]",
    "第二段已经改好。 [SC:sc_target]",
    "第三段继续。",
  ]);

  assert.ok(replaced.indexOf("# 主标题") < replaced.indexOf("开头判断"));
  assert.ok(replaced.indexOf("开头判断") < replaced.indexOf("## 第一节"));
  assert.ok(replaced.indexOf("## 第一节") < replaced.indexOf("第二段已经改好"));
  assert.ok(replaced.indexOf("第二段已经改好") < replaced.indexOf("- 列表项一"));
  assert.ok(replaced.indexOf("- 列表项一") < replaced.indexOf("> 引用块"));
  assert.ok(replaced.indexOf("> 引用块") < replaced.indexOf("第三段继续"));
});

test("out-of-range paragraph replacement returns original markdown unchanged", () => {
  const markdown = "# 标题\n\n只有一段。[SC:sc_a]\n\n- 列表不算可替换段落";

  assert.equal(replaceMarkdownParagraphAt(markdown, 2, "不会写入。"), markdown);
  assert.equal(replaceMarkdownParagraphAt(markdown, -1, "不会写入。"), markdown);
});
