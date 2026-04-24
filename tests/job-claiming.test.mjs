import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("claimNextQueuedJob keeps jobs from the same project serial", async () => {
  const originalCwd = process.cwd();
  const tempCwd = mkdtempSync(join(tmpdir(), "ddd-job-claim-"));
  process.chdir(tempCwd);

  try {
    const { getDb } = await import("../lib/db.ts");
    const { claimNextQueuedJob, enqueueJob } = await import("../lib/jobs/repository.ts");
    const db = getDb();

    insertProject(db, "proj_a");
    insertProject(db, "proj_b");

    const jobA1 = enqueueJob({ projectId: "proj_a", step: "research-brief" }).job;
    const jobA2 = enqueueJob({ projectId: "proj_a", step: "sector-model" }).job;
    const jobB1 = enqueueJob({ projectId: "proj_b", step: "research-brief" }).job;

    setCreatedAt(db, jobA1.id, "2026-04-24T00:00:00.000Z");
    setCreatedAt(db, jobA2.id, "2026-04-24T00:01:00.000Z");
    setCreatedAt(db, jobB1.id, "2026-04-24T00:02:00.000Z");

    const first = claimNextQueuedJob();
    assert.equal(first?.id, jobA1.id);

    const second = claimNextQueuedJob();
    assert.equal(second?.id, jobB1.id);

    const third = claimNextQueuedJob();
    assert.equal(third, null);

    const blockedSameProjectJob = db.prepare("SELECT status FROM job_runs WHERE id = ?").get(jobA2.id);
    assert.equal(blockedSameProjectJob.status, "queued");
  } finally {
    process.chdir(originalCwd);
  }
});

function insertProject(db, id) {
  const now = "2026-04-24T00:00:00.000Z";
  db.prepare(
    `
      INSERT INTO article_projects (
        id, topic, audience, article_type, stage, thesis, core_question,
        target_words, notes, topic_meta_json, think_card_json, style_core_json,
        vitality_check_json, hkrr_json, hamd_json, writing_moves_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', '{}', '{}', '{}', '{}', '{}', ?, ?)
    `,
  ).run(
    id,
    `测试项目 ${id}`,
    "测试读者",
    "规划拆解型",
    "选题定义",
    "测试主判断",
    "测试核心问题",
    1800,
    "",
    now,
    now,
  );
}

function setCreatedAt(db, jobId, createdAt) {
  db.prepare("UPDATE job_runs SET created_at = ? WHERE id = ?").run(createdAt, jobId);
}
