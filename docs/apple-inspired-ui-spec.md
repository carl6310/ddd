# Apple-Inspired UI Specification

本文件把 Apple Human Interface Guidelines 和 Apple 官网视觉语言转译成上海板块写作工作台的可执行 Web 规范。

它不是照搬 Apple 原生控件，也不是把工作台改成营销页。目标是让项目在长时间写作、资料判断、正文编辑中具备 Apple-like 的清晰层级、克制材质、稳定节奏和高级留白。

参考：

- Apple HIG: https://developer.apple.com/design/human-interface-guidelines/
- Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Color: https://developer.apple.com/design/human-interface-guidelines/color
- Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Sheets: https://developer.apple.com/design/human-interface-guidelines/sheets
- Popovers: https://developer.apple.com/design/human-interface-guidelines/popovers
- Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Text Fields: https://developer.apple.com/design/human-interface-guidelines/text-fields
- Lists and Tables: https://developer.apple.com/design/human-interface-guidelines/lists-and-tables
- Search Fields: https://developer.apple.com/design/human-interface-guidelines/search-fields
- Materials: https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/materials

---

## 0. HIG Coverage Matrix

| HIG 主题 | Apple 重点 | 当前项目状态 | 本项目执行口径 |
| --- | --- | --- | --- |
| Layout | 清晰视觉层级、阅读顺序、对齐、安全区域 | 已有三栏和基础 spacing，但 safe area / 内容宽度还不够硬 | 以桌面 web 转译 safe area：外边距、主列宽度、长文宽度、表单宽度写入 token |
| Color | 语义色、一致状态含义、对比度、不要只靠颜色 | 基础色已收敛，高对比模式未完整规范 | 使用语义 token；状态必须配文字；补 `prefers-contrast: more` |
| Typography | 可读字号、字重、行高、文字放大后不截断 | 有字号 token，但 line-height / weight 边界弱 | 标题、正文、长文、meta 全部有 size / weight / line-height |
| Accessibility | 键盘可达、focus、对比度、状态多通道表达 | Modal / Toast / Tab 已补部分语义 | 增加完整 QA 文档和验收路径 |
| Buttons | 按钮可含文字/图标，主次清楚，动作明确 | variant 已有，size 之前不硬 | `sm/md/lg` 尺寸化；主操作用 `lg`，工具操作用 `sm/md` |
| Sheets | 临时任务、短流程、明确关闭和动作 | Modal 已是基础 sheet，但等级未明确 | Modal 增加 `kind` / `size`；长期主流程不得放入 sheet |
| Popovers | 少量临时功能、一次一个、外部关闭 | 之前只有文档，没有组件入口 | 新增轻量 `Popover`，只承载小筛选/说明/临时设置 |
| Text fields | label、hint、尺寸匹配输入量、tab 顺序 | 表单样式分散，部分字段宽高不一致 | 统一 Field 规则；长文本用 textarea，短输入用 input |
| Lists / tables | 列表便于扫描、选中态清楚、行文简洁 | 项目列表、资料卡、任务列表风格仍有局部差异 | 列表项统一 title / meta / body / action |
| Search | 搜索入口位置和搜索范围要匹配 | 左栏已有项目搜索，资料搜索规则未硬 | 左栏搜索只过滤项目；资料区搜索只过滤资料/证据 |
| Sidebars | 侧边栏用于导航和来源切换，降低视觉权重 | 左栏已 Finder 化，但仍有局部卡片感 | 左栏保持低权重，不放大面积主按钮堆叠 |
| Materials | 控件层与内容层分离，材质服务层级 | 未采用 Liquid Glass，也不应照搬 | 转译为 content layer / control layer / floating layer，不做玻璃拟态 |

状态定义：

- 已完成：基础规范和组件已经有约束。
- 进行中：已写入本规范，但仍需逐页迁移。
- 不适用：Apple 原生平台特性不直接复制，只转译原则。

## 1. North Star

界面气质：

- macOS productivity tool
- Apple.com breathing room
- editorial evidence desk
- local-first writing cockpit
- calm, precise, content-first

基本原则：

- 主内容永远是视觉中心。
- 状态和控件服务内容，不和内容抢注意力。
- 色彩用于状态、反馈、主操作，不用于装饰。
- 层级来自留白、字号、字重、灰度、细边框，而不是阴影和渐变。
- 弹窗只承载临时任务，不承载长期主流程。

---

## 2. Surface System

### 2.1 页面层级

