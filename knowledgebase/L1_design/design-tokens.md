# Design Tokens — Geo-SmartAudit Platform

> **Project token map.** This file is a *map*, not a redeclaration.
> The universal token taxonomy (Primary/50–900, spacing scale, radius scale, motion, etc.) lives in
> `~/.aionsoft/core/skills/idea-to-design/SKILL.md`. This file documents the *values* chosen for
> this project and the naming convention used in MUI theme + CSS custom properties.
>
> **OQ-DESIGN-001:** No Figma file or shared design system exists yet. All token values below are
> *proposed by agent* and must be ratified by a human designer and transferred into a Figma file
> before the `tokens/raw/*.json` files can be populated. See Status report.

---

## Source of truth (current state)

- **Canonical (future):** `tokens/raw/*.json` (Figma variable exports — not yet available)
- **Figma file:** none yet — see `figma-links.md`
- **Generated code tokens:** `src/theme/index.ts` (MUI theme object) in the `geo_fe` repo
- **CSS custom properties:** `src/styles/tokens.css` in the `geo_fe` repo (planned)

---

## UI library recommendation

**MUI v6** (Material UI v6) is the recommended UI library for the Next.js FE (`geo_fe`).

Rationale:
- MUI v6 ships with first-class CSS variables support via `CssVarsProvider`, which maps directly
  to CSS custom properties — aligning with the token export format below.
- MUI v5 is also viable but lacks the CSS vars layer; v7 is still experimental as of 2026-05.
- MUI's `DataGrid` component covers the ranking table (US-014) and breakdown tables (US-015,
  US-016) with sorting, row highlighting, and virtualization out of the box.
- The MUI `LinearProgress`, `CircularProgress`, and status chip palette cover run states
  (queued / running / done / error / cancelled) with minimal custom code.

Flag: if the `geo_fe` repo has already pinned a specific MUI version in `package.json`, that
version takes precedence over this recommendation.

---

## Naming convention

This project uses: **semantic** (human-readable intent names, not Figma-mirror or raw scale names).

Rationale: B2B analytics dashboard with a small design surface. Semantic names keep the MUI theme
readable and reduce cognitive overhead when MUI theme overrides reference tokens directly.

Naming pattern:
- Color: `color.<role>.<variant>` → CSS: `--geo-color-<role>-<variant>` → MUI palette key
- Spacing: `spacing.<step>` → CSS: `--geo-sp-<step>` → MUI `spacing(n)`
- Typography: `text.<scale>` → CSS: `--geo-text-<scale>`
- Radius: `radius.<size>` → CSS: `--geo-radius-<size>`
- Shadow: `shadow.<level>` → CSS: `--geo-shadow-<level>`
- Motion: `motion.<property>` → CSS: `--geo-motion-<property>`

---

## Collections

### Color

