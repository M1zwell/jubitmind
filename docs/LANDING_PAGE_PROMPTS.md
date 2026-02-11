# JubitMind Landing Page — Implementation Prompts

Use these prompts to create the `/jubitmind` product landing pages on **dseek.ai** and **jubit.ai**. Combine with the latest build artifacts, PRD (`docs/PRD.md`), and marketing guide (`docs/MARKETING.md`).

---

## Prompt 1: Route + Component Setup (dseek.ai / jubit.ai)

### Context

The dseek.ai and jubit.ai websites share the same React SPA codebase at `/Users/jubit_nb0/JubitLLMNPMPlayground/`. Routes are defined in `src/App.tsx` via a `ROUTE_MAP` object. The app uses React Router v7, Vite 5, Tailwind CSS, and the Jubit Design System v2.1 (dark-mode first, teal primary `#14b8a6` / `#2DD4BF`).

### Task

Add a new `/jubitmind` route that renders a dedicated product landing/download page for JubitMind. This page should work on both dseek.ai and jubit.ai domains (same component).

### Implementation Steps

1. **Add route to ROUTE_MAP** in `src/App.tsx`:
```typescript
const ROUTE_MAP = {
  // ... existing routes
  'jubitmind': '/jubitmind',
} as const;
```

2. **Create the component** at `src/components/JubitMindLanding.tsx` (or `src/pages/JubitMindLanding.tsx`). Lazy-load it:
```typescript
const JubitMindLanding = lazy(() => import('./components/JubitMindLanding'));
```

3. **Add to the render switch** — this should be a full-width page (no max-w-7xl constraint), similar to how `ai-news-hub`, `hk-scraper`, and `life-hub` are rendered:
```typescript
// In the full-width pages array:
['ai-news-hub', 'hk-scraper', 'life-hub', ..., 'jubitmind'].includes(state.currentView)
// Then:
{state.currentView === 'jubitmind' && <JubitMindLanding className="h-full" />}
```

4. **Navigation**: Add a small link in the "Jubit Ecosystem" section of the mobile nav drawer, and optionally as a subtle nav item in the desktop bar. The page is primarily accessed via direct URL `/jubitmind` (linked from GitHub README and external marketing).

### Alternatively (Standalone Route)

If preferred, register `/jubitmind` as a standalone route outside `AppContent` (like `/sso`, `/signup`), so it renders without the main nav bar — making it feel like a true product landing page:

```typescript
<Route
  path="/jubitmind"
  element={
    <Suspense fallback={<ViewLoader message="Loading JubitMind..." />}>
      <JubitMindLanding />
    </Suspense>
  }
/>
```

This approach is **recommended** for a cleaner marketing page experience.

---

## Prompt 2: JubitMind Landing Page Component

### Context

Create a single-page product landing page for **JubitMind v0.77.0** — an AI interaction audit and governance desktop app. The page is primarily a download/marketing page. It lives inside the dseek.ai React SPA but should feel like a standalone product page.

### Design System Reference

Use the Jubit Design System v2.1 (see `/design-system` skill or `docs/jubit-design-system-v2.css`):

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | `#1a1a1a` | Page background |
| `--color-bg-secondary` | `#2a2a2a` | Card/section backgrounds |
| `--color-bg-tertiary` | `#333333` | Elevated surfaces |
| `--color-text-primary` | `#fafafa` | Headlines, body |
| `--color-text-secondary` | `#d4d4d4` | Supporting text |
| `--color-text-muted` | `#a3a3a3` | Captions, labels |
| `--color-border` | `#404040` | Borders, dividers |
| `--color-accent` / teal | `#14b8a6` / `#2DD4BF` | CTAs, highlights, brand |
| Critical risk | `#F87171` | Red |
| High risk | `#FB923C` | Orange |
| Medium risk | `#FACC15` | Yellow |
| Low risk | `#4ADE80` | Green |

**Font**: Inter (primary), SF Mono/Fira Code (monospace)
**Pattern reference**: `src/components/ui/UnifiedHero.tsx` for hero section patterns (gradient text, SVG pattern overlay, feature grid).

### Page Structure

#### Section 1: Hero

```
[JubitMind Logo/Icon — shield or brain with teal accent]

Human judgement meets AI mind.
Every interaction, valued.

The open-source AI interaction audit platform.
Risk-score, classify, and govern every human-AI conversation
across 11 coding tools — from a single desktop app.

[Download for macOS ▾]  [Download for Windows ▾]  [View on GitHub →]

v0.77.0 · Open Source · Apache 2.0
```

**Implementation notes:**
- Gradient text on headline: `bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent`
- OS auto-detection: Use `navigator.platform` or `navigator.userAgent` to highlight the user's platform button
- Download buttons should be prominent with teal gradient: `bg-gradient-to-r from-teal-500 to-teal-600`
- "View on GitHub" as secondary outlined button
- Subtle SVG dot pattern or grid overlay at 5% opacity (see UnifiedHero.tsx pattern)

