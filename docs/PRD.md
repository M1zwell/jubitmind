# JubitMind - Product Requirements Document

**Version**: 1.0
**Date**: 2026-02-08
**Author**: Jubit Team
**Status**: Active Development

---

## 1. Executive Summary

JubitMind is an AI interaction audit, governance, and intelligence platform that captures, categorizes, risk-scores, and tags every human-AI conversation across tools, IDEs, and providers. It transforms scattered AI chat histories into a structured, searchable, and governable knowledge asset.

In a world where humans collaborate daily with AI systems - generating code, making decisions, creating intellectual property, and handling sensitive data - JubitMind ensures that every interaction is recorded, valued, and protected.

**Mission**: Make every human-AI interaction transparent, auditable, and valuable.

**Vision**: The universal standard for AI interaction governance - where organizations and individuals trust that their AI collaborations are safe, compliant, and producing lasting value.

---

## 2. Problem Statement

### The Untracked AI Collaboration Problem

Every day, millions of developers, researchers, writers, and professionals interact with AI systems through multiple interfaces:

- **Terminal CLIs** (Claude Code, GitHub Copilot CLI, Cursor terminal)
- **IDE integrations** (VS Code, Cursor, JetBrains, Antigravity)
- **Web interfaces** (claude.ai, ChatGPT, Gemini)
- **API-direct calls** (custom applications, scripts)

These interactions generate:

| Asset Type | Risk | Current State |
|------------|------|---------------|
| Source code | IP leakage, license contamination | Scattered across chat logs |
| Architecture decisions | Knowledge loss when chats expire | No structured record |
| Sensitive data exposure | Credentials, PII in prompts | No detection or alerting |
| Destructive commands | `rm -rf`, force pushes, DB drops | No risk visibility |
| Compliance evidence | Audit trail for regulated industries | Non-existent |

**No unified platform exists to:**
1. Aggregate conversations across all AI tools and providers
2. Automatically score the risk level of each interaction
3. Classify conversations by technical domain, sensitivity, and operational impact
4. Provide governance controls for organizations using AI at scale
5. Preserve the intellectual value of human-AI collaboration

### Who Suffers

- **Individual developers**: Lose valuable prompts, solutions, and architectural insights buried in expired chat sessions
- **Engineering teams**: Cannot audit what AI tools are doing across the team - what code was generated, what commands were executed, what data was exposed
- **Security teams**: Have zero visibility into AI-assisted operations that may involve credentials, production systems, or destructive commands
- **Compliance officers**: Cannot demonstrate AI usage governance for SOC2, ISO 27001, GDPR, or industry-specific regulations
- **IP counsel**: Cannot track what proprietary information was shared with AI systems or what AI-generated code entered the codebase

---

## 3. Target Users

### Primary Personas

#### P1: The Power Developer
- Uses Claude Code, Cursor, Copilot daily across 3-5 projects
- Runs 20-50 AI sessions per week
- Wants to find "that prompt that worked" from last Tuesday
- Cares about: searchability, prompt reuse, knowledge preservation

#### P2: The Engineering Manager
- Team of 5-20 developers using AI tools
- Needs visibility into AI tool usage patterns
- Concerned about: code quality, security posture, team productivity
- Wants: dashboards, risk summaries, usage analytics

#### P3: The Security/Compliance Officer
- Responsible for AI governance policy
- Needs audit trails for regulatory compliance
- Concerned about: data exposure, destructive operations, credential leaks
- Wants: risk alerts, compliance reports, policy enforcement

#### P4: The AI Researcher / Prompt Engineer
- Crafts and iterates on complex prompt strategies
- Needs to track what works and what doesn't
- Concerned about: prompt versioning, A/B comparisons, methodology documentation
- Wants: tagging, categorization, export for analysis

### Secondary Personas

#### P5: The Solo Entrepreneur
- Uses AI as a "co-founder" for rapid prototyping
- Generates significant IP through AI collaboration
- Wants to prove human authorship and creative direction
- Needs: timestamped records, IP attribution trails

