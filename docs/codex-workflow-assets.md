# Codex Workflow Assets

这几个文件是给 **Codex / 开发流程** 用的，不是给应用运行时直接读取的。

## 文件定位

### `AGENTS.md`
- 作用：仓库级协作规则
- 使用位置：仓库根目录
- 谁来读：Codex / 其他代理式开发工具
- 是否接入应用运行时：否

### `docs/codex-pr-plan-checklist.md`
- 作用：阶段路线图和 PR 评审清单
- 使用位置：`docs/`
- 谁来读：人在排期、拆 PR、做 review 时
- 是否接入应用运行时：否

### `.codex/prompts/codex-phase2-prompt.md`
- 作用：二期执行提示词模板
- 使用位置：`.codex/prompts/`
- 谁来读：Codex 在启动二期任务时
- 是否接入应用运行时：否

## 推荐用法

### 开新任务前
1. 先读仓库根 `AGENTS.md`
2. 再读相关架构文档，例如 `docs/system-runtime-architecture.md`
3. 如果要做二期，直接把 `.codex/prompts/codex-phase2-prompt.md` 作为任务起点

### 拆 PR 时
1. 打开 `docs/codex-pr-plan-checklist.md`
2. 从推荐 PR 队列里选一个最小垂直切片
3. 按清单检查 scope、验证、回滚和文档

## 不建议的用法

- 不要把这些文件接进 Next.js 前端逻辑
- 不要把这些文件接进数据库 schema
- 不要让 API route 在运行时读取这些文件决定业务逻辑
- 不要把 prompt 文件当成产品功能配置

## 当前仓库建议

当前仓库最适合的方式是：
- `AGENTS.md` 约束后续开发行为
- `docs/codex-pr-plan-checklist.md` 管二期到后续阶段的拆分
- `.codex/prompts/codex-phase2-prompt.md` 作为二期开工模板
