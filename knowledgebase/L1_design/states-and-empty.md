# States & Empty — Geo-SmartAudit Platform

> For every screen in `screen-inventory.md`: all four states documented.
> State pattern: **loading → error → empty/zero-data → populated (success)**.
>
> Error tier convention (aligned with backend-architect P4):
> - **auth** errors: 401 → redirect to SC-001 (login); 403 → inline Forbidden page
> - **business** errors: 409 Conflict / 422 Unprocessable → inline toast or field-level validation
> - **system** errors: 500 / network timeout → toast with retry CTA + optional banner
>
> Loading threshold: skeleton shown immediately; spinner escalation at >2s (OQ-DESIGN-005 —
> exact threshold to be confirmed with team-conventions).
>
> Empty state distinction: **first-use empty** (no data has ever existed) vs
> **filtered-empty** (data exists but current filter excludes everything).

---

## SC-001 — Login / SSO handoff

**Loading state**
Pattern: full-page centered spinner + branded logo. Shown while Next.js middleware validates
session or while Keycloak OAuth redirect is in-flight. No skeleton (nothing to skeleton).
Duration: until redirect completes (typically < 1s; no timeout escalation needed).
AC reference: AC-001, AC-002.

**Error state**
- auth: Keycloak returns an error (invalid credentials, account locked) → Keycloak handles
  the error display natively; geo_fe shows a "Login fallito — riprova" banner on redirect
  back, with a link to retry. AC-003.
- system: If the Keycloak server is unreachable, show a full-page "Servizio non disponibile"
  message with a "Riprova" button. No retry loop — one manual trigger.

**Empty state**
Not applicable — this screen has no data-dependent content. The unauthenticated state IS the
"empty" state. When unauthenticated users reach any route, they see SC-001 immediately (AC-001).

**Populated (success) state**
Authenticated session established: immediate redirect to SC-010 (Domains dashboard). SC-001
is never shown to authenticated users. AC-002.

---

## SC-010 — Domains dashboard

**Loading state**
Pattern: skeleton grid — 4–6 domain card placeholders (grey animated shimmer), matching the
expected card dimensions. Skeleton is shown on first load and on hard refresh.
Threshold: skeleton immediately; if >5s with no response, escalate to system error state.

**Error state**
- system (500 / network): full-width error banner "Impossibile caricare i domini. Riprova."
  with a "Ricarica" button. The grid area shows a single error illustration (no skeletons).
- auth (401): redirect to SC-001. If token expires mid-session, Next.js middleware intercepts.

**Empty state (first-use)**
Analyst has no domains assigned yet (UserProfile.clientKeys[] is empty).
Show: centered illustration + copy "Nessun dominio ancora — crea il tuo primo cliente."
+ prominent "Crea dominio" CTA button. This is the onboarding zero state. AC-008.

**Populated state**
Grid of domain cards. Each card:
- Domain name (brand) as card title — `text.scale.h3`
- clientKey as caption — `text.scale.caption`, monospace
- targetDomain — `text.scale.body2`
- Settori tags — up to 3 shown, "+N more" chip if overflow
- Last run: status chip (color-coded per `color.status.*`) + relative timestamp
  (e.g. "3 giorni fa") or "Nessuna run" if no runs yet
- Card is fully clickable → SC-012
"New domain" FAB or header button always visible. AC-008.

---

## SC-011 — Create domain

**Loading state**
The form fields render immediately (no async data needed to show the form).
The only async moment: clientKey uniqueness check on blur → inline spinner in the field
suffix while the BE call is in flight (< 500ms expected). No full-page loading state.

**Error state**
- business (409): clientKey already exists → red inline validation message below the
  clientKey field: "Questo clientKey è già in uso." AC-006.
- business (422): BE returns field-level validation errors → map to inline field messages.
- system (500): toast "Errore durante la creazione del dominio. Riprova." with retry.
- auth (403): should not occur (all analysts can create domains); if it does, redirect to
  SC-010 with an error toast.

**Empty state**
Not applicable — this is a creation form. Its initial state IS the "empty" state: all fields
blank (required fields show placeholder text). Inline validation activates on first blur.
AC-007 drives the FE validation: clientKey, targetDomain, brand are required before submit.

**Populated state**
Form submitted successfully → toast "Dominio creato con successo." + redirect to SC-012
(domain homepage). The new domain is immediately visible in SC-010. AC-005.

---

## SC-012 — Domain homepage (run history)

**Loading state**
Pattern: top domain info card — skeleton (two lines: brand name, targetDomain + clientKey).
Run history table — skeleton rows (4–6 animated placeholder rows with status chip skeleton).
Shown on initial navigation to the route.

**Error state**
- system (500 / network): "Impossibile caricare la cronologia delle run." banner with retry.
  Domain info card still renders (from route params) so the user is not stranded.
