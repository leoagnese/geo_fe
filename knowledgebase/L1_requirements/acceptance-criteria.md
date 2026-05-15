# L1 — Acceptance Criteria

> Testable, behavior-level checks that a US is actually satisfied.
> Format: **Given / When / Then** (BDD) — same format the `test-writer` sub-agent will consume in Sprint 3.

---

## ID scheme

- **Format:** `AC-NNN` (zero-padded, sequential)
- **Never reused, never renumbered.** Deprecated criteria keep their ID with status `deprecated`.
- An AC can implement **multiple** US (one-to-many). A US must have **at least one** AC before leaving `proposed`.

---

## Criteria

### AC-001 — Redirect a Keycloak se non autenticato
- **Implements:** US-001
- **Status:** proposed

**Given** un utente non autenticato  
**When** tenta di accedere a una rotta protetta del FE o a un endpoint BE  
**Then** viene reindirizzato al login Keycloak senza accedere alla risorsa

---

### AC-002 — Token JWT valido dopo login riuscito
- **Implements:** US-001
- **Status:** proposed

**Given** credenziali valide su Keycloak  
**When** l'utente completa il flow OAuth  
**Then** riceve un JWT valido, viene reindirizzato alla dashboard e il BE accetta le sue richieste successive

---

### AC-003 — Nessun token con credenziali errate
- **Implements:** US-001
- **Status:** proposed

**Given** credenziali non valide  
**When** l'utente tenta il login  
**Then** Keycloak mostra un errore e il BE non rilascia alcun token

---

### AC-004 — Endpoint admin-only rifiuta ruolo analyst
- **Implements:** US-002
- **Status:** proposed

**Given** un utente con ruolo `analyst` autenticato  
**When** chiama un endpoint riservato al ruolo `admin`  
**Then** il BE risponde 403 Forbidden

---

### AC-005 — Creazione dominio con campi obbligatori validi
- **Implements:** US-003
- **Status:** proposed

**Given** un analyst autenticato  
**When** invia una richiesta di creazione dominio con clientKey, targetDomain e brand validi  
**Then** il dominio viene salvato in MongoDB e compare nella lista domini dell'utente

---

### AC-006 — Creazione dominio con clientKey duplicato
- **Implements:** US-003
- **Status:** proposed

**Given** un clientKey già presente in MongoDB  
**When** un analyst tenta di creare un dominio con lo stesso clientKey  
**Then** il BE risponde 409 Conflict con messaggio che specifica il campo duplicato

---

### AC-007 — Validazione FE per campi obbligatori mancanti
- **Implements:** US-003
- **Status:** proposed

**Given** campi obbligatori (clientKey, targetDomain, brand) non compilati  
**When** l'analyst tenta di salvare il dominio  
**Then** il FE mostra validazione inline e non effettua chiamate al BE

---

### AC-008 — Lista domini isolata per utente
- **Implements:** US-004
- **Status:** proposed

**Given** un analyst autenticato associato a specifici clientKey  
**When** richiede la lista dei domini  
**Then** il BE restituisce solo i domini associati al suo account, mai quelli di altri analyst

---

### AC-009 — Modifica alias e settori di un dominio
- **Implements:** US-005
- **Status:** proposed

**Given** un dominio esistente  
**When** l'analyst aggiorna aliases o settori  
**Then** le modifiche sono persiste in MongoDB e clientKey rimane invariato

---

### AC-010 — Lista run sulla homepage dominio
- **Implements:** US-006
- **Status:** proposed

**Given** un dominio con run passate  
**When** l'analyst apre la homepage del dominio  
**Then** vede la lista run ordinata per timestamp decrescente, ognuna con runId, stato, modello LLM e data

---

### AC-011 — Configuratore run mostra campi obbligatori e facoltativi
- **Implements:** US-007
- **Status:** proposed

**Given** l'analyst apre il configuratore di una nuova run per un dominio  
**When** la pagina si carica  
**Then** mostra i campi obbligatori (profileKey, runIterations) e quelli facoltativi (keywords override, locale, testMode, debugMode)

---