**Download URLs** (GitHub Releases v0.77.0):
```
macOS DMG:        https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64.dmg
macOS ZIP:        https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64-mac.zip
Windows Setup:    https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-Setup-0.77.0.exe
Windows Portable: https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0.exe
All releases:     https://github.com/M1zwell/jubitmind/releases
GitHub repo:      https://github.com/M1zwell/jubitmind
```

#### Section 2: Problem Statement

```
You use AI every day. But do you know what it's doing?

[3-column grid]

🖥️ Scattered Across Tools          🛡️ Zero Risk Visibility           🏷️ No Classification
Your conversations live in          Which sessions touched             Is it code generation?
11 different AI tools. Good         credentials? Ran destructive       Security work? IP creation?
luck finding that one prompt.       commands? You don't know.          Nobody tracks this.
```

**Implementation notes:**
- Dark card style: `bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6`
- Icons can use Lucide React: `Terminal`, `Shield`, `Tag`
- Responsive: 3 cols on desktop, stacked on mobile

#### Section 3: Solution Overview

```
JubitMind: Your AI governance layer.

[Large screenshot or animated GIF of the dashboard]
→ Placeholder: use a div with gradient border mocking a dashboard screenshot

→ Auto-discovers all AI sessions across 11 tools and IDEs
→ Risk-scores every tool action (Critical / High / Medium / Low)
→ Auto-classifies conversations by domain and sensitivity
→ Background security auditor scans every 30 minutes
→ Rich tool_use rendering with expandable I/O
→ 100% local — your data never leaves your machine
```

**Implementation notes:**
- Screenshot placeholder: `bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 aspect-video` with a mocked UI sketch inside (or actual screenshot if available)
- Checkmark list items with teal icons
- Consider animated entrance (fade-in on scroll)

#### Section 4: Feature Grid (6 cards)

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 🔴🟠🟡🟢            │  │ 🏷️ Auto-Tags        │  │ 🔌 11 AI Tools      │
│ Risk Scoring         │  │                     │  │                     │
│                     │  │ 3 categories         │  │ Claude Code, Cursor │
│ 4 risk levels       │  │ 12+ auto-tags        │  │ Copilot, Windsurf   │
│ 30+ patterns        │  │ Confidence-based     │  │ Aider, Kilo & more  │
│ Real-time scoring   │  │ Zero configuration   │  │ Auto-discovery      │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ 🔍 Rich Rendering   │  │ 🛡️ Auditor Agent    │  │ 📊 Analytics        │
│                     │  │                     │  │                     │
│ tool_use blocks     │  │ Background scanner   │  │ Usage trends        │
│ thinking blocks     │  │ Every 30 minutes     │  │ Risk heatmaps       │
│ Risk-colored        │  │ Severity-ranked      │  │ Tool distribution   │
│ Expandable I/O      │  │ Emergency trigger    │  │ Cost tracking       │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Implementation notes:**
- Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Card style: `bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl p-6 hover:border-teal-500/50 transition-colors`
- Each card has an icon/emoji at top, bold title, 3-4 bullet features
- Subtle hover effect: border color transitions to teal

#### Section 5: Risk Scoring Visual

```
Every AI action, scored by risk. Instantly.

[Visual showing 4 risk levels with examples]

CRITICAL (4)  │  rm -rf, sudo, git push --force, credential access
HIGH (3)      │  git push, npm publish, docker, external API calls
MEDIUM (2)    │  git commit, file writes/edits, builds, installs
LOW (1)       │  File reads, searches, grep (read-only operations)

30+ detection patterns across security, file system, network, and git operations.
```

**Implementation notes:**
- Horizontal bar chart or stacked visual with risk colors (`#F87171`, `#FB923C`, `#FACC15`, `#4ADE80`)
- Each level shows the colored badge + example commands in monospace
- This is a unique selling point — make it visually striking

#### Section 6: Supported AI Tools

```
Works with every AI coding tool you use.

[Grid of tool logos/icons with status badges]

✅ Claude Code CLI     ✅ Claude VS Code     ✅ Cursor IDE
🔜 Windsurf           🔜 GitHub Copilot     🔜 Continue.dev
🔜 Aider              🔜 OpenAI Codex CLI   🔜 Kilo Code
🔜 Kimi CLI           🔜 Antigravity

✅ = Full support  |  🔜 = Adapter ready (coming soon)
```

**Implementation notes:**
- Grid of tool cards with logos (or text icons)
- Active tools in teal, coming-soon in muted gray
- Show that the adapter architecture makes adding tools easy

#### Section 7: Download / CTA (Repeated)