- auth (403): this domain's clientKey is not in the user's UserProfile.clientKeys[] → show
  "Accesso negato" full-page message with back link to SC-010. AC-008 enforcement in UI.

**Empty state (first-use)**
Domain exists but has no runs yet.
Run history section shows: centered copy "Nessuna run ancora — avvia la prima analisi."
+ prominent "Nuova run" CTA button. Domain info card renders normally. AC-010.

**Populated state**
Domain info card (brand, targetDomain, clientKey, settori badges, aliases list).
Run history table — columns: runId (monospace truncated), status chip, profileKey, model
(qgenModel from snapshot), runIterations, startedAt (formatted date + relative time).
Rows clickable → SC-021. "Nuova run" button in header always visible. AC-010, AC-018.

---

## SC-013 — Edit domain

**Loading state**
Form renders immediately. clientKey field is read-only from route params — no async load
needed for the clientKey itself. Brand, aliases, settori are loaded from the domain record:
show skeleton input placeholders while fetching, then populate. Typical fetch < 300ms.

**Error state**
- system (500): "Impossibile salvare le modifiche. Riprova." toast.
- business (422): field-level validation errors from BE → inline messages.

**Empty state**
Not applicable — edit form always has pre-populated data. If the domain record is not found
(404), show a "Dominio non trovato" full-page error with back link to SC-010.

**Populated state**
Form pre-filled: brand, aliases (tag chips), settori (tag chips). clientKey locked/greyed.
On save success: toast "Modifiche salvate." + redirect back to SC-012. AC-009.

---

## SC-020 — New run configurator

**Loading state**
The form has two async dependencies:
1. LLM profiles list (for the profileKey dropdown) — load on mount. While loading: dropdown
   shows skeleton/disabled state with "Caricamento profili..." placeholder.
2. On profileKey selection: model details displayed inline — show a small spinner in the
   model summary row while fetching profile details. AC-012.
No full-page skeleton needed; the rest of the form renders immediately.

**Error state**
- system: profiles list fails to load → "Impossibile caricare i profili LLM. Riprova." inline
  error inside the dropdown, with a retry link.
- business (on submit): n8n not reachable → BE returns error → toast "Avvio run fallito: n8n
  non raggiungibile." + run created in `error` state, analyst redirected to SC-021 showing
  the error. AC-014.
- business (validation): required fields missing → inline field errors. AC-011.
- system (500 generic on submit): toast "Errore interno. Riprova."

**Empty state**
Not applicable — this is a creation form. All optional fields (keywords override, locale,
testMode, debugMode) start blank or at defaults. The optional section is collapsible with a
sensible label: "Opzioni avanzate (facoltativo)".

**Populated state**
Form ready to submit: profileKey selected (models shown beneath selector), runIterations ≥ 1.
On submit → if no concurrent running run for this domain: run created as `running`, redirect
to SC-021 with "Run avviata" success banner. If a running run exists: run created as `queued`,
SC-022 banner shown on SC-021 with queue context. AC-013, AC-015.

---

## SC-021 — Run detail / monitor

This screen has multiple sub-states within "populated" depending on run status.

**Loading state**
Pattern: skeleton for the top status strip (runId, status chip, timestamp). Progress section
(query counters) skeleton — three counter blocks with animated shimmer. Config accordion
collapsed by default (no loading state needed). Debug log panel hidden until content loads.
Shown on first navigation to the route.

**Error state**
- system (polling failure): if 3 consecutive polling calls fail → "Aggiornamento automatico
  sospeso. Connessione assente." warning banner + "Riprova" button to resume polling.
  The last-known counters remain visible (stale data indicator: "Ultimo aggiornamento: N min fa").
  OQ-DESIGN-006 — stale data threshold.
- run in `error` status: the run itself is in terminal error state. Status chip turns red.
  Error message from `georuns.errorMessage` shown in a prominent alert box. No cancel button.
  Config detail accordion still accessible. AC-036.
- auth (403): redirect to SC-010.

**Empty state (queued)**
Run status is `queued` — it is not yet in progress. This is the "waiting" empty state, not
a zero-data state. Show:
- Status chip: "In coda" (amber, `color.status.queued`)
- SC-022 queue banner (queue position, if derivable from API — OQ-DESIGN-002)
- Query counter section: shows 0 / 0 / 0 with note "La run inizierà automaticamente."
- No cancel button (queued runs cannot be cancelled via the current flow — OQ-DESIGN-007).
AC-013, AC-040.

**Populated state — sub-states by run status:**

*Status: running (primary live state)*
- Status chip: animated blue ("In esecuzione", `color.status.running` + pulse animation)
- Progress bar: wide bar showing `doneQueries / plannedQueries` with percentage label
- Query counters: three blocks — Pianificate (grey), Completate (green), Errori (red) — all
  updating every 10s via polling. Last-updated timestamp shown beneath counters.
