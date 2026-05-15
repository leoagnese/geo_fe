# L1 — Out of Scope

> Things explicitly **not** part of this project. Prevents scope creep at every subsequent decision.
> Every item has an ID so discussions can reference it by name.

---

## ID scheme

- **Format:** `OOS-NNN` (zero-padded, sequential)
- Never reused. Items that are later brought into scope stay here with status `moved-in-scope` and a link to the US that covers them.

---

## Items

### OOS-001 — Tool SEO classico (posizionamento Google/Bing)

- **Status:** out-of-scope
- **Rationale:** La piattaforma misura la visibilità nei modelli LLM (AI Visibility), non il posizionamento nelle SERP di Google/Bing né il traffico organico. Sono metriche e pipeline completamente diverse.
- **Re-evaluation:** permanent

---

### OOS-002 — Web crawling autonomo di contenuti

- **Status:** out-of-scope
- **Rationale:** L'analisi si basa esclusivamente su risposte generate dagli LLM. Non è previsto alcun crawler di siti web, page scraper o spider.
- **Re-evaluation:** permanent

---

### OOS-003 — Pubblicazione e scheduling di contenuti

- **Status:** out-of-scope
- **Rationale:** La piattaforma è un tool di analisi e reportistica. Non gestisce la creazione, pubblicazione o distribuzione di contenuti sui canali del cliente.
- **Re-evaluation:** post-MVP — potrebbe diventare un modulo separato se richiesto dal mercato

---

### OOS-004 — Modulo billing e subscription per clienti esterni

- **Status:** out-of-scope
- **Rationale:** Progetto interno; non è prevista una gestione autonoma di pagamenti, piani o fatturazione per utenti finali esterni.
- **Re-evaluation:** se la piattaforma venisse commercializzata come SaaS esterno

---

### OOS-005 — App mobile nativa (iOS / Android)

- **Status:** out-of-scope
- **Rationale:** L'interfaccia è web-based (Next.js). Nessuna app nativa prevista.
- **Re-evaluation:** permanent (per questo progetto)

---

### OOS-006 — Export report in PDF diretto dalla piattaforma

- **Status:** out-of-scope
- **Rationale:** I report vengono generati come .xlsx e .md da n8n e caricati su Google Drive. La generazione PDF non è nella pipeline attuale.
- **Re-evaluation:** post-MVP — dipende da richieste esplicite dei clienti

---

### OOS-007 — Integrazione CMS diretta (WordPress, Shopify, ecc.)

- **Status:** out-of-scope
- **Rationale:** Nessuna integrazione bidirezionale con CMS di terze parti è pianificata. Le raccomandazioni del report vengono implementate manualmente dal cliente.
- **Re-evaluation:** permanent (per questo progetto)

---

<!-- Add items as they come up during discovery or sprints. -->