```
Start governing your AI conversations.
Open-source. Self-hosted. Free.

[Auto-detect OS → show primary download button]

macOS (Apple Silicon)     Windows (64-bit)

Or install from source:
┌─────────────────────────────────────────┐
│ git clone https://github.com/M1zwell/  │
│   jubitmind.git                         │
│ cd jubitmind && ./install.sh            │
└─────────────────────────────────────────┘

[Star on GitHub ⭐]  [View Documentation →]

Also available via Docker:
docker compose up -d
```

**Implementation notes:**
- Primary download button: large, teal gradient, with platform icon (Apple/Windows logo)
- Code block: `bg-[#0d1117] border border-slate-700 rounded-lg p-4 font-mono text-sm`
- Copy-to-clipboard button on code blocks
- GitHub star button links to `https://github.com/M1zwell/jubitmind`

#### Section 8: Philosophy / About

```
We value the finest humanity and the working with AI brains for better life.

Every prompt you craft, every decision you make, every solution you co-create
with AI — these are records of human intelligence amplified by artificial minds.
JubitMind helps you value, protect, and govern that collaboration.

Part of the Jubit AI ecosystem.

[dseek.ai logo]  [jubit.ai logo]

Built by Jubit AI · Apache 2.0 License · Copyright © 2025-2026
```

**Implementation notes:**
- Centered text, philosophical tone
- Gradient text on the tagline
- Ecosystem logos link to dseek.ai and jubit.ai
- Footer-style with legal links

#### Section 9: Footer

```
JubitMind v0.77.0 | Apache 2.0 License | Copyright © 2025-2026 Jubit AI

GitHub  ·  Documentation  ·  dseek.ai  ·  jubit.ai

Privacy Policy  |  Terms of Service  |  TRADEMARKS.md
```

---

## Prompt 3: OS Auto-Detection Logic

### Task

Implement OS detection to auto-highlight the correct download button in the hero and CTA sections.

### Logic

```typescript
function detectOS(): 'mac' | 'windows' | 'linux' | 'unknown' {
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';

  if (platform.includes('mac') || ua.includes('macintosh')) return 'mac';
  if (platform.includes('win') || ua.includes('windows')) return 'windows';
  if (platform.includes('linux') || ua.includes('linux')) return 'linux';
  return 'unknown';
}
```

### Download Mapping

```typescript
const DOWNLOADS = {
  mac: {
    primary: {
      label: 'Download for macOS',
      sublabel: 'Apple Silicon (arm64) · DMG',
      url: 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64.dmg',
    },
    secondary: {
      label: 'ZIP Archive',
      url: 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64-mac.zip',
    },
  },
  windows: {
    primary: {
      label: 'Download for Windows',
      sublabel: '64-bit · Installer (.exe)',
      url: 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-Setup-0.77.0.exe',
    },
    secondary: {
      label: 'Portable (no install)',
      url: 'https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0.exe',
    },
  },
  linux: {
    primary: {
      label: 'Build from Source',
      sublabel: 'Node.js 20+ required',
      url: 'https://github.com/M1zwell/jubitmind#quick-start',
    },
  },
};
```

### UI Behavior

- On page load, detect OS and show that platform's primary download button prominently
- Show the other platform as a smaller secondary link: "Also available for [Windows/macOS]"
- Always show "View on GitHub" as tertiary option
- If OS is unknown or Linux, show both macOS and Windows buttons side by side

---

## Prompt 4: Mobile Responsiveness

### Breakpoint Behavior

| Breakpoint | Layout |
|-----------|--------|
| `< 640px` (mobile) | Single column, stacked sections, full-width download buttons |
| `640-1024px` (tablet) | 2-column feature grid, side-by-side download buttons |
| `> 1024px` (desktop) | 3-column feature grid, hero with large screenshot area |

### Key Mobile Considerations

- Hero text should scale down: `text-4xl md:text-5xl lg:text-6xl`
- Download buttons should be full-width on mobile: `w-full sm:w-auto`
- Feature cards stack vertically on mobile
- Code blocks should horizontally scroll on narrow screens: `overflow-x-auto`
- Risk scoring visual: switch from horizontal to vertical layout on mobile
- Tool grid: 2 columns on mobile, 3 on tablet, 4 on desktop
- Sticky download bar at bottom of screen on mobile (optional, but effective)

---

## Prompt 5: SEO & Meta Tags

### Task

Add proper meta tags for the `/jubitmind` page. Since this is a React SPA, implement via `react-helmet-async` or `document.title` in a `useEffect`.

### Meta Tags

