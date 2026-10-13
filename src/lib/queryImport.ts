/**
 * Custom-query import for the run configurator (gotQueries mode).
 *
 * Pure functions: turn a spreadsheet table (header + rows of strings) into the
 * `queries[lang]` shape the n8n workflow reads
 * ({ keyword, query, topicId, intent, personaId }).
 */
import type { Persona } from '@/lib/api-client'
import { slugifyTopic } from '@/components/RunConfigFields'

export type QueryField = 'query' | 'persona' | 'keyword' | 'topicId' | 'intent' | 'lang'

/** Column index per field, or null when the sheet has no such column. */
export type ColumnMapping = Record<QueryField, number | null>

export interface ImportRow {
  query: string
  keyword: string
  topicId: string
  intent: string
  personaId: string
  lang: string
  /** Full vertical label from the sheet, e.g. "Industry – Manifatturiera". */
  topicLabel: string
  /** Macro vertical used by the import filter ("Industry", "Hospitality", "Altro"…). */
  vertical: string
}

export interface ParsedImport {
  rows: ImportRow[]
  errors: { line: number; reason: string }[]
  duplicates: number
  verticalCounts: Record<string, number>
}

export interface CustomQueryRow {
  keyword: string
  query: string
  topicId: string
  intent: string
  personaId: string
}

const HEADER_ALIASES: Record<QueryField, string[]> = {
  query: ['prompt', 'query', 'domanda', 'question'],
  persona: ['buyer persona', 'persona', 'personaid'],
  keyword: ['solution', 'keyword', 'soluzione'],
  topicId: ['vertical', 'topic', 'topicid', 'argomento'],
  intent: ['intent', 'intento'],
  lang: ['lang', 'language', 'lingua'],
}

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export function detectMapping(header: string[]): ColumnMapping {
  const names = header.map(normalize)
  const find = (field: QueryField) => {
    const idx = names.findIndex((n) => HEADER_ALIASES[field].includes(n))
    return idx === -1 ? null : idx
  }
  return {
    query: find('query'),
    persona: find('persona'),
    topicId: find('topicId'),
    keyword: find('keyword'),
    intent: find('intent'),
    lang: find('lang'),
  }
}

/** "Industry – Manifatturiera" → "Industry"; labels without a separator → "Altro". */
export function macroVertical(vertical: string): string {
  const [macro, ...rest] = vertical.split(/\s[–—-]\s/)
  return rest.length > 0 && macro.trim() ? macro.trim() : 'Altro'
}

export function parseQueryTable(
  table: string[][],
  mapping: ColumnMapping,
  personas: Persona[],
): ParsedImport {
  const cell = (row: string[], field: QueryField) => {
    const idx = mapping[field]
    return idx == null ? '' : (row[idx] ?? '').trim()
  }

  const personaByKey = new Map<string, string>()
  for (const p of personas) {
    personaByKey.set(normalize(p.name), p.id)
    personaByKey.set(normalize(p.id), p.id)
  }

  const result: ParsedImport = { rows: [], errors: [], duplicates: 0, verticalCounts: {} }
  const seen = new Set<string>()

  table.slice(1).forEach((row, i) => {
    const line = i + 2 // 1-based sheet line, header is line 1
    if (row.every((c) => !c?.trim())) return

    const query = cell(row, 'query')
    const keyword = cell(row, 'keyword')
    if (!query || !keyword) {
      result.errors.push({ line, reason: !query ? 'Query vuota' : 'Keyword vuota' })
      return
    }

    const rawPersona = cell(row, 'persona')
    let personaId = ''
    if (rawPersona) {
      const found = personaByKey.get(normalize(rawPersona))
      if (!found) {
        result.errors.push({ line, reason: `Persona non trovata: "${rawPersona}"` })
        return
      }
      personaId = found
    }

    const lang = cell(row, 'lang').toLowerCase()
    const dedupeKey = `${lang}|${personaId}|${normalize(query)}`
    if (seen.has(dedupeKey)) {
      result.duplicates += 1
      return
    }
    seen.add(dedupeKey)

    const rawTopic = cell(row, 'topicId')
    const vertical = macroVertical(rawTopic)
    result.verticalCounts[vertical] = (result.verticalCounts[vertical] ?? 0) + 1
    result.rows.push({
      query,
      keyword,
      topicId: slugifyTopic(rawTopic),
      topicLabel: rawTopic,
      intent: cell(row, 'intent'),
      personaId,
      lang,
      vertical,
    })
  })

  return result
}

export function filterByVerticals(rows: ImportRow[], verticals: string[]): ImportRow[] {
  return rows.filter((r) => verticals.includes(r.vertical))
}

/** Group rows by language (row lang if the sheet had one, else `defaultLang`). */
export function groupByLang(rows: ImportRow[], defaultLang: string): Record<string, CustomQueryRow[]> {
  const out: Record<string, CustomQueryRow[]> = {}
  for (const r of rows) {
    const lang = r.lang || defaultLang
    ;(out[lang] ??= []).push({
      keyword: r.keyword,
      query: r.query,
      topicId: r.topicId,
      intent: r.intent,
      personaId: r.personaId,
    })
  }
  return out
}

export interface DerivedTopic {
  id: string
  label: string
  keywords: string[]
}

/**
 * One topic per distinct vertical label, with the distinct keywords of its rows.
 * The id equals the `topicId` carried by the queries, so topics and queries match.
 */
export function deriveTopics(rows: ImportRow[]): DerivedTopic[] {
  const byId = new Map<string, DerivedTopic>()
  for (const r of rows) {
    if (!r.topicLabel) continue
    const topic = byId.get(r.topicId) ?? { id: r.topicId, label: r.topicLabel, keywords: [] }
    if (!topic.keywords.includes(r.keyword)) topic.keywords.push(r.keyword)
    byId.set(r.topicId, topic)
  }
  return [...byId.values()]
}
