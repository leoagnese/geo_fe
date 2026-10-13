/**
 * Custom-query import (run configurator, gotQueries mode).
 *
 * Uses the real "energy_llm_prompts_104" sheet as fixture:
 * 104 rows, 52 per buyer persona, 44 Industry + 26 Hospitality + 34 other.
 */
import table from './fixtures/energy_llm_prompts_104.json'
import {
  detectMapping,
  macroVertical,
  parseQueryTable,
  filterByVerticals,
  groupByLang,
  deriveTopics,
  type ColumnMapping,
} from '@/lib/queryImport'
import type { Persona } from '@/lib/api-client'

const personas: Persona[] = [
  { id: 'p-prog', name: 'Progettisti / Specifiers', description: '', context: '' },
  { id: 'p-inst', name: 'Installatori / Installers', description: '', context: '' },
]

const rows = table as string[][]

describe('detectMapping', () => {
  it('maps the sheet headers to query fields', () => {
    expect(detectMapping(rows[0])).toEqual({
      query: 0,
      persona: 1,
      topicId: 2,
      keyword: 3,
      intent: null,
      lang: null,
    })
  })

  it('leaves unknown columns unmapped', () => {
    expect(detectMapping(['foo', 'bar']).query).toBeNull()
  })
})

describe('macroVertical', () => {
  it.each([
    ['Industry – Manifatturiera', 'Industry'],
    ['Hospitality – Hotel e ristoranti', 'Hospitality'],
    ['Residenziale', 'Altro'],
    ['', 'Altro'],
  ])('%s → %s', (input, expected) => {
    expect(macroVertical(input)).toBe(expected)
  })
})

describe('parseQueryTable on the real sheet', () => {
  const parsed = parseQueryTable(rows, detectMapping(rows[0]), personas)

  it('parses all 104 rows without errors', () => {
    expect(parsed.rows).toHaveLength(104)
    expect(parsed.errors).toEqual([])
  })

  it('resolves 52 queries per persona', () => {
    const count = (id: string) => parsed.rows.filter((r) => r.personaId === id).length
    expect(count('p-prog')).toBe(52)
    expect(count('p-inst')).toBe(52)
  })

  it('maps prompt→query and solution→keyword', () => {
    expect(parsed.rows[0].query).toMatch(/^Nel progetto dell'impianto elettrico di un museo/)
    expect(parsed.rows[0].keyword).toBe('90 RCD – Interruttori modulari per protezione differenziale')
    expect(parsed.rows[0].vertical).toBe('Hospitality')
  })

  it('counts rows per macro vertical', () => {
    expect(parsed.verticalCounts).toEqual({ Industry: 44, Hospitality: 26, Sports: 4, Retail: 3, Altro: 27 })
  })
})

describe('filterByVerticals', () => {
  const parsed = parseQueryTable(rows, detectMapping(rows[0]), personas)

  it('keeps only Industry and Hospitality → 70 rows', () => {
    const kept = filterByVerticals(parsed.rows, ['Industry', 'Hospitality'])
    expect(kept).toHaveLength(70)
    expect(kept.every((r) => ['Industry', 'Hospitality'].includes(r.vertical))).toBe(true)
  })
})

describe('parseQueryTable error handling', () => {
  const mapping: ColumnMapping = { query: 0, persona: 1, topicId: null, keyword: 2, intent: null, lang: null }
  const header = ['prompt', 'persona', 'solution']

  it('reports unknown personas, with the 1-based sheet line, and skips the row', () => {
    const t = [header, ['Domanda uno', 'Sconosciuta', 'RCD'], ['Domanda due', 'Progettisti / Specifiers', 'RCD']]
    const parsed = parseQueryTable(t, mapping, personas)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.errors).toEqual([{ line: 2, reason: 'Persona non trovata: "Sconosciuta"' }])
  })

  it('reports rows with empty query or keyword', () => {
    const t = [header, ['', 'Progettisti / Specifiers', 'RCD'], ['Domanda', 'Progettisti / Specifiers', '']]
    const parsed = parseQueryTable(t, mapping, personas)
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors.map((e) => e.line)).toEqual([2, 3])
  })

  it('drops exact duplicates for the same persona and counts them', () => {
    const t = [header, ['Stessa  domanda', 'Progettisti / Specifiers', 'RCD'], ['stessa domanda', 'Progettisti / Specifiers', 'MCB']]
    const parsed = parseQueryTable(t, mapping, personas)
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.duplicates).toBe(1)
  })

  it('matches personas case-insensitively and by id', () => {
    const t = [header, ['Q1', 'installatori / installers', 'RCD'], ['Q2', 'p-prog', 'RCD']]
    const parsed = parseQueryTable(t, mapping, personas)
    expect(parsed.rows.map((r) => r.personaId)).toEqual(['p-inst', 'p-prog'])
  })

  it('leaves personaId empty when the persona column is not mapped', () => {
    const parsed = parseQueryTable([['prompt', 'solution'], ['Q1', 'RCD']], { ...mapping, persona: null, keyword: 1 }, personas)
    expect(parsed.rows[0].personaId).toBe('')
    expect(parsed.errors).toEqual([])
  })
})