| 层级 | 名称 | 用途 | 视觉 |
| --- | --- | --- | --- |
| L0 | App Background | 页面底色 | `#f5f5f7` |
| L1 | Stage Surface | 主舞台、阶段入口、项目摘要 | 白色大块，16-20px 圆角，无阴影 |
| L2 | Panel Surface | Inspector、工具面板、资料组 | 白色或浅灰，12-16px 圆角，细边框 |
| L3 | Object Card | 项目项、资料卡、候选角度 | 12-16px 圆角，细边框，无阴影 |
| L4 | Floating Surface | sheet、toast、popover | 18-20px 圆角，允许轻阴影 |
| L5 | Alert | 删除、覆盖、阻塞确认 | 小尺寸、明确后果、最多 3 个动作 |

### 2.2 禁止

- 普通页面区域不新增 `linear-gradient`。
- 普通 card / panel 不新增局部 `box-shadow`。
- 不用卡片套卡片制造层级。
- 不在 JSX 中写布局型 inline style。
- 不把 Apple 官网营销 hero 搬进高频编辑区。

---

## 3. Radius

| 元素 | Token | 值 |
| --- | --- | --- |
| Sheet / 一级弹窗 | `--radius-sheet` | 20px |
| Apple-like 大主舞台 | `--radius-stage` | 18px |
| 工具面板 / Inspector | `--radius-panel` | 14px |
| 独立对象卡 | `--radius-card` | 14px |
| 输入框 / 常规按钮 | `--radius-control` | 10px |
| Badge / chip | `--radius-chip` | 7px |
| 圆形图标按钮 | `50%` | 圆形 |

规则：

- 大块 surface 可以更圆，但不能超过 20px。
- 高频工具控件不要过圆，避免玩具感。
- badge/chip 不做胶囊，除非是极小状态点。

---

## 4. Color

### 4.1 基础色

| Token | 用途 | 值 |
| --- | --- | --- |
| `--app-bg` | 页面底色 | `#f5f5f7` |
| `--surface-primary` | 主 surface | `#ffffff` |
| `--surface-secondary` | 次级 surface | `#f7f7f9` |
| `--hairline` | 细边框 | `rgba(0,0,0,.08)` |
| `--text-primary` | 主文字 | `#1d1d1f` |
| `--text-secondary` | 次级文字 | `#6e6e73` |
| `--accent` | 主操作 / 当前项 / 链接 | `#0071e3` |

### 4.2 状态色

| 状态 | 用途 | 规则 |
| --- | --- | --- |
| Blue | 主操作、选中、链接 | 每个区域最多 1 个强蓝按钮 |
| Green | 成功、通过 | 小面积 chip 或摘要数字 |
| Amber | 风险、待处理 | 不大面积铺底 |
| Red | 失败、删除 | 只用于 destructive |
| Purple | stale / 过期 | 非必要不用 |

规则：

- 同屏强状态色不超过 2 种。
- 状态必须有文字说明，不只靠颜色。
- 主阅读区不用彩色背景。
- 不用同一种颜色同时表达“可点击”和“状态”。

---

## 5. Typography

