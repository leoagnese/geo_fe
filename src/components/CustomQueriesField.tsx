/**
 * CustomQueriesField — "Custom query mode" for the run configurator.
 *
 * When enabled (`gotQueries`), n8n skips question generation and runs the
 * queries listed here, grouped by language:
 *   queries[lang] = [{ keyword, query, topicId, intent, personaId }]
 *   customQueryDefaultPersonaId[lang] = personaId used when a row has none.
 *
 * Field paths are built from `namePrefix` like RunConfigFields, so the same
 * component can later be dropped into a wizard step.
 */
'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import UploadIcon from '@mui/icons-material/UploadFile'
import type { Persona } from '@/lib/api-client'
import type { CustomQueryRow, DerivedTopic } from '@/lib/queryImport'
import QueryImportDialog, { type ImportMode } from './QueryImportDialog'

const EMPTY_ROW: CustomQueryRow = { keyword: '', query: '', topicId: '', intent: '', personaId: '' }

interface Props {
  namePrefix: string
  personas: Persona[]
}

export default function CustomQueriesField({ namePrefix, personas }: Props) {
  const { watch, setValue, getValues, formState: { errors } } = useFormContext()
  const [importOpen, setImportOpen] = useState(false)

  const gotQueries = (watch(`${namePrefix}gotQueries`) as boolean) ?? false
  const locales = (watch(`${namePrefix}activeLocales`) as string[]) ?? []
  const queries = (watch(`${namePrefix}queries`) as Record<string, CustomQueryRow[]>) ?? {}
  const defaults = (watch(`${namePrefix}customQueryDefaultPersonaId`) as Record<string, string>) ?? {}

  const setQueries = (next: Record<string, CustomQueryRow[]>) =>
    setValue(`${namePrefix}queries`, next, { shouldValidate: true, shouldDirty: true })

  const updateRow = (lang: string, idx: number, patch: Partial<CustomQueryRow>) =>
    setQueries({ ...queries, [lang]: (queries[lang] ?? []).map((r, i) => (i === idx ? { ...r, ...patch } : r)) })

  /** Merge imported topics into the form's topic list, dropping empty placeholder rows. */
  function mergeTopics(imported: DerivedTopic[], mode: ImportMode) {
    if (imported.length === 0) return
    const current = (getValues(`${namePrefix}topics`) as { label: string; keywords?: string[] }[]) ?? []
    const kept = mode === 'replace' ? [] : current.filter((t) => t.label.trim())
    const labels = new Set(kept.map((t) => t.label.trim().toLowerCase()))
    const added = imported
      .filter((t) => !labels.has(t.label.toLowerCase()))
      .map(({ label, keywords }) => ({ label, keywords }))
    setValue(`${namePrefix}topics`, [...kept, ...added], { shouldValidate: true, shouldDirty: true })
  }

  function handleImport(byLang: Record<string, CustomQueryRow[]>, topics: DerivedTopic[], mode: ImportMode) {
    const next = mode === 'replace' ? {} : { ...queries }
    for (const [lang, rows] of Object.entries(byLang)) {
      next[lang] = mode === 'replace' ? rows : [...(next[lang] ?? []), ...rows]
    }
    setQueries(next)
    mergeTopics(topics, mode)
  }

  const queriesError = (errors as any)?.[`${namePrefix}queries`]?.message
    ?? namePrefix.split('.').filter(Boolean).reduce((acc: any, k) => acc?.[k], errors as any)?.queries?.message

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={gotQueries}
            onChange={(e) => setValue(`${namePrefix}gotQueries`, e.target.checked, { shouldValidate: true })}
          />
        }
        label="Usa query custom (salta la generazione AI)"
      />

      {gotQueries && (
        <>
          <Alert severity="info">
            Il workflow eseguirà esattamente le query elencate qui. Keyword e topic delle sezioni sopra non vengono usati dal workflow: importando da file i topic vengono compilati in automatico dai vertical.
          </Alert>

          <Box>
            <Button size="small" variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
              Importa da file
            </Button>
          </Box>

          {queriesError && <Alert severity="error">{String(queriesError)}</Alert>}

          {locales.map((lang) => {
            const rows = queries[lang] ?? []
            return (
              <Box key={lang} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle2">{lang.toUpperCase()} — {rows.length} query</Typography>
                  <TextField
                    select size="small" label="Persona di default" sx={{ minWidth: 220 }}
                    value={defaults[lang] ?? ''}
                    onChange={(e) => setValue(`${namePrefix}customQueryDefaultPersonaId`, { ...defaults, [lang]: e.target.value })}
                  >
                    <MenuItem value="">Generica</MenuItem>
                    {personas.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </TextField>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                  {rows.map((row, idx) => (
                    <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 4fr 2fr auto' }, gap: 1, alignItems: 'start' }}>
                      <TextField size="small" label="Keyword" value={row.keyword}
                        onChange={(e) => updateRow(lang, idx, { keyword: e.target.value })} />
                      <TextField size="small" label="Query" multiline minRows={1} maxRows={4} value={row.query}
                        onChange={(e) => updateRow(lang, idx, { query: e.target.value })} />
                      <TextField select size="small" label="Persona" value={row.personaId}
                        onChange={(e) => updateRow(lang, idx, { personaId: e.target.value })}>
                        <MenuItem value="">Default</MenuItem>
                        {personas.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                      </TextField>
                      <IconButton size="small" color="error" aria-label="Rimuovi query"
                        onClick={() => setQueries({ ...queries, [lang]: rows.filter((_, i) => i !== idx) })}>
                        <DeleteIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Box>
                  ))}
                </Box>

                <Button size="small" startIcon={<AddIcon />} sx={{ mt: 1 }}
                  onClick={() => setQueries({ ...queries, [lang]: [...rows, { ...EMPTY_ROW }] })}>
                  Aggiungi query
                </Button>
              </Box>
            )
          })}
        </>
      )}

      <QueryImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        locales={locales}
        personas={personas}
        onImport={handleImport}
      />
    </Box>
  )
}
