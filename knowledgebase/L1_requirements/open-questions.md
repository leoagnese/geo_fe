# L1 — Open Questions

> Unresolved assumptions and unknowns. Referenced from L0_identity (`?? — OQ-xxx`) and from any story that depends on an answer.
> Everything uncertain lives here — not hidden in prose.

---

## ID scheme

- **Format:** `OQ-NNN` (zero-padded, sequential)
- Resolved and deferred questions stay here with the matching status and a link to the resolution (ADR, KB section, or short answer inline).

## Status icons

| Icon | When |
|------|------|
| 🟠 | `Status: open` — regular priority |
| ⚠️ | `Status: open` AND (`Risk` ≠ `none` OR `Blocks:` cites a `must`-priority US) — security / data-integrity / financial / must-blocker |
| 🔍 | `Status: investigating` — someone is actively working the answer |
| 💤 | `Status: deferred` — parked on purpose, revisit later |
| ✅ | `Status: resolved` — answered, resolution linked below |

---

## Questions

### 🟠 OQ-001 — Deployment target e infrastruttura

- **Context:** Non è ancora definito dove gira il BE (NestJS) e il DB (MongoDB): VPS self-hosted, cloud provider (AWS/GCP/DigitalOcean) o container orchestration? Influenza la configurazione Keycloak, le variabili d'ambiente e la strategia di deploy.
- **Blocks:**
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### ⚠️ OQ-002 — Compliance GDPR: i dati delle run contengono PII?

- **Context:** Le query (geoqueries) e le risposte LLM (geollmresponses) potrebbero contenere dati di prodotti o brand di clienti reali. Serve una policy di data retention, consent management, o diritto all'oblio?
- **Blocks:**
- **Owner:** Team legale / l.agnese@gbsweb.it
- **Status:** open
- **Risk:** data-integrity
- **Resolution:**

---

### 🟠 OQ-003 — SLA attesi: uptime, concorrenza run e latenza

- **Context:** Quante run simultanae deve supportare il sistema? Qual è la latenza massima accettabile per l'avvio di una run (BE → n8n webhook)? C'è un requisito di uptime? Influenza le scelte di connessione pool MongoDB e timeout n8n.
- **Blocks:**
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### ✅ OQ-004 — Run concorrenti per lo stesso dominio: lock o permesse?

- **Context:** Se un analyst avvia una seconda run per lo stesso dominio mentre un'altra è già in `running`, cosa succede? Il BE blocca con un errore, accoda, o le permette entrambe? Influenza US-008 AC-013 e la logica del worker lock in geoqueries.
- **Blocks:** US-008
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** data-integrity
- **Resolution:** *(resolved Session 1 — 2026-05-15)* Approccio **coda**: se esiste già una run in stato `running` per lo stesso dominio, la nuova run viene creata in stato `queued`. Quando la run attiva raggiunge `done` o `error`, il BE promuove automaticamente la prima run `queued` a `running` e triggera n8n. Il lifecycle di Run diventa: `queued → running → done | error`. Impatta AC-013 (aggiornato) + nuovo AC-040.

---

### ✅ OQ-005 — Multi-tenancy: associazione utente Keycloak → clientKey

- **Context:** Come viene associato un utente Keycloak ai propri clientKey? Tramite custom claim JWT, una collection MongoDB separata (UserProfile), o un mapping hardcoded? Questo blocca l'implementazione di US-004 (lista domini isolata) e US-023 (gestione utenti admin).
- **Blocks:** US-004, US-023, AC-008
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** security
- **Resolution:** *(resolved Session 1 — 2026-05-15)* Collection MongoDB **`userprofiles`**: mappa `userId` (Keycloak `sub`) → `clientKeys[]`, `email`, `role`. Il BE legge `userprofiles` su ogni richiesta protetta per ricavare i clientKey autorizzati dell'utente. L'admin gestisce questa collection tramite UI admin (US-023). Aggiunto `UserProfile` al domain model.

