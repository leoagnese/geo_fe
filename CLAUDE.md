# CLAUDE.md — geo_fe

## Progetto

**Geo-SmartAudit Platform — Frontend** (repo: `geo_fe`)

Interfaccia Next.js 14 della piattaforma Geo-SmartAudit. Consuma le API REST esposte da `geo_be` e gestisce autenticazione, configurazione run, monitoraggio e visualizzazione risultati.

---

## 🔗 Knowledge Base

Questa repo è il **consumer FE** del KB AionSoft (modello multi-repo G, ADR-001).

- Il **KB master** vive in `geo_be/knowledgebase/`
- Una **copia locale sincronizzata** delle sezioni rilevanti è in `knowledgebase/` di questo repo:
  - `L0_identity.md` — identità progetto
  - `L1_requirements/` — US, AC, OOS, OQ, domain model (identici al BE)
  - `L1_design/` — screen inventory, design tokens, stati, componenti, pattern
  - `L1_backend/api-contracts.md` — contratti endpoint consumati dal FE
- `.kb-source` indica il percorso del master KB

**Regola:** se L1_design o L1_requirements cambiano in `geo_be`, aggiornare la copia qui.

---

## Stack tecnico

| Layer | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| UI | MUI v6 + design tokens da `L1_design/design-tokens.md` |
| Auth | next-auth v5 + Keycloak OIDC (Authorization Code Flow) |
| State / fetch | TanStack Query (React Query) |
| Form | react-hook-form + zod |
| Test | Jest + React Testing Library |
| Language | TypeScript strict |

---

## Struttura `src/`

```
src/
  app/
    (auth)/login/          SC-001
    (protected)/
      layout.tsx           AppShell + auth guard
      domains/             SC-010, SC-011, SC-012, SC-013
      domains/[clientKey]/runs/         SC-020, SC-021, SC-022
      domains/[clientKey]/runs/[runId]/results/  SC-030–SC-033
      admin/               SC-040–SC-043
  components/              Componenti condivisi
  lib/
    api-client.ts          Tutte le chiamate BE (un tipo per ogni endpoint)
    auth.ts                Config next-auth
    theme.ts               Tema MUI dai design token
  middleware.ts            Protezione rotte (next-auth)
```

---

## Convenzioni

- **Routing:** App Router con route groups `(auth)` e `(protected)`. Nessun Pages Router.
- **API calls:** sempre via `src/lib/api-client.ts`. Non chiamare `fetch` direttamente nei componenti.
- **Auth:** l'`access_token` Keycloak è esposto in sessione next-auth e va passato come `Authorization: Bearer` a ogni chiamata BE.
- **Design token:** usare `geoColors` e le MUI theme extensions da `lib/theme.ts`. Non usare colori hardcoded.
- **Traceability:** ogni pagina implementa uno o più `SC-xxx`. I screen ID sono nei commenti di testa dei file `page.tsx`.
- **Polling:** SC-021 fa polling ogni 10s su run in stato `running`. Usare `useQuery({ refetchInterval })` — non `setInterval` manuale.

---

## Comandi utili

```bash
npm run dev          # dev server su :3000
npm run build        # build produzione
npm run lint         # eslint
npm test             # jest
```

---

## Variabili d'ambiente

Vedi `.env.local.example`. Variabili principali:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random>
KEYCLOAK_ISSUER=http://localhost:8080/realms/<realm>
KEYCLOAK_CLIENT_ID=geo-fe
KEYCLOAK_CLIENT_SECRET=<secret>
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api/v1
```

---

## Note per sub-agent

- Leggere sempre `knowledgebase/L1_design/screen-inventory.md` per mappare route → screen ID
- Leggere `knowledgebase/L1_backend/api-contracts.md` per conoscere endpoint, payload e risposta
- Leggere `knowledgebase/L1_requirements/acceptance-criteria.md` per i criteri FE (US-001..US-018, US-023..US-025 hanno impatto UI)
- I mockup HTML di riferimento sono in `../geo_be/docs_legacy/*.html` (Tailwind) — usarli come guida visiva, non come codice
