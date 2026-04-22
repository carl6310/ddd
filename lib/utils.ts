export function createId(prefix: string): string {
  return `${prefix}_${generateIdSeed()}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

export function toNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function extractJson<T>(content: string): T {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return JSON.parse(cleanJsonCandidate(fencedMatch[1])) as T;
  }

  const genericFence = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (genericFence?.[1]) {
    return JSON.parse(cleanJsonCandidate(genericFence[1])) as T;
  }

  const objectStart = content.indexOf("{");
  const objectEnd = content.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return JSON.parse(cleanJsonCandidate(content.slice(objectStart, objectEnd + 1))) as T;
  }

  throw new Error("模型没有返回可解析的 JSON。");
}

export function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function firstNonEmptyLine(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean) ?? "";
}

export function truncate(value: string, max = 160): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}…`;
}

function cleanJsonCandidate(value: string): string {
  return value
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/,\s*([}\]])/g, "$1");
}

export function extractUrls(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s)]+/g) ?? [];
  return Array.from(new Set(matches.map((item) => item.trim())));
}

function generateIdSeed() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID().slice(0, 8);
  }

  if (cryptoApi?.getRandomValues) {
    const bytes = new Uint8Array(8);
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("").slice(0, 8);
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.slice(0, 8);
}