---

### ✅ OQ-006 — Cancellazione run in corso: comportamento n8n e BE

- **Context:** Se un analyst annulla una run in stato `running` (US-010), come viene notificato n8n? n8n deve interrompere l'elaborazione delle query rimanenti? Qual è lo stato finale (cancelled vs error)? Nessuna evidenza nel materiale attuale.
- **Blocks:** US-010
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved Session 1 — 2026-05-15)* Il BE chiama **n8n API `DELETE /api/v1/executions/:executionId`** per terminare l'esecuzione immediatamente. L'`executionId` n8n viene catturato dalla risposta del webhook trigger e persistito in `georuns.executionId`. Stato finale: **`cancelled`** (quarto stato, separato da `error`). Le run `queued` a valle vengono promosse automaticamente come per `done`/`error` (US-026). Lifecycle Run aggiornato: `queued → running → done | error | cancelled`.

---

### ✅ OQ-007 — Storage dei profili LLM: geo-registry su Drive o MongoDB?

- **Context:** Attualmente i profileKey e la configurazione LLM sono nel geo-registry JSONC su Google Drive. Conviene spostarli in una collection MongoDB gestita dal BE (e quindi da US-025 admin)? Influenza l'architettura del configuratore run e la manutenibilità.
- **Blocks:** US-025, AC-039
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved Session 1 — 2026-05-15)* I profili LLM vengono spostati in una collection MongoDB **`profiles`** gestita dal BE. Il geo-registry su Drive conserva solo le personas, le keyword base e i parametri LLM avanzati (responsesCfg, webSearch params) che cambiano raramente. Aggiunto `Profile` al domain model come entità platform.

---

### 🟠 OQ-008 — Data retention: per quanto tempo conservare le run in MongoDB?

- **Context:** Le run generano volumi significativi di dati (geoqueries, geollmresponses con prompt/response interi, geollmitems). Serve una policy di scadenza o archivio per mantenere il DB gestibile nel tempo?
- **Blocks:**
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### ⚠️ OQ-009 — Strategia di archivio per geollmresponses dopo la retention period

- **Context:** OQ-008 chiede "per quanto tempo conservare" — questa chiede "cosa succede dopo": i documenti scaduti vengono eliminati (TTL index), archiviati su cold storage, o compressi? `geollmresponses` contiene prompt+response interi e cresce velocemente. TTL indexes sono predisposti ma disabilitati in attesa di questa decisione.
- **Blocks:** M-008 (migrazione TTL)
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** data-integrity
- **Resolution:**

---

### 🟠 OQ-010 — Tooling per le migrazioni MongoDB

- **Context:** Le 7 migrazioni baseline (M-001→M-007) devono essere applicate in modo versionato. Opzioni: `migrate-mongo`, modulo NestJS custom, script `mongosh` manuali. La scelta influenza come M-001→M-007 vengono pacchettizzati in Sprint 4.
- **Blocks:** Sprint 4 implementation
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 💤 OQ-011 — Full-text search su geollmresponses.llmResponse

- **Context:** È richiesta la ricerca full-text sul testo grezzo delle risposte LLM? Richiederebbe un Atlas Search index o un text index MongoDB — costo e complessità non banali.
- **Blocks:** M-010
- **Owner:** Team tecnico AionSoft
- **Status:** deferred
- **Risk:** none
- **Resolution:**

---

### 💤 OQ-012 — Strategia di sharding per le collection ad alto volume

- **Context:** `geoqueries`, `geollmresponses`, `geollmitems` possono diventare molto grandi. La scelta della shard key deve avvenire prima che i dati arrivino — cambiarla dopo è costoso. Dipende da OQ-001 (deployment target) e OQ-003 (SLA/scala attesa).
- **Blocks:** M-011
- **Owner:** Team tecnico AionSoft
- **Status:** deferred
- **Risk:** none
- **Resolution:**

---

