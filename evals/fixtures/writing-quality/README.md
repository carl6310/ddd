# Writing Quality Fixtures

这些 fixture 用来给本地工作台跑固定写作质量基线。

## 说明

- 当前 fixture 使用本地 SQLite 数据库中的项目 `id`
- 如果你换了一份新的本地数据库，这些 `projectId` 可能不存在
- 不存在时，评测脚本不会报崩，而是把该 fixture 标记为 `available: false`

## 当前建议的三类样例

- `standard_flow`
  - 标准流程完成稿
- `forced_continue`
  - 资料不足或流程未完成稿
- `rewrite_heavy`
  - 有明显人工回修的稿件

## 运行

```bash
node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/evals/run-writing-quality.ts
node --experimental-strip-types --import ./scripts/register-alias.mjs scripts/evals/report-writing-quality.ts
```
