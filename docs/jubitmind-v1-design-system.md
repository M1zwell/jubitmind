# JubitMind v1 Design System

> **Version:** 1.0.0
> **Theme:** Dark-first
> **Extracted from:** JubitMind v0.78.0
> **Purpose:** Portable design token reference for porting to jubit.ai
> **Last updated:** 2026-02-12

---

## 1. Overview & Philosophy

JubitMind is a dark-first monitoring dashboard for AI tool interactions. Its visual language prioritizes:

- **Information density** — compact typography and tight spacing to display large volumes of data
- **Layered depth** — a 3-level surface hierarchy creates visual separation without heavy borders
- **Translucent color coding** — tinted backgrounds at 15-20% opacity over dark surfaces produce a signature "frosted glass" aesthetic that conveys meaning without overwhelming
- **Functional color** — every color carries semantic intent (status, risk, category, feedback)
- **Quiet chrome** — muted borders, subdued text hierarchy, and minimal decoration keep focus on content

### Design Principles

| Principle | Implementation |
|-----------|---------------|
| Dark by default | All tokens assume dark background; light theme is not defined |
| Color = meaning | No decorative color; every hue maps to a semantic role |
| Progressive disclosure | 4-level text hierarchy reduces cognitive load |
| Density over whitespace | `text-xs` as body, `p-3`/`p-4` card padding, tight gaps |
| Consistent interaction | All interactive elements use `transition-colors` with opacity shifts |

---

## 2. Token Architecture

Tokens follow a 4-tier hierarchy. Each tier references the one above it:

```
Global (Primitives)
  └── Alias (Semantic)
        └── Component
              └── State
```

### Naming Convention

```
{category}.{property}.{element}.{variant}.{state}
```

Examples:
- `color.neutral.500` — Global primitive
- `color.surface.raised` — Alias (semantic surface)
- `button.primary.bg` — Component token
- `button.primary.bg.hover` — State token

### Token Format

Tokens are defined in a platform-agnostic format. Each token includes:
- **Name** — Dot-notation semantic path
- **Value** — Raw CSS value (hex, px, rem, or reference)
- **CSS Variable** — The existing `var(--*)` mapping where applicable
- **Tailwind Class** — The utility class used in components

---

## 3. Global Tokens (Primitives)

### 3.1 Color Primitives

#### Neutral Scale

| Token | Hex | CSS Variable | Tailwind |
|-------|-----|-------------|----------|
| `color.neutral.50` | `#fafafa` | `--color-neutral-50` | `neutral-50` |
| `color.neutral.100` | `#f5f5f5` | `--color-neutral-100` | `neutral-100` |
| `color.neutral.200` | `#e5e5e5` | `--color-neutral-200` | `neutral-200` |
| `color.neutral.300` | `#d4d4d4` | `--color-neutral-300` | `neutral-300` |
| `color.neutral.400` | `#a3a3a3` | `--color-neutral-400` | `neutral-400` |
| `color.neutral.500` | `#737373` | `--color-neutral-500` | `neutral-500` |
| `color.neutral.600` | `#525252` | `--color-neutral-600` | `neutral-600` |
| `color.neutral.700` | `#404040` | `--color-neutral-700` | `neutral-700` |
| `color.neutral.800` | `#262626` | `--color-neutral-800` | `neutral-800` |
| `color.neutral.900` | `#171717` | `--color-neutral-900` | `neutral-900` |

#### Brand & Accent Hues

These are Tailwind's built-in color palette values used throughout JubitMind:

| Token | Hex (400) | Hex (500) | Role |
|-------|-----------|-----------|------|
| `color.teal` | `#2dd4bf` | `#14b8a6` | Primary brand, interactive |
| `color.red` | `#f87171` | `#ef4444` | Critical, danger, error |
| `color.orange` | `#fb923c` | `#f97316` | High risk, warning accent |
| `color.amber` | `#fbbf24` | `#f59e0b` | Warning, api-router category |
| `color.yellow` | `#facc15` | `#eab308` | Medium risk |
| `color.green` | `#4ade80` | `#22c55e` | Success, low risk, browser category |
| `color.emerald` | `#34d399` | `#10b981` | Agent badge |
| `color.cyan` | `#22d3ee` | `#06b6d4` | Perplexity accent |
| `color.blue` | `#60a5fa` | `#3b82f6` | Info, IDE category, chat badge |
| `color.indigo` | `#818cf8` | `#6366f1` | DeepSeek accent |
| `color.purple` | `#a78bfa` | `#8b5cf6` | Extension category, ChatLab |
| `color.pink` | `#f472b6` | `#ec4899` | Theater badge, Kimi accent |
| `color.rose` | `#fb7185` | `#f43f5e` | Antigravity accent |
| `color.lime` | `#a3e635` | `#84cc16` | Kilo Code accent |
| `color.gray` | `#9ca3af` | `#6b7280` | Unknown/inactive state |