### AC-012 — Selezione profilo LLM mostra modelli associati
- **Implements:** US-007
- **Status:** proposed

**Given** l'analyst seleziona un profileKey nel configuratore  
**When** il profilo viene caricato  
**Then** il FE mostra il provider LLM e i modelli associati (runModel, qgenModel, nerModel)

---

### AC-013 — Avvio run: running diretto o accodamento
- **Implements:** US-008
- **Status:** proposed

**Given** una configurazione run valida  
**When** l'analyst avvia la run  
**Then** se non c'è nessuna run `running` per il Domain: il BE crea la entry georuns con status `running` e invia il webhook a n8n entro 5 secondi; se c'è già una run `running` per il Domain: il BE crea la entry georuns con status `queued` senza triggerare n8n, e mostra all'analyst che la run è in coda

---

### AC-014 — Errore di avvio se n8n non è raggiungibile
- **Implements:** US-008
- **Status:** proposed

**Given** n8n non raggiungibile al webhook  
**When** il BE tenta l'invio  
**Then** lo stato della run viene impostato a `error`, il messaggio di errore viene persistito e l'analyst vede un avviso nella UI

---

### AC-015 — Conferma avvio run nella UI con runId
- **Implements:** US-008
- **Status:** proposed

**Given** run avviata con successo  
**When** l'analyst viene reindirizzato alla pagina di dettaglio run  
**Then** vede runId, timestamp di avvio, profilo scelto e contatori iniziali

---

### AC-016 — Polling contatori query in tempo reale
- **Implements:** US-009
- **Status:** proposed

**Given** una run in stato `running`  
**When** l'analyst è sulla pagina di dettaglio della run  
**Then** i contatori (planned / done / error queries) si aggiornano via polling ogni 10 secondi senza ricaricare la pagina

---

### AC-017 — Transizione automatica a sezione risultati al completamento
- **Implements:** US-009
- **Status:** proposed

**Given** una run che transisce da `running` a `done`  
**When** il polling del FE rileva il cambio di stato  
**Then** la UI mostra automaticamente la sezione risultati senza azione dell'utente

---

### AC-018 — Lista run ordinata per data
- **Implements:** US-011
- **Status:** proposed

**Given** un dominio con più run  
**When** l'analyst visualizza lo storico  
**Then** le run sono ordinate per timestamp decrescente con runId, stato, modello e data visibili

---

### AC-019 — Dettaglio configurazione run
- **Implements:** US-012
- **Status:** proposed

**Given** una run passata  
**When** l'analyst apre il dettaglio  
**Then** vede tutte le opzioni di configurazione usate (profileKey, modelli, runIterations, locales, keywords override, testMode, debugMode)

---

### AC-020 — KPI brand target visibili su run completata
- **Implements:** US-013
- **Status:** proposed

**Given** una run in stato `done`  
**When** l'analyst apre la pagina risultati  
**Then** vede AI Visibility Score, posizione media, link rate e sentiment breakdown (positivo / neutro / negativo) del brand target

---

### AC-021 — Brand target non presente: Score 0 e rank N/D
- **Implements:** US-013
- **Status:** proposed

**Given** il brand target non compare in nessuna risposta LLM della run  
**When** l'analyst visualizza i KPI  
**Then** AI Visibility Score è 0, la posizione media è indicata come "N/D" e il link rate è 0%

---

### AC-022 — Ranking competitor ordinato per AI Visibility Score
- **Implements:** US-014
- **Status:** proposed

**Given** una run completata con LLM items  
**When** l'analyst visualizza la ranking table  
**Then** vede i competitor ordinati per AI Visibility Score decrescente con colonne: rank, brand, score, mentions, avgRank, linkRate, sentiment (pos/neutro/neg)

---

### AC-023 — Brand target separato dal ranking competitor
- **Implements:** US-014
- **Status:** proposed

**Given** il brand target appare nelle risposte LLM  
**When** viene visualizzata la ranking table  
**Then** il brand target è escluso dalla classifica competitor e mostrato in una sezione separata "Focus sul target"

---

