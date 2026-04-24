# Accessibility QA Spec

本文件把 Apple HIG Accessibility 转译成当前工作台的验收标准。

## 1. 视觉可读性

- 普通正文和背景对比度目标：WCAG AA 4.5:1。
- 大字号标题和粗体文字目标：3:1 以上。
- 状态色必须有文字说明，不只靠颜色。
- 支持 `prefers-contrast: more`：边框、focus、状态底色必须更清楚。
- 暗色模式不是当前目标；文档和代码默认 light-only。

## 2. 键盘路径

必须可用键盘完成：

- 左侧项目搜索与项目选择。
- 主阶段 Tab 切换。
- 子阶段 Tab / segmented control 切换。
- 打开和关闭任务中心、共创弹窗。
- 表单字段按视觉顺序 tab。
- 保存、生成、导出等主动作。

规则：

- 不覆盖系统常用快捷键。
- 自定义可点击区域必须有 `role`、`tabIndex` 和键盘事件。
- Escape 关闭 Popover；Modal 由原生 dialog 和关闭按钮处理。

## 3. Focus

- button、link、input、textarea、select、summary、tab 必须有可见 focus。
- Modal 打开后 focus 进入第一个可操作元素。
- Modal 关闭后 focus 回到触发元素。
- Toast 不抢 focus。
- hover 不替代 focus。

## 4. ARIA

| 组件 | 要求 |
| --- | --- |
| 主阶段 Tab | `role=tablist`、`role=tab`、`aria-selected`、方向键切换 |
| 子阶段 Tab | `role=tablist`、`role=tab`、`aria-selected` |
| Modal | `aria-labelledby`、可选 `aria-describedby`、`aria-modal` |
| Toast | `role=status/alert`、`aria-live` |
| IconButton | 必须有 `aria-label` |
| 展开卡 | `aria-expanded`、必要时 `aria-controls` |

## 5. 表单

- 每个字段必须有可见 label。
- placeholder 只做样例，不作为唯一说明。
- 错误提示必须靠近字段，并说明怎么修。
- 数字字段设置合适的 input mode。
- 长文 textarea 不应造成页面横向滚动。

## 6. 验收清单

- 只用键盘能走完判断、资料、写作、发布四个阶段。
- 高对比模式下文本、边框、focus 都更清楚。
- 关闭弹窗后焦点不会丢失。
- 颜色去饱和后仍能看懂成功、风险、失败。
- 文字放大到浏览器 125% 时主流程不出现横向滚动。