#### Special Colors

| Token | Value | Usage |
|-------|-------|-------|
| `color.black` | `#000000` | Modal overlay base |
| `color.white` | `#ffffff` | Icon on solid brand backgrounds |

### 3.2 Typography Primitives

#### Font Families

| Token | Value | Fallback Stack |
|-------|-------|---------------|
| `font.family.body` | `Inter` | `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif` |
| `font.family.code` | `JetBrains Mono` | `Fira Code, Consolas, monospace` |

#### Font Loading

```
Inter:        wght@300;400;500;600;700  (Google Fonts, swap)
JetBrains Mono: wght@400;500            (Google Fonts, swap)
```

#### OpenType Features

```css
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
letter-spacing: -0.01em;
```

These enable Inter's stylistic alternates for improved readability at small sizes.

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font.weight.light` | `300` | Decorative large text (rare) |
| `font.weight.regular` | `400` | Body text, code |
| `font.weight.medium` | `500` | Labels, navigation, button text, badges, code emphasis |
| `font.weight.semibold` | `600` | Page titles, section headings, brand name |
| `font.weight.bold` | `700` | Emphasis (rare) |

### 3.3 Spacing Scale

JubitMind uses Tailwind's default 4px-base spacing scale. These are the values actively used:

| Token | Value | Tailwind | Common Usage |
|-------|-------|----------|-------------|
| `space.0` | `0px` | `0` | Reset |
| `space.0.5` | `2px` | `0.5` | Tight gap (icon-to-text in tiny badges) |
| `space.1` | `4px` | `1` | Inline gaps, small padding |
| `space.1.5` | `6px` | `1.5` | Button padding-y, badge gaps |
| `space.2` | `8px` | `2` | Standard inline gap, input padding |
| `space.2.5` | `10px` | `2.5` | Button padding-x, nav item gaps |
| `space.3` | `12px` | `3` | Card padding (compact), grid gaps |
| `space.4` | `16px` | `4` | Card padding (standard), section spacing |
| `space.5` | `20px` | `5` | Icon size base (w-5 h-5) |
| `space.6` | `24px` | `6` | Section spacing (space-y-6) |
| `space.8` | `32px` | `8` | Large section margins |
| `space.64` | `256px` | `64` | Sidebar width (w-64) |

### 3.4 Border Radius Scale

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `radius.none` | `0px` | `rounded-none` | — |
| `radius.sm` | `2px` | `rounded-sm` | Scrollbar thumb |
| `radius.default` | `4px` | `rounded` | Buttons, badges, inputs, code blocks |
| `radius.lg` | `8px` | `rounded-lg` | Cards, modals, dialog containers |
| `radius.full` | `9999px` | `rounded-full` | Avatars |

### 3.5 Shadow Scale

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.none` | `none` | Default (most elements) |
| `shadow.lg` | Tailwind `shadow-lg` | Dropdown menus |
| `shadow.2xl` | Tailwind `shadow-2xl` | Modal/dialog containers |

JubitMind relies on border + background layering rather than box-shadow for depth.

### 3.6 Motion / Duration

| Token | Value | Usage |
|-------|-------|-------|
| `motion.duration.fast` | `150ms` | `transition-colors` (Tailwind default) |
| `motion.easing.default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Tailwind default easing |
| `motion.animation.pulse` | `pulse 2s infinite` | Loading button icon (`animate-pulse`) |
| `motion.animation.spin` | `spin 1s linear infinite` | Refresh icon (`animate-spin`) |
| `motion.reduced` | `0.01ms` | `prefers-reduced-motion: reduce` override |

### 3.7 Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z.dropdown` | `20` | Dropdown menus |
| `z.modal` | `50` | Modal overlays and dialogs |

### 3.8 Opacity Scale

