# Layouts

> Cross-screen layout patterns for Geo-SmartAudit Platform.
> Applies to: all screens (SC-001 through SC-043).

## Page shell

All authenticated screens share a common shell:
- **Top nav bar**: `64px` height, `color.neutral.surface` background, `shadow.card` bottom.
  Contains: product logo (left), breadcrumb nav (centre-left), user avatar + role badge (right).
- **Page content area**: below nav bar, `color.neutral.bg` background.
  Horizontal padding: `spacing.page-x` (32px desktop / 16px mobile).
  Vertical padding from nav: `spacing.page-y` (32px top).

SC-001 (login) is a full-page unauthenticated shell: no top nav, centred content, `color.neutral.bg` background.

## Breakpoints (desktop-first)

| Breakpoint | Name | Min width | Layout behaviour |
|------------|------|-----------|-----------------|
| `xl` | widescreen | 1536px | max content width 1400px, centred |
| `lg` | desktop | 1200px | max content width 1200px (default) |
| `md` | tablet | 900px | single column, side panel stacks |
| `sm` | mobile | 600px | single column, table → card list |
| `xs` | small mobile | 0px | full width, no horizontal padding |

MUI `useMediaQuery` / `Breakpoint` system. 8px grid throughout.

## Content width

| Screen type | Max width | Notes |
|-------------|-----------|-------|
| Full-width table/grid | 100% (no max) | SC-010, SC-012, SC-031–SC-033, SC-040–SC-043 |
| Centred form | `640px` | SC-011, SC-013 |
| Wide form (multi-section) | `720px` | SC-020 |
| Full-page detail | 100% | SC-021, SC-030 |

## Drawer pattern (create/edit forms)

Admin create/edit forms (SC-040, SC-042) and any future create-from-list patterns use a
`MuiDrawer` anchored to the right, `480px` width on desktop, full-width on mobile.
The underlying list screen dims (`rgba(0,0,0,0.4)` backdrop) but does not navigate away.
This avoids full-page navigation for quick create/edit operations.

## Tab / sub-nav pattern (results section)

SC-030–SC-033 share a sticky sub-navigation bar below the page header.
Options (OQ-DESIGN-008): MUI `Tabs` with `value` controlled by URL hash, or separate routes.
Recommended for MVP: MUI `Tabs` with hash-based scroll anchors on a single `/results` page —
simpler to implement, keeps KPI context visible while switching breakdown views.

## Mobile adaptations (secondary priority)

- Run history table (SC-012) → card list on `sm` breakpoint. Each card shows status chip,
  runId abbreviated, and start date. Click → SC-021.
- DataGrid tables (SC-031–SC-033, SC-040–SC-043) → horizontal scroll on `sm` / `md`.
  Column pinning: rank/brand (SC-031), keyword (SC-032), persona (SC-033), email (SC-040).
- KPI panel (SC-030) → single column stack on `md` and below.
- Run configurator form (SC-020) → single column on `sm`.
