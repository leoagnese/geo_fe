import { parseCsv } from '@/lib/readSpreadsheet'

describe('parseCsv', () => {
  it('parses comma-separated rows', () => {
    expect(parseCsv('a,b\n1,2\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('detects the semicolon delimiter (Italian Excel)', () => {
    expect(parseCsv('prompt;persona\nCiao, mondo;Progettisti')).toEqual([
      ['prompt', 'persona'],
      ['Ciao, mondo', 'Progettisti'],
    ])
  })

  it('handles quoted fields with delimiters, escaped quotes and newlines', () => {
    expect(parseCsv('a,b\n"x, ""y""","line1\nline2"')).toEqual([
      ['a', 'b'],
      ['x, "y"', 'line1\nline2'],
    ])
  })

  it('strips a UTF-8 BOM and handles CRLF', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']])
  })

  it('returns an empty table for an empty file', () => {
    expect(parseCsv('')).toEqual([])
  })
})
