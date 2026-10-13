/**
 * SC-020 — New run configurator + campaign mode toggle.
 *
 * "Run singola" renders SingleRunForm (this file); "Campagna" renders
 * CampaignWizard (./CampaignWizard.tsx). Both consume the shared
 * RunConfigFields component for the actual field set.
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import RunConfigFields, { slugifyTopic, type LangCode } from '@/components/RunConfigFields'
import CampaignWizard from './CampaignWizard'
import {
  getProfiles,
  getDomain,
  postDomainPersona,
  deleteDomainPersona,
  createRun,
  ApiError,
  type LlmProfile,
  type Persona,
  type PersonaGroup,
} from '@/lib/api-client'

/** Active languages with no complete (keyword + query) custom row. */
function missingQueryLangs(queries: Record<string, { keyword: string; query: string }[]>, locales: string[]) {
  return locales.filter((l) => !(queries[l] ?? []).some((q) => q.keyword.trim() && q.query.trim()))
}

// ─── Zod schema ───────────────────────────────────────────────────────────────

const LangSettingsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  questionsCount: z.number().int().min(1).default(10),
  locationFocus: z.string().default(''),
})

const TopicSchema = z.object({
  // Required only outside custom-query mode — see the superRefine on NewRunSchema.
  label: z.string(),
  keywords: z.array(z.string()).default([]),
})

const CustomQuerySchema = z.object({
  keyword: z.string(),
  query: z.string(),
  topicId: z.string().default(''),
  intent: z.string().default(''),
  personaId: z.string().default(''),
})

const NewRunSchema = z.object({
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
  gotQueries: z.boolean().default(false),
  queries: z.record(z.array(CustomQuerySchema)).default({}),
  customQueryDefaultPersonaId: z.record(z.string()).default({}),
}).refine(
  (data) => !data.useCustomTargetUrl || data.targetUrl.trim().length > 0,
  { message: 'Inserisci un URL', path: ['targetUrl'] },
).superRefine((data, ctx) => {
  if (data.gotQueries) return
  data.topics.forEach((t, i) => {
    if (t.label.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Etichetta obbligatoria', path: ['topics', i, 'label'] })
    }
  })
}).refine(
  (data) => !data.gotQueries || missingQueryLangs(data.queries, data.activeLocales).length === 0,
  (data) => ({
    message: `Inserisci almeno una query (keyword + query) per: ${missingQueryLangs(data.queries, data.activeLocales).join(', ')}`,
    path: ['queries'],
  }),
)

type NewRunForm = z.infer<typeof NewRunSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { clientKey: string }
}

export default function NewRunPage({ params }: Props) {
  const { clientKey } = params
  const [mode, setMode] = useState<'single' | 'campaign'>('single')

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', pb: 2 }}>
      <Typography variant="h1" gutterBottom>Nuova run</Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, next) => next && setMode(next)}
        size="small"
        sx={{ mb: 3 }}
      >
        <ToggleButton value="single">Run singola</ToggleButton>
        <ToggleButton value="campaign">Campagna</ToggleButton>
      </ToggleButtonGroup>
      {mode === 'single' ? <SingleRunForm clientKey={clientKey} /> : <CampaignWizard clientKey={clientKey} />}
    </Box>
  )
}

function SingleRunForm({ clientKey }: { clientKey: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [queuedBanner, setQueuedBanner] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemovingPersona, setIsRemovingPersona] = useState<string | null>(null)

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

  const methods = useForm<NewRunForm>({
    resolver: zodResolver(NewRunSchema),
    defaultValues: {
      profileKey: '',
      runIterations: 3,
      useCustomTargetUrl: false,
      targetUrl: '',
      globalKeywords: [],
      activeLocales: ['it'],
      activePersonaIds: [],
      topics: [{ label: '', keywords: [] }],
      langs: {
        it: { keywords: [], questionsCount: 10, locationFocus: '' },
        en: { keywords: [], questionsCount: 10, locationFocus: '' },
        fr: { keywords: [], questionsCount: 10, locationFocus: '' },
      },
      testMode: false,
      debugMode: false,
      gotQueries: false,
      queries: {},
      customQueryDefaultPersonaId: {},
    },
  })
  const { handleSubmit, watch } = methods

  const activeLocales = watch('activeLocales')

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
      const current = methods.getValues('activePersonaIds')
      methods.setValue('activePersonaIds', current.filter((id) => id !== personaId))
    } finally {
      setIsRemovingPersona(null)
    }
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

      const topics = data.topics
        .filter((t) => t.label.trim())
        .map((t) => ({
          id: slugifyTopic(t.label),
          label: t.label.trim(),
          keywords: t.keywords,
        }))

      const base = {
        profileKey: data.profileKey,
        runIterations: data.runIterations,
        targetUrl: data.useCustomTargetUrl ? data.targetUrl.trim() : undefined,
        locales: data.activeLocales,
        activePersonaIds: data.activePersonaIds,
        locationFocusByLang,
        testMode: data.testMode,
        debugMode: data.debugMode,
      }

      if (data.gotQueries) {
        // Custom queries: only active languages, only complete rows. Keywords are not used; topics (derived from the file) are sent for reference.
        const queries = Object.fromEntries(
          data.activeLocales.map((lang) => [
            lang,
            (data.queries[lang] ?? [])
              .filter((q) => q.keyword.trim() && q.query.trim())
              .map((q) => ({ ...q, keyword: q.keyword.trim(), query: q.query.trim() })),
          ]),
        )
        return createRun(session?.accessToken ?? '', clientKey, {
          ...base,
          gotQueries: true,
          topics,
          queries,
          customQueryDefaultPersonaId: data.customQueryDefaultPersonaId,
        })
      }

      return createRun(session?.accessToken ?? '', clientKey, {
        ...base,
        keywordsByLang,
        questionsCountByLang,
        topics,
      })
    },
    onSuccess: (result) => {
      const { runId, status, queuePosition, queueLength } = result.data
      if (status === 'queued') {
        setQueuedBanner(
          queuePosition && queueLength
            ? `Run in coda (posizione ${queuePosition} di ${queueLength}) — reindirizzamento…`
            : 'Run in coda — reindirizzamento…',
        )
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

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', pb: 6 }}>
      <FormProvider {...methods}>
        <Box
          component="form"
          onSubmit={handleSubmit((data) => createRunMutation.mutate(data))}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <RunConfigFields
            namePrefix=""
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
            enableCustomQueries
          />

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
      </FormProvider>

      {/* Toasts */}
      <Snackbar open={queuedBanner !== null} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info">{queuedBanner}</Alert>
      </Snackbar>
      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
  )
}
