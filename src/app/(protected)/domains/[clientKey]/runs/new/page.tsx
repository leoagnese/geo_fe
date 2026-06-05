/**
 * SC-020 — New run configurator.
 *
 * 4 sections (in order):
 *   1. Active Run Settings   — client key, profile selection, iterations
 *   2. Query Management      — global keywords, custom query mode, personas, country selection
 *   3. Profile & Provider    — provider badge, model versions, response config (from selected profile)
 *   4. Target Settings       — per-language tabs (IT/EN/FR): keyword list, max questions, location focus
 *
 * Submit → POST /domains/:clientKey/runs.
 *
 * @implements US-007, US-008
 * @validates AC-011, AC-012, AC-013, AC-014, AC-015
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import TagInput from '@/components/TagInput'
import {
  getProfiles,
  getPersonas,
  createRun,
  ApiError,
  type LlmProfile,
  type Persona,
} from '@/lib/api-client'

// ─── Constants ────────────────────────────────────────────────────────────────

const LANG_OPTIONS = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹', defaultLocation: 'Italia' },
  { code: 'en', label: 'English', flag: '🇬🇧', defaultLocation: 'United Kingdom' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', defaultLocation: 'France' },
] as const

type LangCode = (typeof LANG_OPTIONS)[number]['code']

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  perplexity: 'Perplexity AI',
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const LangSettingsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  questionsCount: z.number().int().min(1).default(10),
  locationFocus: z.string().default(''),
})

const NewRunSchema = z.object({
  profileKey: z.string().min(1, 'Seleziona un profilo LLM'),
  runIterations: z
    .number({ invalid_type_error: 'Inserisci un numero intero' })
    .int()
    .min(1, 'Almeno 1 iterazione'),
  globalKeywords: z.array(z.string()).default([]),
  activeLocales: z.array(z.string()).min(1, 'Seleziona almeno un paese'),
  activePersonaIds: z.array(z.string()).min(1, 'Seleziona almeno una persona'),
  langs: z.object({
    it: LangSettingsSchema,
    en: LangSettingsSchema,
    fr: LangSettingsSchema,
  }),
  testMode: z.boolean().default(false),
  debugMode: z.boolean().default(false),
})

type NewRunForm = z.infer<typeof NewRunSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { clientKey: string }
}

export default function NewRunPage({ params }: Props) {
  const { clientKey } = params
  const { data: session } = useSession()
  const router = useRouter()

  const [queuedBanner, setQueuedBanner] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [activeLangTab, setActiveLangTab] = useState<LangCode>('it')

  const { data: profilesData, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } =
    useQuery({ queryKey: ['profiles'], queryFn: () => getProfiles(session?.accessToken ?? ''), enabled: !!session?.accessToken })

  const { data: personasData, isLoading: personasLoading } =
    useQuery({ queryKey: ['personas'], queryFn: () => getPersonas(session?.accessToken ?? ''), enabled: !!session?.accessToken })

  const profiles: LlmProfile[] = profilesData?.data ?? []
  const personas: Persona[] = personasData?.data ?? []
  const allPersonaIds = personas.map((p) => p.id)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<NewRunForm>({
    resolver: zodResolver(NewRunSchema),
    defaultValues: {
      profileKey: '',
      runIterations: 3,
      globalKeywords: [],
      activeLocales: ['it'],
      activePersonaIds: [],
      langs: {
        it: { keywords: [], questionsCount: 10, locationFocus: '' },
        en: { keywords: [], questionsCount: 10, locationFocus: '' },
        fr: { keywords: [], questionsCount: 10, locationFocus: '' },
      },
      testMode: false,
      debugMode: false,
    },
  })

  const selectedProfileKey = watch('profileKey')
  const activeLocales = watch('activeLocales')
  const activePersonaIds = watch('activePersonaIds')
  const selectedProfile = profiles.find((p) => p.profileKey === selectedProfileKey)

  // Pre-select all personas when catalog loads
  if (personas.length > 0 && activePersonaIds.length === 0) {
    setValue('activePersonaIds', allPersonaIds)
  }

  function toggleLocale(code: string) {
    const next = activeLocales.includes(code)
      ? activeLocales.filter((l) => l !== code)
      : [...activeLocales, code]
    setValue('activeLocales', next, { shouldValidate: true })
    if (!next.includes(activeLangTab)) {
      const first = LANG_OPTIONS.find((l) => next.includes(l.code))
      if (first) setActiveLangTab(first.code)
    }
  }

  function togglePersona(id: string) {
    const next = activePersonaIds.includes(id)
      ? activePersonaIds.filter((x) => x !== id)
      : [...activePersonaIds, id]
    setValue('activePersonaIds', next, { shouldValidate: true })
  }

  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) => {
      const keywordsByLang = Object.fromEntries(
        data.activeLocales.map((lang) => [
          lang,
          [...data.globalKeywords, ...data.langs[lang as LangCode].keywords],
        ]),
      )
      const questionsCountByLang = Object.fromEntries(
        data.activeLocales.map((lang) => [lang, data.langs[lang as LangCode].questionsCount]),
      )
      const locationFocusByLang = Object.fromEntries(
        data.activeLocales
          .filter((lang) => data.langs[lang as LangCode].locationFocus)
          .map((lang) => [lang, data.langs[lang as LangCode].locationFocus]),
      )

      return createRun(session?.accessToken ?? '', clientKey, {
        profileKey: data.profileKey,
        runIterations: data.runIterations,
        locales: data.activeLocales,
        keywordsByLang,
        questionsCountByLang,
        activePersonaIds: data.activePersonaIds,
        locationFocusByLang,
        testMode: data.testMode,
        debugMode: data.debugMode,
      })
    },
    onSuccess: (result) => {
      const { runId, status } = result.data
      if (status === 'queued') {
        setQueuedBanner(true)
        setTimeout(() => router.push(`/domains/${clientKey}/runs/${runId}`), 2000)
      } else {
        router.push(`/domains/${clientKey}/runs/${runId}`)
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) { setErrorToast('Avvio run fallito: n8n non raggiungibile.'); return }
        if (err.status === 422) { setErrorToast(`Validazione fallita: ${err.message}`); return }
        if (err.status === 404) { setErrorToast(`Profilo o dominio non trovato: ${err.message}`); return }
      }
      setErrorToast('Errore interno. Riprova.')
    },
  })

  const visibleLangTabs = LANG_OPTIONS.filter((l) => activeLocales.includes(l.code))

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 6 }}>
      <Typography variant="h1" gutterBottom>Nuova run</Typography>

      <Box
        component="form"
        onSubmit={handleSubmit((data) => createRunMutation.mutate(data))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >

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

          {/* Profile selection */}
          <FieldRow label="Selezione profilo">
            {profilesError ? (
              <Alert severity="error" action={
                <Button color="inherit" size="small" onClick={() => void refetchProfiles()}>Riprova</Button>
              }>
                Impossibile caricare i profili LLM.
              </Alert>
            ) : (
              <Controller
                name="profileKey"
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
                    {profiles.map((p) => (
                      <MenuItem key={p.profileKey} value={p.profileKey}>
                        {p.profileKey}
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
              {...register('runIterations', { valueAsNumber: true })}
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
              name="globalKeywords"
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

          {/* Persona selection */}
          <FieldRow
            label="Personas"
            badge={`${activePersonaIds.length}/${personas.length} attive`}
          >
            {personasLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary">Caricamento personas…</Typography>
              </Box>
            ) : (
              <>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
                    onClick={() => setValue('activePersonaIds', allPersonaIds, { shouldValidate: true })}>
                    Tutte
                  </Button>
                  <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
                    onClick={() => setValue('activePersonaIds', [], { shouldValidate: true })}>
                    Nessuna
                  </Button>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                  {personas.map((persona) => {
                    const checked = activePersonaIds.includes(persona.id)
                    return (
                      <PersonaCard
                        key={persona.id}
                        persona={persona}
                        checked={checked}
                        onToggle={() => togglePersona(persona.id)}
                      />
                    )
                  })}
                </Box>

                {errors.activePersonaIds && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                    {errors.activePersonaIds.message}
                  </Typography>
                )}
              </>
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
                        name={`langs.${code}.keywords`}
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
                        {watch('globalKeywords').length > 0 && (
                          <> Keyword globali attive: <strong>{watch('globalKeywords').join(', ')}</strong></>
                        )}
                      </Typography>
                    </FieldRow>

                    {/* Max questions per run */}
                    <FieldRow label="Domande max / run">
                      <Controller
                        name={`langs.${code}.questionsCount`}
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
                        name={`langs.${code}.locationFocus`}
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
              <Controller name="testMode" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="Test mode — numero ridotto di query" />
              )} />
              <Controller name="debugMode" control={control} render={({ field }) => (
                <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="Debug mode — log dettagliati" />
              )} />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button variant="text" onClick={() => router.push(`/domains/${clientKey}`)}
            disabled={createRunMutation.isPending} sx={{ color: 'text.secondary' }}>
            Annulla
          </Button>
          <Button type="submit" variant="contained" disabled={createRunMutation.isPending || activeLocales.length === 0}>
            {createRunMutation.isPending ? 'Avvio…' : 'Avvia run'}
          </Button>
        </Box>

      </Box>

      {/* Toasts */}
      <Snackbar open={queuedBanner} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info">Run in coda — reindirizzamento…</Alert>
      </Snackbar>
      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
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
}: {
  persona: Persona
  checked: boolean
  onToggle: () => void
}) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: 'flex', gap: 1.5, alignItems: 'flex-start',
        p: 1.5,
        border: '1px solid',
        borderColor: checked ? 'primary.main' : 'divider',
        borderRadius: 'var(--geo-radius-sm)',
        bgcolor: checked ? 'primary.main' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.12s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
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
  )
}
