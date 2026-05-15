# Project Bindings — Geo-SmartAudit Platform

> The bridge between the design system and this project's code. Stack-specific values live
> here so the universal contract stays universal.
>
> The project frontend implementer agent (e.g. `nextjs-frontend-architect`) reads this file.
> Update it when any of the values change.
>
> **Note on FE repo:** The frontend lives in the separate repo `geo_fe` (Next.js). Per ADR-001
> (KB-split model G), `L1_design/` lives in the FE consumer repo. This copy is in `geo_be`
> (the canonical KB repo) as the authoritative design contract. When `geo_fe` is bootstrapped
> with `--frontend`, it reads this via `.kb-source`.

---

## Stack

| Key | Value |
|-----|-------|
| `framework` | `next@15` (assumed; confirm from `geo_fe/package.json` when repo is created) |
| `ui_library` | `mui@6` (recommended — see `design-tokens.md` for rationale; confirm actual version from `geo_fe/package.json`) |
| `language` | `typescript` |
| `router` | Next.js App Router (`src/app/` or `app/` directory convention) |

---

## Code paths (in `geo_fe` repo)

| Key | Value |
|-----|-------|
| `theme_path` | `src/theme/index.ts` |
| `import_alias` | `@/theme` |
| `components_path` | `src/components/` |
| `styles_path` | `src/styles/tokens.css` |
| `app_router_root` | `src/app/` |

---

## Route → file mapping (planned)

| Screen ID | Route | Expected file path in `geo_fe` |
|-----------|-------|-------------------------------|
| SC-001 | `/login` | `src/app/login/page.tsx` |
| SC-010 | `/domains` | `src/app/domains/page.tsx` |
| SC-011 | `/domains/new` | `src/app/domains/new/page.tsx` |
| SC-012 | `/domains/[clientKey]` | `src/app/domains/[clientKey]/page.tsx` |
| SC-013 | `/domains/[clientKey]/edit` | `src/app/domains/[clientKey]/edit/page.tsx` |
| SC-020 | `/domains/[clientKey]/runs/new` | `src/app/domains/[clientKey]/runs/new/page.tsx` |
| SC-021 | `/domains/[clientKey]/runs/[runId]` | `src/app/domains/[clientKey]/runs/[runId]/page.tsx` |
| SC-030 | `/domains/[clientKey]/runs/[runId]/results/overview` | `src/app/domains/[clientKey]/runs/[runId]/results/(results)/overview/page.tsx` |
| SC-031 | `/domains/[clientKey]/runs/[runId]/results/ranking` | `src/app/domains/[clientKey]/runs/[runId]/results/(results)/ranking/page.tsx` |
| SC-032 | `/domains/[clientKey]/runs/[runId]/results/keywords` | `src/app/domains/[clientKey]/runs/[runId]/results/(results)/keywords/page.tsx` |
| SC-033 | `/domains/[clientKey]/runs/[runId]/results/personas` | `src/app/domains/[clientKey]/runs/[runId]/results/(results)/personas/page.tsx` |
| SC-040 | `/admin/users` | `src/app/admin/users/page.tsx` |
| SC-041 | `/admin/runs` | `src/app/admin/runs/page.tsx` |
| SC-042 | `/admin/profiles` | `src/app/admin/profiles/page.tsx` |
| SC-043 | `/admin/domains` | `src/app/admin/domains/page.tsx` |

Note: Admin routes should be wrapped in a layout that enforces `role=admin` guard,
mapping to AC-004. SC-031–SC-033 use sub-routes under `(results)` route group (OQ-028 resolved).

---

## Figma binding

| Key | Value |
|-----|-------|
| `figma_file_key` | _(not yet created — pending OQ-DESIGN-001; update when Figma file is set up)_ |
| `default_node_id` | _(pending — will be the Cover frame node ID)_ |

---

## Token export

