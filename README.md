<p align="center">
  <strong>JubitMind</strong><br/>
  <em>Human judgement meets AI mind. Every interaction, valued.</em>
</p>

<p align="center">
  <a href="https://github.com/M1zwell/jubitmind/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61dafb" alt="React">
  <img src="https://img.shields.io/badge/Electron-34-47848f" alt="Electron">
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED" alt="Docker">
</p>

---

**JubitMind** is a local AI interaction audit and governance platform. It captures, categorizes, risk-scores, and tags all human-AI conversations across 11 AI coding tools and providers. Built for developers and teams who value transparency, safety, and the intellectual property generated through human-AI collaboration.

*Part of the [Jubit AI](https://jubit.ai) / [dseek](https://dseek.ai) ecosystem.*

## Why JubitMind?

Every human-AI interaction has value — the prompts you craft, the decisions you make, the code you co-create. JubitMind helps you:

- **Audit** every AI tool interaction from a single dashboard
- **Score risk** on every tool use (file writes, shell commands, git pushes)
- **Detect** API key leaks, dangerous permissions, and safety bypasses in config files
- **Track costs** across LLM providers and routing proxies
- **Own your data** — everything runs locally, your conversations never leave your machine

## Features

### Multi-Tool Adapter System

JubitMind discovers and reads sessions from **11 AI coding tools** via a unified adapter interface:

| Tool | Status | Data Source |
|------|--------|------------|
| Claude Code CLI | Auto-discovery | `~/.claude/projects/` JSONL sessions |
| Claude VS Code | Auto-discovery | VS Code extension storage |
| Cursor | Auto-discovery | `~/Library/Application Support/Cursor/` SQLite |
| Windsurf | Stub ready | `~/Library/Application Support/Windsurf/` |
| GitHub Copilot | Stub ready | VS Code Copilot extension |
| Continue.dev | Stub ready | `~/.continue/sessions/` |
| Aider | Stub ready | `~/.aider.chat.history.md` |
| OpenAI Codex CLI | Stub ready | `~/.codex/` |
| Kilo Code | Stub ready | VS Code extension storage |
| Kimi CLI | Stub ready | `~/.kimi/` |
| Antigravity | Stub ready | `~/.antigravity/` |

### Risk Scoring Engine

Every tool use in every conversation is scored:

| Level | Score | Examples |
|-------|-------|----------|
| **Critical** | 4 | `rm -rf`, `sudo`, `git push --force`, credential access |
| **High** | 3 | `git push`, `npm publish`, `docker`, external API calls |
| **Medium** | 2 | `git commit`, file writes/edits, builds, installs |
| **Low** | 1 | File reads, searches, grep (read-only operations) |

30+ detection patterns across security, file system, network, and git operations.

### Auto-Classification Tags

Rule-based tagging with confidence scoring:

- **Technical**: `code-generation`, `debugging`, `architecture`, `devops`, `testing`, `refactoring`
- **Sensitivity**: `security`, `privacy`, `ip-creation`, `legal`, `safety`
- **Operational**: `file-modification`, `system-command`, `external-api`, `data-access`

### Auditor Agent

Background security scanner running every 30 minutes:

- Scans all discovered sessions for security risks
- Detects oversized sessions, performance issues, billing anomalies
- Generates structured reports with severity-ranked findings
- Emergency audit trigger from the UI
- Report persistence in `data/auditor/`

### Agent Config Auditor

Discovers and audits **17 config file formats** across 9 AI tools:

- `CLAUDE.md`, `claude_settings.json`, `.cursorrules`, `.windsurfrules`
- `copilot-instructions.md`, `.github/copilot-instructions.md`
- `.continuerc.json`, `.aider.conf.yml`, `codex.json`, `.clinerules`
- `.editorconfig`, custom agent configs

**Audit patterns detect:**
- Leaked API keys (`sk-`, `sk-ant-`, `ghp_`, `xai-`)
- Dangerous shell commands (`rm -rf`, `sudo`, `chmod 777`)
- Permission bypasses and safety overrides
- Inline Monaco editor with syntax highlighting for direct editing

### LiteLLM Routing Dashboard

Connect to your LiteLLM proxy for model routing visibility:

- Model configuration viewer (reads `config.yaml`)
- Spend tracking by model and time period (requires PostgreSQL)
- Request volume analytics
- API key usage monitoring

### Session Analysis

LLM-powered deep analysis of individual sessions:

- Conversation flow mapping
- Risk pattern identification
- Code quality assessment
- Actionable recommendations

### Rich Message Rendering

- Tool use blocks with risk-colored borders (expandable input/output)
- Thinking blocks (collapsible)
- Message-type filtering: prompts, planning, tools, permissions
- Copy-to-clipboard for any message
- Markdown rendering with syntax highlighting

### Additional Features

- **Archives** — Long-term session storage and retrieval
- **Analytics** — Usage trends, tool distribution, risk heatmaps (Recharts)
- **MCP Servers** — Model Context Protocol server management
- **Skills / Commands / Memory** — Claude Code knowledge base browser
- **Cloud import/export** — Manual conversation backup via Supabase
- **Dark theme** — Full dark mode UI with zinc/slate palette

## Quick Start

### Prerequisites

- Node.js 20+
- npm 9+

### Development

```bash
# Clone the repository
git clone https://github.com/M1zwell/jubitmind.git
cd jubitmind

# Install dependencies
npm install

# Start development (client + server)
npm run dev

# Client: http://localhost:8081
# API:    http://localhost:3001
```

### Production

```bash
# Build and start
npm run build
npm start

# Serves on http://localhost:3000
```

### Docker

```bash
# Build and run
docker build -t jubitmind .
docker run -p 3000:3000 -v ~/.claude:/data/.claude:ro jubitmind

# Or with Docker Compose
docker compose up -d
```

Docker Compose mounts read-only volumes for AI tool data directories.

### Electron Desktop App

```bash
# Development
npm run electron:dev

# Build for macOS
npm run electron:build:mac

# Build for Windows
npm run electron:build:win
```

Produces `.dmg` for macOS and `.exe` installer for Windows.

## Architecture

```
jubitmind/
├── server/                         # Express.js backend
│   ├── index.ts                    # Server entry, route mounting
│   ├── routes/                     # 14 REST route modules
│   │   ├── adapters.ts             # AI tool adapter endpoints
│   │   ├── agent-configs.ts        # Config discovery & editing
│   │   ├── auditor.ts              # Security auditor endpoints
│   │   ├── conversations.ts        # Session & message endpoints
│   │   ├── litellm.ts              # LiteLLM proxy integration
│   │   └── ...                     # analysis, archives, cli, config, mcp, etc.
│   └── services/
│       ├── adapters/               # 11 AI tool adapters + registry
│       │   ├── types.ts            # AIToolAdapter interface
│       │   ├── registry.ts         # AdapterRegistry singleton
│       │   ├── claude-code.ts      # Claude Code CLI adapter
│       │   ├── cursor.ts           # Cursor IDE adapter
│       │   └── ...                 # windsurf, copilot, aider, etc.
│       ├── agent-configs.ts        # Config file discovery & audit
│       ├── auditor-agent.ts        # Background security scanner
│       ├── risk-scorer.ts          # Risk scoring engine (30+ patterns)
│       ├── auto-tagger.ts          # Auto-classification engine
│       ├── claude-sessions.ts      # Claude Code JSONL reader
│       ├── litellm-connector.ts    # LiteLLM DB/YAML connector
│       └── ...
├── src/                            # React + Vite frontend
│   ├── App.tsx                     # Router with 18+ routes
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # 7-section navigation (20 items)
│   │   ├── dashboard/              # Unified home dashboard
│   │   ├── conversations/          # Session list, message thread
│   │   ├── auditor/                # Auditor reports UI
│   │   ├── config/                 # Agent configs + Monaco editor
│   │   ├── litellm/                # LiteLLM routing dashboard
│   │   ├── analytics/              # Usage analytics charts
│   │   └── ...                     # archives, mcp, skills, etc.
│   ├── hooks/                      # React Query hooks
│   └── lib/
│       ├── api.ts                  # API client
│       └── types.ts                # Shared TypeScript types
├── electron/                       # Electron desktop app
│   ├── main.ts                     # Main process
│   └── preload.ts                  # Preload script
├── Dockerfile                      # Multi-stage production build
├── docker-compose.yml              # Container orchestration
├── electron-builder.yml            # Desktop app build config
└── package.json
```

## API Reference

### Adapters

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/adapters` | List all adapters with availability status |
| GET | `/api/adapters/:id/sessions` | Sessions from a specific tool |
| GET | `/api/adapters/:id/stats` | Aggregated stats for a tool |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations/sessions` | List sessions (filter by `source`, `project`, `minRisk`, `tags`) |
| GET | `/api/conversations/sessions/:id/messages` | Paginated messages |
| GET | `/api/conversations/sessions/:id/risk` | Risk score + auto-tags |
| POST | `/api/conversations/sessions/:id/tags` | Add manual tag |
| DELETE | `/api/conversations/sessions/:id/tags/:tag` | Remove tag |
| GET | `/api/conversations/stats` | Usage statistics |

### Auditor

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auditor/status` | Current auditor status |
| GET | `/api/auditor/reports/latest` | Most recent audit report |
| GET | `/api/auditor/reports` | All audit reports |
| POST | `/api/auditor/run` | Trigger emergency audit |

### Agent Configs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agent-configs` | Discover all config files |
| GET | `/api/agent-configs/audit` | Audit all configs for risks |
| GET | `/api/agent-configs/:id` | Get config with content |
| PUT | `/api/agent-configs/:id` | Save/create config file |

### LiteLLM

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/litellm/models` | Configured models |
| GET | `/api/litellm/spend` | Cost by model/day |
| GET | `/api/litellm/usage` | Request volume |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3001 dev, 3000 prod) |
| `CLAUDE_HOME` | No | Override Claude data directory (default: `~/.claude`) |
| `LITELLM_DB_URL` | No | PostgreSQL connection for LiteLLM spend tracking |
| `SUPABASE_URL` | No | Supabase project URL (for cloud features) |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key |
| `VITE_SUPABASE_URL` | No | Client-side Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | No | Client-side Supabase key |

All environment variables are optional. JubitMind works fully offline with just local file system access.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3 |
| Backend | Express 4, TypeScript, Node.js 20+ |
| State | TanStack React Query v5 |
| Charts | Recharts 3 |
| Editor | Monaco Editor (via @monaco-editor/react) |
| Icons | Lucide React |
| Routing | React Router v7 |
| Desktop | Electron 34, Electron Builder 25 |
| Container | Docker (node:20-alpine multi-stage) |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start client + server in development |
| `npm run dev:client` | Vite dev server (port 8081) |
| `npm run dev:server` | Express server with hot reload |
| `npm run build` | Production build (Vite + TypeScript) |
| `npm start` | Run production server (port 3000) |
| `npm run docker:build` | Build Docker image |
| `npm run docker:run` | Run Docker container |
| `npm run docker:compose` | Start with Docker Compose |
| `npm run electron:dev` | Build + run Electron app |
| `npm run electron:build:mac` | Build macOS installer (.dmg) |
| `npm run electron:build:win` | Build Windows installer (.exe) |

## Screenshots

The dashboard features a dark-themed UI with a collapsible sidebar organized into 7 sections:

- **Monitor** — Dashboard home, Terminal (CLI viewer)
- **Data & Insights** — History, Archives, Analytics, Auditor, Health
- **Analysis** — Session Analysis (LLM-powered)
- **Routing** — LiteLLM model routing
- **Configuration** — AI Providers, MCP Servers, Permissions, Agent Configs, Settings, CLAUDE.md
- **Knowledge** — Skills, Commands, Memory
- **Jubit AI** — ChatAB, ChatLab (ecosystem links)

## Contributing

Contributions are welcome. Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit with conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
4. Push and open a Pull Request

See `TRADEMARKS.md` for naming guidelines if you plan to distribute a fork.

## License

Licensed under the **Apache License 2.0** — see [LICENSE](LICENSE) for the full text.

```
Copyright 2025-2026 Jubit AI (jubit.ai)
```

### Trademarks

The names **Jubit**, **Jubit AI**, **JubitMind**, **ChatAB**, and **ChatLab** are trademarks of Jubit AI and are **not** covered by the Apache 2.0 license. You may use them for attribution (e.g., "based on JubitMind") but not to brand derivative products. See [TRADEMARKS.md](TRADEMARKS.md) for the full policy.

---

<p align="center">
  Built by <a href="https://jubit.ai">Jubit AI</a>
</p>
