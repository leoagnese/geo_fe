/**
 * Read an uploaded .xlsx or .csv file into a table of strings (header + rows).
 * Parsing runs in the browser; nothing is sent to the backend.
 */

/** Minimal RFC-4180 CSV parser; the delimiter (`,` or `;`) is sniffed from the first line. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  if (!src.trim()) return []

  const firstLine = src.split(/\r?\n/, 1)[0]
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === delimiter) {
      row.push(field); field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(field); field = ''
      rows.push(row); row = []
    } else field += ch
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}

export async function readSpreadsheetFile(file: File): Promise<string[][]> {
  if (/\.csv$/i.test(file.name)) {
    return parseCsv(await file.text())
  }
  if (/\.xlsx$/i.test(file.name)) {
    const { readSheet } = await import('read-excel-file/browser')
    const data = await readSheet(file)
    return data.map((row) => row.map((c) => (c == null ? '' : String(c))))
  }
  throw new Error('Formato non supportato: usa un file .xlsx o .csv')
}