| Token | Value | Usage |
|-------|-------|-------|
| `opacity.0` | `0%` | Hidden |
| `opacity.10` | `10%` | Subtle tinted bg (teal-500/10) |
| `opacity.15` | `15%` | Standard tinted bg for badges (hue-500/15) |
| `opacity.20` | `20%` | Standard tinted bg for buttons (hue-500/20) |
| `opacity.30` | `30%` | Hover tinted bg (hue-500/30), selection highlight |
| `opacity.50` | `50%` | Disabled state, muted borders (/50 suffix) |
| `opacity.60` | `60%` | Modal overlay (bg-black/60), unavailable cards |
| `opacity.100` | `100%` | Full opacity (default) |

---

## 4. Alias (Semantic) Tokens

These map primitives to intent. They are the primary interface for theming.

### 4.1 Surface Colors

| Token | Value | CSS Variable | Description |
|-------|-------|-------------|-------------|
| `color.surface.base` | `#1a1a1a` | `--color-bg-primary` | Page background, deepest layer |
| `color.surface.raised` | `#2a2a2a` | `--color-bg-secondary` | Cards, sidebar, panels |
| `color.surface.overlay` | `#333333` | `--color-bg-tertiary` | Hover backgrounds, dropdowns, pills |
| `color.surface.scrim` | `rgba(0,0,0,0.6)` | — | Modal backdrop (bg-black/60) |

**Depth model:** Base → Raised → Overlay creates a 3-tier visual hierarchy without box-shadows.

### 4.2 Text Colors

| Token | Value | CSS Variable | Contrast vs Base | Usage |
|-------|-------|-------------|-----------------|-------|
| `color.text.primary` | `#fafafa` | `--color-text-primary` | 15.3:1 | Headings, important content |
| `color.text.secondary` | `#d4d4d4` | `--color-text-secondary` | 11.1:1 | Body text, table cells |
| `color.text.muted` | `#a3a3a3` | `--color-text-muted` | 6.6:1 | Labels, captions, timestamps |
| `color.text.disabled` | `#737373` | `--color-text-light` | 3.8:1 | Disabled, placeholder-adjacent |

### 4.3 Border Colors

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| `color.border.default` | `#404040` | `--color-border` | Card borders, input borders, dividers |
| `color.border.subtle` | `#2a2a2a` | `--color-border-muted` | Sidebar section dividers |

### 4.4 Feedback Colors

| Token | Value | CSS Variable | Usage |
|-------|-------|-------------|-------|
| `color.feedback.success` | `#059669` | `--color-success` | Success states, positive indicators |
| `color.feedback.warning` | `#d97706` | `--color-warning` | Warning states, caution indicators |
| `color.feedback.error` | `#dc2626` | `--color-error` | Error states, critical alerts |
| `color.feedback.info` | `#0284c7` | `--color-info` | Informational states |

### 4.5 Interactive Colors

| Token | Value | Description |
|-------|-------|-------------|
| `color.interactive.primary` | `#14b8a6` | `--color-primary` — Brand teal (Teal-500) |
| `color.interactive.primary.light` | `#f472b6` | `--color-primary-light` — Accent pink |
| `color.interactive.primary.muted` | `#ccfbf1` | `--color-primary-muted` — Teal wash |
| `color.interactive.focus` | `rgba(20,184,166,0.5)` | Focus ring (teal-500/50 border) |
| `color.interactive.selection` | `rgba(20,184,166,0.3)` | Text selection highlight |

---

## 5. Component Tokens

### 5.1 Card

The card is the foundational container throughout JubitMind.

#### Variants

| Variant | Tailwind Composition |
|---------|---------------------|
| **Standard** | `border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-4` |
| **Compact** | `border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-secondary)] p-3` |
| **Interactive** | Standard + `hover:border-teal-500/50 transition-colors` |
| **Unavailable** | `bg-[var(--color-bg-secondary)]/50 border-[var(--color-border)]/50 opacity-60` |
| **Gradient** | `border border-teal-500/30 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 p-4 rounded-lg` |
| **Success** | `border border-green-500/30 rounded-lg bg-green-500/10 p-3` |

#### Token Map

| Token | Value |
|-------|-------|
| `card.bg` | `var(--color-bg-secondary)` |
| `card.border` | `var(--color-border)` |
| `card.radius` | `rounded-lg` (8px) |
| `card.padding.default` | `p-4` (16px) |
| `card.padding.compact` | `p-3` (12px) |
| `card.hover.border` | `teal-500/50` |
| `card.unavailable.opacity` | `0.6` |

### 5.2 Button

All buttons share: `text-xs font-medium rounded transition-colors disabled:opacity-50`

#### Variants

