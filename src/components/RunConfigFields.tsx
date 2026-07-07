/**
 * RunConfigFields — the shared run-configuration field set (target URL
 * override, profile, iterations, keywords/topics, personas, locales,
 * provider info, per-language target settings, advanced options).
 *
 * Used both by the single-run form (namePrefix='') and by each step of the
 * campaign wizard (namePrefix=`sections.${i}.`), via react-hook-form's
 * FormProvider/useFormContext so the same field-registration logic works
 * against either a flat form or a nested `sections[]` array without
 * duplicating ~700 lines of markup.
 *
 * Field paths are built as template strings (`${namePrefix}profileKey`), so
 * this component intentionally does not carry a specific FieldValues generic —
 * react-hook-form's Path<T> can't enumerate dynamic prefixed paths statically.
 *
 * @spec docs/superpowers/specs/2026-07-03-campaign-wizard-design.md §4.1
 */
'use client'

import { useState, useRef } from 'react'
import { useFormContext, Controller, useFieldArray } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TagInput from '@/components/TagInput'
import type { LlmProfile, Persona, PersonaGroup } from '@/lib/api-client'

export const LANG_OPTIONS = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹', defaultLocation: 'Italia' },
  { code: 'en', label: 'English', flag: '🇬🇧', defaultLocation: 'United Kingdom' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', defaultLocation: 'France' },
] as const

export type LangCode = (typeof LANG_OPTIONS)[number]['code']

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  perplexity: 'Perplexity AI',
}

