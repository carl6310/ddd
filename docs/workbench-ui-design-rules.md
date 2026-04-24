# Workbench UI Design Rules

本文件是日常 UI 改动的轻量验收清单。完整产品级设计规范见：

- [Shanghai Writing Workbench Design System](./workbench-design-system.md)
- [Apple-Inspired UI Specification](./apple-inspired-ui-spec.md)
- [Layout And Size Spec](./design/layout-size-spec.md)
- [Typography Spec](./design/typography-spec.md)
- [Modal, Panel And Floating Layer Spec](./design/modal-panel-spec.md)
- [Accessibility QA Spec](./design/accessibility-qa-spec.md)

本项目是本地写作工作台，不是营销站，也不是通用后台。界面目标是让作者长时间阅读、判断、改写时保持稳定、清晰和低负担。

## 1. 布局原则

- 页面只保留三层导航：项目列表、顶部主流程、当前工作区子导航。
- 同一个视口内避免超过两个主要阅读/编辑面板。
- 主要内容区按任务选择布局：资料和摘要可用 2 栏，长文写作和双稿编辑必须保持单列焦点。
- 信息解释文字只放在关键状态和空状态里，不在每个面板重复说明功能。
- 桌面 safe area 遵守页面外边距 24-32px、三栏 gap 20px、主内容不贴边。

## 2. 框与卡片

- 卡片只用于独立对象：项目、资料卡、段落、状态块、弹窗。
- 不使用“卡片套卡片”来制造层级；需要分组时用标题、分割线或留白。
- 主舞台圆角 18px，面板/卡片圆角 14px，按钮/输入框圆角 10px，标签圆角 7px。
- 避免胶囊形按钮和标签，除非是纯状态点或极小计数器。
- 普通工作区、工具面板、资料卡不新增局部 `box-shadow`；只有弹窗、toast、浮层可用轻阴影。
- 普通页面区域不新增 `linear-gradient`；状态提示只用低饱和纯色背景。
- JSX 里不写布局型 inline style，新增视觉样式必须进入 CSS class。
- 新增大区优先使用 `ui-stage-surface / ui-panel / ui-card / ui-callout / ui-sheet` 语义 class。
- 新增浮层使用 `Modal kind/size` 或 `Popover`，不临时写一套浮层。

## 3. 滚动规则

- 每个视口最多允许一个主滚动区和一个局部滚动区。
- 禁止在同一个面板内出现多个并列长文本滚动框。
- 长文章预览使用一个稳定阅读容器，内部滚动；不要把两个长 textarea 并排。
- 编辑区默认自适应高度；只有超过 70vh 的长文本才允许局部滚动。

## 4. 文本区规则

- 可编辑长文使用阅读态 + 点击编辑，避免一直显示 textarea 边框。
- 只读长文使用 article/pre 阅读面，不使用 textarea。
- 重要文本行宽控制在 70-90 个中文字符附近；不要让正文横跨整屏。
- 段落间距要明显大于行距，保证长文阅读有呼吸感。

## 5. 操作层级

- 主操作使用 primary button，每个区域最多 1 个。
- 次操作使用 secondary button，例如重新生成、重新检查。
- 主操作使用 `size="lg"`；工具栏和列表行内操作使用 `size="sm"` 或 `size="md"`。
- 导航按钮只改变视图，不触发后台任务。
- 保存按钮必须与后端必填规则一致，不能出现“按钮可点但必失败”。

## 6. 视觉节奏

- 工作区基础间距 16px，重要区块之间 20-24px。
- 同一行的 badge、chip、button 使用同一高度和圆角。
- 字号、字重、行高遵守 typography token，不新增随机字号。
- 用留白和标题组织信息，不靠更多边框堆层级。
- hover 只做轻量反馈，不做明显位移。
- 同一视口内强状态色不超过 2 种；状态不能比正文内容更抢眼。
- Tab、空状态、关键 surface 可使用 150-200ms opacity / background 轻过渡。
- 必须尊重 `prefers-reduced-motion`。
- 必须尊重 `prefers-contrast: more`。

## 7. 验收清单

- 页面没有无意义横向滚动条。
- 长文区域不出现多个相邻窄滚动框。
- 按钮状态与实际后端要求一致。
- 截图中主要阅读区有清楚留白，不贴边、不拥挤。
- 新增组件遵守 Apple-like radius token，不自己临时写圆角。
- 截图中左栏像项目索引，右栏像 Inspector，主工作区是视觉中心。
- 没有新增未批准的 shadow、gradient、强色块或卡片套卡片。