### ✅ OQ-013 — Come viene calcolato plannedQueries al momento della creazione run?

- **Context:** Al momento del trigger n8n, il BE non conosce ancora quante query verranno generate (QGen le produce durante la fase 1). La formula per `georuns.plannedQueries` è `keywords × locales × personas` (calcolata dal BE al trigger), oppure n8n comunica il conteggio effettivo con il primo PATCH? Un disallineamento crea contatori errati nel monitor di avanzamento (US-009).
- **Blocks:** US-008, US-009
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved 2026-05-15)* **Opzione A — BE calcola upfront**. Formula: `plannedQueries = effectiveKeywords × locales.length × 7`. `effectiveKeywords` = `keywordsOverride.length` se l'override è fornito al run creation, altrimenti costante di piattaforma configurabile (default: 10). `7` = numero fisso di personas nel geo-registry. Calcolato da BE in E-006 sincronamente prima del trigger n8n. Trade-off accettato: leggera imprecisione se QGen salta combinazioni — la barra di avanzamento può mostrare valori lievemente approssimati, corretti al completamento via E-023.

---

### ✅ OQ-014 — Cancellazione di una run in stato queued (senza executionId)

- **Context:** US-010 copre la cancellazione di una run `running`. Ma cosa succede se l'analyst vuole cancellare una run ancora in `queued` (nessun executionId, n8n non è stato triggerato)? Il BE può impostarla direttamente a `cancelled` senza chiamare n8n. Serve un AC esplicito.
- **Blocks:** US-010
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved 2026-05-15)* **Opzione B — cancel queued permesso**. E-009 (`DELETE /domains/:clientKey/runs/:runId`) gestisce entrambi i casi con branching interno: `running` → chiama n8n DELETE + imposta `cancelled`; `queued` → imposta `cancelled` direttamente senza chiamare n8n (nessun `executionId` disponibile). AC-045 aggiunto per il caso queued. US-010 aggiornato. SC-021 e SC-022 mostrano il pulsante "Annulla" per entrambi gli stati (OQ-027 resolved come corollario).

---

### ✅ OQ-015 — Strategia di aggregazione per gli endpoint risultati (US-013→016)

- **Context:** Gli endpoint risultati (KPI, ranking, keyword breakdown, persona breakdown) devono leggere metriche pre-aggregate da `geoqueries` oppure calcolarle on-the-fly da `geollmitems` via aggregation pipeline? Pre-aggregato è più veloce in lettura; on-the-fly è sempre aggiornato. La scelta influenza tutti e 4 gli endpoint risultati e la logica NestJS dei service.
- **Blocks:** US-013, US-014, US-015, US-016
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** data-integrity
- **Resolution:** *(resolved Session 1 — 2026-05-15)* **Opzione A — tutto pre-aggregato**, priorità prestazioni per volume futuro elevato. E-010/E-012/E-013 leggono da `geoqueries` (campi già aggregati da n8n per ogni query). E-011 (competitor ranking) legge da `georuns.rankingSnapshot` — array calcolato da n8n al termine della pipeline e inviato al BE nel body di E-023 (PATCH run status). Nessun aggregation pipeline MongoDB a read-time su tutti e 4 gli endpoint risultati.

---

### ✅ OQ-016 — Storage URL report Google Drive: georuns o fetch live?

- **Context:** I link ai file .xlsx e .md su Google Drive sono salvati in `georuns` da n8n tramite PATCH engine-API (E-023), oppure il BE li fetcherebbe live dal Drive API al momento della richiesta? Il contratto backend-architect li assume salvati in `georuns` — serve conferma esplicita del team.
- **Blocks:** US-017, E-023
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved Session 1 — 2026-05-15)* URL salvati in `georuns.reportFiles[]` da n8n via E-023 (coerente con OQ-015 opzione A — tutto pre-aggregato a write-time). Il BE li restituisce a E-014 senza chiamate live a Google Drive.

---

