# 上海板块写作工作台｜前端重构总计划（Codex 可执行版）

> 本计划用于指导 Codex 分阶段重构当前前端。
> 目标不是修补旧界面，而是以新的 Apple-like 专业写作工作台方向，重建前端信息架构、视觉系统和交互体验。
> 后端、SQLite、API routes、worker/job system、业务数据结构不在本次重构范围内。

---

## 0. 口径更新

当前仓库已有 UI 组件、AppShell、CSS token 和若干设计文档，但这些内容只能作为实现参考，不能限制新的产品方向。

本文件是本轮前端重构的产品和视觉北极星：

- 新方案优先于旧 UI 审美。
- 旧组件可以复用入口，但内部视觉、布局和交互可以大幅改造。
- 旧 CSS 可以保留兼容类，但不应继续主导新界面。
- 旧设计文档如果与本计划冲突，以本计划为准。
- 架构边界、后端边界、数据边界仍以 `AGENTS.md` 和现有系统架构为准。

一句话：

```txt
新方案决定“要做成什么样”，现有代码决定“怎样最小风险落地”。
```

---

## 1. 产品目标

把当前页面从“长页面 + 表单堆叠 + 局部面板”升级为一个完整的本地写作工作台：

```txt
App Shell
  Sidebar
  TopBar
  Stage Navigation
  Workspace
  Inspector
```

重构完成后，用户打开项目时应立即知道：

- 当前项目是什么
- 当前处在哪个阶段
- 下一步最重要的动作是什么
- 资料、提纲、正文、诊断、发布之间如何连续推进
- ThinkCard、StyleCore、VitalityCheck 为什么是核心能力
- 哪些内容已经完成，哪些内容缺证据、缺结构或需要重跑

这不是营销页，也不是通用后台；它应该像一个高级、安静、专业的桌面写作生产力工具。

---

## 2. 不可破坏的边界

本次重构必须保留：

- Next.js App Router
- 单仓库、本地优先、单用户运行方式
- SQLite 持久化
- 现有 API routes
- 现有 worker / job / polling / retry 机制
- `ProjectBundle` 作为工作台 canonical read model
- 现有阶段状态和兼容字段
- Markdown 导出能力
- mock 模式和本地开发方式

本次重构禁止：

- 重写后端
- 修改数据库 schema
- 引入 auth / RBAC / 多租户 / 云存储
- 引入 Postgres / Redis / BullMQ / 外部队列
- 新增大型 UI 框架
- 让 mock 数据覆盖真实数据
- 把未实现能力显示成可用功能
- 为了视觉效果破坏现有写作流程和保存逻辑

---

## 3. 设计方向

### 3.1 Apple-like，而不是 Apple copy

允许：

- 安静的浅色背景
- 克制的蓝色主操作
- 清楚的空间层级
- 大块呼吸感
- 细边框、轻材质、低噪声面板
- 明确的 Sidebar / Workspace / Inspector 分工
- 适度圆角和柔和状态反馈

禁止：

- Apple logo
- 直接复制 Apple 官网布局
- 营销站 hero 化工作台
- 过度玻璃拟态
- 大面积渐变光晕
- 多层重阴影
- 卡片套卡片
- 大面积高饱和色
- 复杂 3D 或夸张动效

### 3.2 视觉关键词

```txt
premium
calm
spacious
desktop productivity
writing cockpit
content first
inspector driven
clear hierarchy
not a form page
```

### 3.3 交互原则

- 一屏一个主任务
- 主内容永远是视觉中心
- 主要状态常驻
- 次要详情进入 Inspector / Sheet / Popover
- 长内容内部滚动
- 不依赖长页面下拉展开
- 每个区域最多一个强主按钮
- 导航只切换视图，按钮才触发真实任务
- 重要动作靠近它影响的内容
- 后台任务必须有 loading、running、success、failed、retry 状态

---

## 4. 信息架构

桌面端目标结构：

```txt
┌───────────────────────────────────────────────────────────────┐
│ Sidebar │ TopBar                                              │
│         ├───────────────────────────────────────┬─────────────┤
│         │ Workspace                             │ Inspector   │
│         │ 当前页面主任务区                         │ 状态/建议区   │
└─────────┴───────────────────────────────────────┴─────────────┘
```

### 4.1 Sidebar

Sidebar 是项目和全局模块入口，不再承载复杂表单。

建议入口：

- 项目
- 工作台
- 资料卡
- 提纲
- 正文
- 发布
- 设置

第一阶段可以先在当前单页中实现这些入口的本地 view state，不急于拆成 Next.js 路由。

### 4.2 TopBar

TopBar 承载全局状态：

- 当前项目
- 页面标题
- 保存状态
- 本地服务状态
- 后台任务入口
- 页面级主要动作

不要把阶段内复杂操作堆到 TopBar。

### 4.3 Stage Navigation

可视化展示 10 个业务阶段：

1. 选题定义
2. ThinkCard / HKR
3. StyleCore
4. 研究清单
5. 资料卡整理
6. 板块建模
7. 提纲生成
8. 正文生成
9. VitalityCheck
10. 发布前整理

要求：

