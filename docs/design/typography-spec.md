# Typography Spec

本文件把 Apple HIG 的 typography / legibility 转译成当前中文写作工作台的文字规范。

## 1. 字体栈

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", sans-serif;
```

规则：

- 不新增花体或装饰字体。
- 不使用 Light / Thin。
- 中文长文优先可读，不追求海报感。
- 不使用负 `letter-spacing`。

## 2. 字号和字重

| Role | Token | Size | Weight | Line height | 用途 |
| --- | --- | ---: | ---: | ---: | --- |
| Hero title | `--font-hero` | 36-46 | 700 | `--line-tight` | 共创入口、关键摘要 |
| Page title | `--font-page-title` | 28-32 | 700 | `--line-title` | 阶段标题 |
| Section title | `--font-section-title` | 22 | 650/700 | `--line-title` | 大区标题 |
| Card title | `--font-card-title` | 17 | 650/700 | `--line-title` | 资料卡、任务卡 |
| Body | `--font-body` | 15 | 400/500 | `--line-body` | 普通说明 |
| Longform | `--font-longform` | 16 | 400 | `--line-longform` | 正文阅读和编辑 |
| Meta | `--font-meta` | 12 | 500/650 | 1.35 | 时间、来源、chip |
| Label | `--font-label` | 11 | 700 | 1.2 | 字段 label、状态 label |

## 3. 中文长文

- 正文阅读宽度控制在 `--longform-max-width` 以内。
- 行高使用 `--line-longform`，避免密集后台感。
- 段落之间使用留白，不用重边框分割。
- 编辑器、原始稿、参考提纲不能并列成双栏长文。

## 4. 层级规则

- 用字号、字重、灰度建立层级，不靠颜色堆叠。
- 小面板内部不得使用 page title 尺寸。
- Label 不写成长句，说明文案放到 body。
- Meta 不承载关键判断。

## 5. 验收标准

- 用户能在 3 秒内区分页面标题、当前任务、辅助说明和状态。
- 资料卡标题不被来源、标签、按钮抢权重。
- Inspector 的文字密度低于主内容区。
- 关键数字不单独漂浮，必须有 label 和上下文。