### 🟠 OQ-017 — Profile deletion: hard-delete o soft-delete?

- **Context:** Se un admin elimina un Profile (profileKey), le run storiche che lo referenziano perdono la traccia della configurazione usata. Raccomandazione: soft-delete (`active: false`) per preservare la storia. Influenza E-018 (DELETE profile endpoint).
- **Blocks:** US-025
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### ✅ OQ-018 — Disattivazione utente: Keycloak disable + userprofiles o solo userprofiles?

- **Context:** Quando l'admin disattiva un analyst (US-023), impostare `userprofiles.active = false` non invalida i JWT già emessi (TTL fino a scadenza). Serve anche una chiamata a Keycloak Admin API per disabilitare l'account KC, altrimenti l'utente può continuare ad agire finché il token non scade. Finestra di rischio: TTL tipico Keycloak (5-15 min).
- **Blocks:** US-023
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** security
- **Resolution:** *(resolved 2026-05-15)* **Opzione C — revoca immediata completa**. Al `PATCH /admin/users/:userId` con `active: false`, il BE esegue in sequenza: (1) `userprofiles.active = false` in MongoDB; (2) `PUT /admin/realms/{realm}/users/{id}` con `{ enabled: false }` su Keycloak Admin API — disabilita l'account KC, nessun nuovo token emesso; (3) `DELETE /admin/realms/{realm}/users/{id}/sessions` su Keycloak Admin API — revoca tutte le sessioni attive, invalida i token già emessi. Finestra di rischio: zero. E-022 aggiornato. AC-037 aggiornato. Dipendenza: credenziali KC Admin API già previste in I-001.

---

### ✅ OQ-019 — Endpoint mancante per creazione LLMResponse (violazione invariante)

- **Context:** Il domain model dichiara: "Solo n8n (service account) crea LLMResponse — tramite endpoint BE autenticati". Tuttavia, il contratto backend-architect E-026 copre solo `geollmitems` (bulk POST NER items). Sembra che `geollmresponses` venga scritto direttamente da n8n in MongoDB, bypassando il BE — questo viola l'invariante. Serve endpoint `POST /engine/queries/:queryId/llm-responses` (E-027 proposto).
- **Blocks:** US-021
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** data-integrity
- **Resolution:** *(resolved Session 1 — 2026-05-15)* Aggiunto **E-027** `POST /engine/queries/:queryId/llm-responses` in `api-contracts.md`. n8n chiama E-027 per ogni iterazione LLM (salva risposta grezza), poi chiama E-026 per gli LLM items NER estratti da quella risposta. L'invariante è ora rispettata: nessuna scrittura diretta MongoDB da n8n.

---

### ✅ OQ-020 — Autenticazione BE → n8n al webhook trigger

- **Context:** Quando il BE triggera n8n via webhook (E-006), come autentica la chiamata verso n8n? Opzioni: path secret nel URL, Basic Auth, `X-N8N-API-KEY` header. Se il webhook n8n è esposto senza autenticazione, chiunque conosca l'URL può triggerare run.
- **Blocks:** US-008
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** security
- **Resolution:** *(resolved Session 1 — 2026-05-15)* Header **`X-N8N-API-KEY`** — meccanismo nativo n8n (Webhook node → "Header Auth"). Il secret è una stringa in env (`N8N_WEBHOOK_SECRET`) sia lato BE che lato n8n. Il NestJS `RunService` include l'header su ogni chiamata outbound verso il webhook trigger.

---

### 🟠 OQ-021 — Shape esatta del payload webhook BE → n8n

- **Context:** Il payload inviato dal BE a n8n al momento del trigger run deve contenere tutti i campi di configurazione che n8n usa per inizializzare la pipeline. La struttura proposta in api-contracts.md deve essere validata contro il workflow n8n esistente.
- **Blocks:** US-008
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-022 — Comportamento quando executionId è null su una run running