| Key | Value |
|-----|-------|
| `naming_convention` | `semantic` (see `design-tokens.md`) |
| `token_export_format` | CSS custom properties + MUI theme object (`src/theme/index.ts`) |
| `css_custom_props_file` | `src/styles/tokens.css` |
| `mui_theme_provider` | `CssVarsProvider` from `@mui/material/styles` (MUI v6 CSS vars mode) |

---

## MUI theme wiring plan

The MUI theme object at `src/theme/index.ts` must implement the following palette keys as
direct references to the CSS custom properties defined in `src/styles/tokens.css`:

```
palette.primary.main       → --geo-color-brand-primary
palette.primary.dark       → --geo-color-brand-primary-dark
palette.primary.light      → --geo-color-brand-primary-light
palette.info.main          → --geo-color-brand-accent
palette.background.default → --geo-color-neutral-bg
palette.background.paper   → --geo-color-neutral-surface
palette.divider            → --geo-color-neutral-border
palette.text.primary       → --geo-color-neutral-text-primary
palette.text.secondary     → --geo-color-neutral-text-secondary
palette.text.disabled      → --geo-color-neutral-text-disabled
palette.success.main       → --geo-color-status-done
palette.warning.main       → --geo-color-status-queued
palette.error.main         → --geo-color-status-error
```

Custom palette extensions needed (not in MUI defaults):
- `palette.status.running` → `--geo-color-status-running`
- `palette.status.cancelled` → `--geo-color-status-cancelled`
- `palette.sentiment.positive/neutral/negative` → sentiment colors
- `palette.score.high/mid/low` → score band colors

Typography overrides:
- `typography.fontFamily` → `'Inter', system-ui, sans-serif`
- `typography.h1/h2/h3/body1/body2/caption/overline` → per `design-tokens.md` scale
- Custom `kpi` variant: `2.5rem / 700` — register via `typography.variants` extension
- Custom `mono` variant: `'JetBrains Mono', monospace` / `0.8125rem` — for debug log panel

Spacing:
- `spacing` unit = `8px` (MUI default — do not override the scale unit)

Border radius:
- `shape.borderRadius` = `8` (px — maps to `radius.md` as MUI default)
- Per-component radius overrides in `components.MuiCard`, `components.MuiChip`, etc.

---

## Frontend implementer agent

The project agent that consumes this folder:
`nextjs-frontend-architect` at `.claude/agents/nextjs-frontend-architect.md`
(to be created for the `geo_fe` repo, or adapted from the platform template at
`~/.aionsoft/core/templates/nextjs-frontend/`).

---

## Notes

- **Results sub-navigation (OQ-028 resolved):** SC-030–SC-033 use separate sub-routes under a
  Next.js route group `(results)`. Implement a shared layout at
  `src/app/domains/[clientKey]/runs/[runId]/results/(results)/layout.tsx` containing MUI Tabs
  navigation. Each tab maps to its own `page.tsx`. The bare `/results` path should redirect to
  `/results/overview`. This enables deep-linking so analysts can share a direct URL to any
  results tab with clients.

- **Auth flow integration:** Keycloak OIDC is handled by NextAuth.js or a custom Keycloak
  adapter. The middleware file (`src/middleware.ts`) enforces route protection. SC-001 is a
  thin shell — Keycloak hosts the actual login form. Confirm the NextAuth.js version and
  Keycloak adapter before wiring `session` objects to `UserProfile` data.

- **Polling implementation:** US-009 polling (10s interval per AC-016) must be implemented
  without blocking server-side rendering. Recommended: SWR `refreshInterval` or React Query
  `refetchInterval` on the client component for SC-021. Do not poll from a server component.

- **DataGrid license:** MUI DataGrid Community edition is sufficient for sorting and basic
  features (SC-031, SC-032, SC-033, SC-040, SC-041, SC-042, SC-043). If row grouping or
  advanced export is needed post-MVP, MUI DataGrid Pro license is required.

- **Tokens/raw status:** `tokens/raw/` is empty (`.gitkeep` only). No Figma file exists yet.
  See OQ-DESIGN-001. The CSS custom properties in `src/styles/tokens.css` should be
  hand-authored from `design-tokens.md` values until Figma exports are available.
