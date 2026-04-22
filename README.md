# 上海板块写作工作台

一个面向单人本地使用的写作工作台，把上海板块解析文章的协作流程拆成 10 个阶段：

1. 选题定义
2. ThinkCard / HKR
3. StyleCore
4. 研究清单
5. 资料卡整理
6. 板块建模
7. 提纲生成
8. 正文
9. VitalityCheck
10. 发布前整理

第一版默认输出 Markdown 主稿，资料卡采用人工录入模式，关键判断必须绑定资料来源。

这次新增的核心能力不是继续堆结构模板，而是把“写作动作层”接进链路：

- 每个项目现在有三张主卡：`ThinkCard`、`StyleCore`、`VitalityCheck`
- `ThinkCard` 先判断题值和 HKR，不再直接冲进结构
- `StyleCore` 负责节奏、打破、人物画像、文化升维、回环和代价
- `VitalityCheck` 单独判断“这篇有没有生命”，不过线就不让进发布前整理
- 老的 `HKRR / HAMD / writingMoves` 仍保留，但已经退到兼容层，由新卡自动派生

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
npm run dev
```

默认会把 `wz/` 目录中的 `.docx` 样本导入到 `data/workbench.db`。

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

## 当前实现边界

- 只做单人私有工作台，不含登录与权限
- 只导出 Markdown，不直接生成 DOCX 或公众号排版稿
- 资料卡以人工录入为主，不做自动网页抓取
- 板块样本库只做检索与参考，不直接拼接进正文
