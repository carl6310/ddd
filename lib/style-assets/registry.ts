import { createId, nowIso } from "@/lib/utils";
import type { SampleArticle } from "@/lib/types";
import { extractSampleActionAssets, type SampleActionAssetInput, type SampleActionType } from "./extractor";

export interface SampleActionAssetRecord extends SampleActionAssetInput {
  id: string;
  sampleId: string;
  createdAt: string;
}

const ACTION_LABELS: Record<SampleActionType, string> = {
  opening_move: "开头动作",
  judgement_bridge: "事实转判断",
  zone_split: "空间/片区拆解",
  scene_grounding: "场景落地",
  closing_echo: "结尾回环",
};

export function buildSampleActionAssets(sample: SampleArticle): SampleActionAssetRecord[] {
  return extractSampleActionAssets(sample).map((asset) => ({
    ...asset,
    id: createId("saa"),
    sampleId: sample.id,
    createdAt: nowIso(),
  }));
}

export function buildStyleActionReference(assets: SampleActionAssetRecord[]) {
  if (assets.length === 0) {
    return "";
  }

  const grouped = new Map<SampleActionType, SampleActionAssetRecord[]>();
  for (const asset of assets) {
    const current = grouped.get(asset.actionType) ?? [];
    current.push(asset);
    grouped.set(asset.actionType, current);
  }

  return Array.from(grouped.entries())
    .map(([actionType, values]) => {
      const top = values
        .slice()
        .sort((left, right) => right.weight - left.weight || left.assetText.localeCompare(right.assetText))
        .slice(0, 3);
      return [
        `${ACTION_LABELS[actionType]}：`,
        ...top.map((item) => `- ${item.assetText}`),
      ].join("\n");
    })
    .join("\n\n");
}
