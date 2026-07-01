/**
 * Campaign creation form — one config shared across N section child runs.
 *
 * Sections default to all of domain.settori; per-section keywords are optional
 * (empty → BE auto-generates, precedence documented in the design spec).
 * Submit → POST /domains/:clientKey/campaigns, redirect to the campaign detail page.
 *
 * @spec docs/superpowers/specs/2026-06-30-campagne-multi-settore-design.md §4.1
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
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TagInput from '@/components/TagInput'
import {
  getProfiles,
  getDomain,
  createCampaign,
  ApiError,
  type LlmProfile,
  type Persona,
} from '@/lib/api-client'

const LANG_OPTIONS = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const

const CampaignSchema = z.object({
  profileKey: z.string().min(1, 'Seleziona un profilo LLM'),
  runIterations: z
    .number({ invalid_type_error: 'Inserisci un numero intero' })
    .int()
    .min(1, 'Almeno 1 iterazione'),
  activeLocales: z.array(z.string()).min(1, 'Seleziona almeno un paese'),
  activePersonaIds: z.array(z.string()).default([]),
  activeSections: z.array(z.string()).min(1, 'Seleziona almeno un settore'),
  // .optional() on the array tolerates Controller-mounted-but-unset section paths
  // (react-hook-form registers `sectionKeywords.<key>` as `undefined` for any
  // section rendered — i.e. checked — but never touched by the user).
  sectionKeywords: z.record(z.array(z.string()).optional()).default({}),
  testMode: z.boolean().default(false),
  debugMode: z.boolean().default(false),
})

type CampaignFormValues = z.infer<typeof CampaignSchema>

interface Props {
  clientKey: string
}

export default function CampaignForm({ clientKey }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const { data: profilesData } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => getProfiles(session?.accessToken ?? ''),
    enabled: !!session?.accessToken,
  })
  const { data: domainData } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const profiles: LlmProfile[] = profilesData?.data ?? []
  const domainPersonas: Persona[] = (domainData?.data?.personas ?? []) as Persona[]
  const sectors: string[] = domainData?.data?.settori ?? []

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: {
      profileKey: '',
      runIterations: 3,
      activeLocales: ['it'],
      activePersonaIds: [],
      activeSections: [],
      sectionKeywords: {},
      testMode: false,
      debugMode: false,
    },
  })

  const activeLocales = watch('activeLocales')
  const activeSections = watch('activeSections')
  const activePersonaIds = watch('activePersonaIds')

  // Pre-select all sectors and all domain personas on first load.
  if (sectors.length > 0 && activeSections.length === 0) {
    setValue('activeSections', sectors)
  }
  if (domainPersonas.length > 0 && activePersonaIds.length === 0) {
    setValue('activePersonaIds', domainPersonas.map((p) => p.id))
  }

  function toggleLocale(code: string) {
    const next = activeLocales.includes(code)
      ? activeLocales.filter((l) => l !== code)
      : [...activeLocales, code]
    setValue('activeLocales', next, { shouldValidate: true })
  }

  function toggleSection(sectionKey: string) {
    const next = activeSections.includes(sectionKey)
      ? activeSections.filter((s) => s !== sectionKey)
      : [...activeSections, sectionKey]
    setValue('activeSections', next, { shouldValidate: true })
  }

  function togglePersona(id: string) {
    const next = activePersonaIds.includes(id)
      ? activePersonaIds.filter((x) => x !== id)
      : [...activePersonaIds, id]
    setValue('activePersonaIds', next, { shouldValidate: true })
  }

  const createCampaignMutation = useMutation({
    mutationFn: (data: CampaignFormValues) => {
      const sectionKeywordsPayload = Object.fromEntries(
        data.activeSections
          .map((s) => [s, data.sectionKeywords[s] ?? []] as const)
          .filter(([, kws]) => kws.length > 0),
      )
      return createCampaign(session?.accessToken ?? '', clientKey, {
        profileKey: data.profileKey,
        runIterations: data.runIterations,
        locales: data.activeLocales,
        activePersonaIds: data.activePersonaIds,
        sectionKeywords: Object.keys(sectionKeywordsPayload).length > 0 ? sectionKeywordsPayload : undefined,
        testMode: data.testMode,
        debugMode: data.debugMode,
      })
    },
    onSuccess: (result) => {
      router.push(`/domains/${clientKey}/campaigns/${result.data.campaignId}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) {
          setErrorToast('Avvio campagna fallito: n8n non raggiungibile.')
          return
        }
        if (err.code === 'DOMAIN_HAS_NO_SECTIONS') {
          setErrorToast('Il dominio non ha settori configurati: aggiungine almeno uno prima di creare una campagna.')
          return
        }
        if (err.status === 404) {
          setErrorToast(`Profilo o dominio non trovato: ${err.message}`)
          return
        }
      }
      setErrorToast('Errore interno. Riprova.')
    },
  })

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 6 }}>
      <Box
        component="form"
        onSubmit={handleSubmit((data) => createCampaignMutation.mutate(data))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                error={!!errors.profileKey}
                helperText={errors.profileKey?.message}
              >
                {profiles.map((p) => (
                  <MenuItem key={p.profileKey} value={p.profileKey}>
                    {p.profileKey}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
          <TextField
            label="Iterazioni"
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            {...register('runIterations', { valueAsNumber: true })}
            error={!!errors.runIterations}
            helperText={errors.runIterations?.message}
            sx={{ maxWidth: 200 }}
          />
        </Box>

        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            Paese / Lingua
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {LANG_OPTIONS.map(({ code, label, flag }) => (
              <Chip
                key={code}
                label={`${flag} ${label}`}
                color={activeLocales.includes(code) ? 'primary' : 'default'}
                onClick={() => toggleLocale(code)}
              />
            ))}
          </Box>
          {errors.activeLocales && (
            <Typography variant="caption" color="error">
              {errors.activeLocales.message}
            </Typography>
          )}
        </Box>

        {domainPersonas.length > 0 && (
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
              Personas ({activePersonaIds.length}/{domainPersonas.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {domainPersonas.map((p) => (
                <Chip
                  key={p.id}
                  label={p.name}
                  color={activePersonaIds.includes(p.id) ? 'primary' : 'default'}
                  onClick={() => togglePersona(p.id)}
                />
              ))}
            </Box>
          </Box>
        )}

        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            Settori ({activeSections.length}/{sectors.length})
          </Typography>
          {sectors.length === 0 ? (
            <Alert severity="warning">
              Il dominio non ha settori configurati. Aggiungine almeno uno prima di creare una campagna.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {sectors.map((sectionKey) => {
                const checked = activeSections.includes(sectionKey)
                return (
                  <Box
                    key={sectionKey}
                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Checkbox checked={checked} onChange={() => toggleSection(sectionKey)} size="small" />
                      <Typography variant="body2" fontWeight={600}>
                        {sectionKey}
                      </Typography>
                    </Box>
                    {checked && (
                      <Box sx={{ pl: 4, pt: 1 }}>
                        <Controller
                          name={`sectionKeywords.${sectionKey}`}
                          control={control}
                          render={({ field }) => (
                            <TagInput
                              label="Keyword per questo settore (opzionale)"
                              value={field.value ?? []}
                              onChange={field.onChange}
                              placeholder="Vuoto = generazione automatica"
                            />
                          )}
                        />
                      </Box>
                    )}
                  </Box>
                )
              })}
            </Box>
          )}
          {errors.activeSections && (
            <Typography variant="caption" color="error">
              {errors.activeSections.message}
            </Typography>
          )}
        </Box>

        <Accordion sx={{ border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' }, boxShadow: 'none' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight={600} color="text.secondary">
              Opzioni avanzate
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller
              name="testMode"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Test mode — numero ridotto di query"
                />
              )}
            />
            <Controller
              name="debugMode"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label="Debug mode — log dettagliati"
                />
              )}
            />
          </AccordionDetails>
        </Accordion>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="contained" disabled={createCampaignMutation.isPending}>
            {createCampaignMutation.isPending ? 'Avvio…' : 'Avvia campagna'}
          </Button>
        </Box>
      </Box>

      <Snackbar
        open={!!errorToast}
        onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setErrorToast(null)}>
          {errorToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
