# Screen Inventory — Geo-SmartAudit Platform

> Every screen in the project. Every row cites at least one US/AC ID (traceability rule).
> A screen with no traceability ID fails the `design-consistency` check.
>
> **Mode:** Forward (no Figma file yet). All screens are `proposed`. Figma node IDs will be
> populated in `figma-links.md` once a file is created.
>
> **Layout:** Desktop-first responsive. The platform is a B2B analytics tool consumed on
> laptops/monitors. Mobile layout is secondary but not out-of-scope — min-width breakpoint
> guidance in `patterns/layouts.md`.

---

## ID scheme: SC-NNN (three-digit, sequential, thematic ranges)

| Range | Thematic group |
|-------|---------------|
| SC-001 | Auth |
| SC-010–SC-012 | Domain management |
| SC-020–SC-023 | Run lifecycle (configure / monitor / results) |
| SC-030–SC-032 | Run results (KPI / ranking / breakdowns) |
| SC-040–SC-043 | Admin |

---

## Group 1 — Auth (SC-001)

| Screen ID | Screen name | Route | Implements | Status | Figma | Layout | Notes |
|-----------|-------------|-------|------------|--------|-------|--------|-------|
| SC-001 | Login / SSO handoff | `/login` | US-001; AC-001, AC-002, AC-003 | proposed | — | full-page centered | Thin shell: Next.js redirects unauthenticated users here; Keycloak handles the actual auth UI. This screen shows a branded loading/redirect state while the OAuth flow runs. No form rendered by geo_fe. |

---

## Group 2 — Domain management (SC-010–SC-012)

| Screen ID | Screen name | Route | Implements | Status | Figma | Layout | Notes |
|-----------|-------------|-------|------------|--------|-------|--------|-------|
| SC-010 | Domains dashboard | `/domains` | US-004; AC-008 | proposed | — | full-page two-column grid | Primary landing page after login. Grid of domain cards, each showing clientKey, targetDomain, brand, and most recent run status + date. Search/filter bar at top. "New domain" CTA button. |
| SC-011 | Create domain | `/domains/new` | US-003; AC-005, AC-006, AC-007 | proposed | — | full-page centered form (max 640px) | Form: clientKey, targetDomain, brand (required), aliases (tag input, optional), settori (tag input, optional). Inline validation on all required fields. clientKey uniqueness check on blur (async). |
| SC-012 | Domain homepage (run history) | `/domains/[clientKey]` | US-006, US-011; AC-010, AC-018 | proposed | — | full-page master-detail | Left/top: domain info card (brand, targetDomain, clientKey, settori, aliases). Main: run history table ordered by timestamp descending. Columns: runId, status chip, profileKey, runIterations, startedAt. Row click → SC-021 (run detail). "New run" CTA always visible. |
| SC-013 | Edit domain | `/domains/[clientKey]/edit` | US-005; AC-009 | proposed | — | full-page centered form (max 640px) | Same form as SC-011 but clientKey is read-only (locked field). Only brand, aliases, settori are editable. Save confirmation toast on success. |

---

## Group 3 — Run lifecycle (SC-020–SC-023)

| Screen ID | Screen name | Route | Implements | Status | Figma | Layout | Notes |
|-----------|-------------|-------|------------|--------|-------|--------|-------|
| SC-020 | New run configurator | `/domains/[clientKey]/runs/new` | US-007, US-008; AC-011, AC-012, AC-013, AC-014, AC-015 | proposed | — | full-page centered form (max 720px) | Two-section form. Required: profileKey dropdown (shows provider + models on selection per AC-012), runIterations number input. Optional (collapsible section): keywords override (tag input), locale select (multi), testMode toggle, debugMode toggle. Submit → triggers run start. If queued (AC-013): shows "Run queued" banner with queue position indicator before redirecting to SC-021. |
| SC-021 | Run detail / monitor | `/domains/[clientKey]/runs/[runId]` | US-009, US-010, US-012; AC-015, AC-016, AC-017, AC-019, AC-028, AC-042, AC-043, AC-044, AC-045 | proposed | — | full-page detail | Top strip: runId, status chip (animated if running), startedAt, profileKey, config summary (iterations, locale, testMode, debugMode). Progress section (visible if running/queued): query counters bar (planned / done / error) polling every 10s. Cancel button (visible if status=`running` OR status=`queued`, implements US-010 — OQ-027 resolved). Config detail accordion (AC-019). Debug log panel (collapsed by default, visible only if debugMode=true, US-018). Auto-transitions to results section or redirects to SC-030 `/overview` when status→done (AC-017). |
| SC-022 | Run queued banner | (inline state of SC-020 or SC-021) | US-008, US-010, US-026; AC-013, AC-040, AC-041, AC-045 | proposed | — | inline overlay / banner | Not a separate route — rendered as a full-width info banner on SC-021 when run status is `queued`. Shows queue position (OQ-DESIGN-002), estimated wait, note that promotion is automatic, and "Annulla" button (OQ-027 resolved: queued runs are cancellable — E-009 handles direct cancel without n8n call). |

---

## Group 4 — Run results (SC-030–SC-033)