#### P6: The Legal/Privacy Officer
- Evaluates AI usage for legal risk
- Needs to identify conversations involving PII, trade secrets, or regulated data
- Wants: sensitivity tags, data classification, retention policies

---

## 4. Core Features

### 4.1 Multi-Source Conversation Aggregation (v1.0 - Current)

**Description**: Automatically discover and ingest AI conversation histories from all local sources.

**Supported Sources**:
| Source | Method | Status |
|--------|--------|--------|
| Claude Code CLI (Terminal) | Direct JSONL file reading | Shipped |
| Claude Code CLI (VS Code) | Shared `~/.claude/projects/` directory | Shipped |
| Claude Code CLI (Cursor) | Shared `~/.claude/projects/` directory | Shipped |
| Claude Code CLI (Antigravity) | Shared `~/.claude/projects/` directory | Shipped |
| Dashboard-created sessions | Local conversation store | Shipped |
| Manual JSON import | File upload | Shipped |
| claude.ai web | Manual export/import | Placeholder |

**Requirements**:
- FR-1.1: Auto-discover all project directories in `~/.claude/projects/`
- FR-1.2: Convert mangled directory names to human-readable project names
- FR-1.3: Incremental refresh using file stat (mtime) to avoid re-reading unchanged files
- FR-1.4: Extract first user message as session preview (scan up to 20 lines)
- FR-1.5: Auto-poll every 10 seconds for new/modified sessions
- FR-1.6: Support filtering by project, source type, and search query
- FR-1.7: Display session metadata: size, message count, project, timestamps

**Performance Requirements**:
- NFR-1.1: Initial scan of 300+ sessions across 9 projects completes in < 5 seconds
- NFR-1.2: Incremental refresh completes in < 500ms
- NFR-1.3: Support up to 10,000 sessions without UI degradation

### 4.2 Risk Scoring Engine (v1.0 - Current)

**Description**: Automatically score every tool use in every conversation by risk level.

**Risk Taxonomy**:

| Level | Score | Detection Patterns | Rationale |
|-------|-------|-------------------|-----------|
| **Critical** (4) | Immediate attention | `rm -rf`, `sudo`, `git push --force`, `DROP TABLE/DATABASE`, `.env`/credential writes, `chmod 777`, `mkfs`, format commands | Irreversible or high-blast-radius operations |
| **High** (3) | Review recommended | `git push`, `npm publish`, `docker run/exec/build`, `curl`/`wget` (data exfil), `ssh`, MCP tool calls | External-facing or state-changing operations |
| **Medium** (2) | Awareness | `git commit`, `npm install`, builds, `Write`/`Edit` to source code, `Task`/subagent calls | Local state changes with moderate impact |
| **Low** (1) | Informational | `Read`, `Glob`, `Grep`, `WebSearch`, text-only responses | Read-only, no state change |

**Requirements**:
- FR-2.1: Score each `tool_use` content block by matching input against risk patterns
- FR-2.2: Compute session-level risk summary: max risk, total tool uses, counts per level
- FR-2.3: Extract top risk reasons (e.g., "External: curl", "MCP: filesystem")
- FR-2.4: Client-side lightweight risk scoring for real-time display without API calls
- FR-2.5: Server-side comprehensive scoring with full pattern library
- FR-2.6: Persist risk scores in tag store for session list display

### 4.3 Auto-Classification Tags (v1.0 - Current)

**Description**: Rule-based automatic tagging of conversations by content and tool usage patterns.

**Tag Categories**:

| Category | Tags | Detection Method |
|----------|------|-----------------|
| **Technical** | `code-generation`, `debugging`, `architecture`, `devops`, `testing`, `refactoring` | Content keyword matching + tool usage patterns |
| **Sensitivity** | `security`, `privacy`, `ip-creation`, `legal`, `safety` | Sensitive term detection in prompts and responses |
| **Operational** | `file-modification`, `system-command`, `external-api`, `data-access` | Tool type classification |

