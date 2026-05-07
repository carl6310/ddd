import { WORKBENCH_FLOW, type WorkbenchFlowId } from "@/lib/workbench/flow-definition";

export const WORKBENCH_NAV_ITEMS = [
  {
    id: "dashboard",
    label: "总览",
    description: "项目驾驶舱",
    disabled: false,
  },
  ...WORKBENCH_FLOW.map((item) => ({
    id: item.id,
    label: item.label,
    description: item.description,
    disabled: false,
  })),
] as const;

export type WorkbenchView = "dashboard" | WorkbenchFlowId;

export function getWorkbenchViewLabel(view: WorkbenchView) {
  return WORKBENCH_NAV_ITEMS.find((item) => item.id === view)?.label ?? "总览";
}