| Screen ID | Screen name | Route | Implements | Status | Figma | Layout | Notes |
|-----------|-------------|-------|------------|--------|-------|--------|-------|
| SC-030 | Results overview (KPI panel) | `/domains/[clientKey]/runs/[runId]/results/overview` | US-013, US-017; AC-020, AC-021, AC-026, AC-027 | proposed | — | full-page tabbed or sectioned | Hero section: AI Visibility Score (large circular gauge or bold numeral), avg rank, link rate, sentiment breakdown (three-bar or donut). Target brand highlighted per AC-023. Google Drive report links section (AC-026) with "Download .xlsx" and "Download .md" CTAs. Error state if Drive upload failed (AC-027). MUI Tabs in shared `(results)` layout navigate to SC-031, SC-032, SC-033. Bare `/results` redirects here (OQ-028 resolved). |
| SC-031 | Brand ranking table | `/domains/[clientKey]/runs/[runId]/results/ranking` | US-014; AC-022, AC-023 | proposed | — | full-page table | Sortable DataGrid: columns rank, brand, AI Visibility Score (color-coded), mentions, avgRank, linkRate, sentiment (pos/neut/neg). Target brand pinned in a separate "Focus sul target" card above the table (AC-023). Export to CSV optional (OQ-DESIGN-003). |
| SC-032 | Keyword breakdown table | `/domains/[clientKey]/runs/[runId]/results/keywords` | US-015; AC-024 | proposed | — | full-page table | DataGrid: columns keyword, queries executed, visibility %, avgRank, linkRate %, target mentions. Sortable. Clicking a keyword row could filter SC-031 to that keyword (OQ-DESIGN-004). |
| SC-033 | Persona breakdown table | `/domains/[clientKey]/runs/[runId]/results/personas` | US-016; AC-025 | proposed | — | full-page table | DataGrid: columns persona name, queries executed, visibility %, avgRank, linkRate %, target mentions. Sortable. Layout mirrors SC-032. |

---

## Group 5 — Admin (SC-040–SC-043)

| Screen ID | Screen name | Route | Implements | Status | Figma | Layout | Notes |
|-----------|-------------|-------|------------|--------|-------|--------|-------|
| SC-040 | Admin: user management | `/admin/users` | US-023, US-002; AC-037, AC-004 | proposed | — | full-page table + drawer | Table of analyst accounts (email, role, clientKeys[], status active/inactive). Create button opens drawer form: email, role, clientKeys multi-select. Deactivate toggle per row. Route is 403-guarded for analyst role (US-002). |
| SC-041 | Admin: global run monitor | `/admin/runs` | US-024; AC-038 | proposed | — | full-page table | Global run table (all domains, all analysts). Columns: runId, domain/clientKey, analyst email, status chip, profileKey, startedAt, duration. No clientKey filter — admin sees all (AC-038). Search by domain or analyst. |
| SC-042 | Admin: LLM profile management | `/admin/profiles` | US-025; AC-039 | proposed | — | full-page table + drawer | Table of LLM profiles (profileKey, llmProvider, runModel, qgenModel, nerModel). Create/edit drawer: all fields per Profile entity in domain model. Changes immediately visible in SC-020 configurator for all analysts (AC-039). |
| SC-043 | Admin: domain management (all) | `/admin/domains` | US-002, US-024; AC-004, AC-038 | proposed | — | full-page table | Read-only view of all domains across all clientKeys (admin oversight). Differentiates from SC-010 which is analyst-filtered. Links to SC-012 for domain detail. |

---

## Engine API — no UI screens

US-019, US-020, US-021, US-022, US-026 are implemented as BE engine-API endpoints consumed by
n8n (service account). They have no FE screens. Their run-state effects surface visually on
SC-021 (run monitor polling) and SC-030–SC-033 (results). Traceability is maintained via
the screen-level notes above; no orphan UI exists.

---

## Must-priority US coverage check

| US | Priority | Covered by screen(s) | Gap? |
|----|----------|---------------------|------|
| US-001 | must | SC-001 | none |
| US-003 | must | SC-011 | none |
| US-004 | must | SC-010 | none |
| US-006 | must | SC-012 | none |
| US-007 | must | SC-020 | none |
| US-008 | must | SC-020, SC-021, SC-022 | none |
| US-009 | must | SC-021 | none |
| US-011 | must | SC-012 | none |
| US-013 | must | SC-030 | none |
| US-014 | must | SC-031 | none |
| US-015 | must | SC-032 | none |
| US-016 | must | SC-033 | none |
| US-017 | must | SC-030 | none |
| US-019 | must | no UI (engine API) | intentional — BE only |
| US-020 | must | no UI (engine API) | intentional — BE only |
| US-021 | must | no UI (engine API) | intentional — BE only |
| US-022 | must | no UI (engine API) | intentional — BE only |
| US-026 | must | SC-022 (queue banner), SC-021 (state polling) | none |

All must-priority user-facing USs have at least one screen. Engine USs (US-019–022, US-026) are
BE-only with no FE screen required.

---

**Companion files:**
- `figma-links.md` — frame URLs and node IDs for each screen (stub — no Figma file yet)
- `states-and-empty.md` — loading / error / empty / populated states per screen
