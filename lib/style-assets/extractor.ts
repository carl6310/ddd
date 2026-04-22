import type { SampleArticle } from "@/lib/types";

export type SampleActionType =
  | "opening_move"
  | "judgement_bridge"
  | "zone_split"
  | "scene_grounding"
  | "closing_echo";

export interface SampleActionAssetInput {
  actionType: SampleActionType;
  assetText: string;
  rationale: string;
  weight: number;
}

function uniqueTrimmed(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length >= 8)),
    ),
  );
}

function extractBodyParagraphs(bodyText: string) {
  return bodyText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8);
}

function pickFirstMatching(lines: string[], patterns: RegExp[]) {
  return lines.find((line) => patterns.some((pattern) => pattern.test(line)));
}

export function extractSampleActionAssets(sample: SampleArticle): SampleActionAssetInput[] {
  const paragraphs = extractBodyParagraphs(sample.bodyText);
  const openingMove = pickFirstMatching(
    uniqueTrimmed([...sample.openingPatterns, sample.coreThesis, paragraphs[0]]),
    [/不是/, /真正/, /为什么/, /误解/, /高估/, /低估/, /问题在于/],
  );
  const judgementBridge = pickFirstMatching(
    uniqueTrimmed([...sample.highlightLines, ...paragraphs.slice(0, 8)]),
    [/不是/, /真正决定/, /更准确地说/, /问题在于/, /很多人/, /误解/],
  );
  const zoneSplit = pickFirstMatching(
    uniqueTrimmed([sample.structureSummary, ...sample.highlightLines, ...paragraphs.slice(0, 12)]),
    [/片区/, /骨架/, /切割/, /不是一个板块/, /几种生活/, /拆开/],
  );
  const sceneGrounding = pickFirstMatching(
    uniqueTrimmed(paragraphs.slice(0, 14)),
    [/通勤/, /地铁/, /接娃/, /买菜/, /小区/, /一家人/, /首改/, /改善/, /早高峰/],
  );
  const closingEcho = pickFirstMatching(
    uniqueTrimmed([paragraphs.at(-1), paragraphs.at(-2), ...sample.highlightLines.slice(-2)]),
    [/回到/, /最后还是/, /真正决定/, /不是标签/, /对谁成立/, /代价/],
  );

  return [
    openingMove
      ? {
          actionType: "opening_move",
          assetText: openingMove,
          rationale: "样本中的开头抓手或反常识切入。",
          weight: 5,
        }
      : null,
    judgementBridge
      ? {
          actionType: "judgement_bridge",
          assetText: judgementBridge,
          rationale: "样本中把事实翻译成判断的桥接句。",
          weight: 4,
        }
      : null,
    zoneSplit
      ? {
          actionType: "zone_split",
          assetText: zoneSplit,
          rationale: "样本中拆空间骨架、片区差异或结构错位的动作。",
          weight: 4,
        }
      : null,
    sceneGrounding
      ? {
          actionType: "scene_grounding",
          assetText: sceneGrounding,
          rationale: "样本中把抽象判断落回生活场景的动作。",
          weight: 3,
        }
      : null,
    closingEcho
      ? {
          actionType: "closing_echo",
          assetText: closingEcho,
          rationale: "样本中结尾回环或落代价的动作。",
          weight: 3,
        }
      : null,
  ].filter((item): item is SampleActionAssetInput => Boolean(item));
}
