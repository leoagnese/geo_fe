---
notion_workspace: <workspace-name>
notion_teamspace_id: <uuid>
notion_mirror_root_url: <url-of-home-page>
notion_mirror_root_id: <uuid>
---

# L0 — Project Identity

## Project

- **Name:** Geo-SmartAudit Platform
- **Client:** Interno — AionSoft / gbsweb.it
- **One-line goal:** Piattaforma SaaS B2B che misura la AI Visibility di un brand — quanto e con che ranking appare nelle risposte LLM a query di utenti reali — generando report competitivi multi-persona per orientare la strategia di contenuto.
- **Domain:** SaaS B2B · analytics dashboard · process automation
- **Status:** active-development

## Personas (max 3 key roles)

| Role | Who they are | What they need |
|------|--------------|----------------|
| `analyst` | Consulente gbsweb che gestisce i clienti della piattaforma | Configurare analisi, monitorarne l'avanzamento e leggere report competitivi per produrre raccomandazioni strategiche ai propri clienti |
| `admin` | Amministratore della piattaforma | Gestire utenti, domini, profili LLM e configurazioni di sistema |
| `engine` | n8n — sistema automatizzato (attore non-umano) | Leggere query pending, scrivere risultati NER e aggiornare lo stato delle run tramite endpoint BE autenticati con service account Keycloak |

## Primary outcomes (max 3)

1. Un analyst può configurare e avviare un'analisi AI Visibility completa per un dominio cliente e ottenere un report competitivo (Excel + Markdown) generato automaticamente al termine della pipeline.
2. Un analyst può visualizzare KPI strutturati (AI Visibility Score, ranking competitor, sentiment) segmentati per keyword e per persona, per orientare la strategia di contenuto del cliente.
3. Il BE garantisce che tutti i dati della pipeline (geoqueries, geollmitems, stato run) siano persistiti in modo consistente su MongoDB, accettando scritture solo da n8n autenticato tramite service account Keycloak.

## Hard constraints

- **Stack:** NestJS (questo repo, `geo_be`) + MongoDB + n8n self-hosted + Next.js (repo separato `geo_fe`) + Keycloak + Google Drive API
- **Deployment target:** ?? — OQ-001
- **Compliance / legal:** GDPR presunto — OQ-002
- **Integrations required:** Keycloak (auth utenti + service account n8n), n8n (webhook trigger + callback PATCH), Google Drive API (upload report .xlsx/.md/.zip), OpenAI API / Gemini API / Perplexity API (chiamate via n8n)
- **Non-negotiable SLAs:** ?? — OQ-003
- **Budget / timeline ceiling:** n/a (progetto interno)

## Explicit non-goals

- Non è un tool SEO classico: non misura posizionamento su Google/Bing né traffico organico
- Non fa web crawling autonomo di contenuti: l'analisi si basa esclusivamente su risposte LLM
- Non gestisce pubblicazione o scheduling di contenuti: solo analisi e reportistica
- Non include un modulo billing/subscription per clienti esterni

## Glossary

- `clientKey` → Identificatore univoco del cliente nella piattaforma; discriminatore di tenancy nei dati (es. `caffevergnano`)
- `targetDomain` → Dominio web del brand oggetto dell'analisi (es. `caffevergnano.com`)
- `Run` → Singola esecuzione completa della pipeline di analisi per un dominio
- `Query` → Singola domanda LLM generata dal QGen dalla combinazione keyword × locale × persona
- `AI Visibility Score` → Indice composito [0–100] che misura quanto un brand compare nelle risposte LLM, pesando volume di citazioni, posizione media nel ranking e link rate
- `persona` → Profilo di ricerca simulato usato per diversificare lo stile delle query (7 personas, definite nel geo-registry); diverso dai "ruoli utente" della piattaforma
- `NER` → Named Entity Recognition — estrazione automatica di brand citati, posizione ranking, sentiment e link dalle risposte LLM
- `geo-registry` → File JSONC su Google Drive contenente la configurazione globale della pipeline (personas, keywords, locali, LLM params); scaricato da n8n all'avvio di ogni run
- `profileKey` → Identificatore della configurazione LLM per una run (provider, modelli runModel/qgenModel/nerModel, params)
- `geoqueries` → Collection MongoDB; una entry per query (keyword × locale × persona) con stato e metriche aggregate di visibilità
- `geollmitems` → Collection MongoDB; una entry per ogni entità brand estratta via NER da ogni risposta LLM
- `reportFolderId` → ID della cartella Google Drive su cui n8n carica i file di output della run

---

*Last updated: 2026-05-15 by AionSoft. Session 1.*
