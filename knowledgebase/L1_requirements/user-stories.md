# L1 — User Stories

> Source of truth per ciò che la piattaforma deve fare, al livello di story.
> Ogni story è citabile da artefatti downstream via ID.

---

## ID scheme

- **Format:** `US-NNN` (zero-padded a 3 cifre, sequenziale)
- **Range tematici:** US-001–002 Auth · US-003–006 Domains · US-007–012 Run lifecycle · US-013–018 Risultati & output · US-019–022 Engine API · US-023–025 Admin · US-026 Run queue

---

## Stories

### US-001 — Login alla piattaforma via Keycloak

- **Persona:** `analyst`, `admin`
- **Value:** As an analyst, I want to log in via Keycloak SSO, so that I can access the platform securely without managing a separate password.
- **Acceptance:** AC-001, AC-002, AC-003
- **Priority:** must
- **Status:** proposed

---

### US-002 — Controllo accessi per ruolo (Admin vs Analyst)

- **Persona:** `admin`
- **Value:** As an admin, I want role-based access control enforced by the BE, so that analysts cannot access admin-only features.
- **Acceptance:** AC-004
- **Priority:** should
- **Status:** proposed
- **Notes:** Ruoli definiti in Keycloak (realm roles). Associazione utente → clientKey gestita via collection `userprofiles` in MongoDB (OQ-005 resolved).

---

### US-003 — Crea un nuovo dominio

- **Persona:** `analyst`
- **Value:** As an analyst, I want to create a new domain entry with clientKey, targetDomain, brand and settori, so that I can associate future runs to a specific client.
- **Acceptance:** AC-005, AC-006, AC-007
- **Priority:** must
- **Status:** proposed

---

### US-004 — Visualizza lista domini

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see only the domains associated with my account, so that client data is isolated and I don't see other clients' domains.
- **Acceptance:** AC-008
- **Priority:** must
- **Status:** proposed
- **Notes:** Isolamento tramite `userprofiles.clientKeys[]` (OQ-005 resolved). Il BE guard verifica che il clientKey richiesto sia nel set autorizzato per l'utente.

---

### US-005 — Modifica parametri di un dominio esistente

- **Persona:** `analyst`
- **Value:** As an analyst, I want to update brand aliases and settori of an existing domain, so that the analysis stays aligned with the client's brand evolution.
- **Acceptance:** AC-009
- **Priority:** should
- **Status:** proposed
- **Notes:** clientKey è immutabile dopo la creazione.

---

### US-006 — Visualizza homepage dominio con storico run

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see a domain's homepage with the list of past runs, so that I can navigate to any previous analysis.
- **Acceptance:** AC-010
- **Priority:** must
- **Status:** proposed

---

### US-007 — Configura una nuova run

- **Persona:** `analyst`
- **Value:** As an analyst, I want to configure a new analysis run by selecting a LLM profile, setting runIterations, and optionally overriding keywords, locale, testMode and debugMode, so that I can tailor the analysis to the client's needs.
- **Acceptance:** AC-011, AC-012
- **Priority:** must
- **Status:** proposed

---

### US-008 — Avvia una run

- **Persona:** `analyst`
- **Value:** As an analyst, I want to start a configured run, so that the BE creates a georuns entry and triggers the n8n pipeline automatically.
- **Acceptance:** AC-013, AC-014, AC-015
- **Priority:** must
- **Status:** proposed
- **Notes:** Se c'è già una run `running` per lo stesso Domain, la nuova run viene creata in stato `queued` (OQ-004 resolved). La promozione automatica a `running` è gestita da US-026. Al momento del trigger n8n, il BE salva l'`executionId` restituito da n8n in `georuns.executionId` (necessario per US-010).

---

### US-009 — Monitora avanzamento run in tempo reale

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see live query counters (planned / done / error) while the run is in progress, so that I can track the pipeline without refreshing manually.
- **Acceptance:** AC-016, AC-017
- **Priority:** must
- **Status:** proposed
- **Notes:** Implementato via polling dal FE. debugMode mostra log aggiuntivi.

---

### US-010 — Annulla una run in corso

- **Persona:** `analyst`
- **Value:** As an analyst, I want to cancel a running analysis, so that I can stop a misconfigured run before it wastes API credits.
- **Acceptance:** AC-042, AC-043, AC-044, AC-045
- **Priority:** could
- **Status:** proposed
- **Notes:** Il BE chiama `DELETE /api/v1/executions/:executionId` su n8n usando l'executionId salvato in georuns al momento del trigger. Stato finale `cancelled` (distinto da `error`). Le run `queued` vengono promosse normalmente (OQ-006 resolved). Run in stato `queued` sono anch'esse cancellabili direttamente dal BE senza chiamare n8n, poiché non hanno ancora un executionId (OQ-014 resolved, AC-045).

---

### US-011 — Lista storico run per dominio

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see all runs for a domain ordered by date, so that I can compare results across different analysis sessions.
- **Acceptance:** AC-018
- **Priority:** must
- **Status:** proposed

---

### US-012 — Visualizza dettaglio configurazione run