| Variant | Default State | Hover State |
|---------|--------------|-------------|
| **Primary** | `bg-teal-500/20 text-teal-400` | `hover:bg-teal-500/30` |
| **Danger** | `bg-red-500/20 text-red-400` | `hover:bg-red-500/30` |
| **Warning** | `bg-amber-500/20 text-amber-400` | `hover:bg-amber-500/30` |
| **Info** | `bg-purple-500/20 text-purple-400` | `hover:bg-purple-500/30` |
| **Ghost** | `text-[var(--color-text-secondary)]` | `hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]` |
| **Icon** | `p-1 rounded text-[var(--color-text-muted)]` | `hover:bg-[var(--color-bg-tertiary)] hover:text-teal-400` |

#### Sizes

| Size | Padding | Text | Icon |
|------|---------|------|------|
| **Default** | `px-3 py-1.5` | `text-xs` | `w-3.5 h-3.5` |
| **Small** | `px-2.5 py-1.5` | `text-xs` | `w-3 h-3` |
| **Icon-only** | `p-1` or `p-1.5` | — | `w-3.5 h-3.5` |

#### States

| State | Treatment |
|-------|----------|
| `default` | Base colors as listed above |
| `hover` | Background opacity increases to `/30` |
| `disabled` | `opacity-50` + `disabled:opacity-50` |
| `loading` | Icon gets `animate-pulse` or `animate-spin` + text changes (e.g., "Generating..." → "Generate Report") |

#### Token Map

| Token | Value |
|-------|-------|
| `button.font.size` | `text-xs` (12px) |
| `button.font.weight` | `font-medium` (500) |
| `button.radius` | `rounded` (4px) |
| `button.transition` | `transition-colors` |
| `button.disabled.opacity` | `0.50` |
| `button.primary.bg` | `teal-500` at 20% |
| `button.primary.bg.hover` | `teal-500` at 30% |
| `button.primary.fg` | `teal-400` |
| `button.danger.bg` | `red-500` at 20% |
| `button.danger.bg.hover` | `red-500` at 30% |
| `button.danger.fg` | `red-400` |

### 5.3 Badge

All badges share: `rounded font-medium` with per-variant sizing.

#### Badge Sizes

| Size | Tailwind | Usage |
|------|----------|-------|
| **XS** | `text-[9px] px-1.5 py-0.5` | Memory tags, micro-labels |
| **SM** | `text-[10px] px-1.5 py-0.5` | Most badges, layer pills, adapter pills |
| **MD** | `text-xs px-2 py-0.5` | Dashboard counter badges |

#### Risk Badges

| Level | Background | Foreground | Border |
|-------|-----------|-----------|--------|
| `critical` | `bg-red-500/15` | `text-red-400` | `border-red-500/50` |
| `high` | `bg-orange-500/15` | `text-orange-400` | `border-orange-500/50` |
| `medium` | `bg-yellow-500/15` | `text-yellow-400` | `border-yellow-500/50` |
| `low` | `bg-green-500/15` | `text-green-400` | `border-green-500/50` |

#### Category Badges

| Category | Foreground | Usage |
|----------|-----------|-------|
| `cli` | `text-teal-400` | Terminal-based AI tools |
| `ide` | `text-blue-400` | IDE integrations |
| `extension` | `text-purple-400` | VS Code extensions |
| `api-router` | `text-amber-400` | API routing services |
| `browser` | `text-green-400` | Browser CDP tools |

#### Product Type Badges

| Type | Background | Foreground | Icon |
|------|-----------|-----------|------|
| `chat` | `bg-blue-500/15` | `text-blue-400` | MessageSquare |
| `chatab` (Arena) | `bg-orange-500/15` | `text-orange-400` | Swords |
| `chatlab` | `bg-purple-500/15` | `text-purple-400` | Users |
| `chatlab-agent` | `bg-emerald-500/15` | `text-emerald-400` | Bot |
| `theater` | `bg-pink-500/15` | `text-pink-400` | Presentation |
| `unknown` | `bg-gray-500/15` | `text-gray-400` | Archive |

#### Memory Layer Badges

| Layer | Background | Foreground |
|-------|-----------|-----------|
| `hot` | `bg-red-500/20` | `text-red-400` |
| `warm` | `bg-amber-500/20` | `text-amber-400` |
| `cold` | `bg-blue-500/20` | `text-blue-400` |

### 5.4 Input / Form Controls

#### Text Input

