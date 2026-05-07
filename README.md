# 上海板块写作工作台

一个面向单人本地使用的上海板块文章生产工作台。

它不是简单的 AI 写作器，而是把一篇板块解析文章拆成 6 个稳定步骤：

1. 选题判断
2. 资料沉淀
3. 板块建模
4. 论证提纲
5. 正文打磨
6. 体检发布

默认输出 Markdown 主稿，资料卡采用人工录入模式，关键判断必须绑定资料来源。主界面只展示这条文章生产线；内部仍保留更细的项目阶段和兼容数据，用于调试和旧数据读取。

核心能力围绕三张判断卡和一条生产流组织：

- 每个项目现在有三张主卡：`ThinkCard`、`StyleCore`、`VitalityCheck`
- `ThinkCard` 先判断题值、读者收益和表达策略，不直接冲进结构
- `StyleCore` 负责节奏、打破、人物画像、文化升维、回环和代价
- `VitalityCheck` 并入“体检发布”，不过线就不进入发布包整理
- 老的 `HKRR / HAMD / writingMoves` 仍保留，但退到调试兼容层，由新卡自动派生

动作系统文档见：

- [上海板块写作动作系统](/Users/gtjunshi/Desktop/ddd/docs/shanghai-writing-action-system.md)

## 技术栈

- Next.js 本地网页应用
- SQLite 持久化
- Python `python-docx` 导入样本文档
- 单一模型接口，支持 OpenAI-compatible API
- 无模型 key 时默认走 `mock` 模式，方便本地先跑流程

## 本地启动

```bash
npm install
python3 -m pip install -r requirements.txt
cp .env.example .env.local
npm run import-samples
npm run dev:all
```

默认会把 `wz/` 目录中的 `.docx` 样本导入到 `data/workbench.db`。
`dev:all` 会同时启动 Next.js 页面服务和后台 worker；只运行 `npm run dev` 时，长任务会入队但不会自动执行。
后台 worker 默认最多并行跑 2 个不同项目的任务，可通过 `.env.local` 里的 `JOB_WORKER_CONCURRENCY` 调整。同一个项目的连续步骤仍会串行执行，避免后一步读到旧数据或覆盖前一步结果。

## 一键启动

如果你在 macOS 上想双击直接运行，直接双击：

[`启动上海板块写作工作台.command`](/Users/gtjunshi/Desktop/ddd/启动上海板块写作工作台.command)

它会自动：

- 进入项目目录
- 检查并安装 `node_modules`
- 安装 Python 依赖
- 导入 `wz` 里的样本文章
- 启动本地服务
- 自动打开浏览器到 `http://127.0.0.1:3000`

停止方式：

- 直接关闭启动器打开的终端窗口
- 或在那个终端里按 `Ctrl + C`

## 环境变量

`.env.local` 示例：

```bash
MODEL_MODE=mock
MODEL_NAME=gpt-4.1-mini
MODEL_API_BASE_URL=https://api.openai.com/v1
MODEL_API_PATH=/chat/completions
MODEL_API_KEY=
MODEL_TEMPERATURE=0.4
```

说明：

- `MODEL_MODE=mock` 时不调用远程模型，适合本地体验流程。
- `MODEL_MODE` 留空且配置 `MODEL_API_KEY` 后，会走远程模型。

## 已实现接口

- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects/:id/research-brief`
- `GET /api/projects/:id/source-cards`
- `POST /api/projects/:id/source-cards`
- `DELETE /api/projects/:id/source-cards/:sourceCardId`
- `POST /api/projects/:id/sector-model`
- `POST /api/projects/:id/outline`
- `POST /api/projects/:id/drafts`
- `PATCH /api/projects/:id/drafts`
- `POST /api/projects/:id/review`
- `GET /api/projects/:id/export/markdown`
- `GET /api/samples`

## 流程映射

界面上的 6 步流程与内部项目阶段的映射如下：

| 界面流程 | 内部阶段 |
| --- | --- |
| 选题判断 | 选题定义、ThinkCard / HKR、StyleCore |
| 资料沉淀 | 研究清单、资料卡整理 |
| 板块建模 | 板块建模 |
| 论证提纲 | 提纲生成 |
| 正文打磨 | 正文生成 |
| 体检发布 | VitalityCheck、发布前整理 |

## 当前实现边界

- 只做单人私有工作台，不含登录与权限
- 只导出 Markdown，不直接生成 DOCX 或公众号排版稿
- 资料卡以人工录入为主，不做自动网页抓取
- 板块样本库只做检索与参考，不直接拼接进正文
