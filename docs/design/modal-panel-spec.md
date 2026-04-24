# Modal, Panel And Floating Layer Spec

本文件规定 Sheet、Alert、Popover、Toast、Inspector 的层级和交互边界。

## 1. Layer Taxonomy

| 层级 | 组件 | 用途 | 规则 |
| --- | --- | --- | --- |
| Content layer | Surface / Panel / Card | 页面主内容 | 无重阴影，不做玻璃拟态 |
| Control layer | Tab / Button / Sidebar control | 操作当前内容 | 轻背景、清晰 focus |
| Inspector layer | ReviewSidebar | 状态、风险、下一步 | 固定右侧，不能变成第二主栏 |
| Floating layer | Sheet / Popover / Toast | 临时任务和反馈 | 允许轻阴影，高 z-index |
| Alert layer | Confirm / destructive | 删除、覆盖、阻塞确认 | 小尺寸，后果明确 |

## 2. Sheet

组件：`Modal kind="sheet"`

| Size | 宽度 | 用途 |
| --- | ---: | --- |
| `sm` | 560px | 新建项目、短表单 |
| `md` | 720px | 默认短任务 |
| `lg` | 1040px | 任务中心、共创结果、批量导入 |

规则：

- Sheet 只承载临时任务，不承载长期主流程。
- 一个 sheet 里最多一个 primary。
- 关闭按钮必须可见，且有 `aria-label`。
- 打开后 focus 进入弹窗；关闭后回到触发元素。
- 不允许一级 sheet 再打开一级 sheet。

## 3. Alert

组件：`Modal kind="alert" size="sm"`

规则：

- 用于删除、覆盖人工内容、清空失败任务、跳过硬性流程。
- 标题一句话说明行为。
- 说明只讲后果和恢复方式。
- 最多 3 个按钮。
- destructive 不允许同时是 primary。

## 4. Popover

组件：`Popover`

用途：

- 小筛选。
- 更多操作。
- 简短说明。
- 临时设置。

规则：

- 宽度默认 360px。
- 同屏只允许一个。
- 点击外部或 Escape 关闭。
- 不保存复杂草稿；如会自动关闭，必须即时保存。
- 不承载多步流程。

## 5. Toast

规则：

- 成功和普通信息使用 `role="status"`。
- 错误使用 `role="alert"`。
- 不抢焦点。
- 只反馈已发生的状态，不放复杂操作。
- 不遮挡主编辑区。

## 6. Inspector

规则：

- 只回答三件事：现在到哪、哪里有风险、下一步做什么。
- 不固定放长文、表单或双稿。
- 不使用大面积状态色。
- CTA 最多一个，并且必须指向当前最合理下一步。