| Token name (semantic) | Proposed value | CSS custom property | MUI palette key | Notes |
|----------------------|----------------|---------------------|-----------------|-------|
| `color.brand.primary` | `#1565C0` | `--geo-color-brand-primary` | `palette.primary.main` | Deep blue — professional B2B anchor |
| `color.brand.primary.dark` | `#0D47A1` | `--geo-color-brand-primary-dark` | `palette.primary.dark` | Hover/active state |
| `color.brand.primary.light` | `#1E88E5` | `--geo-color-brand-primary-light` | `palette.primary.light` | Tinted backgrounds, chips |
| `color.brand.accent` | `#00ACC1` | `--geo-color-brand-accent` | `palette.info.main` | Cyan accent — AI/LLM context highlights |
| `color.neutral.bg` | `#F5F7FA` | `--geo-color-neutral-bg` | `palette.background.default` | Page background |
| `color.neutral.surface` | `#FFFFFF` | `--geo-color-neutral-surface` | `palette.background.paper` | Cards, panels, table backgrounds |
| `color.neutral.border` | `#E0E4EB` | `--geo-color-neutral-border` | `palette.divider` | Table separators, card borders |
| `color.neutral.text.primary` | `#1A1F36` | `--geo-color-neutral-text-primary` | `palette.text.primary` | Body text, headings |
| `color.neutral.text.secondary` | `#6B7A99` | `--geo-color-neutral-text-secondary` | `palette.text.secondary` | Labels, captions, metadata |
| `color.neutral.text.disabled` | `#ADB5C8` | `--geo-color-neutral-text-disabled` | `palette.text.disabled` | Disabled fields |
| **Run status colors** | | | | |
| `color.status.running` | `#1565C0` | `--geo-color-status-running` | `palette.info.dark` | Running state chip (blue, animated) |
| `color.status.queued` | `#F57C00` | `--geo-color-status-queued` | `palette.warning.main` | Queued state chip (amber) |
| `color.status.done` | `#2E7D32` | `--geo-color-status-done` | `palette.success.main` | Done state chip (green) |
| `color.status.error` | `#C62828` | `--geo-color-status-error` | `palette.error.main` | Error state chip (red) |
| `color.status.cancelled` | `#546E7A` | `--geo-color-status-cancelled` | `palette.grey[600]` | Cancelled state chip (grey) |
| **Sentiment colors** | | | | |
| `color.sentiment.positive` | `#388E3C` | `--geo-color-sentiment-positive` | custom | Positive sentiment badge |
| `color.sentiment.neutral` | `#757575` | `--geo-color-sentiment-neutral` | custom | Neutral sentiment badge |
| `color.sentiment.negative` | `#D32F2F` | `--geo-color-sentiment-negative` | custom | Negative sentiment badge |
| **Score colors (AI Visibility Score gradient)** | | | | |
| `color.score.high` | `#2E7D32` | `--geo-color-score-high` | custom | Score ≥ 70 |
| `color.score.mid` | `#F57C00` | `--geo-color-score-mid` | custom | Score 30–69 |
| `color.score.low` | `#C62828` | `--geo-color-score-low` | custom | Score < 30 |

### Typography

| Token name | Value | CSS custom property | Notes |
|------------|-------|---------------------|-------|
| `text.font.primary` | `'Inter', sans-serif` | `--geo-font-primary` | Main UI font; system-ui fallback |
| `text.font.mono` | `'JetBrains Mono', monospace` | `--geo-font-mono` | Debug log panel, run IDs, query text |
| `text.scale.h1` | `2rem / 700` | `--geo-text-h1` | Page titles |
| `text.scale.h2` | `1.5rem / 600` | `--geo-text-h2` | Section headers (KPI panel, table titles) |
| `text.scale.h3` | `1.25rem / 600` | `--geo-text-h3` | Card titles, domain names |
| `text.scale.body1` | `1rem / 400` | `--geo-text-body1` | Body text (MUI default) |
| `text.scale.body2` | `0.875rem / 400` | `--geo-text-body2` | Secondary text, table cell content |
| `text.scale.caption` | `0.75rem / 400` | `--geo-text-caption` | Metadata, timestamps, chip labels |
| `text.scale.overline` | `0.625rem / 600 uppercase` | `--geo-text-overline` | Table column headers, section labels |
| `text.scale.kpi` | `2.5rem / 700` | `--geo-text-kpi` | AI Visibility Score display (large numeral) |
| `text.scale.mono.sm` | `0.8125rem / 400` | `--geo-text-mono-sm` | Debug log entries |

### Spacing (8px grid)

| Token name | Value | CSS custom property | MUI equivalent |
|------------|-------|---------------------|----------------|
| `spacing.1` | `8px` | `--geo-sp-1` | `spacing(1)` |
| `spacing.2` | `16px` | `--geo-sp-2` | `spacing(2)` |
| `spacing.3` | `24px` | `--geo-sp-3` | `spacing(3)` |
| `spacing.4` | `32px` | `--geo-sp-4` | `spacing(4)` |
| `spacing.5` | `40px` | `--geo-sp-5` | `spacing(5)` |
| `spacing.6` | `48px` | `--geo-sp-6` | `spacing(6)` |
| `spacing.8` | `64px` | `--geo-sp-8` | `spacing(8)` |
| `spacing.10` | `80px` | `--geo-sp-10` | `spacing(10)` |
| `spacing.page-x` | `32px` (desktop) / `16px` (mobile) | `--geo-sp-page-x` | Page horizontal padding |
| `spacing.page-y` | `32px` | `--geo-sp-page-y` | Page vertical padding from nav |

