/**
 * QueryImportDialog — import custom queries from an .xlsx/.csv file.
 *
 * Flow: pick file → column mapping (auto-detected) → vertical filter →
 * preview (per persona / per vertical, errors, duplicates) → confirm.
 * All parsing happens in the browser; see lib/queryImport.ts for the rules.
 */
'use client'

import { useMemo, useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import type { Persona } from '@/lib/api-client'
import { readSpreadsheetFile } from '@/lib/readSpreadsheet'
import {
  detectMapping,
  filterByVerticals,
  deriveTopics,
  groupByLang,
  parseQueryTable,
  type DerivedTopic,
  type ColumnMapping,
  type CustomQueryRow,
  type QueryField,
} from '@/lib/queryImport'

const FIELD_LABELS: Record<QueryField, string> = {
  query: 'Query (prompt)',
  keyword: 'Keyword',
  persona: 'Persona',
  topicId: 'Topic / vertical',
  intent: 'Intent',
  lang: 'Lingua',
}

export type ImportMode = 'append' | 'replace'

interface Props {
  open: boolean
  onClose: () => void
  /** Languages selected in the run (import target). */
  locales: string[]
  personas: Persona[]
  onImport: (byLang: Record<string, CustomQueryRow[]>, topics: DerivedTopic[], mode: ImportMode) => void
}

export default function QueryImportDialog({ open, onClose, locales, personas, onImport }: Props) {
  const [table, setTable] = useState<string[][] | null>(null)
  const [fileName, setFileName] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping | null>(null)
  const [defaultLang, setDefaultLang] = useState(locales[0] ?? 'it')
  const [selectedVerticals, setSelectedVerticals] = useState<string[]>([])
  const [mode, setMode] = useState<ImportMode>('append')

  const parsed = useMemo(
    () => (table && mapping && mapping.query != null && mapping.keyword != null
      ? parseQueryTable(table, mapping, personas)
      : null),
    [table, mapping, personas],
  )
  const verticals = parsed ? Object.keys(parsed.verticalCounts) : []
  const kept = parsed ? filterByVerticals(parsed.rows, selectedVerticals) : []
  const byLang = groupByLang(kept, defaultLang)
  const countBy = (key: 'personaId' | 'vertical') =>
    kept.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r[key] || '—']: (acc[r[key] || '—'] ?? 0) + 1 }), {})
  const personaName = (id: string) => personas.find((p) => p.id === id)?.name ?? 'Persona di default'
  const outsideLocales = Object.keys(byLang).filter((l) => !locales.includes(l))

  async function handleFile(file: File | undefined) {
    if (!file) return
    setReadError(null)
    try {
      const t = await readSpreadsheetFile(file)
      if (t.length < 2) throw new Error('Il file non contiene righe di dati.')
      const detected = detectMapping(t[0])
      const p = detected.query != null && detected.keyword != null ? parseQueryTable(t, detected, personas) : null
      setTable(t)
      setFileName(file.name)
      setMapping(detected)
      setSelectedVerticals(p ? Object.keys(p.verticalCounts) : [])
    } catch (err) {
      setTable(null)
      setReadError(err instanceof Error ? err.message : 'Impossibile leggere il file.')
    }
  }

  function changeMapping(field: QueryField, value: string) {
    if (!mapping || !table) return
    const next = { ...mapping, [field]: value === '' ? null : Number(value) }
    setMapping(next)
    if (field === 'topicId' && next.query != null && next.keyword != null) {
      setSelectedVerticals(Object.keys(parseQueryTable(table, next, personas).verticalCounts))
    }
  }

  function reset() {
    setTable(null); setMapping(null); setFileName(''); setReadError(null); setSelectedVerticals([]); setMode('append')
  }

  function close() { reset(); onClose() }

  function confirm() {
    onImport(byLang, deriveTopics(kept), mode)
    close()
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="md" fullWidth>
      <DialogTitle>Importa query da file</DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box>
          <Button component="label" variant="outlined" size="small">
            {fileName ? 'Cambia file' : 'Scegli file .xlsx / .csv'}
            <input
              type="file"
              hidden
              accept=".xlsx,.csv"
              data-testid="query-file-input"
              onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = '' }}
            />
          </Button>
          {fileName && <Typography component="span" variant="body2" sx={{ ml: 1.5 }}>{fileName}</Typography>}
        </Box>

        {readError && <Alert severity="error">{readError}</Alert>}

        {table && mapping && (
          <>
            <Box>
              <Typography variant="subtitle2" gutterBottom>Colonne</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
                {(Object.keys(FIELD_LABELS) as QueryField[]).map((field) => (
                  <TextField
                    key={field}
                    select
                    size="small"
                    label={FIELD_LABELS[field]}
                    value={mapping[field] == null ? '' : String(mapping[field])}
                    onChange={(e) => changeMapping(field, e.target.value)}
                  >
                    <MenuItem value="">— nessuna —</MenuItem>
                    {table[0].map((h, i) => <MenuItem key={i} value={String(i)}>{h || `Colonna ${i + 1}`}</MenuItem>)}
                  </TextField>
                ))}
              </Box>
              {mapping.lang == null && (
                <TextField
                  select size="small" label="Lingua delle query" value={defaultLang}
                  onChange={(e) => setDefaultLang(e.target.value)} sx={{ mt: 1.5, minWidth: 200 }}
                >
                  {locales.map((l) => <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>)}
                </TextField>
              )}
            </Box>

            {!parsed && (
              <Alert severity="warning">Associa almeno le colonne «Query» e «Keyword» per vedere l&apos;anteprima.</Alert>
            )}

            {parsed && (
              <>
                <Box>
                  <Typography variant="subtitle2">Vertical da importare</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2 }}>
                    {verticals.map((v) => (
                      <FormControlLabel
                        key={v}
                        label={`${v} (${parsed.verticalCounts[v]})`}
                        control={
                          <Checkbox
                            size="small"
                            checked={selectedVerticals.includes(v)}
                            onChange={(e) => setSelectedVerticals((prev) =>
                              e.target.checked ? [...prev, v] : prev.filter((x) => x !== v))}
                          />
                        }
                      />
                    ))}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>Anteprima: {kept.length} query</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {Object.entries(countBy('personaId')).map(([id, n]) => (
                      <Chip key={id} size="small" label={`${personaName(id)}: ${n}`} />
                    ))}
                    {Object.entries(countBy('vertical')).map(([v, n]) => (
                      <Chip key={v} size="small" variant="outlined" label={`${v}: ${n}`} />
                    ))}
                  </Box>
                  {parsed.duplicates > 0 && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      {parsed.duplicates} duplicati ignorati.
                    </Typography>
                  )}
                </Box>

                {parsed.errors.length > 0 && (
                  <Alert severity="warning">
                    {parsed.errors.length} righe non importabili:
                    <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                      {parsed.errors.slice(0, 5).map((e) => <li key={e.line}>riga {e.line}: {e.reason}</li>)}
                      {parsed.errors.length > 5 && <li>… e altre {parsed.errors.length - 5}</li>}
                    </ul>
                  </Alert>
                )}

                {outsideLocales.length > 0 && (
                  <Alert severity="warning">
                    Il file contiene query per lingue non selezionate nella run ({outsideLocales.join(', ')}):
                    verranno ignorate dal workflow finché non attivi quel paese.
                  </Alert>
                )}

                <RadioGroup row value={mode} onChange={(e) => setMode(e.target.value as ImportMode)}>
                  <FormControlLabel value="append" control={<Radio size="small" />} label="Aggiungi alle esistenti" />
                  <FormControlLabel value="replace" control={<Radio size="small" />} label="Sostituisci le esistenti" />
                </RadioGroup>
              </>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annulla</Button>
        <Button variant="contained" onClick={confirm} disabled={!parsed || kept.length === 0}>
          Importa {kept.length > 0 ? `${kept.length} query` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