### AC-024 — Breakdown per keyword con metriche di visibilità
- **Implements:** US-015
- **Status:** proposed

**Given** una run completata  
**When** l'analyst visualizza il breakdown per keyword  
**Then** vede per ogni keyword: numero query eseguite, visibility %, avg rank, link rate %, target mentions

---

### AC-025 — Breakdown per persona con metriche di visibilità
- **Implements:** US-016
- **Status:** proposed

**Given** una run completata  
**When** l'analyst visualizza il breakdown per persona  
**Then** vede per ogni persona: numero query eseguite, visibility %, avg rank, link rate %, target mentions

---

### AC-026 — Link report Google Drive visibili su run completata
- **Implements:** US-017
- **Status:** proposed

**Given** una run completata con upload Google Drive avvenuto  
**When** l'analyst accede alla sezione output  
**Then** vede link diretti ai file .xlsx e .md sul reportFolderId configurato per la run

---

### AC-027 — Avviso se upload Google Drive non disponibile
- **Implements:** US-017
- **Status:** proposed

**Given** l'upload su Google Drive è fallito o non ancora avvenuto  
**When** l'analyst accede alla sezione output  
**Then** vede un avviso con il messaggio di errore registrato dal BE

---

### AC-028 — Log debug visibile quando debugMode è attivo
- **Implements:** US-018
- **Status:** proposed

**Given** una run con debugMode attivo  
**When** l'analyst visualizza il dettaglio run  
**Then** vede un pannello di log con le attività della pipeline, aggiornato via polling

---

### AC-029 — Engine: fetch query pending autenticato
- **Implements:** US-019
- **Status:** proposed

**Given** una richiesta GET autenticata da service account n8n  
**When** n8n richiede le query in stato `pending` per un runId  
**Then** il BE risponde con la lista completa di geoqueries pending per quella run

---

### AC-030 — Engine: 401 su richiesta senza token valido
- **Implements:** US-019, US-020, US-021, US-022
- **Status:** proposed

**Given** una richiesta a un endpoint engine-API priva di token Keycloak valido o con token scaduto  
**When** n8n (o chiunque altro) chiama l'endpoint  
**Then** il BE risponde 401 Unauthorized senza processare la richiesta

---

### AC-031 — Engine: PATCH query aggiorna stato e metriche
- **Implements:** US-020
- **Status:** proposed

**Given** una richiesta PATCH con service account token valido  
**When** n8n aggiorna una query con status e metriche  
**Then** il BE persiste targetMentions, visibilityRate, avgRankPosition, linkRate, sentimentPositive/Neutral/Negative e aggiorna lo status in MongoDB

---

### AC-032 — Engine: 404 su queryId inesistente
- **Implements:** US-020
- **Status:** proposed

**Given** un queryId non presente in MongoDB  
**When** n8n invia il PATCH  
**Then** il BE risponde 404 Not Found con indicazione del campo mancante

---

### AC-033 — Engine: bulk POST LLM items persiste tutti i campi NER
- **Implements:** US-021
- **Status:** proposed

**Given** una richiesta POST con service account token valido e array di LLM items  
**When** n8n invia i risultati NER  
**Then** il BE persiste per ogni item: canonicalBrand, rankPosition, sentiment, hasLink, linkType, link, associandoli al responseId e queryId corretti

---

### AC-034 — Engine: 404 se runId o queryId inesistenti nel payload
- **Implements:** US-021
- **Status:** proposed

**Given** un runId o queryId nel payload LLM items non presente in MongoDB  
**When** n8n invia il POST  
**Then** il BE risponde 404 con indicazione del campo mancante

---

### AC-035 — Engine: PATCH run done aggiorna contatori finali
- **Implements:** US-022
- **Status:** proposed

**Given** tutte le query di una run processate  
**When** n8n invia PATCH georuns con status `done` e contatori finali (planned/done/error)  
**Then** il BE aggiorna georuns e il polling del FE riceve il nuovo stato entro il prossimo ciclo

---

### AC-036 — Engine: PATCH run error persiste messaggio di errore
- **Implements:** US-022
- **Status:** proposed

