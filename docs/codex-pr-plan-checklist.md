# Codex 执行 PR 队列（一期完成后）

## 推荐 PR 队列

### Phase 2 — Job system 全覆盖
- **PR-02A**：`research-brief` 接入现有 job system
- **PR-02B**：`sector-model` 与 `outline` 接入现有 job system
- **PR-02C**：`source-card extract / summarize` 接入现有 job system
- **PR-02D**：统一前端步骤任务 hook / 状态组件 / 重试入口

### Phase 3 — Step service 化
- **PR-03A**：建立 `lib/services/steps/*` 基础骨架，迁移 `research-brief`、`sector-model`、`outline`
- **PR-03B**：迁移 `drafts`、`review`、`publish-prep` 到 step services
- **PR-03C**：route handler 进一步变薄，job handler 与手动触发复用同一执行入口

### Phase 4 — 状态机统一
- **PR-04A**：引入 `StageService` + `project_stage_events`
- **PR-04B**：引入 readiness selectors；停止 PATCH 隐式修 stage
- **PR-04C**：兼容字段写入收口到单一 compatibility adapter

### Phase 5 — SQLite 正式迁移体系
- **PR-05A**：建立 `migrations/` 与 `scripts/db-migrate.ts`
- **PR-05B**：把新增 schema 纳入 migration；逐步减少 `ensureColumn` 主路径职责
- **PR-05C**：`db:backup` / `db:doctor` / 升级文档

### Phase 6 — 测试与质量门禁
- **PR-06A**：Vitest 基建 + `workflow/review/repository` 单元测试
- **PR-06B**：SQLite 临时库集成测试（jobs / step services / compatibility）
- **PR-06C**：Playwright smoke：创建项目、跑步骤、查看日志、导出
- **PR-06D**：建立 `npm run verify` 或等价总验证入口

### Phase 7 — Prompt / LLM 可追踪
- **PR-07A**：Prompt registry + `prompt_version` 贯通到 `llm_calls`
- **PR-07B**：最小 eval harness + 固定 fixtures + baseline 报告

### Phase 8 — 证据系统升级
- **PR-08A**：增强 `source_cards` 元数据（来源类型、抓取方式、发布时间、可靠度）
- **PR-08B**：evidence analyzer（broken citations / orphan cards / coverage）
- **PR-08C**：Review / 导出接入 Evidence Summary

### Phase 9 — 抓取链路硬化
- **PR-09A**：提取器 provider 接口统一（HTTP / 微信 / Playwright / Chrome fallback）
- **PR-09B**：抓取 provenance 持久化、失败诊断、环境检查脚本

### Phase 10 — 工作台与导出收尾
- **PR-10A**：Project Timeline / Health / Readiness 面板
- **PR-10B**：导出模式：`full-archive` / `publish-only` / `review-pack`
- **PR-10C**：发布说明与维护文档收尾

---

## 每个 PR 必过清单

### 1. Scope
- [ ] 这个 PR 只做一个垂直切片，没有偷偷混入下阶段重构
- [ ] 目标、非目标、受影响模块在 PR 描述里写清楚

### 2. Code
- [ ] 复用了现有模式，没有平行发明第二套抽象
- [ ] route、service、job、repository 的职责边界比之前更清楚，而不是更乱
- [ ] 没有引入不必要的新依赖

### 3. State / Workflow
- [ ] workflow gate 仍然有效
- [ ] 异步步骤在入队前和执行前都做了必要校验（如适用）
- [ ] stage / readiness / compatibility 行为没有出现隐式破坏

### 4. Data / Schema
- [ ] 所有 schema 变化都有 migration 或明确升级处理
- [ ] 旧数据库可以继续打开
- [ ] 新增字段默认值和空值策略明确
- [ ] 回滚影响已记录

### 5. API / UI
- [ ] API 响应兼容性已检查；若不兼容，调用方同 PR 已更新
- [ ] 前端有 loading / success / error / retry 状态
- [ ] 刷新页面后的恢复行为已验证（对任务型功能尤其重要）

### 6. Tests / Validation
- [ ] 跑了 `typecheck`
- [ ] 跑了 `lint`
- [ ] 跑了本 PR 最相关的测试
- [ ] 如果没有现成测试，补了最小测试或在 PR 中明确说明缺口
- [ ] 没有虚报通过结果

### 7. Docs
- [ ] 更新了相关文档 / README / AGENTS / 阶段说明
- [ ] 新增脚本、命令、环境依赖已写明

### 8. Review output
- [ ] 最终总结包含：改了什么、为什么这样改、改了哪些文件
- [ ] 列出了验证命令和结果
- [ ] 列出了剩余风险与回滚方式
- [ ] 后续建议只保留一个最自然的下一步