**Requirements**:
- FR-3.1: Scan all message content and tool inputs for keyword patterns
- FR-3.2: Assign confidence scores (0.0 - 1.0) to each potential tag
- FR-3.3: Only include tags meeting threshold (0.4 confidence)
- FR-3.4: Boost confidence based on tool_use frequency and risk patterns
- FR-3.5: Support manual tag addition and removal per session
- FR-3.6: Persist tags in sidecar JSON store with atomic writes
- FR-3.7: Display auto-tags by category with color coding
- FR-3.8: List all unique tags across all sessions for filter dropdowns

### 4.4 Governance Dashboard (v1.0 - Current)

**Description**: Visual interface for browsing, filtering, and auditing conversations.

**Requirements**:
- FR-4.1: Session list with date grouping, project badges, risk badges, and tag chips
- FR-4.2: Risk filter dropdown (Critical+, High+, Medium+, Low+)
- FR-4.3: Tag filter with multi-select
- FR-4.4: Project filter dropdown
- FR-4.5: Source filter tabs (All, Dashboard, Claude Code, Cloud)
- FR-4.6: Full-text search on session previews
- FR-4.7: Collapsible TagManager panel above message thread
- FR-4.8: Rich message rendering with tool_use blocks, risk-colored borders, expandable input/output
- FR-4.9: Thinking block rendering (collapsible)
- FR-4.10: Tool result preview with expand
- FR-4.11: Export selected session as JSON
- FR-4.12: Import conversation JSON files

---

## 5. Future Features (Roadmap)

### v1.1 - Provider Expansion
- **OpenAI/ChatGPT history import**: Parse ChatGPT export JSON format
- **Google Gemini import**: Parse Gemini conversation exports
- **GitHub Copilot session tracking**: Monitor Copilot suggestions and acceptances
- **Custom LLM provider integration**: Generic JSONL/JSON import adapters

### v1.2 - Intelligence Layer
- **Prompt similarity detection**: Find similar prompts across sessions using embeddings
- **Conversation clustering**: Auto-group related sessions by topic
- **Prompt effectiveness scoring**: Track which prompts led to successful outcomes
- **Knowledge extraction**: Auto-generate learnings/FAQs from conversation history
- **Trend analysis**: Visualize AI usage patterns over time

### v1.3 - Team & Organization
- **Multi-user support**: User accounts with role-based access
- **Team dashboards**: Aggregate risk and usage across team members
- **Policy engine**: Define rules (e.g., "alert if critical risk in production project")
- **Webhook integrations**: Send alerts to Slack, Teams, PagerDuty
- **SSO/SAML**: Enterprise authentication

### v1.4 - Compliance & Reporting
- **Automated compliance reports**: SOC2, ISO 27001, GDPR evidence packages
- **Data retention policies**: Auto-archive or delete conversations after configurable periods
- **PII detection**: ML-based detection of personal information in conversations
- **Audit log**: Immutable log of all governance actions
- **Export to SIEM**: Integration with Splunk, Datadog, ELK

### v1.5 - Cloud & Sync
- **JubitMind Cloud**: Hosted SaaS version with managed storage
- **End-to-end encryption**: Zero-knowledge encryption for conversation data
- **Cross-device sync**: Access conversation history from any device
- **Real-time collaboration**: Share sessions with team members
- **API access**: Programmatic access for custom integrations

### v2.0 - AI-on-AI Governance
- **LLM-powered risk analysis**: Use AI to detect subtle risks that regex patterns miss
- **Conversation summarization**: Auto-generate session summaries
- **Anomaly detection**: Flag unusual patterns in AI usage
- **Prompt injection detection**: Identify potential prompt injection attempts
- **Model behavior comparison**: Compare responses across different AI models

---

