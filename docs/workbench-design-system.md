# Shanghai Writing Workbench Design System

本手册定义上海板块写作工作台的产品布局、视觉语言、组件语义和后续重构标准。

更具体的 Apple-like 数值规范见：[Apple-Inspired UI Specification](./apple-inspired-ui-spec.md)。后续新增 UI 以该文件的 token、圆角、字号、弹窗等级和验收清单为准。

它不是 Apple Human Interface Guidelines 的照搬版，而是把 Apple 的核心原则转译到当前项目：

- 清楚的层级：用户一眼知道当前项目、当前阶段、下一步动作。
- 内容优先：界面服务写作判断、资料阅读和正文编辑，不抢内容注意力。
- 稳定一致：同一种状态、动作、导航在全项目里只用一种表达。
- 可访问：长时间阅读、键盘操作、足够对比度、明确状态反馈。

当前项目是本地优先、单人使用、流程驱动的写作工作台。它更接近 macOS 文档型生产力工具，而不是营销站、通用后台或多人 SaaS。

本轮视觉方向采用 Apple-mixed：

- 主工作台参考 macOS Notes / Finder / Xcode Inspector：稳定、克制、面板清楚。
- 共创入口、空状态、项目摘要、Evidence Summary 参考 Apple 官网的呼吸感：更大留白、更清楚的主标题、更少视觉噪音。
- 不做 Apple 官网式纯展示页，不牺牲写作效率，不把业务页面改成营销首屏。

参考来源：

- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Apple UI Design Dos and Don'ts: https://developer.apple.com/design/tips/
- Apple Sidebars: https://developer.apple.com/design/human-interface-guidelines/sidebars
- Apple Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Apple Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility

---

## 1. Product North Star

### 1.1 产品定位

一句话：

> 一个让作者和大模型共同完成上海板块分析文章的本地写作操作系统。

设计目标不是让页面显得丰富，而是让作者在 30-120 分钟的真实写作流程中持续知道：

- 我现在在哪个项目里。
- 这篇文章走到哪一步。
- 当前阻塞是什么。
- 下一步最值得做什么。
- 哪些内容是证据、哪些是判断、哪些是生成稿。

### 1.2 核心用户场景

1. 从模糊直觉开始共创选题。
2. 抓取或录入资料，形成可引用证据。
3. 把资料翻译成板块模型、提纲和双稿。
4. 用 ThinkCard / StyleCore / VitalityCheck 检查文章生命力。
5. 人工改写、发布整理、导出 Markdown。

### 1.3 设计判断

首要体验不是"好看"，而是"稳定、可追踪、少干扰"。

界面应像一个专业写作桌面：

- 左边是项目和材料索引。
- 中间是当前正在处理的内容。
- 右边是检查、风险、下一步动作。
- 顶部只承载全局状态，不承载复杂操作。

---

## 2. Information Architecture

### 2.1 推荐主布局

桌面端采用三层结构：

```text
Global Toolbar
┌──────────────┬──────────────────────────────┬──────────────────┐
│ Project List │ Primary Workspace            │ Inspector        │
│              │                              │                  │
│ 项目 / 搜索  │ 判断 / 资料 / 写作 / 发布     │ 状态 / 风险 / 下一步 │
│ 样本 / 历史  │ 当前阶段的主内容              │ 任务 / 检查 / 导出   │
└──────────────┴──────────────────────────────┴──────────────────┘
```

移动端和窄屏采用顺序折叠：

```text
Global Toolbar
Project Switcher
Stage Tabs
Primary Workspace
Inspector Summary
```

### 2.2 顶部栏职责

顶部栏只放全局级信息：

- 产品名或当前空间名。
- 本地服务 / 模型模式 / worker 状态。
- 任务中心入口。
- 可选：全局搜索或设置入口。

顶部栏不放阶段操作。生成、保存、重试、导出都应该靠近它影响的内容。

### 2.3 左侧栏职责

左侧栏是项目库，不是表单主舞台。

应包含：

- 项目搜索。
- 最近项目。
- 历史项目。
- 测试项目显隐开关。
- 新建 / 选题共创入口。

左侧栏不应长期展开复杂共创结果。共创结果如果变成长内容，应进入主工作区或弹窗。

