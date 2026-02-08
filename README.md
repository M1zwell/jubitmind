# JubitMind

**Human judgement meets AI mind. Every interaction, valued.**

JubitMind is an AI interaction audit and governance platform that captures, categorizes, risk-scores, and tags all human-AI conversations across tools and providers. Built for teams and individuals who value transparency, safety, and the intellectual property generated through human-AI collaboration.

*Part of the [dseek](https://dseek.ai) / [jubit](https://jubit.ai) ecosystem.*

## Features

### Multi-Source Conversation Sync
- Auto-discovers all Claude Code CLI sessions across projects and IDEs (VS Code, Cursor, terminal)
- Supports conversations from any directory/project
- Cloud import/export for manual conversation backup
- 10-second auto-polling for live session updates

### Risk Scoring Engine
Every tool use in every conversation is scored:

| Level | Score | Examples |
|-------|-------|----------|
| **Critical** | 4 | `rm -rf`, `sudo`, `git push --force`, credential access |
| **High** | 3 | `git push`, `npm publish`, `docker`, external API calls |
| **Medium** | 2 | `git commit`, file writes/edits, builds, installs |
| **Low** | 1 | File reads, searches, grep (read-only operations) |

### Auto-Classification Tags
Rule-based tagging with confidence scoring:

- **Technical**: `code-generation`, `debugging`, `architecture`, `devops`, `testing`, `refactoring`
- **Sensitivity**: `security`, `privacy`, `ip-creation`, `legal`, `safety`
- **Operational**: `file-modification`, `system-command`, `external-api`, `data-access`

### Manual Tags & Filtering
- Add custom tags to any session
- Filter sessions by minimum risk level
- Filter sessions by tags
- Full-text search across conversation previews

### Rich Message Rendering
- Tool use blocks with risk-colored borders (expandable input/output)
- Thinking blocks (collapsible)
- Tool result previews
- Copy-to-clipboard for any message

## Architecture

```
jubitmind/
├── server/                    # Express.js backend (port 3001)
│   ├── routes/
│   │   └── conversations.ts   # REST API endpoints
│   └── services/
│       ├── risk-scorer.ts     # Risk scoring engine
│       ├── auto-tagger.ts     # Auto-classification engine
│       ├── tag-store.ts       # Persistent tag storage (JSON)
│       ├── session-cache.ts   # In-memory session cache
│       ├── claude-sessions.ts # Claude Code JSONL reader
│       ├── project-discovery.ts # Multi-project discovery
│       └── config-resolver.ts # Path resolution
├── src/                       # React + Vite frontend (port 3000)
│   ├── components/
│   │   └── conversations/
│   │       ├── ConversationHistory.tsx
│   │       ├── SessionList.tsx
│   │       ├── MessageThread.tsx
│   │       ├── MessageBlock.tsx
│   │       ├── TagManager.tsx
│   │       ├── RiskBadge.tsx
│   │       ├── TagChip.tsx
│   │       └── risk-utils.ts
│   ├── hooks/
│   │   └── useConversations.ts
│   └── lib/
│       ├── api.ts
│       └── types.ts
└── package.json
```

## Quick Start

```bash
# Install dependencies
npm install

# Start development (client + server)
npm run dev

# Client: http://localhost:3000
# API:    http://localhost:3001
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/conversations/projects` | List all discovered projects |
| GET | `/api/conversations/sessions` | List sessions (filters: `source`, `project`, `minRisk`, `tags`) |
| GET | `/api/conversations/sessions/:id/messages` | Get paginated messages |
| GET | `/api/conversations/sessions/:id/risk` | Compute risk score + auto-tags |
| POST | `/api/conversations/sessions/:id/tags` | Add manual tag |
| DELETE | `/api/conversations/sessions/:id/tags/:tag` | Remove manual tag |
| GET | `/api/conversations/tags` | List all unique tag names |
| GET | `/api/conversations/history` | Global prompt history |
| GET | `/api/conversations/stats` | Usage statistics |
| POST | `/api/conversations/cloud/import` | Import conversation JSON |
| GET | `/api/conversations/cloud/export` | Export session as JSON |

## Tech Stack

- **Frontend**: React 18, Vite, TanStack React Query, Tailwind CSS, Lucide Icons
- **Backend**: Express.js, TypeScript, tsx (dev server)
- **Data**: JSONL session files, JSON tag store, in-memory caching

## Philosophy

> *We value the finest humanity and the working with AI brains for better life.*

JubitMind exists because every human-AI interaction has value. The prompts you craft, the decisions you make, the code you co-create - these are records of human intelligence amplified by AI. JubitMind helps you track, govern, and protect that value.

## License

MIT