- Cancel button visible: "Annulla run" (outlined, destructive color) → confirm dialog → calls
  cancel endpoint. AC-042, AC-043.
- Debug log panel (if debugMode=true): collapsible panel at bottom, monospace log entries,
  auto-scroll to bottom on new entries. Polling same interval as counters. AC-028.
- Config detail accordion collapsed by default. AC-019.

*Status: done (terminal — results available)*
- Status chip: "Completata" (green, `color.status.done`)
- Query counters: frozen final values.
- Prominent CTA: "Visualizza risultati" → navigates to SC-030. AC-017.
- Drive report links if available (preview of AC-026).
- No cancel button.

*Status: cancelled*
- Status chip: "Annullata" (grey, `color.status.cancelled`)
- Info banner: "Questa run è stata annullata dall'utente." + cancellation timestamp.
- Query counters: frozen values at time of cancellation.
- No cancel button, no results CTA.

*Status: error (terminal — pipeline failure)*
- As described in Error state above.

---

## SC-022 — Run queued banner (inline state of SC-021)

**Loading state**
Not a separate page — rendered as a dismissable alert/banner on SC-021 while status=queued.
The banner content loads with SC-021's data load. No independent loading state.

**Error state**
If queue position cannot be determined (BE does not return it): banner shows generic "La run è
in coda e partirà automaticamente al termine dell'analisi precedente." OQ-DESIGN-002.

**Empty state**
Not applicable — the banner is only rendered when status=queued. When status transitions to
`running`, the banner auto-dismisses (polling detects the change).

**Populated state**
Banner content: "Run in coda — posizione N" (if available), "Partirà automaticamente al
completamento della run in corso." Status chip `queued` (amber). No user action needed.
Auto-dismissed when polling detects status change to `running`. AC-013, AC-040.

---

## SC-030 — Results overview (KPI panel)

**Loading state**
Pattern: skeleton for the hero KPI section (score circle placeholder, three metric blocks).
Drive links section: skeleton two rows. Shown on initial load of the results route.
Polling does NOT continue here — results are static once run is `done`.

**Error state**
- system (data load failure): "Impossibile caricare i risultati. Riprova." full-width error
  with retry button.
- Drive upload failed (AC-027): KPI section loads normally; Drive links section shows a yellow
  warning alert "Report non disponibile: [errorMessage from BE]". Drive error does NOT block
  the KPI display — they are independent sections.

**Empty state (zero visibility)**
Brand target is present in the run but appears in zero LLM responses. This is NOT a load error
— it is a valid result. Show:
- AI Visibility Score: large "0" in `color.score.low`
- Avg rank: "N/D" (not determined) — as per AC-021
- Link rate: "0%"
- Sentiment: all three bars at zero
- Explanatory caption: "Il brand non è stato menzionato in nessuna risposta LLM per questa run."
This zero-data state must be visually distinct from the loading skeleton. AC-021.

**Populated state**
- Hero: circular score gauge (or large numeral) with color coding per score band, labelled
  "AI Visibility Score". Score value prominent (`text.scale.kpi`).
- Three KPI chips beneath: avg rank (e.g. "#3.2"), link rate (e.g. "42%"), total mentions.
- Sentiment breakdown: horizontal three-segment bar (positive / neutral / negative) with
  percentage labels per segment. Colors: `color.sentiment.*`.
- Target brand section: "Focus sul target" — summary card with brand name, score, rank, mentions.
  Separated from competitor list per AC-023.
- Drive report section: two large CTA buttons "Scarica .xlsx" and "Scarica .md" with Drive
  file icon. Opens link in new tab. AC-026.
- Navigation to SC-031, SC-032, SC-033 via tab bar or anchor links in a sticky sub-nav.
AC-020, AC-021, AC-023, AC-026.

---

## SC-031 — Brand ranking table

**Loading state**
Pattern: DataGrid skeleton — 8–10 placeholder rows with animated shimmer. Column headers
render immediately. Shown on first load.

**Error state**
- system: "Impossibile caricare il ranking. Riprova." — full-width error replacing the grid.

**Empty state (no competitors found)**
No competitor brands extracted from LLM responses (unlikely but valid: e.g. testMode run with
very few queries). Show: empty DataGrid state "Nessun competitor trovato per questa run."
Target brand "Focus sul target" card still renders if target had any mentions.

**Empty state (target also invisible)**
Both target and competitors at zero → show the zero-data empty state for the entire results
section, with a note directing back to SC-030 for the visibility score context.

