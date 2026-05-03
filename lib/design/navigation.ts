export const WORKBENCH_NAV_ITEMS = [
  {
    id: "projects",
    label: "项目",
    description: "项目中控台",
    disabled: false,
  },
  {
    id: "workbench",
    label: "工作台",
    description: "写作驾驶舱",
    disabled: false,
  },
  {
    id: "sources",
    label: "资料卡",
    description: "研究资料库",
    disabled: false,
  },
  {
    id: "outline",
    label: "提纲",
    description: "结构编辑器",
    disabled: false,
  },
  {
    id: "draft",
    label: "正文",
    description: "写作编辑器",
    disabled: false,
  },
  {
    id: "publish",
    label: "发布",
    description: "导出中心",
    disabled: false,
  },
  {
    id: "settings",
    label: "设置",
    description: "规划中",
    disabled: true,
  },
] as const;

export type WorkbenchView = (typeof WORKBENCH_NAV_ITEMS)[number]["id"];

export function getWorkbenchViewLabel(view: WorkbenchView) {
  return WORKBENCH_NAV_ITEMS.find((item) => item.id === view)?.label ?? "工作台";
}
