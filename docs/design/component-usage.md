# Component Usage

本文件规定后续 UI 改动优先使用的基础组件和使用边界。

相关规范：

- [Apple-Inspired UI Specification](../apple-inspired-ui-spec.md)
- [Layout And Size Spec](./layout-size-spec.md)
- [Typography Spec](./typography-spec.md)
- [Modal, Panel And Floating Layer Spec](./modal-panel-spec.md)
- [Accessibility QA Spec](./accessibility-qa-spec.md)

## 0. 迁移状态与治理边界

当前工作台 TSX 已迁到新组件入口：

- 布局：`AppShell` + `Surface` / `Panel` / `Card`。
- 动作：`Button` / `ButtonLink` / `IconButton`。
- 状态：`Chip` / `StatusDot`。
- 空状态：`EmptyState`。
- 风险提示：`Callout`。

CSS 中的 `.card`、`.panel`、`.badge`、`.status-chip`、`.empty-state` 只作为兼容别名保留，不允许新 TSX 直接使用这些旧基类。业务 class 可以继续存在，例如 `source-card`、`project-summary-card`、`draft-editor-stage`，但它们必须挂在新组件外壳上。

验收命令：

```bash
rg -n "primary-button|secondary-button|ghost-button|danger-button|status-chip|className=\"card|className=\"panel|className=\"badge|className=\"empty-state" components app -g '*.tsx'
```

允许结果只包含：

- `components/ui/button.tsx` 内部映射。
- `components/ui/chip.tsx` 或 `JobStatusChip` 等组件内部封装。
- 业务 class 名中自然包含 `badge/card/chip` 字样，但不能是旧基类直接挂在 TSX 上。

## 0.1 尺寸、间距与位置基线

尺寸规范由 `app/globals.css` 的 token 统一控制，新增页面不允许随手写一套局部尺寸。

### 间距 scale

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--space-1` | 4px | 极小图标 / 紧贴文本 |
| `--space-2` | 8px | label 与输入、chip 组内间距 |
| `--space-3` | 12px | 小卡片内部组间距 |
| `--space-4` | 16px | 标准卡片间距 |
| `--space-5` | 20px | 面板间距、三栏间距 |
| `--space-6` | 24px | 大卡片内边距 |
| `--space-8` | 32px | 阶段主舞台内边距 |
| `--space-12` | 48px | 空状态、强摘要区呼吸感 |

### 控件高度

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--control-height-sm` | 32px | 紧凑按钮、状态栏动作 |
| `--control-height-md` | 38px | 工具按钮、资料录入动作 |
| `--control-height-lg` | 44px | 表单输入、主按钮 |
| `--chip-height` | 26px | Chip / 状态标签 |