- **Persona:** `analyst`
- **Value:** As an analyst, I want to inspect the full config of a past run (profile, models, iterations, locales), so that I can reproduce or compare configurations.
- **Acceptance:** AC-019
- **Priority:** should
- **Status:** proposed

---

### US-013 — Visualizza KPI principali del brand target

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see the target brand's AI Visibility Score, average rank, link rate and sentiment breakdown for a completed run, so that I can quickly gauge overall visibility health.
- **Acceptance:** AC-020, AC-021
- **Priority:** must
- **Status:** proposed

---

### US-014 — Visualizza brand ranking table

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see the full competitor brand ranking table ordered by AI Visibility Score, so that I can benchmark the client against competitors.
- **Acceptance:** AC-022, AC-023
- **Priority:** must
- **Status:** proposed

---

### US-015 — Visualizza breakdown per keyword

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see visibility metrics (score, avg rank, link rate, target mentions) per keyword, so that I can identify which content clusters the brand is absent from.
- **Acceptance:** AC-024
- **Priority:** must
- **Status:** proposed

---

### US-016 — Visualizza breakdown per persona

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see visibility metrics per persona, so that I can identify which audience segments the brand fails to reach.
- **Acceptance:** AC-025
- **Priority:** must
- **Status:** proposed

---

### US-017 — Accedi ai file report su Google Drive

- **Persona:** `analyst`
- **Value:** As an analyst, I want to access direct links to the .xlsx and .md report files on Google Drive, so that I can share them with the client without manually searching Drive.
- **Acceptance:** AC-026, AC-027
- **Priority:** must
- **Status:** proposed

---

### US-018 — Visualizza log debug di una run

- **Persona:** `analyst`
- **Value:** As an analyst, I want to see the activity log of a run when debugMode is active, so that I can troubleshoot pipeline issues without accessing n8n directly.
- **Acceptance:** AC-028
- **Priority:** should
- **Status:** proposed

---

### US-019 — Engine: leggi query pending per una run

- **Persona:** `engine`
- **Value:** As the n8n engine, I want to fetch pending queries for a given runId, so that I can begin the Audit Worker phase.
- **Acceptance:** AC-029, AC-030
- **Priority:** must
- **Status:** proposed

---

### US-020 — Engine: aggiorna stato e metriche di una query

- **Persona:** `engine`
- **Value:** As the n8n engine, I want to PATCH a query's status and aggregated metrics after processing, so that the BE reflects the correct visibility data in MongoDB.
- **Acceptance:** AC-031, AC-032
- **Priority:** must
- **Status:** proposed

---

### US-021 — Engine: persisti LLM items (NER results)

- **Persona:** `engine`
- **Value:** As the n8n engine, I want to bulk-POST NER-extracted LLM items for a query iteration, so that all brand entities are stored in MongoDB for aggregation and reporting.
- **Acceptance:** AC-033, AC-034
- **Priority:** must
- **Status:** proposed

---

### US-022 — Engine: aggiorna stato finale della run

- **Persona:** `engine`
- **Value:** As the n8n engine, I want to PATCH the run status to done or error with final counters, so that the FE polling detects the run completion and shows results.
- **Acceptance:** AC-035, AC-036
- **Priority:** must
- **Status:** proposed

---

### US-023 — Admin: gestione utenti della piattaforma

- **Persona:** `admin`
- **Value:** As an admin, I want to create, edit and deactivate analyst accounts, so that I can onboard new team members and revoke access when needed.
- **Acceptance:** AC-037
- **Priority:** should
- **Status:** proposed
- **Notes:** L'admin gestisce sia l'account Keycloak (via Keycloak admin API) sia il documento `userprofiles` in MongoDB che associa l'utente ai clientKey autorizzati (OQ-005 resolved).

---

### US-024 — Admin: visualizza tutte le run di tutti i clienti

- **Persona:** `admin`
- **Value:** As an admin, I want a global view of all runs across all domains, so that I can monitor platform usage and pipeline health.
- **Acceptance:** AC-038
- **Priority:** should
- **Status:** proposed

---

### US-025 — Admin: gestione profili LLM disponibili

- **Persona:** `admin`
- **Value:** As an admin, I want to manage available LLM profiles (profileKey, provider, models), so that analysts always select from approved and up-to-date configurations.
- **Acceptance:** AC-039
- **Priority:** should
- **Status:** proposed
- **Notes:** I profili LLM sono nella collection MongoDB `profiles` gestita dal BE (OQ-007 resolved). Priority aggiornata da could a should di conseguenza.

---

### US-026 — Promozione automatica run dalla coda

- **Persona:** `engine`
- **Value:** As the BE, when a run for a Domain transitions to done, error or cancelled, I want to automatically promote the oldest queued run for that Domain to running and trigger n8n, so that the queue drains without manual intervention.
- **Acceptance:** AC-040, AC-041
- **Priority:** must
- **Status:** proposed
- **Notes:** Logica BE pura — nessuna azione utente richiesta. Trigger: `done`, `error`, `cancelled` (OQ-004 + OQ-006 resolved).

---

<!-- Append new stories below in order of addition. Do not reorder after confirmation. -->
