/**
 * CampaignWizard — incremental, sidebar-navigable wizard for creating a
 * campaign out of N fully independent analysis sections. Each section is
 * configured exactly like a single run (via the shared RunConfigFields)
 * plus a "Nome analisi" label. A Recap view lists every section and is the
 * only place the final submit button lives.
 *
 * All sections stay mounted at all times; the inactive ones are hidden via
 * CSS `display: none` rather than being unmounted. This preserves not only
 * react-hook-form's field values (via the default `shouldUnregister: false`)
 * but also each section's own component-local React state (e.g.
 * RunConfigFields' active per-language tab), so switching sections via the
 * sidebar never discards in-progress edits or resets internal UI state.
 *
 * Submit → POST /domains/:clientKey/campaigns, redirect to the campaign
 * detail page.
 *
 * @spec docs/superpowers/specs/2026-07-03-campaign-wizard-design.md §4.3
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider, useFieldArray, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import RunConfigFields, { slugifyTopic, type LangCode } from '@/components/RunConfigFields'
import {
  getProfiles,
  getDomain,
  postDomainPersona,
  deleteDomainPersona,
  createCampaign,
  ApiError,
  type LlmProfile,
  type Persona,
  type PersonaGroup,
  type CampaignSectionDto,
} from '@/lib/api-client'

// ─── Zod schema — mirrors SingleRunForm's, plus `label` ────────────────────────

const LangSettingsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  questionsCount: z.number().int().min(1).default(10),
  locationFocus: z.string().default(''),
})

const TopicSchema = z.object({
  label: z.string().min(1, 'Etichetta obbligatoria'),
  keywords: z.array(z.string()).default([]),
})

const SectionSchema = z.object({
  label: z.string().min(1, 'Nome analisi obbligatorio'),
  profileKey: z.string().min(1, 'Seleziona un profilo LLM'),
  runIterations: z
    .number({ invalid_type_error: 'Inserisci un numero intero' })
    .int()
    .min(1, 'Almeno 1 iterazione'),
  useCustomTargetUrl: z.boolean().default(false),
  targetUrl: z.string().default(''),
  globalKeywords: z.array(z.string()).default([]),
  activeLocales: z.array(z.string()).min(1, 'Seleziona almeno un paese'),
  activePersonaIds: z.array(z.string()).default([]),
  topics: z.array(TopicSchema).default([]),
  langs: z.object({
    it: LangSettingsSchema,
    en: LangSettingsSchema,
    fr: LangSettingsSchema,
  }),
  testMode: z.boolean().default(false),
  debugMode: z.boolean().default(false),
}).refine(
  (data) => !data.useCustomTargetUrl || data.targetUrl.trim().length > 0,
  { message: 'Inserisci un URL', path: ['targetUrl'] },
)

const CampaignWizardSchema = z.object({
  sections: z.array(SectionSchema).min(1, "Aggiungi almeno un'analisi"),
})

type CampaignWizardForm = z.infer<typeof CampaignWizardSchema>
type SectionFormValues = z.infer<typeof SectionSchema>

function makeDefaultSection(overrides?: {
  profileKey?: string
  activeLocales?: string[]
  activePersonaIds?: string[]
  testMode?: boolean
  debugMode?: boolean
}): SectionFormValues {
  return {
    label: '',
    profileKey: overrides?.profileKey ?? '',
    runIterations: 3,
    useCustomTargetUrl: false,
    targetUrl: '',
    globalKeywords: [],
    activeLocales: overrides?.activeLocales ?? ['it'],
    activePersonaIds: overrides?.activePersonaIds ?? [],
    topics: [{ label: '', keywords: [] }],
    langs: {
      it: { keywords: [], questionsCount: 10, locationFocus: '' },
      en: { keywords: [], questionsCount: 10, locationFocus: '' },
      fr: { keywords: [], questionsCount: 10, locationFocus: '' },
    },
    testMode: overrides?.testMode ?? false,
    debugMode: overrides?.debugMode ?? false,
  }
}

type ViewId = number | 'recap'

interface Props {
  clientKey: string
}

export default function CampaignWizard({ clientKey }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewId>(0)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemovingPersona, setIsRemovingPersona] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const { data: profilesData, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } =
    useQuery({ queryKey: ['profiles'], queryFn: () => getProfiles(session?.accessToken ?? ''), enabled: !!session?.accessToken })
  const { data: domainData } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const profiles: LlmProfile[] = profilesData?.data ?? []
  const domainPersonas: Persona[] = (domainData?.data?.personas ?? []) as Persona[]
  const domainGroups: PersonaGroup[] = (domainData?.data?.personaGroups ?? []) as PersonaGroup[]

  const methods = useForm<CampaignWizardForm>({
    resolver: zodResolver(CampaignWizardSchema),
    defaultValues: { sections: [makeDefaultSection()] },
  })
  const { control, handleSubmit, watch, register, formState: { errors } } = methods

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: 'sections',
  })

  const sections = watch('sections')

  async function handleAddPersonaSubmit(persona: { name: string; description: string; context: string; searchStyle?: string }) {
    setIsAddingPersona(true)
    try {
      await postDomainPersona(session?.accessToken ?? '', clientKey, persona)
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
    } finally {
      setIsAddingPersona(false)
    }
  }

  async function handleRemovePersona(personaId: string) {
    setIsRemovingPersona(personaId)
    try {
      await deleteDomainPersona(session?.accessToken ?? '', clientKey, personaId)
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
    } finally {
      setIsRemovingPersona(null)
    }
  }

  function handleAddSection() {
    const last = sections[sections.length - 1]
    appendSection(makeDefaultSection({
      profileKey: last?.profileKey,
      activeLocales: last?.activeLocales,
      activePersonaIds: last?.activePersonaIds,
      testMode: last?.testMode,
      debugMode: last?.debugMode,
    }))
    setView(sections.length)
  }

  function handleRemoveSection(index: number) {
    removeSection(index)
    if (typeof view === 'number' && view >= sections.length - 1) {
      setView(Math.max(0, sections.length - 2))
    }
  }

  const createCampaignMutation = useMutation({
    mutationFn: (data: CampaignWizardForm) => {
      const sectionsPayload: CampaignSectionDto[] = data.sections.map((s) => {
        const keywordsByLang = Object.fromEntries(
          s.activeLocales.map((lang) => [
            lang,
            [...s.globalKeywords, ...s.langs[lang as LangCode].keywords],
          ]),
        )
        const questionsCountByLang = Object.fromEntries(
          s.activeLocales.map((lang) => [lang, s.langs[lang as LangCode].questionsCount]),
        )
        const locationFocusByLang = Object.fromEntries(
          s.activeLocales
            .filter((lang) => s.langs[lang as LangCode].locationFocus)
            .map((lang) => [lang, s.langs[lang as LangCode].locationFocus]),
        )
        const topics = s.topics
          .filter((t) => t.label.trim())
          .map((t) => ({ id: slugifyTopic(t.label), label: t.label.trim(), keywords: t.keywords }))

        return {
          label: s.label,
          profileKey: s.profileKey,
          runIterations: s.runIterations,
          targetUrl: s.useCustomTargetUrl ? s.targetUrl.trim() : undefined,
          locales: s.activeLocales,
          keywordsByLang,
          questionsCountByLang,
          activePersonaIds: s.activePersonaIds,
          locationFocusByLang,
          topics,
          testMode: s.testMode,
          debugMode: s.debugMode,
        }
      })

      return createCampaign(session?.accessToken ?? '', clientKey, { sections: sectionsPayload })
    },
    onSuccess: (result) => {
      router.push(`/domains/${clientKey}/campaigns/${result.data.campaignId}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) { setErrorToast('Avvio campagna fallito: n8n non raggiungibile.'); return }
        if (err.code === 'PROFILE_NOT_FOUND') { setErrorToast(err.message); return }
        if (err.status === 404) { setErrorToast(`Profilo o dominio non trovato: ${err.message}`); return }
      }
      setErrorToast('Errore interno. Riprova.')
    },
  })

  function onValid(data: CampaignWizardForm) {
    createCampaignMutation.mutate(data)
  }

  function onInvalid(formErrors: FieldErrors<CampaignWizardForm>) {
    const firstInvalidIndex = sections.findIndex((_, i) => !!formErrors.sections?.[i])
    if (firstInvalidIndex !== -1) setView(firstInvalidIndex)
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
      {/* Sidebar */}
      <Paper sx={{ width: 220, flexShrink: 0, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {sectionFields.map((field, index) => {
          const hasError = !!errors.sections?.[index]
          const label = sections[index]?.label?.trim() || `Analisi ${index + 1}`
          return (
            <Box
              key={field.id}
              onClick={() => setView(index)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer',
                bgcolor: view === index ? 'primary.main' : 'transparent',
                color: view === index ? 'primary.contrastText' : 'text.primary',
                '&:hover': { bgcolor: view === index ? 'primary.main' : 'action.hover' },
              }}
            >
              {hasError ? (
                <ErrorIcon sx={{ fontSize: 16, color: view === index ? 'inherit' : 'error.main' }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 16, color: view === index ? 'inherit' : 'success.main', opacity: 0.4 }} />
              )}
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>{label}</Typography>
              {sectionFields.length > 1 && (
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleRemoveSection(index) }}
                  sx={{ color: 'inherit', opacity: 0.6, p: 0.25 }}
                  aria-label="Rimuovi analisi"
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          )
        })}
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddSection} sx={{ mt: 1 }}>
          Aggiungi analisi
        </Button>
        <Divider sx={{ my: 1 }} />
        <Box
          onClick={() => setView('recap')}
          sx={{
            px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer',
            bgcolor: view === 'recap' ? 'primary.main' : 'transparent',
            color: view === 'recap' ? 'primary.contrastText' : 'text.primary',
            '&:hover': { bgcolor: view === 'recap' ? 'primary.main' : 'action.hover' },
          }}
        >
          <Typography variant="body2" fontWeight={600}>Recap</Typography>
        </Box>
      </Paper>

      {/* Main panel */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FormProvider {...methods}>
          <Box component="form" onSubmit={handleSubmit(onValid, onInvalid)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sectionFields.map((field, index) => (
              <Box key={field.id} sx={{ display: view === index ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Nome analisi"
                  size="small"
                  {...register(`sections.${index}.label` as const)}
                  error={!!errors.sections?.[index]?.label}
                  helperText={errors.sections?.[index]?.label?.message ?? 'Es. "Dove dormire a Torino"'}
                  sx={{ maxWidth: 400 }}
                />
                <RunConfigFields
                  namePrefix={`sections.${index}.`}
                  clientKey={clientKey}
                  profiles={profiles}
                  profilesLoading={profilesLoading}
                  profilesError={profilesError}
                  onRetryProfiles={() => void refetchProfiles()}
                  domainPersonas={domainPersonas}
                  targetDomain={domainData?.data?.targetDomain}
                  domainGroups={domainGroups}
                  isAddingPersona={isAddingPersona}
                  onAddPersona={handleAddPersonaSubmit}
                  isRemovingPersonaId={isRemovingPersona}
                  onRemovePersona={handleRemovePersona}
                />
              </Box>
            ))}

            {view === 'recap' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h3">Riepilogo campagna</Typography>
                {sections.map((s, index) => {
                  const filledTopics = s.topics.filter((t) => t.label.trim())
                  const totalKeywords = s.globalKeywords.length + filledTopics.reduce((sum, t) => sum + t.keywords.length, 0)
                  const personaNames = s.activePersonaIds
                    .map((id) => domainPersonas.find((p) => p.id === id)?.name)
                    .filter((name): name is string => Boolean(name))
                  return (
                    <Paper key={index} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography variant="body1" fontWeight={600}>{s.label || `Analisi ${index + 1}`}</Typography>

                        <Typography variant="body2" color="text.secondary">
                          Profilo: {s.profileKey || '—'} · Iterazioni: {s.runIterations} · Lingue: {s.activeLocales.join(', ') || '—'}
                          {s.useCustomTargetUrl && s.targetUrl && <> · URL: {s.targetUrl}</>}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          <strong>Personas ({personaNames.length}):</strong>{' '}
                          {personaNames.length > 0 ? personaNames.join(', ') : 'nessuna'}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          <strong>Topic ({filledTopics.length}):</strong>{' '}
                          {filledTopics.length > 0 ? filledTopics.map((t) => t.label).join(', ') : 'nessuno'}
                        </Typography>

                        <Typography variant="caption" color="text.secondary">
                          Keyword totali: {totalKeywords}
                        </Typography>

                        {(s.testMode || s.debugMode) && (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {s.testMode && <Chip size="small" variant="outlined" label="Test mode" />}
                            {s.debugMode && <Chip size="small" variant="outlined" label="Debug mode" />}
                          </Box>
                        )}
                      </Box>
                      <Button size="small" onClick={() => setView(index)}>Modifica</Button>
                    </Paper>
                  )
                })}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? 'Avvio…' : 'Avvia campagna'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </FormProvider>
      </Box>

      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
  )
}