### Radius

| Token name | Value | CSS custom property | Usage |
|------------|-------|---------------------|-------|
| `radius.xs` | `4px` | `--geo-radius-xs` | Chips, badges, status pills |
| `radius.sm` | `6px` | `--geo-radius-sm` | Inputs, small buttons |
| `radius.md` | `8px` | `--geo-radius-md` | Cards, panels, dialogs |
| `radius.lg` | `12px` | `--geo-radius-lg` | KPI hero cards |
| `radius.full` | `9999px` | `--geo-radius-full` | Score ring, avatar |

### Shadows

| Token name | Value | CSS custom property | Usage |
|------------|-------|---------------------|-------|
| `shadow.card` | `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)` | `--geo-shadow-card` | Default card elevation |
| `shadow.panel` | `0 4px 12px rgba(0,0,0,0.10)` | `--geo-shadow-panel` | Side panels, dropdowns |
| `shadow.dialog` | `0 20px 60px rgba(0,0,0,0.16)` | `--geo-shadow-dialog` | Modal dialogs, drawers |

### Motion

| Token name | Value | CSS custom property | Usage |
|------------|-------|---------------------|-------|
| `motion.duration.fast` | `150ms` | `--geo-motion-fast` | Hover transitions, chips |
| `motion.duration.base` | `250ms` | `--geo-motion-base` | Page transitions, panel open/close |
| `motion.duration.slow` | `400ms` | `--geo-motion-slow` | Run progress bar animation |
| `motion.easing.standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | `--geo-motion-ease-std` | MUI default |
| `motion.easing.enter` | `cubic-bezier(0.0, 0, 0.2, 1)` | `--geo-motion-ease-in` | Elements entering |
| `motion.easing.exit` | `cubic-bezier(0.4, 0, 1, 1)` | `--geo-motion-ease-out` | Elements leaving |
| `motion.animation.pulse` | `pulse 1.4s ease-in-out infinite` | `--geo-motion-pulse` | Running state chip indicator |

---

## Project-specific notes

### Run status color system

Run status is a first-class visual concept in this dashboard. The five states (queued, running,
done, error, cancelled) each have a dedicated semantic color token. The `running` state uses the
brand primary blue with a CSS `pulse` animation on the status indicator dot. Implementation
must never use raw hex values — always reference `color.status.*` tokens.

### AI Visibility Score display

The score [0–100] uses a three-band color system (`color.score.high/mid/low`) applied to:
- The large KPI numeral (`text.scale.kpi`)
- A circular progress ring on SC-010 (Run Results screen)
- The score column in the ranking table (SC-011)

### Debug log panel

The debug log panel (US-018, SC-009) uses `text.font.mono` exclusively. Log entries use
`text.scale.mono.sm`. Background is `color.neutral.bg` with a subtle inner shadow.

### Dark mode

Dark mode is NOT in scope for MVP. The token set is designed to be extended to dark mode by
swapping the `color.neutral.*` and `color.brand.*` surface tokens. No `Colors Dark.json` export
is planned until post-MVP.

### No shared design system yet (OQ-DESIGN-001)

The AionSoft shared Figma design system does not yet exist for this project. All tokens above are
`proposed by agent`. Before Sprint 4 frontend implementation begins:
1. A human designer must ratify and encode these tokens as Figma variables.
2. Figma JSON exports must land in `tokens/raw/`.
3. `figma-links.md` must be populated with the fileKey and per-screen nodeIds.
4. `project-bindings.md` must be updated with the confirmed `figma_file_key`.
