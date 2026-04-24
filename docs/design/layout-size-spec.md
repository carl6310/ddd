# Layout And Size Spec

本文件把 Apple HIG 的 layout / safe area / visual hierarchy 转译成当前桌面写作工作台的硬规范。

## 1. 桌面安全区域

本项目以电脑网页为主，不做原生 safe area。Web 转译如下：

| 区域 | Token / 值 | 规则 |
| --- | ---: | --- |
| 页面最大宽度 | `--content-max-width: 1600px` | 超宽屏不让内容无限拉伸 |
| 页面外边距 | 24-32px | 不贴浏览器边缘 |
| 三栏间距 | `--workspace-gap: 20px` | 不局部改成随机 gap |
| 左侧栏 | `--sidebar-width: 260px` | 项目导航，不承载主内容 |
| 右侧 Inspector | `--inspector-width: 304px` | 状态和下一步，不抢主任务 |
| 长文宽度 | `--longform-max-width: 900px` | 双稿编辑和正文阅读保持单列焦点 |
| 表单宽度 | `--form-max-width: 760px` | 避免字段拉得过长 |
| 摘要宽度 | `--summary-max-width: 1180px` | 关键摘要可更宽，但必须有留白 |

## 2. 视觉层级

- 第一视觉焦点必须在主工作区。
- 左侧栏像 Finder sidebar：低色、低阴影、低卡片感。
- 右侧 Inspector 像 macOS Inspector：固定、轻量、只放状态、风险、下一步。
- 每个阶段只保留一个主视觉对象：摘要、资料台、写作编辑器或发布检查。
- 控件靠近它影响的内容，不能漂浮在页面远端。

## 3. 对齐网格

| Token | 值 | 用途 |
| --- | ---: | --- |
| `--space-1` | 4px | 图标和文字微间距 |
| `--space-2` | 8px | label 与控件、小组内间距 |
| `--space-3` | 12px | 小卡片内部间距 |
| `--space-4` | 16px | 标准组间距 |
| `--space-5` | 20px | 面板间距 |
| `--space-6` | 24px | 大卡片内边距 |
| `--space-8` | 32px | 阶段主舞台内边距 |
| `--space-12` | 48px | 空状态和关键摘要呼吸感 |

禁止新增 `13px / 17px / 37px` 这类无 token 尺寸，除非在注释里说明是为兼容历史视觉。

## 4. 固定组件尺寸

- 指标卡最小高度：`--metric-card-height: 88px`。
- 空状态最小高度：`--empty-state-height: 220px`。
- 主按钮高度：`--control-height-lg: 44px`。
- 普通按钮高度：`--control-height-md: 38px`。
- 紧凑按钮高度：`--control-height-sm: 32px`。
- Chip 高度：`--chip-height: 26px`。

## 5. 验收标准

- 1440px 下三栏不拥挤，主工作区明显是视觉中心。
- 1280px 下 Inspector 不压垮主工作区。
- 写作页双稿编辑保持单列，不因参考稿出现左右跳读。
- 资料卡列表可扫描：标题、来源、摘要、状态、动作位置稳定。
- 页面无横向滚动。
