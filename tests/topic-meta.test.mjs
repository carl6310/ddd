import test from "node:test";
import assert from "node:assert/strict";

const { getTopicReaderLens } = await import("../lib/topic-meta.ts");

test("getTopicReaderLens returns an empty array for legacy topic meta without readerLens", () => {
  assert.deepEqual(
    getTopicReaderLens({
      signalMode: null,
      signalBrief: null,
      topicScorecard: null,
      selectedAngleId: null,
      selectedAngleTitle: null,
    }),
    [],
  );
});

test("getTopicReaderLens preserves reader lens values when present", () => {
  assert.deepEqual(
    getTopicReaderLens({
      readerLens: ["risk_aware_reader", "busy_relocator"],
    }),
    ["risk_aware_reader", "busy_relocator"],
  );
});
