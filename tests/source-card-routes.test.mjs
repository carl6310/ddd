import test from "node:test";
import assert from "node:assert/strict";

process.env.MODEL_MODE = "mock";

const projectsRoute = await import("../app/api/projects/route.ts");
const extractRoute = await import("../app/api/projects/[id]/source-cards/extract/route.ts");
const summarizeRoute = await import("../app/api/projects/[id]/source-cards/summarize/route.ts");

async function createProjectId() {
  const response = await projectsRoute.POST(
    new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: "测试资料卡同步助手",
        audience: "关注上海板块和买房决策的读者",
        targetWords: 1800,
        notes: "只用于测试资料卡辅助动作。",
      }),
    }),
  );
  assert.equal(response.status, 201);
  const payload = await response.json();
  return payload.project.id;
}

test("source-card summarize route queues a background job and dedupes identical requests", async () => {
  const projectId = await createProjectId();
  const requestBody = {
    title: "测试资料",
    rawText: "塘桥这个板块最容易被误解的不是距离，而是它内部被切开的生活边界。".repeat(12),
  };

  const response = await summarizeRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/source-cards/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }),
    { params: Promise.resolve({ id: projectId }) },
  );

  assert.equal(response.status, 202);
  const payload = await response.json();
  assert.equal(payload.job.step, "source-card-summarize");
  assert.equal(payload.job.status, "queued");
  assert.equal(payload.job.deduped, false);

  const duplicateResponse = await summarizeRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/source-cards/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    }),
    { params: Promise.resolve({ id: projectId }) },
  );
  assert.equal(duplicateResponse.status, 202);
  const duplicatePayload = await duplicateResponse.json();
  assert.equal(duplicatePayload.job.id, payload.job.id);
  assert.equal(duplicatePayload.job.deduped, true);
});

test("source-card extract route queues a background job", async () => {
  const projectId = await createProjectId();
  const html = `
    <html>
      <head><title>塘桥为什么总被看错</title></head>
      <body>
        <article>
          <p>塘桥的误解不在于它离陆家嘴近，而在于这种近没有自然转化成功能连接。</p>
          <p>真正影响判断的，是板块内部被主路和存量界面切开的骨架，以及更新节奏太慢。</p>
          <p>如果只看地图距离，很容易把它当成自然承接区，但真实生活感受并不是这样。</p>
          <p>这也是为什么很多读者第一次看它会觉得条件不差，结果价格和情绪一直起不来。</p>
        </article>
      </body>
    </html>
  `.replace(/\s+/g, " ");
  const url = `data:text/html,${encodeURIComponent(html)}`;

  const response = await extractRoute.POST(
    new Request(`http://localhost:3000/api/projects/${projectId}/source-cards/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }),
    { params: Promise.resolve({ id: projectId }) },
  );

  assert.equal(response.status, 202);
  const payload = await response.json();
  assert.equal(payload.job.step, "source-card-extract");
  assert.equal(payload.job.status, "queued");
  assert.equal(payload.job.deduped, false);
});
