# JubitMind - Marketing & Brand Guide

---

## 1. Brand Identity

### Name
**JubitMind** — /ˈdʒuː.bɪt.maɪnd/

### Brand Family
| Brand | Meaning | Role |
|-------|---------|------|
| **dseek** | data seek · defence seek · deep seek | Parent ecosystem brand |
| **jubit** | judgement + bit · jupiter | Intelligence & decision-making brand |
| **JubitMind** | jubit + mind | AI interaction governance product |

### Tagline (Primary)
> **Human judgement meets AI mind. Every interaction, valued.**

### Tagline Variants
| Context | Tagline |
|---------|---------|
| Hero / Landing | *Every AI conversation tells a story. JubitMind makes sure it's told right.* |
| Developer focus | *Your AI sessions, scored, tagged, and governed — automatically.* |
| Enterprise pitch | *AI governance that starts where the conversation happens.* |
| Security angle | *See everything your AI tools do. Score every risk. Tag every action.* |
| Philosophy | *We value the finest humanity and the working with AI brains for better life.* |
| Shortform | *Govern your AI. Value your mind.* |

### Brand Voice
- **Authoritative but accessible**: We know AI governance deeply, but explain it simply
- **Human-first**: Always lead with the human, not the technology
- **Protective**: We guard, we audit, we preserve — never surveil
- **Direct**: No buzzword soup. Say what it does, why it matters
- **Inclusive**: Every person working with AI deserves this, not just enterprises

### Color Palette (Dark Mode First)

| Role | Color | Hex | Usage |
|------|-------|-----|-------|
| Primary | Teal | `#2DD4BF` | Accent, CTAs, active states |
| Critical Risk | Red | `#F87171` | Critical risk badges, alerts |
| High Risk | Orange | `#FB923C` | High risk indicators |
| Medium Risk | Yellow | `#FACC15` | Medium risk indicators |
| Low Risk | Green | `#4ADE80` | Low risk, safe indicators |
| Technical Tag | Blue | `#60A5FA` | Technical category tags |
| Sensitivity Tag | Red | `#F87171` | Sensitivity category tags |
| Operational Tag | Purple | `#C084FC` | Operational category tags |
| Manual Tag | Teal | `#5EEAD4` | User-defined tags |
| Background | Dark Gray | `#0F172A` | Primary background |
| Surface | Slate | `#1E293B` | Cards, panels |
| Text Primary | White | `#F8FAFC` | Headlines, body text |
| Text Muted | Gray | `#94A3B8` | Secondary text, timestamps |

---

## 2. Positioning

### One-Liner
JubitMind is an open-source AI interaction audit platform that automatically scores risk, classifies content, and governs every human-AI conversation across all your tools.

### Elevator Pitch (30 seconds)
Every developer using AI tools generates hundreds of conversations a month — code generation, debugging, architecture decisions, system commands. Some of those conversations touch credentials. Some execute destructive commands. Some create valuable intellectual property. But nobody tracks any of it.

JubitMind changes that. It discovers all your AI conversations, scores every tool action by risk level, auto-classifies content, and gives you a single dashboard to audit, tag, and govern your human-AI collaboration. Think of it as the audit trail your AI usage has been missing.

### Positioning Statement
**For** developers, engineering teams, and security professionals **who** use AI coding assistants daily, **JubitMind** is an AI interaction governance platform **that** automatically discovers, risk-scores, and classifies every human-AI conversation. **Unlike** basic chat history viewers or LLM observability tools, JubitMind focuses on **protecting the human side** — tracking what was shared, what risks were taken, and what value was created in the collaboration between human judgement and AI minds.

### Category
**AI Interaction Governance** (new category)

Adjacent categories: AI Safety, LLM Observability, Developer Tooling, GRC (Governance Risk Compliance)

---

## 3. Target Audiences & Messaging

### Audience 1: Individual Developers

**Pain**: "I know I solved this problem with Claude last week, but I can't find the conversation. Also, did I accidentally paste my API keys?"

**Message**: *Find any prompt. Score every risk. Never lose a conversation again.*

**Key Features**:
- All conversations from all IDEs in one place
- Search across every session you've ever had
- Risk badges show you at a glance if anything dangerous happened
- Auto-tags organize conversations by what you were doing
- Export any session as JSON for your records

**CTA**: *Start governing your AI conversations in 60 seconds. `npm install && npm run dev`*

### Audience 2: Engineering Teams & Managers