- 显示当前阶段、已完成、阻塞、运行中、需重跑
- 小屏横向滚动
- 不用下拉菜单代替阶段导航
- 只做展示和导航，不直接触发后台任务
- 内部 `ProjectStage` 不改，展示层通过 adapter 映射

### 4.4 Workspace

Workspace 是唯一主舞台。不同视图目标如下：

- 项目：项目中控台
- 工作台：写作驾驶舱
- 资料卡：研究资料库
- 提纲：结构编辑器
- 正文：沉浸式写作编辑器
- 发布：质量检查和导出中心

### 4.5 Inspector

Inspector 是右侧检查区，用于：

- 当前阶段状态
- 下一步建议
- 缺失项
- 证据完整度
- VitalityCheck
- stale artifact 风险
- 后台任务状态
- 与当前内容相关的辅助动作

Inspector 不承载长文编辑，不展示大段原文。

---

## 5. 实现策略

### 5.1 组件命名空间

当前仓库已经有：

- `components/ui/*`
- `components/layout/app-shell.tsx`
- `components/workbench/*`
- `app/globals.css`

执行时不要并行保留两套基础组件。

推荐策略：

- 把 `components/ui/*` 视为本仓库的 design system 入口。
- 可以大幅重构 `Surface`、`Panel`、`Card`、`Button`、`Chip`、`Modal` 等内部实现。
- 如果新方案需要组件，优先放入 `components/ui/*` 或 `components/workbench/redesign/*`。
- 除非明确要迁移命名空间，否则不新增 `components/design-system/*` 与现有 `components/ui/*` 并存。
- `components/layout/app-shell.tsx` 可以重构成新的 AppShell，但不要同时保留两个互相竞争的 AppShell。

核心原则：

```txt
复用入口，不复用旧审美。
```

### 5.2 View Model

页面不直接吃 API 原始结构。新增：

```txt
lib/design/view-models.ts
lib/design/stages.ts
lib/design/navigation.ts
```

用途：

- 把 `ProjectBundle` 转成 UI 可读状态
- 统一阶段进度
- 统一项目健康度
- 统一 source / outline / draft / publish 视图数据
- 把 fallback 和空态集中处理

禁止在 JSX 里到处散落：

- `project.xxx ?? "未命名"`
- 假的项目名
- 假的资料卡数量
- 假的评分
- 未标记的 mock 数据

### 5.3 Mock 数据

允许新增：

```txt
lib/design/mock-ui-data.ts
```

但仅用于：

- 独立视觉原型
- 空态示例
- 明确标记的 preview

真实工作台默认必须优先显示真实数据；真实数据不足时显示空态或“规划中”，不要伪装为真实已完成。

---

## 6. 页面蓝图

### 6.1 项目页

目标：项目中控台。

首屏应包含：

- 当前核心项目
- 项目进度
- 最近项目列表
- 项目健康度
- 写作队列
- 快速继续入口

验收：

- 不下拉也能继续当前项目
- 项目卡片像生产力工具，不像表单列表
- 新建项目 / 选题共创入口清晰

### 6.2 工作台页

目标：写作驾驶舱。

首屏应包含：

- 当前项目标题
- 10 阶段导航
- 下一步主行动
- ThinkCard
- StyleCore
- VitalityCheck
- 资料/提纲/正文摘要
- 右侧状态 Inspector

验收：

- 第一屏像完整工作台
- 用户知道下一步该做什么
- ThinkCard / StyleCore / VitalityCheck 是视觉核心
- 不出现旧式长下拉堆叠

### 6.3 资料卡页

目标：研究资料库。

结构：

```txt
Summary Stats
Search + Filters
Source Card Grid / List
Inspector: Selected Source Detail
```

验收：

- 点击资料卡不跳页，右侧显示详情
- 搜索、筛选、引用动作清晰
- raw evidence id 不作为默认交互入口

### 6.4 提纲页

目标：结构编辑器。

结构：

```txt
Outline Tree
Selected Section Detail
Inspector: Evidence / Strength / Missing Items
```

验收：

- 只展示当前选中章节详情
- 不把所有章节长展开
- 支撑证据和章节强度清楚

### 6.5 正文页

目标：沉浸式写作编辑器。

结构：

```txt
Outline Mini Panel
Editor Canvas
Inspector: StyleCore / VitalityCheck / Revision Suggestions
```

验收：

- 中央写作区域安静
- 右侧建议不抢正文
- 支持基础专注模式
- 长文宽度稳定，不跨满超宽屏

### 6.6 发布页

目标：质量检查和导出中心。

结构：

```txt
Publish Checklist
Article Preview
Export Options
Inspector: Quality / Remaining Issues / Source Completeness
```

验收：

- Markdown 导出接真实接口
- DOCX / 公众号版 / 小红书图文如果未实现，必须 disabled 或显示“规划中”
- 用户一眼知道能不能发布

---

## 7. 分阶段执行

不要一次性全量改完。每个 Phase 完成后必须保持项目可运行。

### Phase 0｜现状冻结与基线

目标：

- 记录当前入口、状态流、任务流
- 确认哪些组件可重构，哪些应替换
- 明确新方案覆盖旧 UI 审美