**Given** la pipeline n8n incontra un errore bloccante  
**When** n8n invia PATCH georuns con status `error` e messaggio di errore  
**Then** il BE persiste il messaggio, imposta georuns.status a `error` e il FE mostra un avviso all'analyst

---

### AC-037 — Admin: crea e disattiva account analyst
- **Implements:** US-023
- **Status:** proposed

**Given** un admin autenticato  
**When** crea un nuovo account analyst o lo disattiva tramite UI admin  
**Then** per la creazione: il BE crea il documento `userprofiles` in MongoDB e l'account è disponibile per il login Keycloak; per la disattivazione (`active: false`): il BE (1) imposta `userprofiles.active = false`, (2) chiama Keycloak Admin API `PUT /admin/realms/{realm}/users/{id}` con `{ enabled: false }`, (3) chiama Keycloak Admin API `DELETE /admin/realms/{realm}/users/{id}/sessions` per revocare tutte le sessioni attive — l'accesso è revocato immediatamente senza finestra di vulnerabilità JWT (OQ-018 Opzione C)

---

### AC-038 — Admin: vista globale di tutte le run
- **Implements:** US-024
- **Status:** proposed

**Given** un admin autenticato  
**When** accede alla sezione admin runs  
**Then** vede tutte le run di tutti i domini, non filtrate per clientKey, con stato, analyst e timestamp

---

### AC-039 — Admin: gestione profili LLM
- **Implements:** US-025
- **Status:** proposed

**Given** un admin autenticato  
**When** crea o aggiorna un profilo LLM  
**Then** il nuovo profileKey è disponibile nel configuratore run per tutti gli analyst

---

### AC-040 — Promozione automatica run queued dopo done / error / cancelled
- **Implements:** US-026
- **Status:** proposed

**Given** una run di un Domain transisce a `done`, `error` o `cancelled`  
**When** il BE processa l'aggiornamento di stato  
**Then** il BE promuove la run `queued` più antica dello stesso Domain a `running`, salva l'`executionId` n8n e invia il webhook a n8n entro 5 secondi

---

### AC-041 — Nessuna promozione se non ci sono run in coda
- **Implements:** US-026
- **Status:** proposed

**Given** una run di un Domain transisce a `done` o `error`  
**When** il BE verifica la coda e non ci sono run `queued` per quel Domain  
**Then** il BE non esegue nessun ulteriore trigger n8n

---

### AC-042 — Cancellazione run: BE chiama n8n DELETE execution
- **Implements:** US-010
- **Status:** proposed

**Given** una run in stato `running` con `executionId` valido  
**When** l'analyst richiede la cancellazione  
**Then** il BE chiama `DELETE /api/v1/executions/:executionId` sull'istanza n8n e riceve conferma

---

### AC-043 — Cancellazione run: stato finale cancelled
- **Implements:** US-010
- **Status:** proposed

**Given** la chiamata n8n DELETE ha avuto successo  
**When** il BE aggiorna il record in MongoDB  
**Then** `georuns.status` diventa `cancelled` (non `error`), il timestamp di fine viene registrato e la UI mostra la run come annullata dall'utente

---

### AC-044 — Cancellazione run: n8n non può sovrascrivere cancelled
- **Implements:** US-010
- **Status:** proposed

**Given** una run in stato `cancelled`  
**When** n8n invia un PATCH engine-API con un aggiornamento di stato (es. status `done` per batch già in volo al momento della cancellazione)  
**Then** il BE ignora l'aggiornamento e risponde 409 Conflict senza modificare il record

---

### AC-045 — Cancellazione run queued: stato diretto senza n8n
- **Implements:** US-010
- **Status:** proposed

**Given** una run in stato `queued` (nessun executionId assegnato)  
**When** l'analyst richiede la cancellazione tramite E-009  
**Then** il BE imposta `georuns.status = cancelled` e `completedAt` direttamente, senza chiamare n8n, risponde 200 con il record aggiornato; la run viene rimossa dalla coda e non sarà mai promossa a `running`

---

<!-- Append new criteria below in order of addition. Do not reorder after confirmation. -->