字体栈：

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", sans-serif;
```

| Role | Token | Size | Weight | 用途 |
| --- | --- | ---: | ---: | --- |
| Hero title | `--font-hero` | 36-46 | 700 | 项目摘要、共创标题 |
| Page title | `--font-page-title` | 28-32 | 700 | 阶段标题、资料索引 |
| Section title | `--font-section-title` | 20-24 | 650/700 | 区块标题 |
| Card title | `--font-card-title` | 16-18 | 650/700 | 资料卡、候选角度 |
| Body | `--font-body` | 14-15 | 400/500 | 普通说明 |
| Longform | `--font-longform` | 15-16 | 400 | 草稿阅读 |
| Meta | `--font-meta` | 12-13 | 500/600 | badge、时间、说明 |
| Label | `--font-label` | 11-12 | 600/700 | Inspector label、状态标签 |

规则：

- 不使用 Light / Thin。
- 不使用负 letter-spacing。
- 中文正文行宽控制在 70-90 个中文字符。
- 通过 size、weight、color 建立层级，不通过花色。

---

## 6. Layout

### 6.1 桌面三栏

```text
Sidebar 240-280px
Main    minmax(680px, 1fr)
Inspector 280-320px
Gap 20-28px
Outer padding 24-32px
Max app width 1600px
```

主内容最大宽度：

- 长文阅读：720-900px。
- 资料卡正文：不跨满超宽屏。
- 项目摘要 / 共创 / Evidence Summary：允许大标题和大留白。

### 6.2 窄屏顺序

```text
Topbar
Project switcher
Main workspace
Inspector
```

Inspector 不放在主工作区前面。

---

## 7. Modal Levels

### 7.1 一级弹窗：Sheet

用途：

- 选题共创
- 新建项目
- 批量导入
- 发布前确认

规格：

- 宽度：小任务 560-720px，复杂任务 960-1040px。
- 圆角：20px。
- 背景：父页面 dim + blur。
- 标题：32-46px / 700。
- 副标题：15-17px / gray。
- 内容：大白块分组，不做卡片套卡片。
- 动作：一个 primary，其他 secondary/ghost。
- 关闭：右上角圆形关闭按钮。

禁止：

- 一级弹窗里再打开一级弹窗。
- 用 sheet 做长期主页面。
- 在 sheet 里堆多个同等级主操作。

### 7.2 二级浮层：Popover

用途：

- 小筛选
- 更多操作
- 简短说明
- 临时设置

规格：

- 宽度：280-420px。
- 圆角：14-16px。
- 同时只显示一个。
- 点击外部关闭。
- 移动端改为 sheet。

### 7.3 Alert

用途：

- 删除
- 覆盖人工内容
- 清空失败任务
- 跳过硬性流程

规则：

- 标题一句话。
- 说明只讲后果。
- 最多 3 个按钮。
- destructive 不允许同时是 primary。

---

## 8. Buttons

| 类型 | 用途 | 视觉 |
| --- | --- | --- |
| Primary | 当前最可能动作 | 蓝底白字 |
| Secondary | 次要动作 | 白底细边框 |
| Ghost | 取消、关闭、辅助 | 透明或浅灰 |
| Danger | 删除、清空 | 红色文字或浅红底 |

规则：

- 每个区域最多 1 个 primary。
- hit area 至少 44px 高。
- 文案用动词开头。
- 同一组选项按钮保持同尺寸，用样式区分主次，不用大小区分。
- `Button size="sm"`：工具栏、列表行内操作、刷新。
- `Button size="md"`：普通表单动作、次操作。
- `Button size="lg"`：主操作、生成、保存、导出。
- primary 默认视觉上应达到 `lg` 强度；不得用小号 primary 做高频主操作。

---

## 8.1 Text Fields

规则：

- 每个输入必须有可见 label；placeholder 只做例子，不替代 label。
- 短输入使用 input，长段落使用 textarea。
- 字段宽度和预期输入量匹配：短字段不拉满超宽屏，长文编辑不超过 `--longform-max-width`。
- 多字段表单优先纵向堆叠，label 与字段保持一致间距。
- Tab 顺序必须符合视觉顺序。
- 错误提示放在字段附近，说明原因和修复方式。

---

## 8.2 Lists, Tables, Search

列表规则：

- 项目列表、资料列表、任务列表统一结构：title / meta / body / actions。
- 选中态必须有背景或边框变化，不只靠文字颜色。
- 列表行内动作使用 `sm` 或 `md`，不出现多个同级强按钮。
- 长文本优先截断到摘要，详情进入展开或独立区域。

搜索规则：

- 左侧 search 只过滤项目导航。
- 资料区 search 只过滤资料卡和证据，不做全局搜索。
- 搜索框靠近它影响的列表。
- 清空搜索后必须回到完整列表。

---

## 8.3 Materials

本项目不复制 Liquid Glass。转译方式：

- Content layer：正文、资料、项目摘要，使用白色或浅灰 surface。
- Control layer：Tab、按钮、侧边栏控件，视觉上轻浮于内容但不抢内容。
- Floating layer：Sheet、Popover、Toast，允许轻阴影和更高 z-index。

禁止：

- 在正文层使用玻璃拟态。
- 用透明叠色制造不可读材质。
- 让控件层和内容层颜色混在一起，导致扫描困难。

---

## 9. Component Mapping

| 项目组件 | 类型 | 规范 |
| --- | --- | --- |
| `page-shell` | App frame | 1600px max, 24-32px padding |
| `workflow-tabs` | Segmented control | 低色，active 白底 |
| `project-summary-card` | Stage Surface | 大标题，大白块 |
| `section-shell` | Stage Surface | 阶段内容主面 |
| `status-bar inspector-panel` | Panel | 白底，轻边框，单主操作 |
| `source-library-stage` | Evidence Desk | Summary -> gaps -> cards |
| `evidence-source-card` | Object Card | 宽松，无阴影 |
| `modal-dialog` | Sheet | 20px radius, floating shadow |
| `status-block` | Callout/Panel | 只用于状态或局部分组 |

---

## 10. Review Checklist

每次 UI 改动前后检查：

- 页面是否只有一个视觉主角。
- 是否没有普通区域新增 shadow / gradient。
- 是否没有卡片套卡片。
- 是否同屏强状态色不超过 2 种。
- 是否每个区域最多一个 primary。
- 是否弹窗只承载临时任务。
- 是否移动端无横向溢出。
- 是否字体层级符合 token。
- 是否按钮 hit area 至少 44px。
- 是否状态不只依赖颜色。
