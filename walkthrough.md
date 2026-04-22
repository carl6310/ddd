# UI / UX 重构走查

## 当前状态

- `components/project-workbench.tsx` 已从巨型渲染文件收敛为状态中枢，负责项目选择、主消息提示、步骤请求分发和 Tab 切换。
- 主界面已按工作流拆为 `概览 & 设置`、`研究清单 & 资料`、`流转定稿` 三个区域，并新增右侧 `ReviewSidebar` 用于快速检查 ThinkCard、StyleCore 和 VitalityCheck 状态。
- 左侧栏已拆分为独立的 `ProjectSidebar`，承接选题共创、新建项目和项目列表三块能力。

## 目录拆分

- `components/project-workbench.tsx`
- `components/workbench/ProjectSidebar.tsx`
- `components/workbench/OverviewTab.tsx`
- `components/workbench/ResearchTab.tsx`
- `components/workbench/DraftsTab.tsx`
- `components/workbench/ReviewSidebar.tsx`

## 视觉变化

- `app/globals.css` 已引入统一变量体系，使用浅色底板、径向渐变背景、半透明面板、边框与阴影层级来提升层次感。
- 卡片、按钮、链接和消息提示条均加入了 hover / transition 细节，交互比原始工作台更清晰。
- 页面主结构改为三栏工作台布局，减少长页面滚动，把高频操作收拢到更稳定的位置。

## 已完成验证

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## 后续建议

- `OverviewTab.tsx` 仍然偏大，后续可以继续拆成 `FrameEditor`、`WorkflowActions`、`VitalityPanel` 等更细粒度组件。
- 如果要把本次重构作为里程碑提交，建议补一组最基础的组件交互测试，锁住 Tab 切换与关键按钮的回归行为。
