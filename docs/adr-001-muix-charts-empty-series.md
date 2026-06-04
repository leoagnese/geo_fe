# ADR-001 — MUI X Charts: filtrare le serie vuote prima del rendering

**Data:** 2026-06-04  
**Stato:** Adottato  
**Componente:** `SC-031 — Brand Analysis` (`ranking/page.tsx`)

---

## Contesto

La tab *Brand Analysis* usa `ScatterChart` di MUI X Charts per il grafico *Competitive Landscape*. Il grafico riceve due serie distinte:

- **Target** — un solo punto (il brand analizzato), presente solo se `avgRankPosition !== null`
- **Competitor** — N punti (i competitor filtrati), presenti solo se hanno una posizione media valida

In certi run (nessun competitor con posizione misurata, oppure target senza posizione) una delle due serie risultava un array vuoto `[]`.

## Problema

MUI X Charts costruisce internamente un indice spaziale **Flatbush** per ottimizzare l'hover/tooltip sui punti del grafico. Flatbush richiede `numItems > 0`: se riceve una serie con `data: []`, lancia:

```
Error: MUI X Charts: Unexpected numItems value: 0.
The spatial index requires a positive integer for numItems.
```

Questo produceva un *Unhandled Runtime Error* che bloccava l'intera pagina dei risultati.

## Decisione

Prima di passare l'array `series` a `<ScatterChart>`, le serie con `data` vuoto vengono escluse con spread condizionale:

```tsx
series={[
  ...(targetScatter.length > 0
    ? [{ data: targetScatter, label: 'Target', ... }]
    : []),
  ...(competitorScatter.length > 0
    ? [{ data: competitorScatter, label: 'Competitor', ... }]
    : []),
]}
```

Il guard esterno (`targetScatter.length > 0 || competitorScatter.length > 0`) garantisce già che il grafico non venga montato quando entrambe le serie sono vuote, mostrando invece il messaggio "Dati di posizione non disponibili". Il fix agisce a livello più granulare: assicura che *ogni singola serie* passata al componente contenga almeno un punto.

## Alternative considerate

| Alternativa | Motivo del rifiuto |
|---|---|
| Passare `data: [{ x: 0, y: 0, id: '_placeholder' }]` come serie fantasma | Introduce un punto falso nel grafico, altera metriche e tooltip |
| Wrappare `<ScatterChart>` in un `try/catch` o `ErrorBoundary` locale | Nasconde l'errore ma non lo previene; la serie vuota genera comunque uno stato inconsistente |
| Upgrade di `@mui/x-charts` | Non garantisce la risoluzione; il comportamento di Flatbush con serie vuote è documentato come input non supportato |

## Conseguenze

- Nessuna regressione: se entrambe le serie hanno dati, il grafico funziona identicamente a prima.
- Il caso "solo target" e "solo competitor" ora renderizzano correttamente con una singola serie.
- Pattern da replicare in qualsiasi altro `ScatterChart` / `BarChart` / `LineChart` che costruisce le serie dinamicamente da dati API potenzialmente vuoti.
