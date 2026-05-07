import test from "node:test";
import assert from "node:assert/strict";

const { assertPublishQualityGateAllowsPrepare } = await import("../lib/services/steps/prepare-publish.ts");
const { JobError } = await import("../lib/jobs/types.ts");

function createGate(patch = {}) {
  return {
    mode: "warn-only",
    overallStatus: "pass",
    mustFix: [],
    shouldFix: [],
    optionalPolish: [],
    ...patch,
  };
}

function captureFailure(gate) {
  const logs = [];
  try {
    assertPublishQualityGateAllowsPrepare(gate, {
      log(level, code, message, detail = {}) {
        logs.push({ level, code, message, detail });
      },
    });
  } catch (error) {
    return { error, logs };
  }
  return { error: null, logs };
}

test("prepare publish blocks when quality gate has must-fix items", () => {
  const { error, logs } = captureFailure(
    createGate({
      mustFix: [{ code: "broken_citations", title: "存在无效引用", detail: "发布前必须修掉。" }],
    }),
  );

  assert.ok(error instanceof JobError);
  assert.equal(error.code, "quality_gate_failed");
  assert.match(error.message, /写作质量门槛未通过/);
  assert.match(error.message, /存在无效引用/);
  assert.deepEqual(
    logs.map((log) => [log.level, log.code]),
    [["warn", "quality_gate_blocked"]],
  );
});

test("prepare publish blocks when quality gate mode is hard-block", () => {
  const { error } = captureFailure(createGate({ mode: "hard-block" }));

  assert.ok(error instanceof JobError);
  assert.equal(error.code, "quality_gate_failed");
  assert.match(error.message, /暂时不能生成发布包/);
});

test("prepare publish blocks when quality gate overall status fails", () => {
  const { error } = captureFailure(createGate({ overallStatus: "fail" }));

  assert.ok(error instanceof JobError);
  assert.equal(error.code, "quality_gate_failed");
});

test("prepare publish proceeds when quality gate passes", () => {
  assert.doesNotThrow(() => assertPublishQualityGateAllowsPrepare(createGate()));
});

test("prepare publish quality gate error message is user-readable", () => {
  const { error } = captureFailure(createGate({ mode: "hard-block" }));

  assert.ok(error instanceof JobError);
  assert.match(error.message, /^写作质量门槛未通过，暂时不能生成发布包。/);
  assert.doesNotMatch(error.message, /hard-block|overallStatus|mustFix|quality_gate_failed/);
});
