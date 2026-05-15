# Figma Links — Geo-SmartAudit Platform

> Canonical Figma URLs and frame anchors. Used by `idea-to-design` and `design-to-code` skills.
>
> **Current state: STUB — no Figma file exists yet.**
> OQ-DESIGN-001: A project Figma file and the AionSoft shared design system must be created
> before this file can be populated with real nodeIds and URLs.
>
> The structure below is the target state — fill in fileKey and nodeIds once the Figma file
> is set up. Every row maps to a screen in `screen-inventory.md`.

---

## Project Figma file

| Key | Value |
|-----|-------|
| **URL** | _(not yet created — pending OQ-DESIGN-001)_ |
| **`fileKey`** | _(extract from URL once created; e.g. `AbCdEfGhIjKlMnOp1234`)_ |
| **Default node ID** | _(first/cover frame of the project file)_ |
| **File name convention** | `Geo-SmartAudit — UI Design` |
| **Figma pages to create** | `Cover`, `Design System Ref`, `Auth`, `Domains`, `Run Lifecycle`, `Results`, `Admin`, `States & Empty`, `Archive` |

---

## Frame anchors per screen

When the Figma file is created, one canonical frame per screen must be registered here.
Format: `https://www.figma.com/file/<fileKey>/Geo-SmartAudit?node-id=<nodeId-hyphenated>`

| Screen ID | Screen name | Node ID | Direct link | Page in Figma |
|-----------|-------------|---------|-------------|---------------|
| SC-001 | Login / SSO handoff | _(pending)_ | _(pending)_ | Auth |
| SC-010 | Domains dashboard | _(pending)_ | _(pending)_ | Domains |
| SC-011 | Create domain | _(pending)_ | _(pending)_ | Domains |
| SC-012 | Domain homepage (run history) | _(pending)_ | _(pending)_ | Domains |
| SC-013 | Edit domain | _(pending)_ | _(pending)_ | Domains |
| SC-020 | New run configurator | _(pending)_ | _(pending)_ | Run Lifecycle |
| SC-021 | Run detail / monitor | _(pending)_ | _(pending)_ | Run Lifecycle |
| SC-022 | Run queued banner | _(pending — inline state frame inside SC-021)_ | _(pending)_ | States & Empty |
| SC-030 | Results overview (KPI panel) | _(pending)_ | _(pending)_ | Results |
| SC-031 | Brand ranking table | _(pending)_ | _(pending)_ | Results |
| SC-032 | Keyword breakdown table | _(pending)_ | _(pending)_ | Results |
| SC-033 | Persona breakdown table | _(pending)_ | _(pending)_ | Results |
| SC-040 | Admin: user management | _(pending)_ | _(pending)_ | Admin |
| SC-041 | Admin: global run monitor | _(pending)_ | _(pending)_ | Admin |
| SC-042 | Admin: LLM profile management | _(pending)_ | _(pending)_ | Admin |
| SC-043 | Admin: domain management (all) | _(pending)_ | _(pending)_ | Admin |

---

## State variant frames (States & Empty page)

Per screen, four state frames should exist as variants or separate frames on the
"States & Empty" Figma page. Register them here once created.

| Screen ID | State | Node ID | Notes |
|-----------|-------|---------|-------|
| SC-010 | loading (skeleton) | _(pending)_ | Grid skeleton |
| SC-010 | empty (first-use) | _(pending)_ | Zero-domain state |
| SC-010 | error | _(pending)_ | System error banner |
| SC-010 | populated | _(pending)_ | → same as main frame |
| SC-012 | loading | _(pending)_ | |
| SC-012 | empty (no runs) | _(pending)_ | First-use for domain |
| SC-021 | loading | _(pending)_ | |
| SC-021 | queued sub-state | _(pending)_ | SC-022 banner visible |
| SC-021 | running sub-state | _(pending)_ | Animated progress bar |
| SC-021 | done sub-state | _(pending)_ | Results CTA visible |
| SC-021 | error sub-state | _(pending)_ | Error alert visible |
| SC-021 | cancelled sub-state | _(pending)_ | Cancelled info banner |
| SC-030 | zero visibility | _(pending)_ | Score=0, rank=N/D |
| SC-030 | Drive error partial | _(pending)_ | KPI visible, Drive warning |
| _(others)_ | _(all 4 states)_ | _(pending)_ | Follow same pattern |

---

## Component library frames

When the AionSoft shared design system Figma file is created (OQ-DESIGN-001), or when
this project creates a local component library page, register component anchors here.

| Component family | File / Page | Node ID | Notes |
|------------------|-------------|---------|-------|
| Buttons | Geo-SmartAudit / Design System Ref | _(pending)_ | Primary, Secondary, Destructive, Icon-only |
| Status chips | Geo-SmartAudit / Design System Ref | _(pending)_ | queued, running, done, error, cancelled |
| DataGrid (table) | Geo-SmartAudit / Design System Ref | _(pending)_ | MUI DataGrid overrides |
| KPI cards | Geo-SmartAudit / Design System Ref | _(pending)_ | Score ring, metric chip |
| Domain cards | Geo-SmartAudit / Design System Ref | _(pending)_ | Used in SC-010 |
| Run list row | Geo-SmartAudit / Design System Ref | _(pending)_ | Used in SC-012, SC-041 |
| Form drawer | Geo-SmartAudit / Design System Ref | _(pending)_ | Create/edit patterns |
| Debug log panel | Geo-SmartAudit / Design System Ref | _(pending)_ | Monospace, scrollable |
| Progress bar (run) | Geo-SmartAudit / Design System Ref | _(pending)_ | query counter visualization |
| Skeleton placeholders | Geo-SmartAudit / Design System Ref | _(pending)_ | Per-screen skeleton variants |
| Sentiment bar | Geo-SmartAudit / Design System Ref | _(pending)_ | Three-segment horizontal bar |
| Score gauge | Geo-SmartAudit / Design System Ref | _(pending)_ | Circular or large numeral |

---

## How to populate this file

1. Create the Figma project file named `Geo-SmartAudit — UI Design`.
2. Extract the `fileKey` from the URL (segment between `/file/` and the next `/`).
3. Update `project-bindings.md` with the `figma_file_key`.
4. For each screen, create a top-level frame on the designated Figma page.
5. Copy the node ID from Figma (right-click frame → Copy link, extract `node-id` param).
6. Replace every `_(pending)_` entry above with the real node ID and full URL.
7. Export Figma variables as JSON into `tokens/raw/` — one file per collection.
8. Run `idea-to-design` skill to validate that frames are addressable and tokens are wired.