describe('groupByLang', () => {
  const parsed = parseQueryTable(rows, detectMapping(rows[0]), personas)

  it('puts every row under the chosen language, in the workflow format', () => {
    const grouped = groupByLang(parsed.rows.slice(0, 2), 'it')
    expect(Object.keys(grouped)).toEqual(['it'])
    expect(grouped.it).toHaveLength(2)
    expect(grouped.it[0]).toEqual({
      keyword: '90 RCD – Interruttori modulari per protezione differenziale',
      query: expect.stringMatching(/^Nel progetto/),
      topicId: 'hospitality_musei_e_biblioteche',
      intent: '',
      personaId: 'p-prog',
    })
  })

  it('uses the per-row lang when the sheet has a lang column', () => {
    const t = [['prompt', 'solution', 'lang'], ['Q it', 'K', 'it'], ['Q en', 'K', 'EN']]
    const m: ColumnMapping = { query: 0, persona: null, topicId: null, keyword: 1, intent: null, lang: 2 }
    const grouped = groupByLang(parseQueryTable(t, m, personas).rows, 'it')
    expect(Object.keys(grouped).sort()).toEqual(['en', 'it'])
  })
})

describe('deriveTopics', () => {
  const parsed = parseQueryTable(rows, detectMapping(rows[0]), personas)
  const kept = filterByVerticals(parsed.rows, ['Industry', 'Hospitality'])

  it('creates one topic per distinct vertical label of the rows', () => {
    const topics = deriveTopics(kept)
    expect(topics).toHaveLength(12) // 6 Industry + 6 Hospitality
    expect(topics.map((t) => t.label)).toContain('Industry – Manifatturiera')
  })

  it('uses the same id the queries carry as topicId, so topics and queries match', () => {
    const topics = deriveTopics(kept)
    const queryTopicIds = new Set(kept.map((r) => r.topicId))
    expect(new Set(topics.map((t) => t.id))).toEqual(queryTopicIds)
  })

  it('lists the distinct keywords (solutions) of each topic', () => {
    const topics = deriveTopics(kept)
    const t = topics.find((x) => x.label === 'Hospitality – Musei e biblioteche')!
    expect(t.keywords).toEqual(['90 RCD – Interruttori modulari per protezione differenziale', expect.any(String)])
    expect(new Set(t.keywords).size).toBe(t.keywords.length)
  })

  it('skips rows without a topic label', () => {
    const noTopic = [['prompt', 'solution'], ['Q', 'K']]
    const p2 = parseQueryTable(noTopic, { query: 0, keyword: 1, persona: null, topicId: null, intent: null, lang: null }, personas)
    expect(deriveTopics(p2.rows)).toEqual([])
  })
})