```
bg-[var(--color-bg-primary)]
border border-[var(--color-border)]
rounded
px-3 py-1.5
text-xs text-[var(--color-text-primary)]
placeholder:text-[var(--color-text-muted)]
focus:outline-none focus:border-teal-500/50
```

#### Search Input (with icon)

Same as text input plus:
```
pl-8    (left padding for icon)
pr-3    (right padding)
py-2    (slightly taller)
```

Icon positioned with: `absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-text-muted)]`

#### Token Map

| Token | Value |
|-------|-------|
| `input.bg` | `var(--color-bg-primary)` |
| `input.border` | `var(--color-border)` |
| `input.border.focus` | `teal-500/50` |
| `input.radius` | `rounded` (4px) |
| `input.padding.x` | `px-3` (12px) |
| `input.padding.y` | `py-1.5` (6px) |
| `input.font.size` | `text-xs` (12px) |
| `input.text.color` | `var(--color-text-primary)` |
| `input.placeholder.color` | `var(--color-text-muted)` |
| `input.disabled.bg` | Same + `disabled` attribute |

### 5.5 Table

| Token | Value | Usage |
|-------|-------|-------|
| `table.header.font.size` | `text-[10px]` | Column headers |
| `table.header.color` | `var(--color-text-muted)` | Header text |
| `table.header.font.weight` | `font-medium` (500) | Header weight |
| `table.header.border` | `border-b border-[var(--color-border)]` | Header underline |
| `table.row.padding.y` | `py-1.5` (6px) | Cell vertical padding |
| `table.row.border` | `border-b border-[var(--color-border)] last:border-0` | Row divider |
| `table.cell.color` | `var(--color-text-secondary)` | Cell text |
| `table.cell.color.primary` | `var(--color-text-primary)` | First-column / name cells |
| `table.cell.font.size` | `text-[10px]` | Cell text size |

### 5.6 Modal / Dialog

| Token | Value |
|-------|-------|
| `modal.overlay.bg` | `bg-black/60` |
| `modal.overlay.position` | `fixed inset-0 z-50` |
| `modal.container.bg` | `var(--color-bg-secondary)` |
| `modal.container.border` | `border border-[var(--color-border)]` |
| `modal.container.radius` | `rounded-lg` (8px) |
| `modal.container.maxWidth` | `max-w-3xl` (768px) |
| `modal.container.maxHeight` | `max-h-[85vh]` |
| `modal.container.shadow` | `shadow-2xl` |
| `modal.container.layout` | `flex flex-col` |

### 5.7 Sidebar / Navigation

Sidebar sections are individually collapsible. Section headers are toggle buttons with chevron indicators. State is persisted to `localStorage` under `jm.sidebar.sectionState.v1`.

**Sections:** Monitor, Data, Insights, Ops, Routing, Configuration, Knowledge (7 sections, 25 primary items + 2 footer links).

**Collapse behavior:**
- Click section header to toggle expand/collapse.
- Active route's parent section auto-expands.
- Default: Monitor + Data expanded on first load; others collapsed.
- ChatAB and ChatLab appear as secondary links in the sidebar footer.

| Token | Value |
|-------|-------|
| `sidebar.width` | `w-64` (256px) |
| `sidebar.bg` | `var(--color-bg-secondary)` |
| `sidebar.border` | `border-r border-[var(--color-border)]` |
| `sidebar.overflow` | `overflow-y-auto` |
| `sidebar.brand.icon.size` | `w-6 h-6` |
| `sidebar.brand.icon.bg` | `bg-teal-500 rounded` |
| `sidebar.brand.icon.color` | `text-white` |
| `sidebar.brand.text` | `text-sm font-semibold text-[var(--color-text-primary)]` |
| `sidebar.brand.subtitle` | `text-xs text-[var(--color-text-muted)]` |
| `sidebar.section.label` | `text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]` |
| `sidebar.section.label.active` | `text-teal-400` (when section contains active route) |
| `sidebar.section.padding` | `px-4 py-1.5` |
| `sidebar.section.chevron` | `w-3 h-3 text-[var(--color-text-muted)]` |
| `sidebar.item.padding` | `px-4 py-1.5 mx-2` |
| `sidebar.item.font` | `text-xs font-medium` |
| `sidebar.item.icon.size` | `w-3.5 h-3.5` |
| `sidebar.item.gap` | `gap-2.5` |
| `sidebar.item.radius` | `rounded` (4px) |
| `sidebar.item.default.color` | `var(--color-text-secondary)` |
| `sidebar.item.hover.color` | `var(--color-text-primary)` |
| `sidebar.item.hover.bg` | `var(--color-bg-tertiary)` |
| `sidebar.item.active.bg` | `teal-500/20` |
| `sidebar.item.active.color` | `teal-400` |
| `sidebar.footer.link.font` | `text-xs font-medium` |
| `sidebar.footer.link.icon.size` | `w-3 h-3` |

