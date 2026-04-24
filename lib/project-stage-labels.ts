import type { ProjectStage } from "@/lib/types";

export function formatProjectStage(stage: ProjectStage) {
  switch (stage) {
    case "选题定义":
      return "选题定义";
    case "ThinkCard / HKR":
      return "选题判断";
    case "StyleCore":
      return "表达策略";
    case "研究清单":
      return "研究清单";
    case "资料卡整理":
      return "资料整理";
    case "板块建模":
      return "板块建模";
    case "提纲生成":
      return "提纲生成";
    case "正文生成":
      return "正文生成";
    case "VitalityCheck":
      return "质量检查";
    case "发布前整理":
      return "发布整理";
    default:
      return stage;
  }
}