**Populated state**
MUI DataGrid with columns: # (rank), Brand, AI Visibility Score (colored cell per band),
Mentions, Avg Rank, Link Rate %, Sentiment (positive / neutral / negative — three small bars
or percentage values per cell). Default sort: score descending. Resortable on all columns.
Sticky header. Target brand excluded from this table and shown in "Focus sul target" card
pinned above the grid (AC-023). Rows: ~20–50 competitors expected per run.
OQ-DESIGN-003: CSV export button? Surface for product decision.
AC-022, AC-023.

---

## SC-032 — Keyword breakdown table

**Loading state**
Same pattern as SC-031: DataGrid skeleton rows.

**Error state**
"Impossibile caricare il breakdown per keyword. Riprova." inline error.

**Empty state**
No geoqueries records for this run → "Nessuna keyword trovata per questa run." DataGrid empty
state. If the run was in testMode with 0 queries, explain this with a caption.

**Populated state**
DataGrid columns: Keyword, Query eseguite, Visibility %, Avg Rank, Link Rate %, Target
Mentions. Default sort: visibility % descending. Clicking a keyword row (OQ-DESIGN-004) could
in future filter the ranking table — raise as OQ, not implemented for MVP.
AC-024.

---

## SC-033 — Persona breakdown table

**Loading state**
Same pattern as SC-031.

**Error state**
"Impossibile caricare il breakdown per persona. Riprova." inline error.

**Empty state**
No persona data → "Nessuna persona trovata per questa run." Up to 7 personas expected per
geo-registry configuration (referenced in domain-model). If zero, add caption about run config.

**Populated state**
DataGrid columns: Persona Name, Query eseguite, Visibility %, Avg Rank, Link Rate %, Target
Mentions. Default sort: visibility % descending. Layout mirrors SC-032 for UX consistency.
AC-025.

---

## SC-040 — Admin: user management

**Loading state**
DataGrid skeleton (4–8 rows). "Crea analyst" button disabled while loading.

**Error state**
- auth (403): analyst role accessing admin route → full-page "Accesso negato" with back link
  to SC-010. This is the primary enforcement point for US-002/AC-004.
- system (500): "Impossibile caricare gli utenti. Riprova." + retry.
- business (Keycloak API error on create/deactivate): toast "Operazione fallita: [message]."

**Empty state (first-use)**
No analyst accounts exist (fresh platform install). DataGrid shows empty state:
"Nessun analyst ancora — crea il primo account."

**Populated state**
DataGrid: email, role badge, clientKeys (comma-separated or chip list), status (active/
inactive toggle). Row-level actions: "Modifica" (opens drawer) and deactivate toggle.
Drawer for create/edit: email, role select (analyst / admin), clientKeys multi-select from
available domains. AC-037.

---

## SC-041 — Admin: global run monitor

**Loading state**
DataGrid skeleton. Filters/search bar disabled while loading.

**Error state**
- auth (403): same as SC-040 — full-page "Accesso negato".
- system: "Impossibile caricare le run. Riprova."

**Empty state**
Platform has no runs at all (fresh install). "Nessuna run ancora sulla piattaforma."
DataGrid empty state with illustration.

**Populated state**
DataGrid: runId (monospace), domain (targetDomain + clientKey), analyst email, status chip,
profileKey, startedAt, duration (if done/error/cancelled). Search bar filters by domain or
analyst. Status filter chips (queued / running / done / error / cancelled). Rows clickable →
SC-021 for run detail. AC-038.

---

## SC-042 — Admin: LLM profile management

**Loading state**
DataGrid skeleton. "Crea profilo" button disabled while loading.

**Error state**
- auth (403): full-page "Accesso negato".
- system: "Impossibile caricare i profili. Riprova."
- business (profileKey duplicate on create): "Questo profileKey è già in uso." inline error
  in the drawer form.

**Empty state**
No LLM profiles configured. "Nessun profilo LLM ancora — crea il primo profilo."
Note: analysts cannot start runs without at least one profile (SC-020 will show an empty
dropdown). This empty state is a blocker for the analyst workflow and must be flagged.

**Populated state**
DataGrid: profileKey, llmProvider badge (openai/gemini/perplexity), runModel, qgenModel,
nerModel. Row-level edit button opens drawer with all Profile entity fields.
New profiles immediately available in SC-020 configurator on save (AC-039). AC-039.

---

## SC-043 — Admin: domain management (all)

**Loading state**
DataGrid skeleton (domains across all clientKeys).

**Error state**
- auth (403): full-page "Accesso negato".
- system: "Impossibile caricare i domini. Riprova."

**Empty state**
No domains on the platform. "Nessun dominio ancora sulla piattaforma."
Note: admin sees all, not filtered. This is a read-only oversight view.

**Populated state**
DataGrid: brand, clientKey (monospace), targetDomain, settori tags, # of total runs (count).
Row click → SC-012 (domain homepage). Unlike SC-010, no "Create domain" CTA (admins do not
create domains in this MVP — that is the analyst's responsibility). AC-004, AC-038.