### 5.8 Stat Card

| Token | Value |
|-------|-------|
| `stat.container` | Standard card (`border rounded-lg bg-secondary p-3`) |
| `stat.label` | `text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]` |
| `stat.value` | `text-lg font-semibold text-[var(--color-text-primary)]` |
| `stat.grid` | `grid grid-cols-2 md:grid-cols-4 gap-3` |

### 5.9 Dropdown / Menu

| Token | Value |
|-------|-------|
| `dropdown.position` | `absolute right-0 top-full mt-1 z-20` |
| `dropdown.bg` | `var(--color-bg-secondary)` |
| `dropdown.border` | `border border-[var(--color-border)]` |
| `dropdown.radius` | `rounded` (4px) |
| `dropdown.shadow` | `shadow-lg` |
| `dropdown.padding` | `py-1` |
| `dropdown.item.padding` | `px-3 py-1.5` |
| `dropdown.item.font` | `text-xs` |
| `dropdown.item.color` | `var(--color-text-secondary)` |
| `dropdown.item.hover.bg` | `var(--color-bg-tertiary)` |
| `dropdown.item.gap` | `gap-2` |

### 5.10 Code Block

| Token | Value |
|-------|-------|
| `code.bg` | `var(--color-bg-primary)` |
| `code.border` | `border border-[var(--color-border)]` |
| `code.radius` | `rounded` (4px) |
| `code.padding` | `px-3 py-2` |
| `code.font.family` | `font-mono` (JetBrains Mono) |
| `code.font.size` | `text-[11px]` |
| `code.color` | `teal-400` |

### 5.11 Banner / Alert

| Variant | Border | Background | Text Color |
|---------|--------|-----------|-----------|
| **Demo** | `border-teal-500/30` | `bg-teal-500/15` | `text-teal-400` |
| **Success** | `border-green-500/30` | `bg-green-500/10` | `text-green-400` |
| **Error** | `border-red-500/30` | `bg-red-500/10` | `text-red-400` |

Pattern: `border border-{hue}-500/30 rounded-lg bg-{hue}-500/{10-15} p-3`

### 5.12 Scrollbar

