import test from "node:test";
import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

test("home shell exposes the core workbench surfaces", async () => {
  const [homeResponse, projectsResponse] = await Promise.all([
    fetch(baseUrl),
    fetch(`${baseUrl}/api/projects`),
  ]);

  assert.equal(homeResponse.ok, true, `Expected ${baseUrl} to respond with 200`);
  assert.equal(projectsResponse.ok, true, `Expected ${baseUrl}/api/projects to respond with 200`);

  const [html, projectsPayload] = await Promise.all([
    homeResponse.text(),
    projectsResponse.json(),
  ]);

  assert.match(html, /上海板块写作工作台/);
  assert.match(html, /工作台主阶段/);
  assert.match(html, /判断/);
  assert.match(html, /资料/);
  assert.match(html, /写作/);
  assert.match(html, /发布/);
  assert.match(html, /项目状态/);
  assert.match(html, /(补资料卡|生成研究清单|查看检查项|生成发布前整理)/);
  assert.ok(Array.isArray(projectsPayload.projects) && projectsPayload.projects.length > 0, "Expected seeded projects to be available");
});