### 2.4 中间工作区职责

中间工作区是唯一主舞台。每次只强调一个主要对象：

- 选题判断：ThinkCard / StyleCore。
- 资料准备：研究清单 / 资料卡 / Evidence Summary。
- 写作推进：板块模型 / 提纲 / 双稿。
- 发布整理：VitalityCheck / 发布包 / Markdown 导出。

同一视口内不要同时出现超过两个长文本阅读或编辑区域。

### 2.5 右侧 Inspector 职责

Inspector 是"当前项目的驾驶舱"，承担：

- 当前阶段进度。
- 下一步推荐动作。
- VitalityCheck / stale artifact / evidence coverage 风险。
- 正在运行或失败的后台任务。
- 与当前内容相关的辅助动作。

Inspector 不做长文编辑，不显示大段资料原文。

---

## 3. Navigation Model

### 3.1 主阶段命名

建议把主 Tab 从解释性短语收敛为动词/名词更明确的四阶段：

| Stage | 中文名 | 主要对象 |
| --- | --- | --- |
| Judgement | 判断 | ThinkCard, StyleCore, Topic Scorecard |
| Research | 资料 | Research Brief, Source Cards, Evidence Summary |
| Writing | 写作 | Sector Model, Outline, Drafts |
| Publish | 发布 | VitalityCheck, Publish Package, Markdown Export |

当前的"选题与检查 / 资料准备 / 写作推进"可以在迁移期保留，但文案和路由语义应逐步对齐四阶段。

### 3.2 流程 Stepper

阶段内用 Stepper 表示实际工作流：

1. 研究清单
2. 资料卡
3. 板块建模
4. 段落提纲
5. 双稿生成
6. VitalityCheck
7. 发布整理

Stepper 只表示流程，不替代主导航。

### 3.3 导航与动作分离

- Tab、子导航、项目项：只改变视图。
- Primary button：触发生成、保存、重试、导出等真实动作。
- 状态 Banner：可以带一个推荐动作，但不能同时提供多个同等级主操作。

---

## 4. Visual System

### 4.0 Apple-Mixed Direction

本项目不能直接套 Apple 官网视觉，因为它不是消费电子展示页；也不能只套 HIG 信息架构，因为那会变成干净但偏后台的工具界面。

执行口径：

- macOS 工具感用于高频操作区：项目列表、主工作区、Inspector、任务中心、编辑器。
- Apple 官网呼吸感用于低风险表达区：空状态、共创入口、项目摘要、关键 summary、阶段说明。
- Apple 官网式“产品页感”只允许出现在主摘要、空状态、共创入口和阶段入口：大标题、单一主操作、大块白色 surface、清晰灰底。
- 共创弹窗和资料索引属于允许放大呼吸感的区域：前者像一个轻量创意 brief，后者像一个 evidence desk。
- 页面默认不用渐变、重阴影和玻璃材质；材质感来自留白、细分割线、轻色面和一致圆角。
- 动效只用于切换、出现、hover feedback，不用于吸引注意力或制造跳动。

### 4.1 总体气质

关键词：

- macOS productivity
- editorial workspace
- local-first
- quiet utility
- content-first
- inspector-driven

避免：

- 营销 landing page 风格。
- 过度卡片化。
- 大面积渐变、玻璃、彩色阴影。
- 将所有状态都做成蓝色按钮。

### 4.2 Color Tokens

语义色优先，不直接按色值写业务状态。

| Token | 用途 | 当前建议 |
| --- | --- | --- |
| `--bg` | 页面背景 | 冷灰白，降低长时间阅读疲劳 |
| `--surface` | 工作区表面 | 白色或接近白色 |
| `--surface-muted` | 次级区块 | 浅灰，不抢正文 |
| `--border` | 分割和边框 | 低对比灰 |
| `--text-primary` | 标题和正文重点 | 深灰接近黑 |
| `--text-secondary` | 辅助说明 | 中灰 |
| `--accent` | 当前阶段和主操作 | 蓝色，但克制使用 |
| `--success` | 完成 / 通过 | 绿色 |
| `--warning` | 待处理 / 可继续但有风险 | 琥珀色 |
| `--danger` | 失败 / 阻塞 | 红色 |
| `--stale` | 下游过期 | 紫灰或琥珀，不与失败混淆 |
| `--running` | 后台执行 | 蓝色 + spinner 或进度文案 |

