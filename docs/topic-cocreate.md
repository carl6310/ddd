# Topic Cocreate 返回结构

`PR-KS-01` 起，`/api/topic-cocreate` 在正式产出候选角度前，会先整理一份 `Signal Brief`。

- `signalMode`
  - `input_only`
  - `url_enriched`
  - `search_enabled`
- `signalBrief`
  - `queries`
  - `signals`
  - `gaps`
  - `freshnessNote`

`/api/topic-cocreate` 现在默认返回两层结果：

- `recommendedAngles`
  - 推荐名单，默认 4-6 个
- `angleLonglist`
  - 长名单，默认 12-16 个

同时保留兼容 alias：

- `angles = recommendedAngles`
- `candidateAngles = recommendedAngles`

每个 angle 现在还会带：

- `articlePrototype`
- `targetReaderPersona`
- `creativeAnchor`
- `hkr`
- `readerLens`
- `signalRefs`
- `topicScorecard`

## Angle 结构

每个 angle 至少包含：

- `id`
- `title`
- `angleType`
- `angleTypeLabel`
- `articleType`
- `coreJudgement`
- `counterIntuition`
- `readerValue`
- `whyNow`
- `articlePrototype`
- `targetReaderPersona`
- `creativeAnchor`
- `hkr`
- `readerLens`
- `signalRefs`
- `topicScorecard`
- `neededEvidence`
- `riskOfMisfire`
- `recommendedNextStep`

## Coverage Summary

`coverageSummary` 用来说明这次共创覆盖了哪些角度桶：

- `includedTypes`
- `missingTypes`
- `duplicatesMerged`

## Prompt 与后处理分工

- 模型层 `topic_cocreate` 负责生成宽覆盖的原始候选长名单
- 代码后处理负责：
  - `angleType` 规范化
  - 去重
  - 推荐名单筛选
  - `coverageSummary` 计算

也就是说，推荐名单与 coverage 不是让模型直接拍脑袋决定，而是由确定性规则生成。

## Canonical angle buckets

- `thesis` — 总判断型
- `counterintuitive` — 反常识型
- `spatial_segmentation` — 空间切割型
- `buyer_segment` — 客群视角型
- `transaction_micro` — 交易微观型
- `supply_structure` — 供给结构型
- `policy_transmission` — 政策传导型
- `timing_window` — 时间窗口型
- `comparative` — 对比参照型
- `risk_deconstruction` — 风险拆解型
- `decision_service` — 决策服务型
- `narrative_upgrade` — 叙事升级型
- `scene_character` — 人物/场景型
- `lifecycle` — 生命周期型
- `mismatch` — 错配型
- `culture_psychology` — 文化/心理型