**Pain**: "I have no idea what AI tools are doing across my team. Are they pushing code directly? Running destructive commands? Sharing proprietary code?"

**Message**: *See what every AI assistant does across your team. Risk-scored, classified, auditable.*

**Key Features**:
- Multi-project aggregation across all team members' workstations
- Risk scoring surfaces critical and high-risk operations automatically
- Auto-classification tags conversations by domain (security, devops, architecture)
- Filter by risk level to focus security reviews
- Manual tagging for incident tracking and project organization

**CTA**: *Deploy JubitMind for your team. Know what AI is doing.*

### Audience 3: Security & Compliance Professionals

**Pain**: "Our SOC2 auditor asked how we govern AI tool usage. We had nothing to show them."

**Message**: *The audit trail your AI governance policy needs. Risk-scored, tagged, exportable.*

**Key Features**:
- Every AI tool action classified: Critical / High / Medium / Low
- Automatic detection of credential exposure, destructive commands, data exfiltration patterns
- Sensitivity tags flag security, privacy, legal, and IP-related conversations
- Export conversation records with risk assessments for compliance evidence
- Immutable conversation history from native JSONL logs

**CTA**: *Add AI governance to your compliance story. Open-source, self-hosted, auditor-ready.*

### Audience 4: AI Researchers & Prompt Engineers

**Pain**: "I've crafted thousands of prompts across dozens of sessions. I need to find patterns, track what works, and build a reusable library."

**Message**: *Your prompt laboratory. Every interaction recorded, classified, and searchable.*

**Key Features**:
- Rich message rendering with full tool_use visibility
- Auto-tags identify conversation types (code-generation, debugging, architecture)
- Manual tags for custom categorization and methodology tracking
- Full session export for external analysis
- Cross-project search to find prompt patterns

**CTA**: *Turn your AI conversations into a knowledge base.*

---

## 4. Feature Highlights

### Highlight 1: Risk Scoring Engine

**Headline**: *Every AI action, scored by risk. Instantly.*

**Copy**: When Claude runs `rm -rf`, that's a critical risk. When it `git push`es to production, that's high. When it reads a file, that's low. JubitMind scores every single tool action in every conversation, giving you instant visibility into what happened and how dangerous it was.

**Visual**: Session card with red CRITICAL badge, showing `rm -rf /var/data` in an expandable tool_use block with red left border.

**Stats callout**:
- 4 risk levels: Critical, High, Medium, Low
- 30+ risk patterns detected automatically
- Session-level summary: total tool uses, risk distribution, top risks

---

### Highlight 2: Auto-Classification Tags

**Headline**: *Your conversations, classified. Without lifting a finger.*

**Copy**: JubitMind scans every conversation and automatically tags it by what you were doing. Code generation. Debugging. Architecture design. Security work. Privacy-sensitive discussions. IP creation. All classified, all filterable, all organized.

**Visual**: TagManager panel showing auto-tags grouped by category (blue for technical, red for sensitivity, purple for operational) plus user-added teal manual tags.

**Tag categories**:
- Technical: code-generation, debugging, architecture, devops, testing, refactoring
- Sensitivity: security, privacy, ip-creation, legal, safety
- Operational: file-modification, system-command, external-api, data-access

---

### Highlight 3: Multi-Source Aggregation

**Headline**: *One dashboard. Every AI conversation. Every project. Every IDE.*

**Copy**: Whether you're in VS Code, Cursor, Antigravity, or raw terminal — JubitMind finds every Claude Code session automatically. Nine projects, 300 sessions, 3GB of conversation data? Loaded in under 5 seconds. Refreshed every 10 seconds. Zero configuration.

**Visual**: Session list showing sessions from different projects with purple project badges (JubitLLMNPMPlayground, dseek-web, ccass-analysis, etc.)

---

### Highlight 4: Rich Message Rendering

**Headline**: *See exactly what your AI did. Every tool call. Every command. Every file change.*

**Copy**: JubitMind doesn't just show you text messages. It renders every tool_use block with risk-colored borders, expandable input/output, thinking blocks you can peek into, and tool results. You see the full picture of what happened in every conversation.

**Visual**: Message thread showing a Bash tool_use block (orange/high risk) with `git push origin main`, an Edit tool_use (yellow/medium) modifying source code, and a Read tool_use (green/low) with file content.

---

## 5. Landing Page Structure

### Hero Section
```
[Logo: JubitMind]

Human judgement meets AI mind.
Every interaction, valued.

The open-source AI interaction audit platform.
Risk-score, classify, and govern every human-AI conversation.

[Get Started →]  [View on GitHub →]

[Hero Screenshot: Dashboard showing sessions with risk badges and tag filters]
```