/** Derive a stable id from a topic label: lowercase, non-alphanumeric → '_'. */
export function slugifyTopic(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export interface RunConfigFieldsProps {
  /** '' for the top-level single-run form, `sections.${i}.` for a wizard step. */
  namePrefix: string
  clientKey: string
  profiles: LlmProfile[]
  profilesLoading: boolean
  profilesError: boolean
  onRetryProfiles: () => void
  domainPersonas: Persona[]
  domainGroups: PersonaGroup[]
  isAddingPersona: boolean
  onAddPersona: (persona: { name: string; description: string; context: string; searchStyle?: string }) => Promise<void>
  isRemovingPersonaId: string | null
  onRemovePersona: (personaId: string) => Promise<void>
}

export default function RunConfigFields({
  namePrefix,
  clientKey,
  profiles,
  profilesLoading,
  profilesError,
  onRetryProfiles,
  domainPersonas,
  domainGroups,
  isAddingPersona,
  onAddPersona,
  isRemovingPersonaId,
  onRemovePersona,
}: RunConfigFieldsProps) {
  const { register, control, watch, setValue, formState: { errors: allErrors } } = useFormContext()
  const errors: any = namePrefix
    ? (namePrefix.split('.').filter(Boolean).reduce((acc: any, key) => acc?.[key], allErrors) ?? {})
    : allErrors

  const [activeLangTab, setActiveLangTab] = useState<LangCode>('it')
  const [openPersonaDialog, setOpenPersonaDialog] = useState(false)
  const [personaFormError, setPersonaFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const contextRef = useRef<HTMLInputElement>(null)
  const searchStyleRef = useRef<HTMLInputElement>(null)

  const p = (field: string) => `${namePrefix}${field}`

  const { fields: topicFields, append: appendTopic, remove: removeTopic } = useFieldArray({
    control,
    name: p('topics'),
  })

  const selectedProfileKey = watch(p('profileKey')) as string
  const activeLocales = (watch(p('activeLocales')) as string[]) ?? []
  const activePersonaIds = (watch(p('activePersonaIds')) as string[]) ?? []
  const useCustomTargetUrl = watch(p('useCustomTargetUrl')) as boolean
  const selectedProfile = profiles.find((prof) => prof.profileKey === selectedProfileKey)
  const allPersonaIds = domainPersonas.map((persona) => persona.id)

  // Pre-select all domain personas on first load.
  if (domainPersonas.length > 0 && activePersonaIds.length === 0) {
    setValue(p('activePersonaIds'), allPersonaIds)
  }

  function toggleLocale(code: string) {
    const next = activeLocales.includes(code)
      ? activeLocales.filter((l) => l !== code)
      : [...activeLocales, code]
    setValue(p('activeLocales'), next, { shouldValidate: true })
    if (!next.includes(activeLangTab)) {
      const first = LANG_OPTIONS.find((l) => next.includes(l.code))
      if (first) setActiveLangTab(first.code)
    }
  }

  function togglePersona(id: string) {
    const next = activePersonaIds.includes(id)
      ? activePersonaIds.filter((x) => x !== id)
      : [...activePersonaIds, id]
    setValue(p('activePersonaIds'), next, { shouldValidate: true })
  }

  async function handleAddPersona() {
    const name = nameRef.current?.value.trim() ?? ''
    const description = descRef.current?.value.trim() ?? ''
    const context = contextRef.current?.value.trim() ?? ''
    const searchStyle = searchStyleRef.current?.value.trim() ?? ''
    if (!name || !description || !context) {
      setPersonaFormError('Nome, descrizione e contesto sono obbligatori.')
      return
    }
    setPersonaFormError(null)
    try {
      await onAddPersona({ name, description, context, searchStyle: searchStyle || undefined })
      setOpenPersonaDialog(false)
    } catch (err) {
      setPersonaFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    }
  }

  const visibleLangTabs = LANG_OPTIONS.filter((l) => activeLocales.includes(l.code))

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          1. ACTIVE RUN SETTINGS
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="1" title="Impostazioni run">

        {/* Client key — read-only */}
        <FieldRow label="Client Key">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={clientKey}
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}
            />
            <Typography variant="caption" color="text.secondary">dominio attivo</Typography>
          </Box>
        </FieldRow>

        {/* Target URL override */}
        <FieldRow label="URL da analizzare">
          <Controller
            name={p('useCustomTargetUrl')}
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value ? 'custom' : 'same'}
                exclusive
                size="small"
                onChange={(_, next) => next && field.onChange(next === 'custom')}
              >
                <ToggleButton value="same">Stesso URL del progetto</ToggleButton>
                <ToggleButton value="custom">URL diverso</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          {useCustomTargetUrl && (
            <TextField
              label="URL da analizzare"
              size="small"
              fullWidth
              {...register(p('targetUrl'))}
              error={!!errors.targetUrl}
              helperText={errors.targetUrl?.message ?? 'Es. acme.com/hotel-torino'}
              sx={{ mt: 1.5, maxWidth: 400 }}
            />
          )}
        </FieldRow>

        {/* Profile selection */}
        <FieldRow label="Selezione profilo">
          {profilesError ? (
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={onRetryProfiles}>Riprova</Button>
            }>
              Impossibile caricare i profili LLM.
            </Alert>
          ) : (
            <Controller
              name={p('profileKey')}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Profilo LLM"
                  size="small"
                  fullWidth
                  disabled={profilesLoading}
                  error={!!errors.profileKey}
                  helperText={errors.profileKey?.message ?? (profilesLoading ? 'Caricamento…' : undefined)}
                >
                  {profiles.map((prof) => (
                    <MenuItem key={prof.profileKey} value={prof.profileKey}>
                      {prof.profileKey}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}
        </FieldRow>

        {/* Run iterations */}
        <FieldRow label="Iterazioni">
          <TextField
            label="Iterazioni"
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            {...register(p('runIterations'), { valueAsNumber: true })}
            error={!!errors.runIterations}
            helperText={errors.runIterations?.message ?? 'Numero di ripetizioni per affidabilità statistica'}
            sx={{ maxWidth: 200 }}
          />
        </FieldRow>

      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          2. QUERY MANAGEMENT
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="2" title="Gestione query">

        {/* Global keywords */}
        <FieldRow label="Keywords">
          <Controller
            name={p('globalKeywords')}
            control={control}
            render={({ field }) => (
              <TagInput
                label="Keyword globali (tutte le lingue)"
                value={field.value}
                onChange={field.onChange}
                placeholder="Aggiungi keyword e premi Invio"
              />
            )}
          />
          <Typography variant="caption" color="text.secondary">
            Queste keyword vengono aggiunte a tutte le lingue attive. Keyword specifiche per lingua si configurano nella sezione 4.
          </Typography>
        </FieldRow>

        <Divider />

        {/* Topics repeater */}
        <FieldRow
          label="Topic"
          badge={`${topicFields.length}`}
        >
          <Typography variant="caption" color="text.secondary">
            Definisci almeno un topic: il workflow distribuisce le query di analisi tra i topic.
            L&apos;<code>id</code> è derivato automaticamente dall&apos;etichetta.
          </Typography>
          {topicFields.length === 0 && (
            <Alert severity="warning" sx={{ my: 1 }}>
              Nessun topic definito. Aggiungine almeno uno per consentire l&apos;analisi.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {topicFields.map((topicField, index) => {
              const label = (watch(p(`topics.${index}.label`)) as string) ?? ''
              const derivedId = slugifyTopic(label)
              return (
                <Box
                  key={topicField.id}
                  sx={{
                    display: 'flex', flexDirection: 'column', gap: 1,
                    p: 1.5,
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 'var(--geo-radius-sm)',
                    bgcolor: 'background.default',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      label="Etichetta topic"
                      size="small"
                      fullWidth
                      {...register(p(`topics.${index}.label`))}
                      error={!!errors.topics?.[index]?.label}
                      helperText={
                        errors.topics?.[index]?.label?.message ??
                        (derivedId ? `id: ${derivedId}` : 'es. "dove dormire a Torino"')
                      }
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeTopic(index)}
                      sx={{ mt: 0.5 }}
                      aria-label="Rimuovi topic"
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                  <Controller
                    name={p(`topics.${index}.keywords`)}
                    control={control}
                    render={({ field }) => (
                      <TagInput
                        label="Keyword del topic (facoltative)"
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Aggiungi keyword e premi Invio"
                      />
                    )}
                  />
                </Box>
              )
            })}
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => appendTopic({ label: '', keywords: [] })}
              sx={{ alignSelf: 'flex-start' }}
            >
              Aggiungi topic
            </Button>
          </Box>
        </FieldRow>

        <Divider />

        {/* Custom query mode — locked */}
        <FieldRow label="Custom Query">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="Le query vengono generate automaticamente dall'AI. La modalità custom query non è ancora disponibile." placement="top">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch disabled checked={false} size="small" />
                <Typography variant="body2" color="text.disabled">Custom query mode</Typography>
                <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Box>
            </Tooltip>
            <Chip label="AI-generated" size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
          </Box>
        </FieldRow>

        <Divider />

        {/* Persona selection + management */}
        <FieldRow
          label="Personas"
          badge={`${activePersonaIds.length}/${domainPersonas.length} attive`}
        >
          {/* Quick-select by group */}
          {domainGroups.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Gruppo:</Typography>
              {domainGroups.map((g) => (
                <Chip
                  key={g.id}
                  label={`${g.name} (${g.personaIds.length})`}
                  size="small"
                  variant={g.personaIds.every((id) => activePersonaIds.includes(id)) && activePersonaIds.length === g.personaIds.length ? 'filled' : 'outlined'}
                  color="primary"
                  onClick={() => setValue(p('activePersonaIds'), g.personaIds, { shouldValidate: true })}
                  sx={{ cursor: 'pointer', fontSize: 11 }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
              onClick={() => setValue(p('activePersonaIds'), allPersonaIds, { shouldValidate: true })}
              disabled={domainPersonas.length === 0}>
              Tutte
            </Button>
            <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
              onClick={() => setValue(p('activePersonaIds'), [], { shouldValidate: true })}
              disabled={domainPersonas.length === 0}>
              Nessuna
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              sx={{ fontSize: 11, py: 0.25, px: 1.5, ml: 'auto' }}
              onClick={() => { setPersonaFormError(null); setOpenPersonaDialog(true) }}>
              Aggiungi
            </Button>
          </Box>

          {domainPersonas.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Nessuna persona configurata per questo dominio. Clicca "Aggiungi" per crearne una.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 1 }}>
              {domainPersonas.map((persona) => {
                const checked = activePersonaIds.includes(persona.id)
                return (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    checked={checked}
                    onToggle={() => togglePersona(persona.id)}
                    onRemove={() => onRemovePersona(persona.id)}
                    isRemoving={isRemovingPersonaId === persona.id}
                  />
                )
              })}
            </Box>
          )}
        </FieldRow>

        <Divider />

        {/* Country selection */}
        <FieldRow
          label="Paese / Lingua"
          badge={`${activeLocales.length} ${activeLocales.length === 1 ? 'paese' : 'paesi'}`}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {LANG_OPTIONS.map(({ code, label, flag }) => {
              const active = activeLocales.includes(code)
              return (
                <Box
                  key={code}
                  onClick={() => toggleLocale(code)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 2, py: 1,
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    borderRadius: 'var(--geo-radius-md)',
                    bgcolor: active ? 'primary.main' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Checkbox
                    checked={active} size="small" disableRipple
                    sx={{ p: 0, color: active ? 'primary.contrastText' : 'text.disabled',
                      '&.Mui-checked': { color: 'primary.contrastText' } }}
                  />
                  <Typography variant="body2" fontWeight={600}
                    sx={{ color: active ? 'primary.contrastText' : 'text.primary' }}>
                    {flag} {label}
                  </Typography>
                </Box>
              )
            })}
          </Box>
          {errors.activeLocales && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {errors.activeLocales.message}
            </Typography>
          )}
        </FieldRow>

      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          3. PROFILE & PROVIDER MANAGEMENT
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="3" title="Gestione profilo & provider">
        {!selectedProfile ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Seleziona un profilo LLM nella sezione 1 per vedere la configurazione provider.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Provider + run model */}
            <FieldRow label="Provider LLM">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={PROVIDER_LABELS[selectedProfile.llmProvider] ?? selectedProfile.llmProvider}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {selectedProfile.profileKey}
                </Typography>
              </Box>
            </FieldRow>

            <FieldRow label="Versione modello">
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {[
                  ['Run model', selectedProfile.runModel],
                  ['QGen model', selectedProfile.qgenModel],
                  ['NER model', selectedProfile.nerModel],
                ].map(([lbl, val]) => (
                  <Box key={lbl}>
                    <Typography variant="caption" color="text.secondary" display="block">{lbl}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            </FieldRow>

            {/* Response config (if present) */}
            {selectedProfile.responsesCfg && Object.keys(selectedProfile.responsesCfg).length > 0 && (
              <FieldRow label="Configurazione risposte">
                <Box sx={{
                  display: 'flex', gap: 1, flexWrap: 'wrap',
                  p: 1.5,
                  bgcolor: 'background.default',
                  borderRadius: 'var(--geo-radius-sm)',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  {Object.entries(selectedProfile.responsesCfg).map(([key, val]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${String(val)}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </FieldRow>
            )}
          </>
        )}
      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          4. TARGET SETTINGS & KEYWORDS
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="4" title="Impostazioni target & keyword">
        {activeLocales.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Seleziona almeno un paese nella sezione 2 per configurare le impostazioni per lingua.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab bar — only active languages */}
            <Tabs
              value={visibleLangTabs.some((l) => l.code === activeLangTab) ? activeLangTab : visibleLangTabs[0]?.code}
              onChange={(_, v: LangCode) => setActiveLangTab(v)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
            >
              {visibleLangTabs.map(({ code, label, flag }) => (
                <Tab key={code} value={code} label={`${flag} ${label}`} sx={{ fontWeight: 600, fontSize: 13 }} />
              ))}
            </Tabs>

            {/* Tab content */}
            {visibleLangTabs.map(({ code, defaultLocation }) => {
              const currentTab = visibleLangTabs.some((l) => l.code === activeLangTab)
                ? activeLangTab
                : visibleLangTabs[0]?.code
              if (code !== currentTab) return null
              return (
                <Box key={code} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                  {/* Keyword list manager */}
                  <FieldRow label="Lista keyword">
                    <Controller
                      name={p(`langs.${code}.keywords`)}
                      control={control}
                      render={({ field }) => (
                        <TagInput
                          label={`Keyword specifiche per ${code.toUpperCase()}`}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Aggiungi keyword e premi Invio"
                        />
                      )}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Vengono aggiunte alle keyword globali della sezione 2.
                      {((watch(p('globalKeywords')) as string[]) ?? []).length > 0 && (
                        <> Keyword globali attive: <strong>{((watch(p('globalKeywords')) as string[]) ?? []).join(', ')}</strong></>
                      )}
                    </Typography>
                  </FieldRow>

                  {/* Max questions per run */}
                  <FieldRow label="Domande max / run">
                    <Controller
                      name={p(`langs.${code}.questionsCount`)}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          label="Domande per keyword"
                          type="number"
                          size="small"
                          inputProps={{ min: 1, step: 1 }}
                          error={!!errors.langs?.[code]?.questionsCount}
                          helperText={errors.langs?.[code]?.questionsCount?.message ?? 'Quante domande AI generare per ciascuna keyword'}
                          sx={{ maxWidth: 200 }}
                        />
                      )}
                    />
                  </FieldRow>

                  {/* Location focus */}
                  <FieldRow label="Focus geografico">
                    <Controller
                      name={p(`langs.${code}.locationFocus`)}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Città / Area (facoltativo)"
                          size="small"
                          placeholder={defaultLocation}
                          helperText="Override della localizzazione per le ricerche web. Lascia vuoto per usare il default paese."
                          sx={{ maxWidth: 320 }}
                        />
                      )}
                    />
                  </FieldRow>

                </Box>
              )
            })}
          </>
        )}
      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          Advanced options (collapsible)
      ═══════════════════════════════════════════════════════ */}
      <Accordion sx={{
        border: '1px solid', borderColor: 'divider',
        borderRadius: 'var(--geo-radius-md) !important',
        '&:before': { display: 'none' }, boxShadow: 'none',
      }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">Opzioni avanzate</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller name={p('testMode')} control={control} render={({ field }) => (
              <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Test mode — numero ridotto di query" />
            )} />
            <Controller name={p('debugMode')} control={control} render={({ field }) => (
              <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Debug mode — log dettagliati" />
            )} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Add Persona Dialog */}
      <Dialog open={openPersonaDialog} onClose={() => setOpenPersonaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuova persona</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {personaFormError && <Alert severity="error">{personaFormError}</Alert>}
          <TextField label="Nome *" inputRef={nameRef} fullWidth size="small"
            placeholder="es. Turista Arte e Cultura – City Break" />
          <TextField label="Descrizione *" inputRef={descRef} fullWidth size="small" multiline rows={3}
            placeholder="Profilo demografico, motivazioni, comportamento di ricerca…" />
          <TextField label="Contesto *" inputRef={contextRef} fullWidth size="small" multiline rows={3}
            placeholder="In prima persona: 'Sei Mario, 45 anni…'" />
          <TextField label="Search Style (opzionale)" inputRef={searchStyleRef} fullWidth size="small"
            placeholder="Query tipiche usate da questa persona" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPersonaDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleAddPersona} disabled={isAddingPersona}>
            {isAddingPersona ? 'Aggiunta…' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfigSection({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider',
      borderRadius: 'var(--geo-radius-md)',
      overflow: 'hidden',
      bgcolor: 'background.paper',
    }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 1.75,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.default',
      }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.contrastText', lineHeight: 1 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="body1" fontWeight={700}>{title}</Typography>
      </Box>

      {/* Body */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {children}
      </Box>
    </Box>
  )
}

function FieldRow({
  label,
  badge,
  children,
}: {
  label: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: { xs: 1, sm: 2 }, alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: { sm: 0.5 } }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{ height: 18, fontSize: 10, ml: 'auto' }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {children}
      </Box>
    </Box>
  )
}

function PersonaCard({
  persona,
  checked,
  onToggle,
  onRemove,
  isRemoving,
}: {
  persona: Persona
  checked: boolean
  onToggle: () => void
  onRemove: () => void
  isRemoving: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start',
        p: 1.5,
        border: '1px solid',
        borderColor: checked ? 'primary.main' : 'divider',
        borderRadius: 'var(--geo-radius-sm)',
        bgcolor: checked ? 'primary.main' : 'background.paper',
        transition: 'all 0.12s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box onClick={onToggle} sx={{ display: 'flex', gap: 1, flex: 1, cursor: 'pointer', alignItems: 'flex-start' }}>
        <Checkbox
          checked={checked} size="small" disableRipple
          sx={{ p: 0, mt: 0.25, flexShrink: 0,
            color: checked ? 'primary.contrastText' : 'text.disabled',
            '&.Mui-checked': { color: 'primary.contrastText' } }}
        />
        <Box>
          <Typography variant="body2" fontWeight={600}
            sx={{ color: checked ? 'primary.contrastText' : 'text.primary', lineHeight: 1.3 }}>
            {persona.name}
          </Typography>
          <Typography variant="caption"
            sx={{ color: checked ? 'primary.contrastText' : 'text.secondary', opacity: checked ? 0.85 : 1, display: 'block', mt: 0.25 }}>
            {persona.description}
          </Typography>
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        disabled={isRemoving}
        sx={{ flexShrink: 0, color: checked ? 'primary.contrastText' : 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
      >
        {isRemoving ? <CircularProgress size={12} color="inherit" /> : <DeleteIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Box>
  )
}
