import type { MatrixCell, ProcessedItem, SourcesResult } from '@/lib/api-client'
import type { SheetData } from '@/lib/saveWorkbook'

const LANGS: Array<{ key: 'all' | 'it' | 'en' | 'fr'; top: string; suffix: string }> = [
  { key: 'all', top: 'TOT', suffix: '' },
  { key: 'it', top: 'IT', suffix: ' - IT' },
  { key: 'en', top: 'EN', suffix: ' - EN' },
  { key: 'fr', top: 'FR', suffix: ' - FR' },
]
const ITEM_COLUMNS = ['timeStamp', 'isStaticProbe', 'lang', 'region', 'keywordCluster', 'personaType', 'promptText', 'modelName', 'runIteration', 'canonicalBrand', 'rankPosition', 'sentiment', 'hasLink', 'linkType', 'domain', 'link'] as const

type Row = (string | number | null)[]

function topBlock(label: string, s: SourcesResult): Row[] {
  return [
    [`Top10 domini (${label})`, 'Menzioni con link', 'Peso %'],
    ...s.topDomains.rows.map((r): Row => [r.domain, r.mentions, r.weight]),
    ['Totale', s.topDomains.totalMentions, ''],
    [],
  ]
}

function matrixBlock(title: string, s: SourcesResult, pick: (c: MatrixCell) => number | null): Row[] {
  const value = (c: MatrixCell) => pick(c) ?? ''
  const names = new Map(s.personas.map((p) => [p.id, p.name]))
  return [
    [title],
    ['Buyer Personas', ...s.matrix.topics, 'Totale generale'],
    ...s.matrix.rows.map((r): Row => [names.get(r.personaId) ?? r.personaId, ...r.cells.map(value), value(r.total)]),
    ['Totale generale', ...s.matrix.totals.cells.map(value), value(s.matrix.totals.total)],
    [],
  ]
}

/** The "processed" workbook: the summary tables of the SEO's files, the enriched LLM items and domain × language counts. */
export function buildProcessedSheets(input: {
  sources: Record<'all' | 'it' | 'en' | 'fr', SourcesResult>
  items: ProcessedItem[]
}): SheetData[] {
  const summary: Row[] = []
  for (const l of LANGS) summary.push(...topBlock(l.top, input.sources[l.key]))
  for (const l of LANGS) {
    const s = input.sources[l.key]
    summary.push(...matrixBlock(`TOT${l.suffix}`, s, (c) => c.total))
    summary.push(...matrixBlock(`TTP${l.suffix}`, s, (c) => c.target))
    summary.push(...matrixBlock(`%${l.suffix}`, s, (c) => c.share))
  }

  const llmItems: Row[] = [[...ITEM_COLUMNS], ...input.items.map((i): Row => ITEM_COLUMNS.map((c) => i[c] as string | number))]

  const byDomain = new Map<string, { en: number; fr: number; it: number }>()
  for (const i of input.items) {
    if (!i.domain || (i.lang !== 'en' && i.lang !== 'fr' && i.lang !== 'it')) continue
    const e = byDomain.get(i.domain) ?? { en: 0, fr: 0, it: 0 }
    e[i.lang] += 1
    byDomain.set(i.domain, e)
  }
  const domini: Row[] = [
    ['domain', 'en', 'fr', 'it', 'Totale generale'],
    ...[...byDomain.entries()]
      .map(([d, e]) => ({ d, e, t: e.en + e.fr + e.it }))
      .sort((a, b) => b.t - a.t || a.d.localeCompare(b.d))
      .map(({ d, e, t }): Row => [d, e.en, e.fr, e.it, t]),
  ]

  return [
    { name: 'summary', rows: summary },
    { name: 'LLM items', rows: llmItems },
    { name: 'Domini', rows: domini },
  ]
}
