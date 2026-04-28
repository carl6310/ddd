# Argument Shapes

ArgumentShape is the article-level argument form. It decides the article structure before outline writing.

Key rules:
- `primaryShape` decides the article structure.
- `secondaryShapes` can influence emphasis, but must not override `primaryShape`.
- `SectorModel` is an evidence map, not article structure.
- A section is not allowed to exist only because a zone exists.
- Zones can support a claim, sharpen a comparison, or define a boundary; they should not automatically become chapters.

## Shape List

### judgement_essay

Use when the topic asks for a direct judgement: whether something is overvalued, undervalued, worth buying, still viable, or strategically meaningful.

Structure cue: question -> answer -> supporting claims -> strongest counterargument -> decision boundary.

### misread_correction

Use when the article needs to explain why a common reading is wrong.

Structure cue: common misread -> why it feels right -> where it breaks -> corrected frame -> reader implication.

### signal_reinterpretation

Use when the topic starts from a market signal that readers may be interpreting too literally.

Structure cue: visible signal -> common interpretation -> alternative interpretation -> evidence -> what to watch next.

### lifecycle_reframe

Use when the core argument is about a district moving from one development phase to another.

Structure cue: old lifecycle -> transition point -> new constraints -> new value logic -> reader timing.

### asset_tiering

Use when the useful argument is not one total verdict, but tiering assets inside the same area.

Structure cue: tiering principle -> top tier -> middle tier -> weak tier -> how readers should sort options.

### mismatch_diagnosis

Use when price, supply, planning, school district, traffic, or buyer demand no longer matches the old label.

Structure cue: expected match -> observed mismatch -> cause -> consequence -> correction.

### tradeoff_decision

Use when the reader needs to choose between imperfect options.

Structure cue: reader goal -> available options -> tradeoff dimensions -> unacceptable costs -> decision rule.

### risk_decomposition

Use when the topic is mainly about whether a risk is real, exaggerated, or conditional.

Structure cue: named risk -> transmission path -> who bears it -> mitigation conditions -> warning threshold.

### comparison_benchmark

Use when the argument depends on comparing one area or asset with a benchmark.

Structure cue: benchmark choice -> same points -> different points -> price/value gap -> what the comparison proves.

### planning_reality_check

Use when the topic depends on planning, TOD, renewal, commercial promises, or infrastructure delivery.

Structure cue: planning claim -> delivery path -> bottlenecks -> realistic impact -> timing and uncertainty.

### cycle_timing

Use when the core issue is whether the current moment is early, late, or waiting for confirmation.

Structure cue: cycle position -> supporting signals -> lagging risks -> next confirmation -> action window.

### buyer_persona_split

Use when different reader groups should reach different conclusions.

Structure cue: persona split -> what each group values -> which facts matter -> who should act -> who should avoid.

## Relationship To SectorModel

`SectorModel` remains useful as an evidence map:
- it records zones, boundaries, support, risks, and evidence IDs;
- it helps claims find grounded examples;
- it can provide contrast points.

It must not become the default outline. For example, if `primaryShape` is `judgement_essay`, sections should be claim-led. North square, south square, business district, or other zones can appear inside supporting claims, but should not become consecutive chapters merely because they exist in `SectorModel.zones`.
