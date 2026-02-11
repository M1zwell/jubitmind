# JubitMind + LangExtract Integration Plan

> Deep research, critical review, and implementation roadmap for integrating Google's LangExtract
> into JubitMind as a local-first, open-source AI interaction audit platform.

**Date**: 2026-02-11
**Status**: Research Complete, Implementation Planned

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [LangExtract Technical Deep Dive](#langextract-technical-deep-dive)
3. [Critical Compatibility Review](#critical-compatibility-review)
4. [Competitive Landscape](#competitive-landscape)
5. [Architecture Design](#architecture-design)
6. [Extraction Schema Design](#extraction-schema-design)
7. [Desktop Packaging Strategy](#desktop-packaging-strategy)
8. [UX Design for Extraction](#ux-design-for-extraction)
9. [Performance & Cost Analysis](#performance--cost-analysis)
10. [Implementation Roadmap](#implementation-roadmap)
11. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### The Opportunity

**No tool exists** that extracts structured intelligence from AI conversations locally, privately, across multiple AI tools, without SDK integration or cloud dependency.

- **LangSmith, Langfuse, Helicone, Braintrust, Portkey, OpenLIT, Arize Phoenix** -- all focus on API-level tracing (latency, tokens, cost). None extract *what was actually discussed, decided, or created*.
- **LangExtract** provides structured extraction with source grounding but has no UI, no multi-tool support, and requires Python scripting.
- **JubitMind** already ingests 75K+ interactions from 11 AI tools, has risk scoring, classification, and a full dashboard -- but lacks semantic extraction.

**The combination creates a new category**: local-first AI interaction audit with structured entity extraction.

### Verdict: Strong Match with Manageable Friction

| Dimension | Assessment |
|-----------|-----------|
| **Complementary strengths** | Perfect -- zero functional overlap |
| **Data pipeline fit** | Natural -- JubitMind has the text, LangExtract needs text |
| **Philosophy alignment** | Strong -- both prioritize transparency and traceability |
| **LLM flexibility** | Matched -- both support Gemini, OpenAI, Ollama |
| **Runtime mismatch** | Real friction -- Node.js + Python requires sidecar architecture |
| **Cost for local use** | Manageable -- Ollama makes it free; cloud models are optional turbo |
| **Extraction latency** | Requires UX design -- 30-60s per session, not instant |

---

## LangExtract Technical Deep Dive

### Key Facts

| Attribute | Value |
|-----------|-------|
| Version | v1.1.1 (Nov 27, 2025) |
| License | Apache 2.0 |
| Python | >= 3.10 |
| GitHub Stars | ~28.8k |
| Author | Akshay Goel @ Google (not officially supported by Google) |
| Default Model | `gemini-2.5-flash` |
| Output | JSONL with character-level source positions + interactive HTML |

### Core API

```python
import langextract as lx

result = lx.extract(
    text_or_documents="...",           # str, URL, Document, or iterable
    prompt_description="...",          # Natural language extraction instructions
    examples=[...],                    # Few-shot ExampleData objects
    model_id="gemini-2.5-flash",       # LLM model
    max_char_buffer=2000,              # Characters per chunk
    max_workers=10,                    # Parallel threads
    extraction_passes=2,              # Higher = better recall
    model_url="http://localhost:11434" # For Ollama
)
```

### Five-Phase Pipeline

```
1. Pre-flight Validation → Validate few-shot examples align to source text
2. Model Resolution     → Route to correct LLM provider (Gemini/OpenAI/Ollama)
3. Prompt Generation    → Build structured prompts from description + examples
4. LLM Inference        → Chunk text, batch process with parallel workers
5. Resolution           → Parse outputs, ground to exact character positions
```

### Supported LLM Providers

| Provider | Pattern | Package | Schema Enforcement |
|----------|---------|---------|-------------------|
| Google Gemini | `^gemini` | `google-genai` (always installed) | Full controlled generation |
| OpenAI | `^gpt-` | `openai` (optional) | Requires `fence_output=True` |
| Ollama | Catch-all fallback | None (HTTP) | None (prompt-based) |
| Custom | Plugin system | Entry points | Provider-dependent |

### Performance Benchmarks (NVIDIA 10-K, 148K chars)

| Metric | Value |
|--------|-------|
| Processing time | 45 seconds (Gemini Flash) |
| Cost per document | $0.027 |
| Extraction yield | 287 entities across 6 types |
| Precision | 96% |
| Recall (2 passes) | ~93% |
| Throughput | ~800 documents/hour |

### Known Limitations

| Issue | Impact | Mitigation |
|-------|--------|-----------|
| Fuzzy alignment hangs on >10K char examples | High | Break large examples into smaller documents |
| CJK character interval accuracy (v1.1.1) | Medium | JubitMind sessions are mostly English code |
| OpenAI can't use schema constraints | Low | Use Gemini or Ollama as default |
| No cross-compilation for PyInstaller | Medium | CI/CD matrix builds per platform |
| Text-only input (no PDF/images) | None | JubitMind sessions are already text (JSONL) |
| Not officially supported by Google | Low | Apache 2.0 license, active development |

---

## Critical Compatibility Review

### Where They're a Perfect Match

**1. Zero Functional Overlap**

LangExtract does structured extraction. JubitMind does multi-tool ingestion, visualization, risk scoring, and auditing. Neither does what the other does. This isn't a "nice to have" integration -- it's genuinely complementary.

**2. Natural Data Pipeline**

```
JubitMind (already has)          LangExtract (needs)
─────────────────────           ──────────────────
75K+ interaction blocks    →    text_or_documents parameter
JSONL session files        →    Document objects
Message content strings    →    Raw text for extraction
```

No data transformation needed. JubitMind's existing `interaction-index.ts` already has every message as a text string with metadata. Feed it directly to `lx.extract()`.

**3. Shared Multi-LLM Philosophy**

Both tools support Gemini, OpenAI, and Ollama. JubitMind's existing LiteLLM proxy can route extraction requests. No provider lock-in on either side.

**4. Source Grounding = Audit Trail**

LangExtract's killer feature is `char_interval` -- every extraction maps back to exact character positions in the source text. For an audit platform, this is exactly what you need: "The AI recommended deleting this file at characters 1234-1289 of message #7."

### Where There's Real Friction

**1. Runtime Mismatch (Node.js + Python)**

This is the biggest engineering challenge. Two runtimes mean:
- Process boundary communication (HTTP between Node server and FastAPI sidecar)
- Error propagation across process boundaries
- Health monitoring for both processes
- Startup sequencing (Node first, then Python sidecar)
- Graceful shutdown of both processes

**Mitigation**: FastAPI sidecar with clean REST API. Node server spawns Python process on startup, monitors health via `/health` endpoint, kills on shutdown. This pattern is well-established (VS Code does it with language servers).

**2. Cost for Local Users**

Processing 209 sessions (75K interactions) through a cloud LLM would cost real money:

| Provider | Model | Est. Cost (75K interactions) |
|----------|-------|------------------------------|
| Gemini | gemini-2.5-flash | ~$2-5 |
| OpenAI | gpt-4o-mini | ~$5-15 |
| Ollama | gemma2:2b | $0 (local) |
| Ollama | llama3.2:3b | $0 (local) |

**Mitigation**: Make Ollama the default. Cloud models are "turbo mode" for users who want higher quality and are willing to pay. The UI should make this choice clear and prominent.

**3. Extraction Latency**

LangExtract processes text in chunks (default 1000 chars) with multiple passes. A single session message (avg ~2000 chars) takes 2-5 seconds with Gemini Flash, 5-15 seconds with Ollama.

A full session (200+ messages) could take 5-15 minutes with Ollama.

**Mitigation**:
- Background processing with progress indicators
- Incremental results (show extractions as they complete)
- Cache aggressively -- extract once, query forever
- Prioritize: extract on-demand per session first, batch later
- Allow users to select which sessions/messages to extract

**4. Extraction Quality Variance**

Small local models (gemma2:2b) produce significantly lower quality extractions than cloud models (gemini-2.5-flash). The few-shot examples must be carefully crafted for AI conversation patterns (code blocks, tool outputs, thinking blocks, mixed languages).

**Mitigation**: Ship pre-built extraction templates with high-quality few-shot examples specifically designed for AI coding conversations. Test against real JubitMind sessions. Provide quality comparison between models in the UI.

### Verdict

**Strong match. The friction is engineering complexity, not fundamental incompatibility.** The PyInstaller sidecar pattern is proven (VS Code, JetBrains, and many Electron apps use Python sidecars). The cost issue is solved by Ollama-first design. The latency issue is solved by UX patterns (background processing, caching).

---

## Competitive Landscape

### The Gap Nobody Fills

| Tool | Type | Local? | Structured Extraction? | Multi-tool? |
|------|------|--------|----------------------|-------------|
| LangSmith | SaaS (Enterprise self-host) | Enterprise only | No | Yes |
| Langfuse | Open Source + Cloud | Yes (self-host) | No | Yes (OTEL) |
| Helicone | Open Source + Cloud | Yes (self-host) | No | Yes (gateway) |
| Braintrust | SaaS (hybrid) | No (hybrid) | No | Yes |
| Portkey | Gateway + SaaS | Gateway only | No | Yes (1600+) |
| OpenLIT | Open Source | Yes | No | Yes (50+) |
| Arize Phoenix | Open Source + Cloud | Yes | No | Yes (OTEL) |
| **JubitMind + LangExtract** | **Open Source** | **Yes (local-first)** | **Yes** | **Yes (11 tools)** |

### What Competitors Do vs. What's Missing

**What they DO:**
- Trace LLM API calls (latency, tokens, cost)
- Monitor production LLM applications
- Evaluate LLM outputs (hallucination, quality)
- Route requests across providers (gateway)
- Version and manage prompts

**What they DO NOT do (and JubitMind + LangExtract will):**
- Extract structured data from actual conversation content
- Audit what an AI actually said and decided
- Work across AI coding tools at the conversation level
- Provide offline-first conversation analysis
- Create a searchable audit trail at the semantic level

### Positioning Statement

> **JubitMind + LangExtract: The only tool that extracts structured intelligence from your AI conversations -- locally, privately, across any AI tool -- without SDK integration or cloud dependency.**
>
> While LangSmith, Langfuse, and Helicone tell you *that* an LLM call happened, JubitMind tells you *what was actually discussed, decided, and created*.

### Five Key Differentiators

1. **Post-hoc analysis** -- works on conversations that already happened, no pre-instrumentation
2. **Semantic-level auditing** -- extracts meaning, not just metrics
3. **True offline/local** -- no cloud, no proxy, no account required
4. **Multi-tool coverage** -- Claude Code, Cursor, VS Code, and 8 more
5. **Developer workflow native** -- designed for AI-assisted development sessions

---

## Architecture Design

### System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   JubitMind Desktop App                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Tauri / Electron Shell                     │  │
│  │                                                        │  │
│  │  ┌─────────────────┐    ┌───────────────────────────┐  │  │
│  │  │   React 18 UI   │    │     Node.js Server        │  │  │
│  │  │   (Vite 5)      │◄──►│     (Express 4)           │  │  │
│  │  │                 │    │                           │  │  │
│  │  │  - Explorer     │    │  - Session Ingestion      │  │  │
│  │  │  - Insights     │    │  - Risk Scoring           │  │  │
│  │  │  - Extraction   │    │  - Classification         │  │  │
│  │  │    Templates    │    │  - Interaction Index      │  │  │
│  │  │  - Audit Trail  │    │  - Extraction Proxy       │  │  │
│  │  └─────────────────┘    └────────────┬──────────────┘  │  │
│  └──────────────────────────────────────┼─────────────────┘  │
│                                         │ HTTP (localhost)    │
│  ┌──────────────────────────────────────▼─────────────────┐  │
│  │          LangExtract Sidecar (FastAPI)                  │  │
│  │                                                        │  │
│  │  ┌──────────────────┐    ┌──────────────────────────┐  │  │
│  │  │  FastAPI Bridge   │    │   LangExtract Core       │  │  │
│  │  │  REST API         │    │   v1.1.1                 │  │  │
│  │  │                   │    │                          │  │  │
│  │  │  POST /extract    │    │   - Prompt Generation    │  │  │
│  │  │  POST /batch      │    │   - Chunked Inference    │  │  │
│  │  │  GET  /templates  │    │   - Source Resolution    │  │  │
│  │  │  GET  /health     │    │   - Character Alignment  │  │  │
│  │  └──────────────────┘    └──────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                         │                     │
│  ┌──────────────────────────────────────▼─────────────────┐  │
│  │          LLM Provider (configurable)                    │  │
│  │                                                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐ │  │
│  │  │  Ollama   │  │  Gemini  │  │  OpenAI / Custom    │ │  │
│  │  │  (local)  │  │  (cloud) │  │  (cloud)            │ │  │
│  │  │  DEFAULT  │  │  turbo   │  │  turbo              │ │  │
│  │  └──────────┘  └──────────┘  └──────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### FastAPI Sidecar API Design

```
POST /api/extract
  Body: { text, prompt_description, examples, model_id, model_url, extraction_passes }
  Response: { document_id, extractions: [{ class, text, char_interval, attributes }] }

POST /api/extract/batch
  Body: { documents: [{ id, text }], template_id, model_id }
  Response: SSE stream of { document_id, extractions, progress }

GET /api/templates
  Response: [{ id, name, description, extraction_classes, examples }]

POST /api/templates
  Body: { name, description, extraction_classes, examples }
  Response: { id, created_at }

GET /api/models
  Response: [{ id, provider, available, recommended }]

GET /api/health
  Response: { status, version, ollama_available, models_loaded }
```

### Data Flow

```
User clicks "Extract" on a session
         │
         ▼
Node server reads session messages from cache
         │
         ▼
Node sends POST /api/extract to FastAPI sidecar
         │
         ▼
FastAPI calls lx.extract() with pre-built template
         │
         ▼
LangExtract chunks text → sends to Ollama/Gemini
         │
         ▼
LLM returns structured extractions per chunk
         │
         ▼
LangExtract resolves character positions
         │
         ▼
FastAPI returns extractions to Node server
         │
         ▼
Node caches results + sends to React UI via API
         │
         ▼
React renders inline annotations in MessageThread
```

---

## Extraction Schema Design

### AI Interaction Audit Schemas

These schemas are specifically designed for AI coding conversations, not generic NLP:

#### 1. `permission-grant`

Detects when a user explicitly approves an AI tool execution.

```python
lx.data.Extraction(
    extraction_class="permission-grant",
    extraction_text="Yes, go ahead and delete those files",
    attributes={
        "action": "file_deletion",
        "tool": "Bash",
        "risk_level": "high",
        "explicit": "true"
    }
)
```

#### 2. `risk-event`

Detects dangerous commands, external API calls, or security-sensitive operations.

```python
lx.data.Extraction(
    extraction_class="risk-event",
    extraction_text="rm -rf /Users/dev/project/node_modules",
    attributes={
        "command_type": "destructive_delete",
        "risk_level": "critical",
        "tool": "Bash",
        "reversible": "false"
    }
)
```

#### 3. `intent-shift`

Detects when the conversation topic changes significantly.

```python
lx.data.Extraction(
    extraction_class="intent-shift",
    extraction_text="Actually, let's switch to working on the authentication system instead",
    attributes={
        "from_topic": "database_migration",
        "to_topic": "authentication",
        "trigger": "user_redirect"
    }
)
```

#### 4. `code-artifact`

Detects files created, modified, or discussed with their paths.

```python
lx.data.Extraction(
    extraction_class="code-artifact",
    extraction_text="Created src/components/LoginForm.tsx with email and password fields",
    attributes={
        "file_path": "src/components/LoginForm.tsx",
        "action": "created",
        "language": "typescript",
        "framework": "react"
    }
)
```

#### 5. `thinking-insight`

Detects key reasoning from model thinking blocks.

```python
lx.data.Extraction(
    extraction_class="thinking-insight",
    extraction_text="I need to check if the database connection is pooled before adding concurrent queries",
    attributes={
        "insight_type": "performance_consideration",
        "domain": "database",
        "actionable": "true"
    }
)
```

#### 6. `architecture-decision`

Detects system design decisions and trade-offs.

```python
lx.data.Extraction(
    extraction_class="architecture-decision",
    extraction_text="Using Redis for session storage instead of in-memory because we need horizontal scaling",
    attributes={
        "decision": "redis_session_storage",
        "alternative": "in_memory",
        "rationale": "horizontal_scaling",
        "components_affected": "auth,session"
    }
)
```

#### 7. `error-resolution`

Detects error diagnosis and fix patterns.

```python
lx.data.Extraction(
    extraction_class="error-resolution",
    extraction_text="The TypeError was caused by passing undefined to the map function. Fixed by adding a null check",
    attributes={
        "error_type": "TypeError",
        "root_cause": "undefined_passed_to_map",
        "fix": "null_check_added",
        "file": "src/utils/transform.ts"
    }
)
```

### Pre-Built Extraction Templates

| Template | Use Case | Schemas Used |
|----------|----------|-------------|
| **Security Audit** | Review sessions for dangerous operations | `permission-grant`, `risk-event` |
| **Code Review** | Understand what was built and changed | `code-artifact`, `architecture-decision` |
| **Cost Analysis** | Track model usage and decision patterns | `intent-shift`, `thinking-insight` |
| **Full Audit** | Comprehensive session analysis | All 7 schemas |
| **Error Postmortem** | Understand how errors were diagnosed | `error-resolution`, `code-artifact` |

---

## Desktop Packaging Strategy

### Recommended Approach: Electron (Phase 1) → Tauri (Phase 2)

#### Why Electron First

| Factor | Electron | Tauri |
|--------|----------|-------|
| Node.js server | Built-in (no sidecar needed) | Requires compiled Node.js sidecar |
| Python sidecar | `extraResources` + `child_process` | `externalBin` + shell plugin |
| Complexity | Medium (1 sidecar: Python) | High (2 sidecars: Node + Python) |
| Maturity | Battle-tested, huge ecosystem | Newer, growing ecosystem |
| Bundle size | ~180-250 MB with Python sidecar | ~100-200 MB with both sidecars |
| Dev experience | Hot reload for JS, rebuild for Python | Rebuild for both sidecars |
| JubitMind status | Already has Electron setup | Migration needed |

**JubitMind already has an `electron/` directory with working Electron builds.** Starting with Tauri would require rewriting the desktop shell from scratch while also solving the Node.js sidecar problem. Use what exists.

#### Phase 1: Electron + PyInstaller Sidecar

```
JubitMind.app (or .exe)
├── Electron runtime (~85 MB)
│   ├── Chromium
│   └── Node.js (runs Express server directly)
├── React UI (dist/client, ~5 MB)
├── Server code (dist/server, ~2 MB)
└── resources/
    └── langextract-sidecar/        (~30-80 MB)
        ├── langextract-server      (PyInstaller binary)
        └── templates/              (pre-built extraction templates)
```

**Total estimated size**: ~120-170 MB (comparable to VS Code)

**PyInstaller build for the sidecar:**

```bash
# Build FastAPI + LangExtract as standalone binary
pyinstaller --name langextract-server \
    --onedir \
    --hidden-import=uvicorn.logging \
    --hidden-import=uvicorn.protocols.http.auto \
    --collect-all fastapi \
    --collect-all langextract \
    --exclude-module tkinter \
    --exclude-module matplotlib \
    --strip \
    sidecar/main.py
```

**Important constraints:**
- PyInstaller does NOT cross-compile -- must build on each target platform
- Use `workers=1` for uvicorn (multi-worker unreliable in PyInstaller)
- Use `--onedir` mode (1-2s startup vs 5-20s for `--onefile`)

**CI/CD matrix for cross-platform builds:**

```yaml
strategy:
  matrix:
    include:
      - os: macos-14          # Apple Silicon
        target: aarch64-apple-darwin
      - os: macos-13          # Intel Mac
        target: x86_64-apple-darwin
      - os: windows-latest    # Windows x64
        target: x86_64-pc-windows-msvc
```

#### Phase 2: Tauri Migration (Future)

Benefits of eventual Tauri migration:
- App shell drops from ~85 MB to ~3-8 MB
- RAM usage drops from ~80-150 MB to ~20-50 MB
- Native look and feel on each platform
- But adds complexity: must also compile Node.js server as sidecar via `pkg` or Node SEA

**Decision**: Migrate to Tauri only when the product is stable and the engineering team can absorb the complexity. Not a v1 priority.

### Ollama Integration Strategy

**Ollama cannot be practically bundled** (745 MB+ with GPU libraries). Instead:

1. **Check if Ollama is running** at startup: `GET http://localhost:11434/api/version`
2. **If available**: Show available models via `GET /api/tags`, offer one-click extraction
3. **If not available**: Show a setup wizard:
   - "Install Ollama" button (links to ollama.com/download)
   - "Use cloud model instead" button (Gemini API key setup)
   - "Skip extraction" button (use JubitMind without LangExtract features)
4. **Model recommendation**: Suggest `gemma2:9b` or `llama3.2:3b` for extraction quality/speed balance
5. **Auto-pull**: Offer to download recommended model via `POST /api/pull` with progress bar

### Installer Strategy

| Platform | Format | Tool | Notes |
|----------|--------|------|-------|
| macOS | `.dmg` | electron-builder | Drag-to-Applications, auto-discover `~/.claude/` |
| Windows | `.exe` (NSIS) | electron-builder | Standard installer wizard |
| Both | Auto-update | electron-updater | Check for updates on launch |

### Code Signing

| Platform | Certificate | Cost | Result |
|----------|------------|------|--------|
| macOS | Developer ID Application | $99/year | No Gatekeeper warnings, notarized |
| Windows | OV Code Signing | ~$200-400/year | SmartScreen reputation builds over time |
| Windows | EV Code Signing | ~$400+/year | Immediate SmartScreen trust (hardware token required) |

---

## UX Design for Extraction

### Design Principles

1. **Zero-code first** -- no Python, no CLI, no JSONL files
2. **Progressive disclosure** -- simple by default, powerful when needed
3. **Inline, not separate** -- extractions appear in the conversation, not as separate HTML files
4. **Background processing** -- extract in the background, show results when ready

### Key UX Flows

#### Flow 1: One-Click Session Audit

```
1. User opens JubitMind → Sessions auto-loaded
2. User clicks "Audit" button on any session
3. System checks: Ollama running? → Yes → Uses default "Full Audit" template
4. Progress bar: "Extracting 47 messages... (23/47)"
5. Results appear inline in MessageThread:
   - Red highlights for risk-event
   - Blue highlights for architecture-decision
   - Green highlights for code-artifact
   - Yellow highlights for permission-grant
6. Summary card at top: "Found 12 risk events, 8 code artifacts, 3 architecture decisions"
7. User can export as PDF/MD (existing export feature)
```

#### Flow 2: Extraction Template Builder (Visual)

```
1. User clicks "Templates" in sidebar
2. Sees pre-built templates: Security Audit, Code Review, Cost Analysis, Full Audit
3. User clicks "Create Template"
4. Step 1: Name and describe the template
5. Step 2: Select extraction classes from palette (or create custom)
6. Step 3: Add few-shot examples:
   - Browse real session messages as example text
   - Highlight text spans and assign extraction classes
   - Add attributes via form fields
7. Step 4: Preview on a sample session
8. Save template → Available for all sessions
```

#### Flow 3: Extraction Explorer (New Page)

```
1. User navigates to "Extractions" page
2. Sees all cached extractions across all sessions
3. Filter by: extraction class, risk level, date range, model, tool
4. Group by: session, extraction class, file path
5. Click any extraction → Opens source session at exact position
6. Aggregate views:
   - "Top 10 risk events this week"
   - "Architecture decisions by project"
   - "Code artifacts by language"
```

### Inline Annotation Design

In the existing `MessageThread` component, extracted entities appear as:

```
┌─────────────────────────────────────────────────────────┐
│ Assistant Message                                        │
│                                                         │
│ I'll create the authentication module. Let me start by  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 risk-event                                       │ │
│ │ "rm -rf node_modules && npm install"                │ │
│ │ Risk: High | Tool: Bash | Reversible: Yes           │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Then I'll create the login component:                   │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟢 code-artifact                                    │ │
│ │ "src/components/LoginForm.tsx"                      │ │
│ │ Action: Created | Language: TypeScript | React       │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ I chose JWT over session cookies because...             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔵 architecture-decision                            │ │
│ │ "JWT over session cookies for stateless auth"       │ │
│ │ Rationale: Stateless | Alternative: Session cookies │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

Toggle extraction overlay on/off with a button in the message header.

---

## Performance & Cost Analysis

### Extraction Cost Estimates

For a typical JubitMind installation (209 sessions, 75K interactions):

| Scenario | Model | Time | Cost | Quality |
|----------|-------|------|------|---------|
| Full audit (all sessions) | Ollama gemma2:9b | ~4-8 hours | $0 | Good |
| Full audit (all sessions) | Gemini Flash | ~30-60 min | ~$2-5 | Excellent |
| Single session (200 msgs) | Ollama gemma2:9b | ~5-15 min | $0 | Good |
| Single session (200 msgs) | Gemini Flash | ~30-60 sec | ~$0.03 | Excellent |
| Quick scan (10 sessions) | Ollama llama3.2:3b | ~10-30 min | $0 | Moderate |

### Caching Strategy

Extract once, query forever:

```
extractions/
├── {session_id}/
│   ├── metadata.json       # Template used, model, timestamp, version
│   ├── extractions.jsonl   # All extractions with char_intervals
│   └── summary.json        # Aggregated counts by class
└── index.json              # Cross-session extraction index
```

- Never re-extract unless the user explicitly requests it
- Store extractions alongside session data
- Build in-memory index on startup (like existing `interaction-index.ts`)
- Invalidate cache only when: session data changes, template is modified, or user forces re-extraction

### Performance Optimization

| Technique | Impact |
|-----------|--------|
| Extract only user-selected sessions (not all) | Major -- reduces from hours to minutes |
| Use `extraction_passes=1` for Ollama (vs 2-3 for cloud) | 2-3x faster for local models |
| Increase `max_char_buffer` to 2000-3000 for coding sessions | Fewer API calls, maintains quality |
| Cache at message level, not just session level | Enables incremental extraction |
| Stream results via SSE as each message completes | Better perceived performance |

---

## Implementation Roadmap

### Phase 1: Python Sidecar Foundation (2-3 weeks)

**Goal**: Working FastAPI sidecar that can extract from a single session.

| Task | Priority | Effort |
|------|----------|--------|
| Create `sidecar/` directory with FastAPI app | P0 | 1 day |
| Implement `POST /extract` endpoint wrapping `lx.extract()` | P0 | 2 days |
| Implement `GET /health` with Ollama detection | P0 | 0.5 day |
| Build 3 pre-built extraction templates (Security, Code, Full) | P0 | 2 days |
| Add extraction proxy route in Node server (`/api/extraction/*`) | P0 | 1 day |
| Add sidecar process management (spawn, health check, kill) | P0 | 1 day |
| Add `GET /api/extraction/status` endpoint for sidecar health | P0 | 0.5 day |
| Test with real JubitMind sessions (Claude Code JSONL) | P0 | 2 days |
| PyInstaller build script + CI/CD for macOS + Windows | P1 | 2 days |

**Deliverable**: `npm run sidecar:start` launches FastAPI, Node server proxies requests.

### Phase 2: UI Integration (2-3 weeks)

**Goal**: Users can extract and view results from the JubitMind UI.

| Task | Priority | Effort |
|------|----------|--------|
| Add "Extract" button to session detail page | P0 | 1 day |
| Implement extraction progress indicator (SSE stream) | P0 | 1 day |
| Build inline annotation component for MessageThread | P0 | 3 days |
| Add extraction summary card to session header | P0 | 1 day |
| Add Ollama setup wizard (detect, install prompt, model pull) | P0 | 2 days |
| Add extraction toggle (show/hide annotations) | P1 | 0.5 day |
| Add extraction cache display (extracted date, model used) | P1 | 0.5 day |
| Create ExtractionExplorerPage (cross-session extraction view) | P1 | 3 days |
| Add extraction facets to existing Explorer page | P1 | 1 day |

**Deliverable**: Click "Extract" on any session, see inline annotations in 30-60 seconds.

### Phase 3: Template Builder + Batch Processing (2-3 weeks)

**Goal**: Users can create custom extraction templates and run batch extractions.

| Task | Priority | Effort |
|------|----------|--------|
| Build visual extraction template builder | P0 | 5 days |
| Implement `POST /extract/batch` with SSE progress | P0 | 2 days |
| Add batch extraction queue (background processing) | P0 | 2 days |
| Extraction results in Insights reports | P1 | 2 days |
| Export extractions as CSV/JSON | P1 | 1 day |
| Template sharing (export/import as JSON) | P2 | 1 day |

**Deliverable**: Create custom templates visually, batch extract across sessions.

### Phase 4: Desktop Packaging (1-2 weeks)

**Goal**: One-click installer for macOS and Windows with bundled sidecar.

| Task | Priority | Effort |
|------|----------|--------|
| PyInstaller binary for macOS (arm64 + x86_64) | P0 | 1 day |
| PyInstaller binary for Windows (x64) | P0 | 1 day |
| Electron builder config for sidecar bundling | P0 | 1 day |
| Auto-start sidecar on Electron launch | P0 | 1 day |
| macOS code signing + notarization | P1 | 1 day |
| Windows code signing | P1 | 1 day |
| Auto-update mechanism | P1 | 1 day |
| First-launch Ollama setup wizard | P0 | 1 day |

**Deliverable**: Download `.dmg` or `.exe`, install, launch, extract. No terminal needed.

### Phase 5: Community & Ecosystem (Ongoing)

| Task | Priority | Effort |
|------|----------|--------|
| Community extraction template repository | P2 | 3 days |
| Template marketplace in UI | P2 | 3 days |
| Tauri migration research spike | P2 | 2 days |
| llamafile bundling research (alternative to Ollama) | P2 | 1 day |

---

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| PyInstaller binary fails on some Windows configs | Medium | High | Test on Windows 10/11 clean installs; provide fallback `pip install` |
| Ollama extraction quality too low with small models | Medium | Medium | Default to gemma2:9b (not 2b); offer cloud turbo mode |
| LangExtract CJK char_interval bug affects mixed-language sessions | Low | Low | Most coding sessions are English; monitor issue #334 |
| FastAPI sidecar orphan processes on crash | Medium | Low | Process manager with PID file; cleanup on next launch |
| LangExtract breaking API changes in future versions | Low | Medium | Pin version in requirements.txt; abstract behind our own API |
| Code signing costs ($99 + $200-400/year) | Certain | Low | Budget for it; required for serious desktop distribution |

### Product Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Users don't understand "extraction" concept | Medium | High | One-click "Audit" flow with sensible defaults; no jargon in UI |
| Extraction too slow for impatient users | Medium | Medium | Background processing; show cached results immediately |
| LangExtract becomes unmaintained (not officially Google) | Low | High | Apache 2.0 allows forking; abstract behind our API layer |
| Competitors add extraction features | Low | Medium | Move fast; our multi-tool + local-first positioning is hard to replicate |

---

## Appendix: Technology Reference

### LangExtract v1.1.1 Key Classes

```python
# Core data types
langextract.data.Extraction          # Single extraction with class, text, position
langextract.data.ExampleData         # Few-shot example (text + expected extractions)
langextract.data.Document            # Input document wrapper
langextract.data.AnnotatedDocument   # Output with extractions
langextract.data.CharInterval        # Character position (start_pos, end_pos)
langextract.data.AlignmentStatus     # MATCH_EXACT, MATCH_FUZZY, etc.

# Main API
langextract.extract()                # Primary extraction function
langextract.visualize()              # Generate interactive HTML
langextract.io.save_annotated_documents()  # Save to JSONL/NDJSON
```

### Ollama API Endpoints

```
GET  http://localhost:11434/api/version    # Server version
GET  http://localhost:11434/api/tags       # List local models
POST http://localhost:11434/api/pull       # Download model
POST http://localhost:11434/api/chat       # Chat completion
POST http://localhost:11434/api/generate   # Text completion
GET  http://localhost:11434/api/ps         # Running models

# OpenAI-compatible endpoint (drop-in replacement)
POST http://localhost:11434/v1/chat/completions
```

### Electron Sidecar Pattern

```javascript
// In Electron main process
const { spawn } = require('child_process');
const path = require('path');

function getSidecarPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'langextract-sidecar', 'langextract-server');
  }
  return path.join(__dirname, '..', 'sidecar', 'dist', 'langextract-server');
}

const sidecar = spawn(getSidecarPath(), ['--port', '8100']);
sidecar.stdout.on('data', (data) => console.log(`[sidecar] ${data}`));
sidecar.on('close', (code) => console.log(`[sidecar] exited: ${code}`));
app.on('before-quit', () => sidecar.kill());
```

---

*This document synthesizes research from Google LangExtract documentation, competitive analysis of 7 LLM observability platforms, and technical feasibility assessment of Tauri v2, Electron, PyInstaller, and Ollama packaging strategies.*
