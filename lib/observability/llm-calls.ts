import { createHash } from "node:crypto";
import { createId, nowIso, stringifyJson, truncate } from "@/lib/utils";
import { insertLLMCall } from "@/lib/jobs/repository";
import type { LLMCallAuditRecord } from "@/lib/jobs/types";

export function stableHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function recordLLMCall(input: Omit<LLMCallAuditRecord, "id" | "createdAt">) {
  insertLLMCall({
    ...input,
    id: createId("llm"),
    createdAt: nowIso(),
  });
}

export function buildLLMCallHashes(input: { prompt: unknown; output: unknown }) {
  return {
    inputHash: stableHash(typeof input.prompt === "string" ? input.prompt : stringifyJson(input.prompt)),
    outputHash: stableHash(typeof input.output === "string" ? input.output : stringifyJson(input.output)),
  };
}

export function summarizeLLMError(error: unknown) {
  return truncate(error instanceof Error ? error.message : "未知模型错误。", 240);
}