### Problem Section
```
You use AI every day.
But do you know what it's doing?

[Icon: Terminal]               [Icon: Shield]              [Icon: Tag]
Scattered across IDEs          Zero risk visibility         No classification
Your conversations live in     Which sessions touched        Is it code generation?
5 different tools. Good luck   credentials? Ran destructive  Security work? IP creation?
finding that one prompt.       commands? You don't know.     Nobody tracks this.
```

### Solution Section
```
JubitMind: Your AI governance layer.

[Screenshot: Full dashboard with session list, risk badges, tag filters, TagManager panel]

→ Auto-discovers all AI sessions across projects and IDEs
→ Risk-scores every tool action (Critical / High / Medium / Low)
→ Auto-classifies conversations (Technical / Sensitivity / Operational)
→ Filters by risk level, tags, project, and source
→ Rich tool_use rendering with expandable input/output
→ Manual tagging for custom organization
→ Export for compliance evidence
```

### Features Grid
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Risk Scoring     │  │ Auto-Tags        │  │ Multi-Source      │
│                  │  │                  │  │                  │
│ 4 risk levels    │  │ 3 categories     │  │ All IDEs         │
│ 30+ patterns     │  │ 12+ auto-tags    │  │ All projects     │
│ Real-time        │  │ Confidence-based │  │ Auto-discovery   │
└──────────────────┘  └──────────────────┘  └──────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Rich Rendering   │  │ Manual Tags      │  │ Export & Import  │
│                  │  │                  │  │                  │
│ tool_use blocks  │  │ Custom labels    │  │ JSON export      │
│ thinking blocks  │  │ Per-session      │  │ Compliance-ready │
│ risk-colored     │  │ Filterable       │  │ Portable         │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Social Proof Section (Post-Launch)
```
Trusted by developers who take AI governance seriously.

[Testimonial cards]
[GitHub stars badge]
[Usage stats: X sessions governed, Y risks detected]
```

### CTA Section
```
Start governing your AI conversations.
Open-source. Self-hosted. Free.

npm install && npm run dev

[Get Started →]  [Read the Docs →]  [Star on GitHub →]

Part of the dseek · jubit ecosystem
```

---

## 6. Social Media & Launch Copy

### GitHub Repository Description
> JubitMind - AI Interaction Audit & Governance Platform. Risk-score, classify, and govern every human-AI conversation. Open-source.

### GitHub Topics
`ai-governance` `ai-safety` `llm-audit` `claude-code` `ai-tools` `risk-scoring` `conversation-history` `developer-tools` `compliance` `ai-ethics`

### Twitter/X Launch Thread

**Tweet 1 (Hook)**:
> Every developer using AI generates 100+ conversations/month.
>
> Nobody tracks what happens in them.
>
> Introducing JubitMind — the AI interaction audit platform.
>
> Open-source. Self-hosted. Free.
>
> [screenshot]

**Tweet 2 (Risk)**:
> Your AI assistant ran `rm -rf` last Tuesday.
> It `git push --force`d to main on Wednesday.
> It read your `.env` file on Thursday.
>
> Did you know?
>
> JubitMind scores every tool action by risk:
> Critical → High → Medium → Low
>
> [screenshot of risk badges]

**Tweet 3 (Tags)**:
> JubitMind auto-classifies every conversation:
>
> Technical: code-generation, debugging, architecture
> Sensitivity: security, privacy, ip-creation, legal
> Operational: file-modification, system-command
>
> No configuration. No ML training. Works out of the box.

**Tweet 4 (Multi-source)**:
> VS Code? Cursor? Terminal? Antigravity?
>
> JubitMind discovers ALL your Claude Code sessions.
> Every project. Every IDE. One dashboard.
>
> 300+ sessions, 3GB of data → loaded in 5 seconds.

**Tweet 5 (Philosophy + CTA)**:
> We value the finest humanity and the working with AI brains for better life.
>
> Every prompt you write. Every decision you make. Every solution you co-create.
> These are records of human intelligence amplified by AI.
>
> JubitMind helps you value that.
>
> github.com/M1zwell/jubitmind

### Hacker News Post

**Title**: Show HN: JubitMind – Open-source AI interaction audit and governance platform