规则：

- 颜色不能作为唯一状态表达，必须配合文字、图标或状态词。
- 每个视口里同时出现的高饱和色不超过 2 类。
- 主内容阅读区不使用彩色背景。

### 4.3 Typography

字体栈：

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", sans-serif;
```

层级：

| Role | Size | Weight | 用途 |
| --- | --- | --- | --- |
| App title | 18-20 | 700 | 顶部产品名 |
| Page title | 20-24 | 700 | 当前项目或阶段 |
| Section title | 16-18 | 600 | 卡片/面板标题 |
| Body | 14-15 | 400 | 普通说明、正文预览 |
| Dense body | 13 | 400/500 | 表格、列表、状态 |
| Meta | 12 | 500 | badge, chip, timestamp |
| Longform | 15-16 | 400 | 长文阅读和编辑 |

长文规则：

- 中文正文行宽控制在 70-90 个中文字符。
- 段落间距明显大于行高。
- 只读正文使用阅读容器，不使用 textarea。
- 可编辑长文优先用阅读态 + 点击编辑。

### 4.4 Spacing

基础间距：

```text
4 / 8 / 12 / 16 / 20 / 24 / 32
```

使用规则：

- 控件内部：8-12。
- 同组元素：8-12。
- 区块之间：16-24。
- 页面边缘：20-24 桌面端，16 窄屏。
- Inspector 内部更紧凑，主阅读区更宽松。

### 4.5 Shape And Elevation

- Sheet / 一级弹窗圆角：20px。
- Apple-like 主舞台圆角：18px。
- 工具面板 / Inspector 圆角：14px。
- 独立对象卡圆角：14px。
- 输入框 / 按钮圆角：10px。
- 标签 / chip 圆角：7px。
- 避免大圆角胶囊，除非是状态点或极小计数器。
- 默认不使用大阴影；只在弹窗、浮层、toast 中使用轻阴影。
- 不用 hover 位移制造层次。

硬规则：

- 普通 `Surface / Panel / Card` 不新增局部 `box-shadow`。
- 普通页面区域不新增 `linear-gradient`；只有 toast、modal、极少数高风险 callout 可使用轻微层次。
- 新增 surface 优先使用 `ui-stage-surface / ui-panel / ui-card / ui-callout / ui-sheet` 这组 primitives。
- 工具面板、内部控件、标签/chip 使用 `app/globals.css` 中的 radius token，不再局部自定义。
- 不在 JSX 里写布局型 inline style；样式必须进入 CSS class。

### 4.6 Surface Taxonomy

后续组件只能落入这 4 类，不再混用“所有东西都是 card”的语言：

| 类型 | 用途 | 视觉规则 |
| --- | --- | --- |
| `Surface` | 页面大区、主画布 | 白色或浅灰面，不强调边框，不使用阴影 |
| `Panel` | 工具面板、Inspector、任务中心 | 14px 圆角、细边框、轻背景 |
| `Card` | 独立对象：项目项、资料卡、候选角度 | 14px 圆角、细边框、无默认阴影 |
| `Callout` | 风险、失败、过期、成功提示 | 可用状态色背景，但同屏强状态色不超过 2 种 |

禁止：

- 卡片套卡片来制造层级。
- 同屏出现 3 种以上强状态色。
- 每个局部组件自己定义 shadow、gradient、超大圆角。
- 用 hover 位移或彩色阴影表达可点击。
- 把 Apple 官网首页的营销 hero 直接搬进高频编辑区。

---

## 5. Component Rules

### 5.1 AppToolbar

用途：全局状态和入口。

包含：

- 产品名。
- 本地服务状态。
- 模型模式。
- 后台任务入口。

不包含：

- 当前阶段生成按钮。
- 项目内保存按钮。
- 大段说明文字。

### 5.2 ProjectSidebar

用途：项目导航和新建入口。

规则：

- 项目项显示标题、阶段、更新时间或摘要。
- 测试项目默认折叠。
- 搜索和筛选靠近项目列表。
- 共创弹窗只承载输入和候选，不长期占据左栏。

### 5.3 StageTabs

用途：切换主阶段。

规则：

- Tab 数量保持 3-5 个。
- Tab 文案短，不放解释句。
- Active 状态必须明显，但不能依赖强色块。
- Tab 不触发后台任务。

### 5.4 StageStepper

用途：展示完整写作流程进度。

状态：

| State | 含义 | 展示 |
| --- | --- | --- |
| `complete` | 已产生产物 | check + 低调绿色 |
| `current` | 当前推荐做 | accent + 主动词 |
| `ready` | 可执行但非推荐 | 中性边框 |
| `blocked` | 前置条件不足 | warning + 解锁条件 |
| `running` | 后台执行中 | spinner + 进度 |
| `failed` | 执行失败 | danger + 重试 |
| `stale` | 下游已过期 | stale + 重新生成建议 |

### 5.5 InspectorPanel

用途：当前项目状态、风险和下一步。

结构：

1. 当前状态一句话。
2. 下一步主动作。
3. 风险列表，最多 3 条。
4. 后台任务摘要。
5. 辅助入口。

规则：

- 每个 Inspector 只允许一个 primary action。
- 风险文案必须告诉用户为什么影响写作结果。
- 不显示长文。

### 5.6 StatusBanner

用途：短期提醒。

规则：

- 成功提醒 3-5 秒可自动消失。
- 失败、阻塞、过期提醒需要可手动关闭。
- 需要用户处理的问题必须有明确目标入口。

### 5.7 TaskToast / TaskCenter

用途：后台任务感知。

规则：

- Toast 显示当前最重要任务。
- TaskCenter 显示完整队列。
- 任务失败时直接暴露错误摘要和重试按钮。
- 任务成功后自动刷新对应 bundle，并将用户带到结果区。

### 5.8 SourceCard

用途：资料证据对象。

必须显示：

- 标题。
- 来源 URL 或来源说明。
- 可信度。
- 支撑强度。
- 时间敏感度。
- 证据摘要。
- 是否被正文引用。

规则：

- 原文长文本默认折叠。
- Evidence Summary 和 orphan card 要作为资料阶段的重要状态。
- 资料索引页先显示 Evidence Summary，再显示待补证据，最后显示资料卡；不要让资料卡列表压过证据总览。
- 资料卡可以比普通状态块更宽松，但仍然不使用阴影和渐变。

### 5.9 DraftReaderEditor

用途：长文阅读和改写。

规则：

- 默认阅读态。
- 编辑时保持稳定宽度，不跳布局。
- 原稿、成文稿、人工改写稿不要三个长框同时并排。
- 引用标记、证据缺口、改写建议靠近对应段落。

### 5.10 Modal

用途：临时任务，不是常驻工作区。

适合：

- 新建项目。
- 选题共创。
- 批量导入。
- 确认高风险动作。

不适合：

- 长期阅读资料。
- 大篇幅正文编辑。
- 多阶段流程主线。

---

## 6. Interaction Rules

### 6.1 Action Hierarchy

| Role | 示例 | 规则 |
| --- | --- | --- |
| Primary | 立即生成、保存、重试、导出 | 每个区域最多 1 个 |
| Secondary | 重新检查、重新抓取、查看详情 | 不抢主动作 |
| Ghost | 关闭、取消、标记已处理 | 轻量操作 |
| Link | 查看导出、打开来源 | 不触发破坏性动作 |
| Danger | 删除资料卡、清空失败任务 | 必须明确后果 |

### 6.2 Button Wording

按钮用动词开头：

- 生成研究清单
- 保存选题判断
- 重试失败任务
- 导出 Markdown
- 打开资料卡

避免：

- 好的
- 确定
- 开始
- 处理一下

除非上下文极其明确。

### 6.3 Loading And Async

所有异步动作必须有四态：

- idle
- running
- succeeded
- failed

长任务还必须有：

- queued
- progress message
- retry
- detail log

### 6.4 Confirmation

只有这些情况需要确认：

- 删除。
- 覆盖人工内容。
- 跳过硬性流程闸门。
- 强制继续可能污染下游结果。

普通生成、保存、切换视图不需要确认。

---

## 7. Accessibility And Quality Bar

### 7.1 Minimums

- 所有可点击控件的点击区域不小于 44px 高或等效 hit area。
- 正文对比度满足 WCAG AA。
- Focus state 清晰可见。
- 不取消浏览器默认键盘可达性。
- 状态不只依赖颜色。
- 页面无无意义横向滚动。

### 7.2 Keyboard

优先保证：

- Tab 可进入主要控件。
- Escape 可关闭弹窗。
- Enter / Space 可触发按钮。
- 焦点不被 toast 或自动刷新抢走。

### 7.3 Motion

- hover 不做明显位移。
- loading 使用轻量 spinner 或进度文案。
- 尊重 `prefers-reduced-motion`。

---

## 8. Refactor Roadmap

### Phase 1: Design System Foundation

目标：先统一规则，不动大结构。

- 建立本手册为主规范。
- 保留 `docs/workbench-ui-design-rules.md` 作为验收清单。
- 梳理现有 CSS token，统一语义命名。
- 盘点现有状态色和按钮角色。

验收：

- 新增 UI 改动都能引用本手册。
- 状态、按钮、布局有明确判断依据。

### Phase 2: Layout Shell

目标：让产品像稳定的写作工作台。

- 顶部栏只保留全局状态。
- 左侧栏收敛为项目库。
- 中间区成为唯一主舞台。
- 右侧 Inspector 固定承担状态和下一步。

验收：

- 用户打开任意项目能在 5 秒内知道下一步。
- 不需要同时读三个以上状态提示。

### Phase 3: Workflow Navigation

目标：把阶段和动作分开。

- 主 Tab 收敛到判断 / 资料 / 写作 / 发布。
- Stepper 表达 7 步流程。
- 状态 Banner 和 Inspector 不重复说同一件事。

验收：

- 导航只切视图，按钮才触发任务。
- 当前推荐动作唯一且明确。

### Phase 4: Reading And Editing Surfaces

目标：提升长文工作效率。

- Draft 阅读态和编辑态拆清楚。
- SourceCard 原文折叠，证据摘要优先。
- Evidence Summary 进入资料阶段核心位置。
- VitalityCheck 问题能定位到段落或产物。

验收：

- 长文阅读区行宽稳定。
- 没有多个相邻窄滚动长文本框。

### Phase 5: Visual Polish And QA

目标：统一视觉，不引入新产品形态。

- 统一 radius、spacing、border、shadow。
- 清理重复卡片和重复说明文字。
- 浏览器截图检查 375 / 768 / 1024 / 1440。
- 跑 lint、typecheck、build。

验收：

- 页面安静、密度稳定、无横向滚动。
- 主要内容不会被状态提示压住。

---

## 9. Before / After Acceptance

### Before

- 页面像后台：每个区块都有边框、阴影或强色块。
- 左栏、主内容、Inspector 视觉强度接近，主舞台不突出。
- `card / status-block / source-card / zone-card` 都像独立容器，形成卡片堆叠。
- 蓝、绿、黄、红、紫在同屏一起出现，状态比内容更抢眼。
- 动效缺席或只来自浏览器默认变化，页面切换缺少轻微连续性。

### After

- 主工作区是唯一视觉中心，左栏像 Finder sidebar，右侧像 Inspector。
- 默认页面无重阴影、无营销渐变，层级来自留白、标题、细分割线。
- 每个阶段只保留一个视觉主角：判断看 ThinkCard / StyleCore，资料看 Evidence Summary / Source Cards，写作看 Draft，发布看 Quality Gate / Export。
- 状态色只在必要处出现，同屏强状态色不超过 2 种。
- Tab、surface、空状态有 150-200ms 轻过渡，并尊重 `prefers-reduced-motion`。

---

## 10. PR Review Checklist

每次 UI PR 合并前检查：

- 是否保持本地写作工作台定位。
- 是否没有新增无必要依赖。
- 是否保持主布局层级清楚。
- 是否每个视口只有一个主任务。
- 是否没有卡片套卡片制造层级。
- 是否没有新增未批准的局部 shadow / gradient / inline style。
- 是否同屏强状态色不超过 2 种。
- 是否按钮角色明确。
- 是否异步任务有 loading / success / error / retry。
- 是否状态不只靠颜色表达。
- 是否长文行宽、滚动、编辑态稳定。
- 是否保留现有工作流和数据兼容性。
