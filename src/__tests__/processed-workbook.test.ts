import { buildProcessedSheets } from '@/lib/processedWorkbook'
import type { ProcessedItem, SourcesResult } from '@/lib/api-client'

const cell = { total: 2, target: 1, share: 50 }
const empty = { total: 0, target: 0, share: null }
const sources = (lang: string): SourcesResult => ({
  lang, target: 'turismotorino.org',
  personas: [{ id: 'p1', name: 'Family' }], topics: ['T1'],
  topDomains: { rows: [{ domain: 'a.com', mentions: 3, queries: 2, weight: 60 }], totalMentions: 5, totalQueries: 3 },
  matrix: { topics: ['T1'], rows: [{ personaId: 'p1', cells: [cell], total: empty }], totals: { cells: [cell], total: cell } },
  examplePrompts: { p1: { it: 'Prompt reale' } },
})
const item = (o: Partial<ProcessedItem>): ProcessedItem => ({
  itemId: 'i1', queryId: 'q1', runId: 'r1', timeStamp: '2026-10-13T10:00:00Z', isStaticProbe: false, lang: 'it', region: 'Italia',
  keywordCluster: 'T1', personaType: 'Family', promptText: 'Prompt', modelName: 'gpt', runIteration: 1, canonicalBrand: 'B',
  rankPosition: 1, sentiment: 'neutral', hasLink: true, linkType: 'editorial', link: 'https://a.com/x', domain: 'a.com', isTarget: false, ...o,
})
const build = () =>
  buildProcessedSheets({
    sources: { all: sources('all'), it: sources('it'), en: sources('en'), fr: sources('fr') },
    items: [item({}), item({ itemId: 'i2', lang: 'en', domain: 'a.com' }), item({ itemId: 'i3', link: '', domain: '', hasLink: false })],
  })

describe('buildProcessedSheets', () => {
  it('has the three sheets', () => {
    expect(build().map((s) => s.name)).toEqual(['summary', 'LLM items', 'Domini'])
  })

  it('writes a Top10 block per language with its total', () => {
    const rows = build()[0].rows
    expect(rows).toContainEqual(['Top10 domini (TOT)', 'Menzioni con link', 'Peso %'])
    expect(rows).toContainEqual(['Top10 domini (IT)', 'Menzioni con link', 'Peso %'])
    expect(rows).toContainEqual(['a.com', 3, 60])
    expect(rows).toContainEqual(['Totale', 5, ''])
  })

  it('writes TOT, TTP and % matrices per language, blank where there is nothing', () => {
    const rows = build()[0].rows
    for (const title of ['TOT', 'TTP', '%', 'TOT - IT', 'TTP - EN', '% - FR']) expect(rows).toContainEqual([title])
    expect(rows).toContainEqual(['Buyer Personas', 'T1', 'Totale generale'])
    expect(rows).toContainEqual(['Family', 2, 0]) // TOT: cell total, row total (empty = 0)
    expect(rows).toContainEqual(['Family', 50, '']) // %: share, null row total → blank
  })

  it('lists the enriched items with the processed columns', () => {
    const items = build()[1]
    expect(items.rows[0]).toEqual(['timeStamp', 'isStaticProbe', 'lang', 'region', 'keywordCluster', 'personaType', 'promptText', 'modelName', 'runIteration', 'canonicalBrand', 'rankPosition', 'sentiment', 'hasLink', 'linkType', 'domain', 'link'])
    expect(items.rows).toHaveLength(4)
    expect(items.rows[1][4]).toBe('T1')
  })

  it('counts domain × language from the linked items only', () => {
    const domini = build()[2].rows
    expect(domini[0]).toEqual(['domain', 'en', 'fr', 'it', 'Totale generale'])
    expect(domini[1]).toEqual(['a.com', 1, 0, 1, 2])
    expect(domini).toHaveLength(2)
  })
})