- **Context:** Scenario edge: una run è in stato `running` ma `georuns.executionId` è null (es. il webhook n8n non ha restituito l'ID per un errore transiente). Se l'analyst tenta di cancellarla, il BE non può chiamare il DELETE n8n. Serve un guard esplicito con errore descrittivo (es. `RUN_MISSING_EXECUTION_ID`).
- **Blocks:** US-010
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 💤 OQ-023 — Watchdog per run bloccate in stato running

- **Context:** Se n8n va in crash durante una run, la run rimane `running` per sempre nel DB. Un job cron (NestJS Scheduler) potrebbe rilevare run in `running` da più di N ore e spostarle a `error`. Non è un blockeroperativo, ma è un gap di resilienza per deploy production.
- **Blocks:**
- **Owner:** Team tecnico AionSoft
- **Status:** deferred
- **Risk:** none
- **Resolution:**

---

<!-- Add questions as they emerge. Never hide an unknown — always file it here. -->

---

### ⚠️ OQ-024 — Nessun file Figma e nessun design system condiviso AionSoft

- **Context:** Il progetto geo_fe non ha ancora un file Figma né un design system condiviso AionSoft. I token di design emessi in `L1_design/design-tokens.md` sono `proposed by agent` e non ancora ratificati da un designer umano. Questo blocca la validazione visiva di tutti gli screen e l'export dei token JSON in `tokens/raw/`.
- **Blocks:** tutti gli screen SC-001–SC-043 (nessun nodeId Figma disponibile); `figma-links.md` è stub; export `tokens/raw/` vuoto
- **Owner:** l.agnese@gbsweb.it / designer
- **Status:** open
- **Risk:** none
- **Resolution:** Creare il file Figma `Geo-SmartAudit — UI Design`, ratificare i token in `design-tokens.md`, esportare le Figma variables JSON in `tokens/raw/`, e aggiornare `figma-links.md` con i nodeId reali.

---

### 🟠 OQ-025 — Posizione coda visibile in UI? (SC-022 queue banner)

- **Context:** AC-013 specifica che la run viene messa `queued` e che l'analyst vede che la run è in coda. Non è specificato se il BE espone la posizione nella coda (es. "2a in coda"). Senza questo dato, il banner SC-022 può solo dire "in coda" genericamente. Esporre la posizione richiede una query BE aggiuntiva (`count queued runs for Domain with createdAt < this run`).
- **Blocks:** SC-022 (queue banner detail level)
- **Owner:** Team tecnico AionSoft
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-026 — Intervallo di polling e visibilità all'utente (SC-021)

- **Context:** AC-016 fissa il polling a 10 secondi. L'utente deve vedere un countdown al prossimo aggiornamento, un'icona "in aggiornamento", o niente? Mostrare il timestamp dell'ultimo aggiornamento ("Aggiornato 3s fa") è sufficiente o serve un countdown esplicito? Impatta il design del componente `run-progress`.
- **Blocks:** SC-021 (counter-block design detail)
- **Owner:** l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### ✅ OQ-027 — Cancellazione di run in stato queued (SC-021 / SC-022)

- **Context:** US-010 e AC-042 specificano che solo le run in stato `running` possono essere cancellate tramite n8n DELETE. Le run `queued` non hanno un executionId e quindi non possono essere cancellate via n8n. L'analyst deve poter cancellare (eliminare) una run `queued` direttamente dal BE? Se sì, serve un endpoint BE PATCH/DELETE separato per le run queued. Se no, il banner SC-022 non deve mostrare un pulsante "Annulla".
- **Blocks:** SC-021, SC-022 (cancel button visibility logic)
- **Owner:** Team tecnico AionSoft
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved 2026-05-15)* Corollario di OQ-014. La cancellazione di run `queued` è permessa tramite lo stesso E-009, senza endpoint separato. SC-021 e SC-022 mostrano entrambi il pulsante "Annulla" — visibile per `running` e `queued`, nascosto per `done`, `error`, `cancelled`.

