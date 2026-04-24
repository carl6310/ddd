# Screenshot Smoke Targets

截图用于确认 Apple-inspired mixed system 没有回退为后台堆叠感。

## Required Desktop Targets

| 文件名 | 视口 | 页面 |
| --- | --- | --- |
| `1440-workbench-judgement.png` | 1440 x 900 | 判断阶段 |
| `1440-workbench-research.png` | 1440 x 900 | 资料索引 |
| `1440-workbench-writing.png` | 1440 x 900 | 双稿编辑 |
| `1440-review-publish.png` | 1440 x 900 | 发布整理 |
| `1440-topic-cocreate.png` | 1440 x 900 | 选题共创弹窗 |
| `1280-workbench-main.png` | 1280 x 850 | 三栏主工作台 |
| `narrow-fallback.png` | 390 x 844 | 窄屏 fallback |

## Manual Acceptance

截图通过需要满足：

- 无横向滚动。
- 左栏、主区、Inspector 层级清楚。
- 主工作区是视觉中心。
- 右侧状态面板不抢主内容。
- 同屏强状态色不超过两种。
- 长文编辑不左右双栏跳读。
- 弹窗主操作唯一，候选角度按钮不过度放大。

## Playwright Notes

如果使用 Playwright，建议输出到 `/tmp/ddd-ui-audit/`，不要把截图提交进仓库，除非甲方明确要求作为交付物。