| Token | Value |
|-------|-------|
| `scrollbar.width` | `4px` |
| `scrollbar.height` | `4px` |
| `scrollbar.track.bg` | `transparent` |
| `scrollbar.thumb.bg` | `var(--color-neutral-700)` (#404040) |
| `scrollbar.thumb.bg.hover` | `var(--color-neutral-600)` (#525252) |
| `scrollbar.thumb.radius` | `2px` |

---

## 6. Typography Scale

JubitMind uses a compact, information-dense type scale. All sizes are fixed (not responsive).

### Scale

| Token | CSS Value | Tailwind | Role |
|-------|-----------|----------|------|
| `type.page-title` | `18px` / `28px` | `text-lg font-semibold` | Page-level headings (h1) |
| `type.section-title` | `14px` / `20px` | `text-sm font-medium` | Section headings (h2) |
| `type.subsection-title` | `12px` / `16px` | `text-xs font-semibold` | Card headings (h3) |
| `type.body` | `12px` / `16px` | `text-xs` | Default body text |
| `type.body-code` | `11px` / `16px` | `text-[11px] font-mono` | Code blocks, terminal output |
| `type.label` | `10px` / `14px` | `text-[10px] font-medium` | Stat labels, adapter names, badge text |
| `type.caption` | `10px` / `14px` | `text-[10px]` | Timestamps, URLs, metadata |
| `type.micro` | `9px` / `12px` | `text-[9px]` | Section sub-labels, tag text, chart labels |

### Text Color Pairing

| Hierarchy Level | Color Token | Example Usage |
|----------------|------------|---------------|
| Heading | `color.text.primary` | Page title, section title, card heading |
| Body | `color.text.secondary` | Descriptions, table cells, results |
| Supporting | `color.text.muted` | Labels, timestamps, section labels |
| Decorative / Disabled | `color.text.disabled` | Placeholder-adjacent, de-emphasized |
| Accent | `teal-400` | Adapter names, active nav, linked text |

### Special Treatments

| Treatment | Classes | Usage |
|-----------|---------|-------|
| Section label | `text-[10px] uppercase tracking-wider text-muted` | Sidebar sections, stat labels |
| Label above input | `text-[10px] text-muted block mb-1` | Form field labels |
| Truncation | `truncate` | Long URLs, email addresses |
| Line clamp | `line-clamp-3` | Memory search result previews |

---

## 7. Iconography

### Library

**Lucide React** — Consistent 24x24 SVG grid, 2px stroke weight.

### Sizing Scale

| Token | Size | Usage |
|-------|------|-------|
| `icon.xs` | `w-2 h-2` | Inline micro-icons (tag icon in badges) |
| `icon.sm-xs` | `w-2.5 h-2.5` | Inline small icons (clock, cloud, external link) |
| `icon.sm` | `w-3 h-3` | Button inline icons |
| `icon.md-sm` | `w-3.5 h-3.5` | Navigation icons, button icons, search icon |
| `icon.md` | `w-4 h-4` | Section heading icons |
| `icon.lg` | `w-5 h-5` | Page title icons |
| `icon.xl` | `w-6 h-6` | Brand icon container |

### Color Convention

Icons inherit text color from their parent. Specific overrides:
- Page title icon: category-specific color (e.g., `text-teal-400`, `text-green-400`, `text-purple-400`)
- Status icon: `text-green-500` (available) / `text-gray-500` (unavailable)
- Action button icon: matches button text color

---

## 8. Responsive Breakpoints & Grid

### Breakpoints

JubitMind uses Tailwind's default breakpoints (mobile-first):

| Token | Value | Tailwind Prefix |
|-------|-------|----------------|
| `breakpoint.sm` | `640px` | `sm:` |
| `breakpoint.md` | `768px` | `md:` |
| `breakpoint.lg` | `1024px` | `lg:` |
| `breakpoint.xl` | `1280px` | `xl:` |

### Grid Patterns

| Pattern | Usage |
|---------|-------|
| `grid grid-cols-2 md:grid-cols-4 gap-3` | Stat cards (4-column on desktop, 2 on mobile) |
| `grid grid-cols-2 md:grid-cols-3 gap-3` | Tool status grid |
| `grid grid-cols-1 lg:grid-cols-2 gap-4` | Two-column insights layout |

### Layout Structure

```
┌──────────────────────────────────────────────┐
│ Sidebar (w-64, fixed)  │  Main Content Area  │
│                        │  (flex-1, overflow)  │
│  brand + nav + footer  │                      │
│                        │  p-6 space-y-6       │
└──────────────────────────────────────────────┘
```

- Sidebar: `w-64 flex-shrink-0` (always visible, sections individually collapsible)
- Content: `flex-1 overflow-auto p-6`
- Page spacing: `space-y-6` between sections

---

## 9. Accessibility Tokens

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

All animations (`animate-spin`, `animate-pulse`) and transitions (`transition-colors`) are disabled for users who prefer reduced motion.

### Selection Color

```css
::selection {
  background: rgba(20, 184, 166, 0.3);  /* teal at 30% */
  color: var(--color-text-primary);
}
```

### Focus Indicators

| Element | Focus Style |
|---------|------------|
| Text inputs | `focus:outline-none focus:border-teal-500/50` |
| Buttons | Browser default (no custom focus ring) |
| Nav links | Active state doubles as focus indicator |

### Contrast Ratios (against `#1a1a1a` base)

| Text Level | Color | Ratio | WCAG AA | WCAG AAA |
|-----------|-------|-------|---------|----------|
| Primary | `#fafafa` | 15.3:1 | Pass | Pass |
| Secondary | `#d4d4d4` | 11.1:1 | Pass | Pass |
| Muted | `#a3a3a3` | 6.6:1 | Pass | Pass (large text) |
| Disabled | `#737373` | 3.8:1 | Pass (large) | Fail |
| Teal-400 accent | `#2dd4bf` | 8.5:1 | Pass | Pass |

### Known Gaps (for porting improvement)

- No visible focus ring on buttons — add `focus-visible:ring-2 focus-visible:ring-teal-500/50`
- No `aria-label` on icon-only buttons — add descriptive labels
- Missing `htmlFor`/`id` pairing on form labels
- `text-[10px]` captions may be below WCAG minimum (should not be sole content carrier)

---

## 10. Porting Guide (JubitMind to jubit.ai)

### Strategy

JubitMind's tokens are dark-first. When porting to jubit.ai (which may need light + dark themes):

1. **Keep the token names** — The semantic layer (`color.surface.base`, `color.text.primary`, etc.) is theme-agnostic
2. **Create a light theme mapping** — Swap values for each alias token
3. **Preserve the opacity pattern** — The `{hue}-500/20` translucent pattern works on both light and dark backgrounds

### Light Theme Suggestions

| Token | Dark Value | Light Suggestion |
|-------|-----------|-----------------|
| `color.surface.base` | `#1a1a1a` | `#ffffff` |
| `color.surface.raised` | `#2a2a2a` | `#f8fafc` |
| `color.surface.overlay` | `#333333` | `#f1f5f9` |
| `color.text.primary` | `#fafafa` | `#0f172a` |
| `color.text.secondary` | `#d4d4d4` | `#334155` |
| `color.text.muted` | `#a3a3a3` | `#64748b` |
| `color.text.disabled` | `#737373` | `#94a3b8` |
| `color.border.default` | `#404040` | `#e2e8f0` |
| `color.border.subtle` | `#2a2a2a` | `#f1f5f9` |

### CSS Variable Implementation

For theming, wrap tokens in CSS custom properties with class-based switching:

```css
:root, .theme-dark {
  --color-surface-base: #1a1a1a;
  --color-surface-raised: #2a2a2a;
  --color-surface-overlay: #333333;
  /* ... */
}

.theme-light {
  --color-surface-base: #ffffff;
  --color-surface-raised: #f8fafc;
  --color-surface-overlay: #f1f5f9;
  /* ... */
}
```

### Portability Checklist

- [ ] Extract all CSS variables into a standalone `tokens.css` file
- [ ] Create `tokens.json` for tooling (Style Dictionary, Figma Tokens, etc.)
- [ ] Generate Tailwind theme config from tokens
- [ ] Add light theme token values
- [ ] Add `focus-visible` ring tokens for accessibility
- [ ] Add `aria-label` to all icon-only buttons
- [ ] Pair all form labels with `htmlFor`/`id`
- [ ] Validate all `text-[10px]` usage meets WCAG criteria
- [ ] Consider adding `text-base` (16px) option for comfortable reading mode
- [ ] Test translucent badge pattern on light backgrounds

### Token Export Formats

For maximum portability, export tokens in:

| Format | Tool | File |
|--------|------|------|
| CSS Custom Properties | Browsers | `tokens.css` |
| JSON | Style Dictionary, Figma Tokens | `tokens.json` |
| Tailwind Config | Tailwind CSS | `tailwind.config.ts` |
| TypeScript Constants | Runtime access | `tokens.ts` |

---

## Appendix A: Complete CSS Variable Reference

Source: `jubitmind/src/index.css`

```css
:root {
  /* Brand */
  --color-primary: #14b8a6;
  --color-primary-light: #f472b6;
  --color-primary-muted: #ccfbf1;

  /* Neutral Scale */
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;

  /* Surfaces */
  --color-bg-primary: #1a1a1a;
  --color-bg-secondary: #2a2a2a;
  --color-bg-tertiary: #333333;

  /* Text */
  --color-text-primary: #fafafa;
  --color-text-secondary: #d4d4d4;
  --color-text-muted: #a3a3a3;
  --color-text-light: #737373;

  /* Borders */
  --color-border: #404040;
  --color-border-muted: #2a2a2a;

  /* Feedback */
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;
  --color-info: #0284c7;
}
```

---

## Appendix B: Tailwind Configuration

Source: `jubitmind/tailwind.config.ts`

```typescript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

---

## Appendix C: Opacity Modifier Pattern Reference

The signature JubitMind visual pattern uses Tailwind's opacity modifier syntax:

```
bg-{color}-500/{opacity}  →  background with {color} at {opacity}%
text-{color}-400           →  foreground text in lighter shade
border-{color}-500/{opacity} → border with {color} at {opacity}%
```

**Standard recipe for a new color intent:**

```
Default:  bg-{hue}-500/20  text-{hue}-400
Hover:    bg-{hue}-500/30
Active:   bg-{hue}-500/20  (same as default for "selected" state)
Badge:    bg-{hue}-500/15  text-{hue}-400
Border:   border-{hue}-500/50 (focus/active borders)
Banner:   border-{hue}-500/30  bg-{hue}-500/10
```

This pattern is the core of JubitMind's visual identity and should be preserved when porting to jubit.ai.
