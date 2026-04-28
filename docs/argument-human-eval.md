# Argument Human Eval

This harness is for human review of generated articles after `ArgumentFrame` is available. It does not call an LLM. It runs deterministic review and prints a compact report that a developer can compare with human notes.

## What To Score

For each pasted article, score or annotate these dimensions:

1. 这篇文章是否回答标题问题？
2. 是否有 `centralTension`？
3. 是否过早变成板块资料整理？
4. 是否出现 map tour？
5. `supportingClaims` 是否真的支撑 `answer`？
6. 片区材料是否只是证据，而不是章节目录？
7. `counterargument` 是否真实？
8. `readerDecisionFrame` 是否可用？
9. 是否因为规则太多而生硬？
10. 是否保留作者口吻？

## Fixture

Paste 5-10 real generated articles into:

```text
evals/fixtures/writing-quality/argument-samples.json
```

Each fixture should be self-contained. Minimal shape:

```json
{
  "id": "xinzhuang-real-run-001",
  "label": "莘庄真实生成稿 001",
  "topic": "莘庄房价高估了吗？",
  "articleType": "价值重估型",
  "articleMarkdown": "# 莘庄房价高估了吗？\n\n...",
  "argumentFrame": {
    "primaryShape": "judgement_essay",
    "secondaryShapes": [],
    "centralTension": "新房认购冷和核心二手资产高价之间的张力。",
    "answer": "莘庄不是典型泡沫，但也不是成长型板块。",
    "notThis": ["不要写成板块分区说明书"],
    "supportingClaims": [
      {
        "id": "claim-1",
        "claim": "成熟确定性仍然撑价。",
        "role": "prove",
        "evidenceIds": ["sc_a"],
        "mustUseEvidenceIds": ["sc_a"],
        "zonesAsEvidence": ["北广场", "南广场"],
        "shouldNotBecomeSection": true
      }
    ],
    "strongestCounterArgument": "新房认购冷说明价格撑不住。",
    "howToHandleCounterArgument": "承认短期压力，但限定到资产分层和安全边际。",
    "readerDecisionFrame": "按预算、等待周期和风险承受力判断。"
  },
  "humanNotes": {
    "answersHeadline": "yes/no/unclear",
    "centralTension": "yes/no/unclear",
    "mapTour": "yes/no/unclear",
    "notes": "人工评语"
  }
}
```

Optional fields:

- `outlineHeadings`: use when the generated outline headings differ from Markdown headings.
- `sectorZones`: zone names used by the deterministic map-tour check.
- `sourceCards`: source card ids/titles/summaries for citation validation.
- `thesis`: override `argumentFrame.answer`.
- `humanNotes`: any JSON object; the script passes it through unchanged.

## Run

```bash
npm run eval:argument-human
```

Optional input path:

```bash
node --no-warnings --experimental-strip-types --import ./scripts/register-alias.mjs scripts/eval-argument-samples.ts evals/fixtures/writing-quality/argument-samples.json
```

The script prints a readable Markdown report and writes JSON to:

```text
output/evals/argument-human-eval-latest.json
```

## How To Use Results

Use deterministic flags as prompts for human review, not as final truth.

- If humans see map tour but `argumentQualityFlags` does not, tighten review heuristics.
- If `map_tour_in_judgement_essay` fires on a claim-led article, reduce false positives.
- If `counterargument_missing` fires but the article genuinely handles the strongest opposing view, improve matching.
- If the article reads stiff because it obeys too many rules, record that in `humanNotes`; this is a human judgement that deterministic review cannot fully score.
