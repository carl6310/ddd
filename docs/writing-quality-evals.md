# Writing Quality Evals

这一轮先做的是 **WQ-01：质量基线和固定样例**，不是正式的长期落库体系。

## 当前范围

已实现：
- 固定 fixture 清单：`evals/fixtures/writing-quality/default.json`
- 质量评分逻辑：`lib/writing-quality/scorecard.ts`
- JSON 评测脚本：`scripts/evals/run-writing-quality.ts`
- Markdown 报告脚本：`scripts/evals/report-writing-quality.ts`

本轮**暂不做**：
- `writing_quality_reports` 正式数据表
- baseline 历史对比存储
- CI 门禁

先把指标跑顺，再决定哪些指标值得正式持久化。

## 当前指标

- `citation_coverage`
- `broken_citation_count`
- `section_evidence_coverage`
- `hook_anchor_echo_pass`
- `rewrite_hotspot_count`
- `polisher_trigger_rate`
- `human_edit_delta`
- `vitality_pass_rate`

## 连续性规则

新增固定样例：`evals/fixtures/writing-quality/continuity.json`。

一节只有在满足下面条件时，才算真的服务全文：

1. 它回答上一节留下的问题。
2. 它只新增一件事。
3. 它让下一节变得必要。
4. 它不能和相邻章节随便交换。
5. 删掉它会明显损伤全文认知链。

连续性问题不能靠单独补过渡句解决。应该重写 section role、上一节结尾和下一节开头，让下一节成为上一节问题的自然答案。

## 运行方式

```bash
npm run eval:writing-quality
npm run eval:writing-quality:report
```

默认输出到：
- `output/evals/writing-quality-latest.json`
- `output/evals/writing-quality-latest.md`

## 指标解释

### `citation_coverage`
当前先用“正文中实际引用到的资料卡”覆盖“提纲与板块建模要求的证据 id”的比例来近似。

### `broken_citation_count`
正文中的 `[SC:...]` 如果在当前项目资料卡里找不到，就记为 broken citation。

### `section_evidence_coverage`
按提纲 section 粗略拆段，检查每段是否把它应使用的 `evidenceIds` 真正挂到正文里。

### `hook_anchor_echo_pass`
复用现有 review 输出中的 `opening / hook / anchor / echo` 结果，先做 0~1 的通过率。

### `rewrite_hotspot_count`
复用现有 review 中一批最接近“需要定点返工”的检查项，统计未通过数量。

### `polisher_trigger_rate`
基于 `llm_calls` 中 `draft_writer` 和 `draft_polisher` 的调用次数估算。

### `human_edit_delta`
当前先用叙事稿和人工编辑稿的双字组相似度近似，不是最终版编辑学指标。

### `vitality_pass_rate`
直接复用现有 `vitalityCheck` 的通过结果。
