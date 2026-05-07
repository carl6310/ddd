import type { ProjectStage } from "@/lib/types";

export const WORKBENCH_FLOW = [
  {
    id: "judgement",
    label: "选题判断",
    shortLabel: "判断",
    description: "判断题值、读者收益、表达策略",
    stageLabels: ["选题定义", "ThinkCard / HKR", "StyleCore"],
  },
  {
    id: "evidence",
    label: "资料沉淀",
    shortLabel: "资料",
    description: "生成研究清单，录入和管理资料卡",
    stageLabels: ["研究清单", "资料卡整理"],
  },
  {
    id: "model",
    label: "板块建模",
    shortLabel: "建模",
    description: "把资料翻译成空间模型、价值判断和风险结构",
    stageLabels: ["板块建模"],
  },
  {
    id: "outline",
    label: "论证提纲",
    shortLabel: "提纲",
    description: "确定文章主判断、论证骨架和段落任务",
    stageLabels: ["提纲生成"],
  },
  {
    id: "draft",
    label: "正文打磨",
    shortLabel: "正文",
    description: "生成双稿、人工编辑、修订正文",
    stageLabels: ["正文生成"],
  },
  {
    id: "publish",
    label: "体检发布",
    shortLabel: "发布",
    description: "完成 VitalityCheck、标题摘要和发布清单",
    stageLabels: ["VitalityCheck", "发布前整理"],
  },
] as const;

export type WorkbenchFlowItem = (typeof WORKBENCH_FLOW)[number];
export type WorkbenchFlowId = WorkbenchFlowItem["id"];

export function getWorkbenchFlowItem(id: WorkbenchFlowId): WorkbenchFlowItem {
  return WORKBENCH_FLOW.find((item) => item.id === id) ?? WORKBENCH_FLOW[0];
}

export function getWorkbenchFlowLabel(id: WorkbenchFlowId): string {
  return getWorkbenchFlowItem(id).label;
}

export function getWorkbenchFlowByProjectStage(stage: ProjectStage): WorkbenchFlowId {
  return WORKBENCH_FLOW.find((item) => (item.stageLabels as readonly ProjectStage[]).includes(stage))?.id ?? "judgement";
}