**Body**:
> Hey HN,
>
> I built JubitMind because I realized I had 300+ Claude Code conversations across 9 projects and zero visibility into what happened in them.
>
> JubitMind is a self-hosted platform that:
>
> - Auto-discovers all Claude Code sessions across all projects and IDEs
> - Risk-scores every tool action (rm -rf = critical, git push = high, Read = low)
> - Auto-classifies conversations (code-generation, security, ip-creation, etc.)
> - Lets you filter by risk level, tags, project, and search
> - Renders tool_use blocks with risk-colored borders and expandable I/O
>
> It's a React + Express app that reads Claude Code's native JSONL session files. No database, no cloud, no accounts. Everything stays on your machine.
>
> The bigger vision: as we collaborate more with AI, we need governance for the human side — tracking what was shared, what risks were taken, and what value was created. Not just LLM observability for production apps, but interaction audit for the humans using AI every day.
>
> Stack: React 18, Vite, TanStack Query, Tailwind, Express, TypeScript.
>
> GitHub: https://github.com/M1zwell/jubitmind
>
> Would love feedback on the risk taxonomy and auto-tagging approach. What patterns should we detect? What categories are missing?

### Product Hunt

**Tagline**: Human judgement meets AI mind. Every interaction, valued.

**Description**: JubitMind is an open-source AI interaction audit platform that automatically discovers, risk-scores, and classifies every human-AI conversation across your development tools. See everything your AI assistant does — scored by risk, tagged by category, governed by you.

**Categories**: Developer Tools, AI, Open Source, Security

---

## 7. Content Marketing Roadmap

### Blog Posts (First 90 Days)

| Week | Title | Audience |
|------|-------|----------|
| Launch | *Why Every Developer Needs an AI Audit Trail* | Developers |
| 2 | *The Risk Taxonomy: How We Score AI Tool Actions* | Security |
| 4 | *Building an AI Governance Culture in Your Engineering Team* | Managers |
| 6 | *From Chat History to Knowledge Asset: The JubitMind Philosophy* | General |
| 8 | *SOC2 and AI: How to Answer "How Do You Govern AI Usage?"* | Compliance |
| 10 | *The State of AI Interaction Governance (2026 Report)* | Industry |
| 12 | *JubitMind v1.1: Multi-Provider Support and What's Next* | Product |

### Documentation Pages

| Page | Purpose |
|------|---------|
| Getting Started | 60-second quickstart guide |
| Risk Scoring Guide | Full pattern list, scoring rationale, customization |
| Auto-Tag Reference | All tags, categories, detection rules, confidence thresholds |
| API Reference | All REST endpoints with examples |
| Architecture Guide | System design, data flow, extension points |
| Self-Hosting Guide | Deployment options (Docker, PM2, systemd) |
| Contributing Guide | How to add risk patterns, tags, and data source adapters |
| Security & Privacy | Data handling, local-first architecture, threat model |

---

## 8. Competitive Messaging

### vs. "Just use ChatGPT/Claude history"
> Chat history shows you *what was said*. JubitMind shows you *what was done* — every file read, every command executed, every risk taken. Scored, classified, and auditable.

### vs. LangSmith / Langfuse
> LLM observability tools monitor your *production AI applications*. JubitMind governs your *human-AI development conversations*. Different problem. Different solution.

### vs. "We have a company AI policy"
> A policy says "don't paste credentials into AI." JubitMind *detects when someone does*. A policy says "review destructive operations." JubitMind *scores them automatically*.

### vs. "We'll build it internally"
> You could. Or you could start governing AI interactions today with an open-source tool that reads your existing session files with zero configuration. Ship your product instead.

---

## 9. Metrics & KPIs

### Awareness Metrics
| Metric | 30-Day Target | 90-Day Target |
|--------|---------------|---------------|
| GitHub Stars | 100 | 500 |
| GitHub Forks | 10 | 50 |
| HN Points | 100+ | - |
| Twitter Impressions | 50K | 200K |

### Adoption Metrics
| Metric | 30-Day Target | 90-Day Target |
|--------|---------------|---------------|
| npm installs | 200 | 1,000 |
| Active instances (self-reported) | 50 | 200 |
| GitHub Issues opened | 20 | 100 |
| Contributors | 3 | 10 |

### Engagement Metrics
| Metric | Target |
|--------|--------|
| Avg sessions governed per user | 50+ |
| Risk scores computed per user | 100+ |
| Manual tags added per user | 10+ |
| Return usage (7-day) | 60%+ |

---

*JubitMind — Part of the dseek · jubit ecosystem*
*We value the finest humanity and the working with AI brains for better life.*