---

### ✅ OQ-028 — Struttura route per i risultati (tab vs sub-route)

- **Context:** SC-030–SC-033 coprono l'overview KPI, la ranking table, il breakdown per keyword e per persona. La struttura FE può essere: (a) singola route `/results` con MUI Tabs + hash anchors, o (b) sub-route separate `/results/ranking`, `/results/keywords`, `/results/personas`. L'opzione (a) è più semplice per il MVP; l'opzione (b) consente link diretti e browser history per ogni tab.
- **Blocks:** `project-bindings.md` route mapping; SC-030–SC-033 FE implementation
- **Owner:** l.agnese@gbsweb.it
- **Status:** resolved
- **Risk:** none
- **Resolution:** *(resolved 2026-05-15)* **Opzione B — sub-route separate**. Route pattern: `/domains/[clientKey]/runs/[runId]/results/overview`, `.../ranking`, `.../keywords`, `.../personas`. Implementazione Next.js: route group `(results)` con layout condiviso (`layout.tsx`) contenente MUI Tabs, e 4 file `page.tsx` separati. Il path bare `/results` redirige su `/results/overview`. `project-bindings.md` e `screen-inventory.md` aggiornati.

---

### 🟠 OQ-029 — Export CSV dalla ranking table (SC-031)?

- **Context:** La ranking table (SC-031) con tutti i competitor potrebbe essere utile da esportare come CSV per i clienti. Non è esplicitamente richiesto nelle user stories ma è un'aspettativa comune nei tool analytics B2B. MUI DataGrid Community edition non ha export nativo — richiederebbe `csv-stringify` lato FE o MUI DataGrid Pro. Includere nel MVP?
- **Blocks:** SC-031 design (export button o no?)
- **Owner:** l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-030 — Filtro per keyword sulla ranking table (SC-031 ↔ SC-032)?

- **Context:** Cliccando una keyword in SC-032 (breakdown per keyword), sarebbe utile filtrare SC-031 (ranking) per mostrare solo i brand che appaiono in quella keyword. Questo richiede stato condiviso tra i due tab/view o un parametro query URL. Non è nei requisiti MVP ma migliora la leggibilità del report. Includere?
- **Blocks:** SC-031, SC-032 interaction design
- **Owner:** l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-031 — Score gauge (circolare) vs numeral plain (SC-030)?

- **Context:** Il KPI principale (AI Visibility Score) può essere rappresentato come: (a) grande numeral colorato con label, o (b) numeral all'interno di un anello circolare (MUI CircularProgress decorativo) che visivamente suggerisce "out of 100". L'opzione (b) aggiunge impatto visivo ma introduce una componente custom. Scelta estetica da ratificare con il designer.
- **Blocks:** SC-030 hero section design; `components/kpi-cards.md`
- **Owner:** designer / l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-032 — Debug log panel: inline vs drawer (SC-021)?

- **Context:** Il pannello log debug (US-018) è attualmente `proposed` come pannello inline collassabile in fondo a SC-021. Su run con molti log, un drawer laterale o modale darebbe più spazio. Il drawer oscura il contesto della run (contatori, configurazione). Scelta di layout da confermare prima dell'implementazione.
- **Blocks:** SC-021 layout; `components/run-progress.md`
- **Owner:** designer / l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

---

### 🟠 OQ-033 — Dirty-state guard sui form (SC-011, SC-013, SC-020)?

- **Context:** Se l'analyst ha modificato un form senza salvare e naviga via (browser back, link), deve apparire un dialog di conferma "Modifiche non salvate — vuoi davvero uscire?" Questo richiede `beforeunload` + React state tracking. Standard UX per form lunghi, ma non esplicitamente nei requisiti. Includere nel MVP?
- **Blocks:** SC-011, SC-013, SC-020 form behaviour
- **Owner:** l.agnese@gbsweb.it
- **Status:** open
- **Risk:** none
- **Resolution:**