### 布局宽度

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--content-max-width` | 1600px | 桌面工作台最大宽度 |
| `--sidebar-width` | 260px | 左侧项目栏 |
| `--inspector-width` | 304px | 右侧状态面板 |
| `--workspace-gap` | 20px | 三栏间距 |
| `--longform-max-width` | 900px | 长文阅读 / 编辑宽度上限 |

### 组件尺寸规则

- `Surface` 默认内边距：`--surface-padding-stage`，用于阶段大区。
- `Panel` 默认内边距：`--surface-padding-panel`，用于工具面板。
- `Card` 默认内边距：`--surface-padding-card`，用于独立对象。
- 指标卡统一最小高度：`--metric-card-height`。
- 空状态统一最小高度：`--empty-state-height`。

### 禁止

- 禁止新组件直接写散落的 `padding: 13px 17px`、`gap: 11px`、`height: 37px`。
- 禁止同类指标卡在同一页面使用不同高度。
- 禁止为了填空白把卡片撑高；应该调整信息密度或布局列数。
- 禁止在页面局部重新定义 sidebar / inspector 宽度。

## 1. Surface

文件：`components/ui/surface.tsx`

用途：

- 阶段主舞台。
- 项目摘要。
- 大块内容承载区。

规则：

- 用于页面大区，不用于每一个小字段。
- 不和 `Card` 套用制造层级。
- 大标题和关键 summary 可以放在 Surface 内。

## 2. Panel

文件：`components/ui/surface.tsx`

用途：

- 工具面板。
- Inspector 分组。
- 资料分组。

规则：

- 信息密度可以比 Surface 高。
- 允许细边框，不使用重阴影。
- 不承载长文主编辑。

## 3. Card

文件：`components/ui/surface.tsx`

用途：

- 独立对象：项目、资料卡、候选角度、段落、检查项。

规则：

- 卡片必须代表一个对象。
- 不把普通解释文案做成卡片。
- 禁止卡片套卡片。

## 4. Button / ButtonLink / IconButton

文件：`components/ui/button.tsx`

用途：

- `primary`：真实主动作，例如生成、保存、导出。
- `secondary`：次动作，例如重新生成、查看详情。
- `ghost`：低权重动作，例如标记已处理。
- `danger`：删除、撤销等破坏性动作。
- `size="sm"`：工具栏、列表行内操作、刷新。
- `size="md"`：默认表单动作、次操作。
- `size="lg"`：生成、保存、导出等主操作。
- `ButtonLink`：需要链接语义的导出、打开来源等动作。
- `IconButton`：只有图标时必须提供 `aria-label`。

规则：

- 每个区域最多一个 primary。
- 导航按钮不要做成 primary。
- 所有按钮必须显式 `type="button"` 或 `type="submit"`。
- 不用按钮大小表达主次；主次由 variant 表达，尺寸由场景表达。
- primary 不使用 `sm`，除非它是非常局部的行内确认。

## 5. Chip / StatusDot

文件：`components/ui/chip.tsx`

用途：

- 小状态。
- 计数。
- 当前阶段。
- 风险类型。

规则：

- 不承载长句。
- 状态必须有文字，不只靠颜色。
- 同屏强状态色不超过两种。

## 6. Callout

文件：`components/ui/callout.tsx`

用途：

- 风险提示。
- 失败提示。
- 下游过期提示。
- 待补证据提示。

规则：

- 必须说明原因。
- 必须说明下一步。
- 只用小面积状态色。

## 7. SectionHeader

文件：`components/ui/section-header.tsx`

用途：

- 阶段标题。
- 主区块标题。
- 可选的右侧动作区。

规则：

- 不在小卡片里使用大标题。
- 描述文案只放关键位置，不每个面板重复解释。

## 8. EmptyState

文件：`components/ui/empty-state.tsx`

用途：

- 未选择项目。
- 尚未生成研究清单。
- 尚未导入资料。
- 尚未生成双稿。

规则：

- 一句话说明当前缺什么。
- 一个主动作即可。
- 不堆多个同级按钮。

## 9. AppShell

文件：`components/layout/app-shell.tsx`

用途：

- 工作台三栏结构。

规则：

- Header、Sidebar、MainStage、Inspector 在这里装配。
- 业务状态仍由 `ProjectWorkbench` 控制。
- 不在 AppShell 中加入业务 API 或写作流程逻辑。

## 10. Modal

文件：`components/ui/modal.tsx`

用途：

- `kind="sheet"`：短任务、共创入口、任务中心、导入。
- `kind="alert"`：删除、覆盖、清空、跳过硬门槛。
- `size="sm"`：短确认或短表单。
- `size="md"`：默认 sheet。
- `size="lg"`：内容较多但仍是临时任务的 sheet。

规则：

- `wide` 只作为历史兼容；新增调用使用 `size`。
- Sheet 不承载长期主流程。
- Alert 不做复杂表单。
- 一个 Modal 内最多一个 primary。

## 11. Popover

文件：`components/ui/popover.tsx`

用途：

- 小筛选。
- 更多操作。
- 简短解释。
- 临时设置。

规则：

- 同屏只显示一个。
- 点击外部或 Escape 关闭。
- 不承载多步流程。
- 不保存复杂草稿。