## 6. Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JubitMind Platform                        │
├─────────────────────────┬───────────────────────────────────────┤
│    React Frontend       │         Express.js Backend            │
│    (Port 3000)          │         (Port 3001)                   │
│                         │                                       │
│  ┌───────────────────┐  │  ┌─────────────────────────────────┐  │
│  │ ConversationHistory│  │  │ Routes                          │  │
│  │ SessionList       │  │  │  /conversations/sessions        │  │
│  │ MessageThread     │  │  │  /conversations/sessions/:id/*  │  │
│  │ TagManager        │  │  │  /conversations/projects        │  │
│  │ RiskBadge         │  │  │  /conversations/tags            │  │
│  │ TagChip           │  │  │  /conversations/cloud/*         │  │
│  │ MessageBlock      │  │  └──────────┬──────────────────────┘  │
│  └───────┬───────────┘  │             │                         │
│          │              │  ┌──────────▼──────────────────────┐  │
│  ┌───────▼───────────┐  │  │ Services                        │  │
│  │ TanStack Query    │  │  │  project-discovery.ts            │  │
│  │ (10s auto-poll)   │◄─┤  │  session-cache.ts (in-memory)   │  │
│  └───────────────────┘  │  │  claude-sessions.ts (JSONL)     │  │
│                         │  │  risk-scorer.ts (regex engine)   │  │
│  ┌───────────────────┐  │  │  auto-tagger.ts (rule engine)   │  │
│  │ risk-utils.ts     │  │  │  tag-store.ts (JSON persist)    │  │
│  │ (client scorer)   │  │  └──────────┬──────────────────────┘  │
│  └───────────────────┘  │             │                         │
└─────────────────────────┴─────────────┼─────────────────────────┘
                                        │
                          ┌─────────────▼─────────────────┐
                          │  Data Sources                  │
                          │                                │
                          │  ~/.claude/projects/           │
                          │    ├── -Users-xxx-ProjectA/    │
                          │    │   ├── session1.jsonl      │
                          │    │   └── session2.jsonl      │
                          │    ├── -Users-xxx-ProjectB/    │
                          │    └── ...                     │
                          │                                │
                          │  conversations/_tags.json      │
                          │  (risk scores + tags persist)  │
                          └────────────────────────────────┘
```

### Data Model

#### Session JSONL Format (Claude Code native)
```jsonl
{"type":"user","message":{"role":"user","content":"fix the login bug"},"timestamp":"2026-02-08T10:00:00Z","uuid":"abc-123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll fix that..."},{"type":"tool_use","name":"Read","input":{"file_path":"/src/auth.ts"}}]},"timestamp":"2026-02-08T10:00:05Z","uuid":"def-456"}
```

#### Tag Store Schema (`_tags.json`)
```json
{
  "version": 1,
  "entries": {
    "projectSlug:sessionId": {
      "autoTags": [
        { "name": "code-generation", "category": "technical", "confidence": 0.9 }
      ],
      "manualTags": ["reviewed", "important"],
      "riskSummary": {
        "maxRisk": "high",
        "maxScore": 3,
        "totalToolUses": 42,
        "criticalCount": 0,
        "highCount": 5,
        "mediumCount": 30,
        "lowCount": 7,
        "topRisks": ["External: curl", "MCP: filesystem"]
      },
      "computedAt": "2026-02-08T10:00:00Z",
      "fileMtime": 1707350400000
    }
  }
}
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend Framework | React 18 | Component model, ecosystem, team expertise |
| Build Tool | Vite 5 | Fast HMR, ESM-native, minimal config |
| State Management | TanStack React Query v5 | Server state caching, auto-refetch, stale-while-revalidate |
| Styling | Tailwind CSS 3 | Utility-first, consistent design tokens, dark mode |
| Icons | Lucide React | Consistent icon set, tree-shakeable |
| Code Editor | Monaco Editor | Full-featured editor for config/markdown editing |
| Backend Runtime | Node.js + tsx | TypeScript execution without build step in dev |
| HTTP Framework | Express.js 4 | Mature, middleware ecosystem, simple routing |
| Data Format | JSONL (sessions) + JSON (tags) | Native Claude Code format, human-readable, no DB dependency |

### Security Considerations

- **Local-first**: All data stays on the user's machine. No external API calls for core functionality.
- **No credential storage**: API keys for AI providers are stored in provider config, never in conversation data.
- **Atomic writes**: Tag store uses tmp file + rename pattern to prevent corruption.
- **Input validation**: Manual tag input limited to 50 characters, sanitized to lowercase.
- **No authentication** (v1.0): Single-user local tool. Multi-user auth planned for v1.3.

---

## 7. Success Metrics

### v1.0 Launch Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Sessions discovered | 100% of local Claude Code sessions | Compare discovered vs. actual JSONL files |
| Risk scoring accuracy | < 5% false positive rate on critical/high | Manual review of 100 scored sessions |
| Auto-tag relevance | > 70% of auto-tags rated "useful" by users | User feedback survey |
| Initial load time | < 5 seconds for 300+ sessions | Performance timing |
| Incremental refresh | < 500ms | Performance timing |
| GitHub stars (30 days) | 100+ | GitHub analytics |

### Long-term North Star Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Monthly Active Users | 10,000 | 12 months |
| Enterprise pilots | 5 organizations | 6 months |
| Conversations governed | 1M+ sessions | 12 months |
| Provider integrations | 5+ AI providers | 9 months |
| Compliance certifications achieved by users | 10 SOC2/ISO audits citing JubitMind | 18 months |

---

## 8. Competitive Landscape

| Product | Focus | Gap JubitMind Fills |
|---------|-------|-------------------|
| ChatGPT history | Single provider, no risk scoring | Multi-provider, risk + tags |
| Claude.ai projects | Single provider, no local CLI sessions | Aggregates CLI + web |
| LangSmith | LLM observability for production apps | Not for developer interaction audit |
| Langfuse | Open-source LLM tracing | Production-focused, not conversation governance |
| PromptLayer | Prompt management for apps | Not for human-AI conversation audit |
| Humanloop | LLM eval & monitoring | Focused on model performance, not human safety |

**JubitMind's unique position**: The only platform focused on **human-side AI interaction governance** - protecting the human, not optimizing the model.

---

## 9. Open Questions & Decisions

| Question | Options | Decision | Date |
|----------|---------|----------|------|
| Database for v1.1+ | SQLite / PostgreSQL / DuckDB | TBD | - |
| Cloud hosting model | Self-hosted / SaaS / Hybrid | TBD | - |
| Pricing model | Free open-source + paid cloud | TBD | - |
| PII detection approach | Regex / Presidio / Custom ML | TBD | - |
| Embedding model for similarity | Local (Ollama) / API (OpenAI) | TBD | - |

---

## 10. Appendix

### A. Glossary

| Term | Definition |
|------|-----------|
| **Session** | A single conversation between a human and an AI system, stored as a JSONL file |
| **Tool use** | An action taken by the AI (e.g., reading a file, running a command, writing code) |
| **Risk score** | A 1-4 numerical rating of how dangerous/impactful a tool use is |
| **Auto-tag** | A tag automatically assigned by the classification engine based on content analysis |
| **Manual tag** | A tag manually added by the user for custom categorization |
| **Project slug** | The encoded directory name representing a project in `~/.claude/projects/` |
| **Tag store** | The persistent JSON file storing risk scores and tags for all sessions |

### B. User Stories

1. **As a developer**, I want to see all my Claude Code conversations from every project in one place, so I can find past solutions without remembering which project I was in.

2. **As a developer**, I want to see risk badges on each session, so I can quickly identify conversations where destructive operations occurred.

3. **As a security engineer**, I want to filter sessions by critical risk level, so I can audit high-risk AI-assisted operations.

4. **As a team lead**, I want to tag conversations by topic (e.g., "auth-refactor", "prod-incident"), so I can organize AI-assisted work by initiative.

5. **As a compliance officer**, I want to export conversation records with risk scores and tags, so I can include them in audit evidence packages.

6. **As a prompt engineer**, I want to search across all conversations for specific techniques, so I can build a prompt library from real usage.

7. **As a solo developer**, I want timestamped records of my AI interactions, so I can demonstrate that I directed the AI's creative output (IP attribution).

8. **As a privacy-conscious user**, I want to identify conversations where personal data was discussed, so I can manage data exposure risk.