检查：

- `package.json`
- `app/page.tsx`
- `components/project-workbench.tsx`
- `components/layout/app-shell.tsx`
- `components/ui/*`
- `components/workbench/*`
- `lib/types.ts`
- `lib/project-stage-labels.ts`
- `components/workbench/workflow-state.ts`

产出：

- 当前 UI 迁移边界
- Phase 1 文件清单

### Phase 1｜Design Foundation + AppShell 原型

目标：

- 用新视觉方向重构基础 UI 入口
- 重构统一 AppShell
- 做一个真实数据驱动的工作台驾驶舱原型

允许修改：

```txt
app/globals.css
components/ui/*
components/layout/app-shell.tsx
components/project-workbench.tsx
components/workbench/*
lib/design/*
```

必须完成：

- Sidebar / TopBar / Workspace / Inspector 的新壳层
- 10 阶段导航展示
- 下一步主行动区
- ThinkCard / StyleCore / VitalityCheck 三个核心能力卡
- 真实 `ProjectBundle` adapter
- 明确空态和 loading 状态

不做：

- 不迁移全部页面
- 不拆 Next.js 路由
- 不改 API
- 不改 schema
- 不做 DOCX / 公众号版等新后端能力

验收：

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- 浏览器检查 1440px / 1280px / 小屏不崩

### Phase 2｜项目页 + 工作台页完整迁移

目标：

- 项目页变成项目中控台
- 工作台页变成写作驾驶舱
- 两者共享新 AppShell 和基础组件

验收：

- 不再依赖旧式长页面
- 项目选择、新建、继续编辑可用
- 后台任务入口和状态可用
- 真实项目数据优先

### Phase 3｜资料卡页迁移

目标：

- 资料卡页变成研究资料库
- 右侧 Inspector 展示选中资料详情

验收：

- 资料卡增删改、抓取、摘要、重跑路径不破坏
- 搜索和筛选 UI 清楚
- 证据 ID 默认转成可读标题/摘要

### Phase 4｜提纲页迁移

目标：

- 提纲页变成结构编辑器
- 左树、中编辑、右诊断

验收：

- 提纲保存和生成仍走现有 API/job
- 当前章节编辑清楚
- 缺失证据和章节强度可见

### Phase 5｜正文页迁移

目标：

- 正文页变成沉浸式写作编辑器
- 支持基础专注模式

验收：

- 正文保存、生成、重跑可用
- StyleCore 建议和 VitalityCheck 不抢主编辑区
- 长文阅读/编辑体验稳定

### Phase 6｜发布页迁移

目标：

- 发布页变成质量检查和导出中心

验收：

- Markdown 导出真实可用
- 未实现导出能力明确 disabled
- 质量检查、剩余问题、资料绑定完整度清楚

### Phase 7｜统一打磨与旧 UI 清理

目标：

- 删除或降级不再使用的旧 UI
- 统一响应式、动效、loading、空态、错误态
- 补齐视觉 QA

验收：

- 没有两套基础组件并行
- 没有散落 mock 数据
- 没有旧式长下拉主流程
- 没有未实现功能伪装可用
- lint / typecheck / build 全通过

---

## 8. 每轮验证要求

每个 Phase 至少运行：

```bash
npm run typecheck
npm run lint
npm run build
```

涉及 job / 任务中心 / 后台步骤时，还要验证：

```bash
npm run worker:once
```

涉及真实 UI 时，应启动本地页面并检查：

- 1440px 桌面
- 1280px 桌面
- 768px 或更窄屏
- 页面无无意义横向滚动
- 主按钮状态与后端要求一致
- 任务运行中、成功、失败、重试状态可见

---

## 9. 第一轮执行指令

第一轮只执行 Phase 0 + Phase 1：

```txt
请阅读 FRONTEND_REDESIGN_MASTER_PLAN.md。

现在执行 Phase 0 + Phase 1：
1. 以本计划的新视觉方向为准，不再受旧 UI 审美限制。
2. 复用现有组件入口，但可以重构其内部视觉和布局。
3. 建立新的 AppShell：Sidebar + TopBar + Stage Navigation + Workspace + Inspector。
4. 做一个真实 ProjectBundle 驱动的工作台驾驶舱原型。
5. 不迁移全部页面。
6. 不拆 Next.js 路由。
7. 不重写后端。
8. 不改数据库 schema。
9. 不引入大型 UI 框架。
10. mock 数据只能用于明确标记的 UI preview，不能覆盖真实数据。

完成后运行：
- npm run typecheck
- npm run lint
- npm run build

输出：
1. 修改了哪些文件
2. 哪些旧 UI 入口被重构
3. 哪些数据来自真实 ProjectBundle
4. 哪些能力仍是空态或规划中
5. 下一轮应该迁移哪个页面
```

---

## 10. 最重要的原则

```txt
先重建工作台心智模型，再迁移具体页面。
先确立新视觉系统，再清理旧样式。
先真实数据可用，再补视觉丰富度。
先小范围跑通，再分阶段替换。
```

这次重构不是给旧界面做 polish，而是把前端重新推进到一个真正专业的写作工作台形态。
