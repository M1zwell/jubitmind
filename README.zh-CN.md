<p align="center">
  <strong>JubitMind</strong><br/>
  <em>人类智慧与 AI 思维的交汇。每一次交互，皆有价值。</em>
</p>

<p align="center">
  <a href="./README.md">English</a> ·
  <a href="./README.ja.md">日本語</a> ·
  <a href="./README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/M1zwell/jubitmind/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61dafb" alt="React">
  <img src="https://img.shields.io/badge/Node.js-20+-339933" alt="Node.js">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB" alt="Python">
  <img src="https://img.shields.io/badge/Electron-34-47848f" alt="Electron">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED" alt="Docker">
  <img src="https://img.shields.io/badge/LangExtract-Integrated-FF6F00" alt="LangExtract">
</p>

---

**JubitMind** 是一个本地优先、开源的 AI 交互审计与治理平台。它能够捕获、分类、风险评分并分析人类与 AI 之间的所有对话，支持 11 种 AI 编程工具，并通过 [Google LangExtract](https://github.com/google/langextract) 实现结构化实体提取。您的对话数据永远不会离开您的设备。

*隶属于 [Jubit AI](https://jubit.ai) / [dseek](https://dseek.ai) 生态系统。*

## 为什么选择 JubitMind？

每一次人机交互都蕴含价值——您精心设计的提示词、做出的每个决策、与 AI 共同创建的代码。JubitMind 帮助您：

- **审计** 在统一面板中审查所有 AI 工具的交互记录
- **提取** 从对话中提取结构化实体，具备溯源追踪能力
- **探索** 跨会话浏览所有交互——按模型、工具、风险等级、类别筛选
- **分析** 提示词模式、工具使用趋势以及模型成本，辅以 AI 驱动的洞察
- **风险评分** 对每次工具调用进行风险评估（文件写入、Shell 命令、Git 推送等）
- **导出** 将洞察报告导出为 Markdown、PDF 或 PNG 数据看板
- **数据自主** 一切在本地运行，隐私保护贯穿设计始终

## 功能特性

### LangExtract 集成

基于 [Google LangExtract](https://github.com/google/langextract) 从 AI 对话中进行深度结构化提取：

```
Sessions (JSONL) → JubitMind Server → LangExtract Sidecar (FastAPI)
                                           ↓
                                     Ollama / Gemini / OpenAI
                                           ↓
                                     Structured Extractions
                                           ↓
                                     Insights Dashboard + Explorer
```

**为什么 LangExtract + JubitMind 是最佳组合？**

| LangExtract 提供 | JubitMind 提供 |
|-------------------|----------------|
| 精确的来源定位 | 多工具会话摄取 |
| 结构化输出模式 | 风险评分与自动标注 |
| 长文档分块处理 | 跨会话数据聚合 |
| 多轮提取机制 | 交互式可视化 |
| 灵活的 LLM 支持 | 本地优先部署 |

**面向 AI 审计的提取模式：**

| 类别 | 检测内容 |
|------|----------|
| `permission-grant` | 用户批准的工具执行操作 |
| `risk-event` | 危险命令、外部 API 调用 |
| `intent-shift` | 会话中的主题切换 |
| `code-artifact` | 创建或修改的文件及其路径 |
| `thinking-insight` | 模型推理过程中的关键思路 |
| `architecture-decision` | 系统架构设计决策与权衡 |

**默认本地运行**：Ollama 在本地运行提取模型——无需 API 密钥，数据不会离开您的设备。云端模型（Gemini、OpenAI）可作为可选的加速模式使用。

### 交互浏览器

在单一页面中浏览所有会话的全部交互记录：

- **类别标签页**：用户提示 | 规划与思考 | 工具调用 | 工具结果 | 模型输出
- **筛选侧边栏**：搜索、工具名称、模型系列、风险等级、项目、日期范围
- **75,000+ 条交互记录** 在内存中索引并可查询
- **可展开卡片** 按需加载完整内容
- "在会话中打开"导航功能，提供上下文环境

### 洞察代理

后台分析代理，每小时自动生成周期性报告：

- **提示词模式**：常见主题、重复请求、平均提示词长度
- **工具使用趋势**：最常用的工具、风险暴露随时间的变化（Recharts 图表）
- **模型对比**：按模型系列统计会话数、Token 数和预估成本
- **建议**：基于使用模式生成的可操作洞察
- **按需运行**：点击"立即运行"即可获得即时分析

### 报告导出

支持三种格式的洞察报告导出：

| 格式 | 说明 |
|------|------|
| **Markdown** | 包含表格、主题和建议的格式化 `.md` 文件 |
| **PDF** | 带有渲染图表的 A4 排版文档 |
| **PNG** | 高分辨率 2x 数据看板图片，便于分享 |

### 会话分类

每个会话在启动时自动完成分类：

- **使用的模型**：opus、sonnet、haiku、gpt-4o、gemini、deepseek 等
- **使用的工具**：附带风险等级（严重/高/中/低）
- **消息细分**：用户提示、助手文本、思考过程、工具调用
- **主导类别**：工具密集型、规划密集型、提示密集型、均衡型
- **分面筛选**：多选下拉菜单，实时更新计数

### 多工具适配器系统

JubitMind 通过统一的适配器接口发现并读取来自 **11 种 AI 编程工具** 的会话数据：

| 工具 | 状态 | 数据源 |
|------|------|--------|
| Claude Code CLI | 自动发现 | `~/.claude/projects/` JSONL sessions |
| Claude VS Code | 自动发现 | VS Code extension storage |
| Cursor | 自动发现 | `~/Library/Application Support/Cursor/` SQLite |
| Windsurf | 预留接口 | `~/Library/Application Support/Windsurf/` |
| GitHub Copilot | 预留接口 | VS Code Copilot extension |
| Continue.dev | 预留接口 | `~/.continue/sessions/` |
| Aider | 预留接口 | `~/.aider.chat.history.md` |
| OpenAI Codex CLI | 预留接口 | `~/.codex/` |
| Kilo Code | 预留接口 | VS Code extension storage |
| Kimi CLI | 预留接口 | `~/.kimi/` |
| Antigravity | 预留接口 | `~/.antigravity/` |

### 风险评分引擎

对每次对话中的每个工具调用进行风险评分：

| 等级 | 分值 | 示例 |
|------|------|------|
| **严重** | 4 | `rm -rf`、`sudo`、`git push --force`、凭证访问 |
| **高** | 3 | `git push`、`npm publish`、`docker`、外部 API 调用 |
| **中** | 2 | `git commit`、文件写入/编辑、构建、安装 |
| **低** | 1 | 文件读取、搜索、grep（只读操作） |

涵盖安全、文件系统、网络和 Git 操作的 30+ 种检测模式。

### 审计代理

每 30 分钟运行一次的后台安全扫描器：

- 扫描所有已发现的会话，检测安全风险
- 检测超大会话、性能问题、计费异常
- 生成按严重程度排序的结构化报告
- 支持从界面触发紧急审计

### 代理配置审计器

发现并审计 9 种 AI 工具中的 **17 种配置文件格式**：

- 检测泄露的 API 密钥（`sk-`、`sk-ant-`、`ghp_`、`xai-`）
- 标记危险的 Shell 命令、权限绕过和安全覆盖
- 内置 Monaco 编辑器，支持语法高亮的直接编辑

### 更多功能

- **LiteLLM 路由面板** — 模型路由、花费追踪、API 密钥监控
- **会话分析** — 基于 LLM 的单会话深度分析
- **归档管理** — 会话长期存储与检索
- **数据分析** — 使用趋势、工具分布、风险热力图（Recharts）
- **MCP 服务器** — Model Context Protocol 服务器管理
- **技能 / 命令 / 记忆** — Claude Code 知识库浏览器
- **富消息渲染** — 工具调用模块、思考过程模块、消息类型筛选
- **深色主题** — 基于 zinc/slate 色系的完整深色模式界面

## 快速开始

### 前置要求

- Node.js 20+
- npm 9+

### 开发环境

```bash
git clone https://github.com/M1zwell/jubitmind.git
cd jubitmind

npm install
npm run dev

# Client: http://localhost:8081
# API:    http://localhost:3001
```

### 生产环境

```bash
npm run build
npm start
# Serves on http://localhost:3000
```

### Docker

```bash
docker build -t jubitmind .
docker run -p 3000:3000 -v ~/.claude:/data/.claude:ro jubitmind

# 或使用 Docker Compose
docker compose up -d
```

### 桌面应用（macOS / Windows）

```bash
# 开发模式
npm run electron:dev

# 构建 macOS 安装包 (.dmg)
npm run electron:build:mac

# 构建 Windows 安装包 (.exe)
npm run electron:build:win
```

一键安装，无需终端。启动时自动发现会话。

## 架构

```
jubitmind/
├── server/
│   ├── index.ts                    # 服务器入口、路由挂载、启动链
│   ├── routes/
│   │   ├── conversations.ts        # 会话、消息、分面、分类
│   │   ├── explorer.ts             # 跨会话交互浏览
│   │   ├── insights.ts             # AI 洞察报告
│   │   ├── auditor.ts              # 安全审计
│   │   ├── adapters.ts             # AI 工具适配器
│   │   ├── agent-configs.ts        # 配置发现与编辑
│   │   ├── litellm.ts              # LiteLLM 代理
│   │   └── ...                     # analysis, archives, cli, config, mcp 等
│   └── services/
│       ├── adapters/               # 11 种 AI 工具适配器 + 注册表
│       ├── session-classifier.ts   # 模型/工具/类别分类
│       ├── interaction-index.ts    # 内存中的跨会话索引（75K+ 条目）
│       ├── insights-agent.ts       # 后台洞察分析
│       ├── auditor-agent.ts        # 后台安全扫描
│       ├── risk-scorer.ts          # 风险评分引擎（30+ 种模式）
│       ├── auto-tagger.ts          # 自动分类引擎
│       ├── session-cache.ts        # 会话元数据缓存与分类
│       └── ...
├── src/
│   ├── App.tsx                     # 路由，20+ 条路由
│   ├── pages/
│   │   ├── InteractionExplorerPage.tsx  # 跨会话浏览器
│   │   └── InsightsPage.tsx             # 洞察仪表板与图表
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # 7 个分区导航
│   │   ├── conversations/          # 会话列表、消息线程、筛选
│   │   ├── auditor/                # 审计报告界面
│   │   ├── config/                 # 代理配置 + Monaco 编辑器
│   │   ├── litellm/                # LiteLLM 路由面板
│   │   └── ...
│   ├── hooks/                      # React Query 钩子
│   └── lib/
│       ├── api.ts                  # API 客户端（适配器、会话、浏览器、洞察）
│       ├── export-insights.ts      # MD/PDF/PNG 导出工具
│       └── types.ts                # 共享 TypeScript 类型
├── electron/                       # 桌面应用（macOS + Windows）
├── Dockerfile                      # 多阶段生产构建
├── docker-compose.yml              # 容器编排
└── package.json
```

## API 参考

### 浏览器

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/explorer/interactions` | 查询交互记录（类别、工具、模型、风险、搜索） |
| GET | `/api/explorer/interactions/:id/content` | 按需获取完整内容 |
| GET | `/api/explorer/facets` | 浏览器全局分面计数 |
| GET | `/api/explorer/stats` | 索引统计信息 |

### 洞察

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/insights/status` | 代理运行状态 |
| GET | `/api/insights/reports/latest` | 最新洞察报告 |
| GET | `/api/insights/reports` | 报告历史 |
| POST | `/api/insights/run` | 触发按需分析 |

### 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/conversations/sessions` | 会话列表（模型、工具、类别、hasThinking 筛选） |
| GET | `/api/conversations/sessions/:id/messages` | 分页消息 |
| GET | `/api/conversations/sessions/:id/risk` | 风险评分 + 自动标签 |
| GET | `/api/conversations/facets` | 模型/工具/类别分面计数 |
| GET | `/api/conversations/classification-status` | 分类进度 |
| POST | `/api/conversations/sessions/:id/classify` | 按需分类 |

### 适配器

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/adapters` | 列出所有适配器及其可用性 |
| GET | `/api/adapters/:id/sessions` | 指定工具的会话 |
| GET | `/api/adapters/:id/stats` | 指定工具的汇总统计 |

### 审计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auditor/status` | 审计器状态 |
| GET | `/api/auditor/reports/latest` | 最新审计报告 |
| POST | `/api/auditor/run` | 触发紧急审计 |

### LiteLLM

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/litellm/models` | 已配置的模型 |
| GET | `/api/litellm/spend` | 按模型/日期统计成本 |
| GET | `/api/litellm/usage` | 请求量 |

## 路线图

### LangExtract 深度集成

| 阶段 | 说明 | 状态 |
|------|------|------|
| 1 | Python Sidecar（FastAPI 桥接）+ 提取服务 | 规划中 |
| 2 | 可视化提取模板构建器（零代码界面） | 规划中 |
| 3 | 消息线程中的内联提取标注 | 规划中 |
| 4 | 社区提取模板市场 | 规划中 |

### 桌面应用

| 阶段 | 说明 | 状态 |
|------|------|------|
| 1 | Electron 桌面应用（macOS + Windows） | 已完成 |
| 2 | Tauri 迁移（5-15MB vs 150MB+） | 规划中 |
| 3 | PyInstaller 打包 LangExtract Sidecar | 规划中 |
| 4 | 一键安装器，支持自动更新 | 规划中 |

### 平台

| 功能 | 状态 |
|------|------|
| 会话分类 + 分面筛选 | 已完成 |
| 交互浏览器（75K+ 索引） | 已完成 |
| 洞察代理，支持后台分析 | 已完成 |
| 报告导出（MD/PDF/PNG） | 已完成 |
| 多工具适配器系统（11 种工具） | 已完成（3 个活跃，8 个预留） |
| LiteLLM 路由面板 | 已完成 |
| Ollama 本地 LLM 支持 | 规划中 |
| 社区提取模板 | 规划中 |

## 环境变量

| 变量 | 是否必需 | 说明 |
|------|----------|------|
| `PORT` | 否 | 服务器端口（默认：开发环境 3001，生产环境 3000） |
| `CLAUDE_HOME` | 否 | 覆盖 Claude 数据目录（默认：`~/.claude`） |
| `LITELLM_DB_URL` | 否 | LiteLLM 花费追踪的 PostgreSQL 连接字符串 |
| `SUPABASE_URL` | 否 | Supabase 项目 URL（用于云端功能） |
| `SUPABASE_ANON_KEY` | 否 | Supabase 匿名密钥 |

所有环境变量均为可选项。JubitMind 仅需本地文件系统访问即可完全离线运行。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| 后端 | Express 4, TypeScript, Node.js 20+ |
| 提取 | Google LangExtract, Python 3.10+, FastAPI |
| 状态管理 | TanStack React Query v5 |
| 图表 | Recharts 3 |
| 编辑器 | Monaco Editor |
| 图标 | Lucide React |
| 桌面 | Electron 34（计划迁移至 Tauri） |
| 容器 | Docker (node:20-alpine multi-stage) |
| 本地 LLM | Ollama（计划作为提取默认选项） |

## 脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动客户端 + 服务器开发环境 |
| `npm run dev:client` | Vite 开发服务器（端口 8081） |
| `npm run dev:server` | Express 服务器，支持热重载 |
| `npm run build` | 生产构建（Vite + TypeScript） |
| `npm start` | 运行生产服务器（端口 3000） |
| `npm run docker:build` | 构建 Docker 镜像 |
| `npm run docker:run` | 运行 Docker 容器 |
| `npm run docker:compose` | 使用 Docker Compose 启动 |
| `npm run electron:dev` | 构建并运行 Electron 应用 |
| `npm run electron:build:mac` | 构建 macOS 安装包 (.dmg) |
| `npm run electron:build:win` | 构建 Windows 安装包 (.exe) |

## 参与贡献

欢迎贡献代码。请遵循以下流程：

1. Fork 本仓库
2. 创建功能分支（`git checkout -b feature/my-feature`）
3. 使用约定式提交信息（`feat:`、`fix:`、`docs:` 等）
4. 推送并创建 Pull Request

如果您计划分发 Fork 版本，请参阅 `TRADEMARKS.md` 了解命名规范。

## 许可证

本项目基于 **Apache License 2.0** 开源——完整条款请参阅 [LICENSE](LICENSE)。

```
Copyright 2025-2026 Jubit AI (jubit.ai)
```

### 商标声明

**Jubit**、**Jubit AI**、**JubitMind**、**ChatAB** 和 **ChatLab** 是 Jubit AI 的商标，**不受** Apache 2.0 许可证的覆盖。您可以将其用于署名（例如"基于 JubitMind"），但不得用于衍生产品的品牌命名。完整政策请参阅 [TRADEMARKS.md](TRADEMARKS.md)。

---

<p align="center">
  由 <a href="https://jubit.ai">Jubit AI</a> 构建
</p>
