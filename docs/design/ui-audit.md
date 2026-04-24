# UI Audit / Baseline

版本：2026-04-24  
范围：上海板块写作工作台 Web UI  
依据：[client-design-interaction-brief](../client-design-interaction-brief.md)

## 1. 当前结构

当前工作台已经形成三栏产品结构：

- 左侧：项目索引、搜索、新建、选题共创入口。
- 中间：判断、资料、写作、发布四个主阶段。
- 右侧：项目状态 Inspector，展示进度、风险、下一步。

关键文件：

- `app/page.tsx`：首屏取数并渲染工作台。
- `components/project-workbench.tsx`：工作台状态、主阶段切换、任务反馈和布局装配。
- `components/workbench/ProjectSidebar.tsx`：项目列表、新建项目、选题共创。
- `components/workbench/OverviewTab.tsx`：判断 / 创作策略。
- `components/workbench/ResearchTab.tsx`：研究清单、资料录入、资料索引。
- `components/workbench/DraftsTab.tsx`：板块建模、段落提纲、双稿编辑、发布整理。
- `components/workbench/ReviewSidebar.tsx`：右侧项目状态面板。
- `app/globals.css`：当前主要视觉系统、响应式和交互动效。

## 2. 已对齐项

- 桌面三栏结构已经稳定。
- 主背景、surface、圆角、状态色已经接近 Apple-inspired token。
- 右侧 Inspector 已降低视觉权重，不再使用大面积强色 CTA。
- 双稿编辑已经保持单列焦点，避免左右长文跳读。
- 资料索引已具备证据摘要和资料卡局部滚动。
- 选题共创弹窗已具备更大的呼吸感和候选角度卡片。
- 已支持 `prefers-reduced-motion`。

## 3. 主要问题

### 3.1 组件边界不够硬

全局 CSS 已经包含大量 token 和 class，但基础组件层还不完整。后续容易继续散写：

- 卡片。
- 面板。
- 状态 chip。
- callout。
- empty state。
- section header。

处理策略：新增 `components/ui/*` 基础组件，并在后续页面改动中优先复用。

### 3.2 AppShell 没有组件化

三栏结构之前直接写在 `ProjectWorkbench` 中，长期会让主控制器同时承担状态和布局职责。

处理策略：新增 `components/layout/app-shell.tsx`，由主控制器传入 header、sidebar、main、inspector 和 overlays。

### 3.3 Tab 语义不足

视觉上是 Tab，但部分位置仍是普通按钮：

- 主阶段 Tab。
- 判断阶段概览 / 编辑切换。
- 资料阶段子导航。
- 写作阶段子导航。
- 双稿预览版本切换。

处理策略：补充 `role="tablist"`、`role="tab"`、`aria-selected`，主阶段支持方向键切换。

### 3.4 弹窗和 Toast 可访问性不足

Modal 基于原生 `<dialog>`，但之前没有显式关联标题和描述。Toast 没有 `aria-live`。

处理策略：

- Modal 增加 `aria-labelledby` / `aria-describedby` / `aria-modal`。
- 打开弹窗后焦点进入弹窗，关闭后回到原焦点。
- Toast 增加 `role=status/alert` 和 `aria-live`。

### 3.5 全局 CSS 重复度较高

`app/globals.css` 是当前视觉系统中心，覆盖链较长，后续需要继续压缩：

- 基础 token。
- 通用组件 class。
- 页面专属 class。
- responsive。
- override polish。

处理策略：这轮不做大规模 CSS 拆分，避免回归；先用文档和基础组件建立边界。

## 4. 高风险文件

| 文件 | 风险 | 改动原则 |
| --- | --- | --- |
| `components/project-workbench.tsx` | 主状态机、任务反馈、阶段切换集中 | 只做布局装配和语义补强，不改业务流程 |
| `app/globals.css` | 全站样式集中，覆盖链长 | 小步添加 token / class，不删除未知规则 |
| `components/ui/modal.tsx` | 所有弹窗共用 | 只做无障碍增强，不改视觉结构 |
| `components/workbench/ProjectSidebar.tsx` | 新建与共创流程复杂 | 不改 API 和流程，只优化可复用样式边界 |
| `components/workbench/DraftsTab.tsx` | 写作主链路 | 保持单列编辑，不恢复双栏长文 |

## 5. 不能并行改的区域

- `ProjectWorkbench` 与 `AppShell` 装配。
- 全局 token 和基础按钮 / 卡片 / panel 样式。
- Modal / Toast 交互。

这些区域由 Integration Lead 统一修改。

## 6. 后续 Wave 建议

1. 继续把常用区域迁移到 `Surface / Panel / Card / Callout`。
2. 用组件文档限制新增 UI，不允许新增一次性卡片样式。
3. 建立截图 smoke，固定 1440 / 1280 / narrow 三类视口。
4. 下一轮重点压缩 `globals.css` 的重复覆盖链。
