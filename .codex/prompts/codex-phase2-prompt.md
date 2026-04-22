/plan

Goal:
完成二期：把剩余阶段全部接入**现有** job system，并统一前端步骤运行状态。不要提前做三期及以后的结构性重构。

Context:
- 先阅读 `AGENTS.md`
- 如果存在，阅读 `docs/system-runtime-architecture.md`
- 先检查当前一期实现：`lib/jobs/*`、`lib/services/steps/*`、`scripts/worker.ts`、`app/api/jobs/*`、轮询 hook / 状态组件
- 重点检查这些现有阶段入口：
  - `app/api/projects/[id]/research-brief/route.ts`
  - `app/api/projects/[id]/sector-model/route.ts`
  - `app/api/projects/[id]/outline/route.ts`
  - `app/api/projects/[id]/source-cards/route.ts`
  - `app/api/projects/[id]/source-cards/extract/route.ts`
  - 与一期已完成步骤对照：`drafts` / `review` / `publish-prep`
- 重点检查这些领域文件：
  - `lib/repository.ts`
  - `lib/workflow.ts`
  - `lib/llm.ts`
  - `lib/review.ts`
  - `lib/types.ts`
  - `components/project-workbench.tsx`

Constraints:
- 必须复用现有 job system，不允许新建第二套队列/worker 模型。
- 保持本地优先、单人使用、SQLite 持久化。
- 不引入 Postgres / Redis / BullMQ / Auth / 微服务 / 对象存储。
- 尽量保持现有 API 响应兼容；如必须调整，调用方同 PR 一起修改。
- `ProjectBundle` 读取模型和 Markdown 导出行为本阶段不要改。
- 不提前做正式 migration runner、StageService、evidence analyzer、prompt registry、评测体系等三期后的内容。
- workflow gate 需要在**入队前**和**真正执行前**都校验一次；如果允许 `forceProceed`，要保持现有确认语义。
- source-card 的 extract / summarize 也要进入统一任务状态体系，而不是保留特殊异步路径。

Deliverables:
1. 把以下步骤接入现有 job system：
   - `research-brief`
   - `sector-model`
   - `outline`
   - `source-card extract`
   - `source-card summarize`（如果当前创建逻辑里有自动摘要）
2. 为以上步骤补齐 handler / service 接入层，遵循一期现有模式。
3. 前端抽一个通用步骤任务 hook / 状态组件，避免继续为每个步骤手写轮询。
4. 刷新页面后任务状态可恢复；失败任务可重试；重复点击 dedupe 生效。
5. 为本阶段新增或更新最小必要测试。
6. 更新文档：至少补一段“哪些步骤已进入 job system”的说明。

Implementation approach:
- 先给出具体计划、假设和预计改动文件清单，再开始改代码。
- 按最小垂直切片推进，建议顺序：
  1. `research-brief`
  2. `sector-model`
  3. `outline`
  4. `source-card extract`
  5. `source-card summarize`
  6. 前端状态统一
- 每完成一个切片，先跑最小相关检查，再进入下一个。
- 如果发现一期实现与预期不同，优先贴合当前代码，不要为了“理想结构”重写一期。

Verification:
- 先检查 `package.json`，只运行仓库中真实存在的脚本。
- 最少运行：
  - `npm run typecheck`
  - `npm run lint`
- 如果已有测试脚本，运行与本阶段最相关的测试。
- 如果没有测试脚本，但本阶段新增了容易回归的逻辑，请补最小测试并运行。
- 不要声称“已验证”除非真正执行过命令，并在结尾列出命令与结果。

Output format:
1. Plan
2. Assumptions
3. Files to change
4. Implementation summary
5. Validation commands and results
6. Risks / rollback
7. One next-step suggestion only