```html
<title>JubitMind — AI Interaction Audit & Governance Platform | Download Free</title>
<meta name="description" content="Download JubitMind — the open-source desktop app that risk-scores, classifies, and governs every human-AI conversation across 11 coding tools. Free for macOS and Windows." />
<meta name="keywords" content="AI governance, AI audit, Claude Code, AI safety, risk scoring, conversation history, developer tools, open source" />

<!-- Open Graph -->
<meta property="og:title" content="JubitMind — AI Interaction Audit Platform" />
<meta property="og:description" content="Risk-score, classify, and govern every human-AI conversation. Download free for macOS and Windows." />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://dseek.ai/jubitmind" />
<meta property="og:image" content="https://dseek.ai/images/jubitmind-og.png" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="JubitMind — AI Interaction Audit Platform" />
<meta name="twitter:description" content="Every AI conversation, risk-scored and governed. Open source." />
<meta name="twitter:image" content="https://dseek.ai/images/jubitmind-og.png" />
```

### Open Graph Image

Create a 1200x630 OG image (`public/images/jubitmind-og.png`) with:
- Dark background (#0F172A)
- "JubitMind" in large white text
- Tagline: "Human judgement meets AI mind."
- Teal accent bar/gradient
- Risk level color dots (red/orange/yellow/green)
- "Download Free — dseek.ai/jubitmind"

---

## Prompt 6: GitHub README Redirect

### Task

Update the JubitMind GitHub README (`jubitmind/README.md`) to redirect users to the landing pages.

### Changes

In the Download section, update the "Also available at" line:

```markdown
## Download

Download the latest desktop app — no terminal, no git clone, no Python required:

**[Download from dseek.ai/jubitmind →](https://dseek.ai/jubitmind)** (recommended)

Or download directly from GitHub Releases:

| Platform | Download | Notes |
|----------|----------|-------|
| **macOS** | [JubitMind.dmg](https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64.dmg) | Apple Silicon (arm64) |
| **macOS** | [JubitMind.zip](https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0-arm64-mac.zip) | ZIP archive |
| **Windows** | [JubitMind-Setup.exe](https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-Setup-0.77.0.exe) | NSIS installer |
| **Windows** | [JubitMind-Portable.exe](https://github.com/M1zwell/jubitmind/releases/latest/download/JubitMind-0.77.0.exe) | Portable (no install) |

Also available at **[jubit.ai/jubitmind](https://jubit.ai/jubitmind)**.
```

### GitHub Pages (Optional)

If GitHub Pages is enabled for the repo, add a redirect page at `docs/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0; url=https://dseek.ai/jubitmind" />
  <title>JubitMind — Redirecting...</title>
</head>
<body>
  <p>Redirecting to <a href="https://dseek.ai/jubitmind">dseek.ai/jubitmind</a>...</p>
</body>
</html>
```

---

## Prompt 7: Internationalization (Optional)

### README Translations

Translated READMEs are already available:
- `README.zh-CN.md` — Simplified Chinese
- `README.ja.md` — Japanese
- `README.ko.md` — Korean

The landing page could include a language switcher or auto-detect `navigator.language` to show localized copy. For v1, keep the page in English only and link to translated READMEs from the footer.

---

## Reference Files

When building the landing page, refer to these files for accurate copy, feature lists, and technical details:

| File | Purpose |
|------|---------|
| `jubitmind/docs/MARKETING.md` | Brand voice, taglines, positioning, landing page structure, social copy, competitive messaging |
| `jubitmind/docs/PRD.md` | Problem statement, personas, features, architecture, tech stack |
| `jubitmind/README.md` | Feature list, API reference, scripts, architecture diagram |
| `jubitmind/package.json` | Version (0.77.0), scripts |
| `jubitmind/electron-builder.yml` | Build targets, platform config |
| `src/components/ui/UnifiedHero.tsx` | Hero section pattern (gradient text, SVG overlay, feature grid, CTA buttons) |
| `src/App.tsx` | Route configuration (ROUTE_MAP), lazy loading pattern |
| `docs/jubit-design-system-v2.css` | Full design token reference |
| `tailwind.config.js` | Tailwind extensions, custom utilities |

---

## Quick Reference: Copy Blocks

### Hero Headline
> Human judgement meets AI mind. Every interaction, valued.

### Hero Subline
> The open-source AI interaction audit platform. Risk-score, classify, and govern every human-AI conversation across 11 coding tools.

### Problem Headline
> You use AI every day. But do you know what it's doing?

### Solution Headline
> JubitMind: Your AI governance layer.

### Philosophy
> We value the finest humanity and the working with AI brains for better life.

### CTA Primary
> Start governing your AI conversations. Open-source. Self-hosted. Free.

### CTA Button Text
> Download for macOS | Download for Windows | View on GitHub | Star on GitHub

### One-liner
> JubitMind is an open-source AI interaction audit platform that automatically scores risk, classifies content, and governs every human-AI conversation across all your tools.

### Positioning (Short)
> The audit trail your AI usage has been missing.
