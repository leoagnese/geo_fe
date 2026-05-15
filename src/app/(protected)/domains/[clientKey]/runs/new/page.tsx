/**
 * SC-020 — New run configurator.
 *
 * Section 1 (required): profileKey select (GET /profiles, shows provider + models),
 * runIterations number input.
 * Section 2 (collapsible "Opzioni avanzate"): keywords override tag input,
 * locale multi-select, testMode/debugMode toggles.
 * Submit → POST /domains/:clientKey/runs.
 * If queued: info banner + redirect to monitor. If running: redirect to monitor.
 *
 * States:
 * - Loading: profiles dropdown disabled with "Caricamento profili…"
 * - Error: profile load failure inline; submit failure toast
 * - Empty: not applicable (creation form)
 * - Populated: form ready → submit triggers run
 *
 * @implements US-007, US-008
 * @validates AC-011, AC-012, AC-013, AC-014, AC-015
 * @spec L1_design/screen-inventory.md §"SC-020"
 * @spec L1_design/states-and-empty.md §"SC-020"
 * @spec L1_design/patterns/forms.md
 * @figma — (Figma file not yet created)
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
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import TagInput from '@/components/TagInput'
import { getProfiles, createRun, ApiError, type LlmProfile } from '@/lib/api-client'

const LOCALE_OPTIONS = ['it-IT', 'en-US', 'en-GB', 'fr-FR', 'de-DE', 'es-ES']

const NewRunSchema = z.object({
  profileKey: z.string().min(1, 'Seleziona un profilo LLM'),
  runIterations: z
    .number({ invalid_type_error: 'Inserisci un numero intero' })
    .int()
    .min(1, 'Almeno 1 iterazione'),
  locales: z.array(z.string()).default([]),
  keywordsOverride: z.array(z.string()).default([]),
  testMode: z.boolean().default(false),
  debugMode: z.boolean().default(false),
})

type NewRunForm = z.infer<typeof NewRunSchema>

interface NewRunPageProps {
  params: { clientKey: string }
}

export default function NewRunPage({ params }: NewRunPageProps) {
  const { clientKey } = params
  const { data: session } = useSession()
  const router = useRouter()
  const [queuedBanner, setQueuedBanner] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Load LLM profiles for the dropdown (AC-012)
  const {
    data: profilesData,
    isLoading: profilesLoading,
    isError: profilesError,
    refetch: refetchProfiles,
  } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => getProfiles(session?.accessToken ?? ''),
    enabled: !!session?.accessToken,
  })

  const profiles: LlmProfile[] = profilesData?.data ?? []

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<NewRunForm>({
    resolver: zodResolver(NewRunSchema),
    defaultValues: {
      profileKey: '',
      runIterations: 3,
      locales: [],
      keywordsOverride: [],
      testMode: false,
      debugMode: false,
    },
  })

  const selectedProfileKey = watch('profileKey')
  const selectedProfile = profiles.find((p) => p.profileKey === selectedProfileKey)

  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) =>
      createRun(session?.accessToken ?? '', clientKey, {
        profileKey: data.profileKey,
        runIterations: data.runIterations,
        locales: data.locales.length > 0 ? data.locales : undefined,
        keywordsOverride: data.keywordsOverride.length > 0 ? data.keywordsOverride : undefined,
        testMode: data.testMode,
        debugMode: data.debugMode,
      }),
    onSuccess: (result) => {
      const { runId, status } = result.data
      if (status === 'queued') {
        // AC-013: show queued banner briefly then redirect to monitor
        setQueuedBanner(true)
        setTimeout(() => {
          router.push(`/domains/${clientKey}/runs/${runId}`)
        }, 2000)
      } else {
        // status === 'running': redirect immediately to monitor (AC-015)
        router.push(`/domains/${clientKey}/runs/${runId}`)
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) {
          setErrorToast('Avvio run fallito: n8n non raggiungibile. La run è in stato errore.')
          return
        }
        if (err.status === 422) {
          setErrorToast(`Validazione fallita: ${err.message}`)
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
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h1" gutterBottom>
        Nuova run
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Dominio: <strong>{clientKey}</strong>
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit((data) => createRunMutation.mutate(data))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {/* ── Section 1: Required fields ─── */}

        {/* profileKey select — AC-012 */}
        {profilesError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refetchProfiles()}>
                Riprova
              </Button>
            }
          >
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
                disabled={profilesLoading}
                error={!!errors.profileKey}
                helperText={
                  errors.profileKey?.message ??
                  (profilesLoading ? 'Caricamento profili…' : 'Seleziona il profilo per questa run')
                }
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

        {/* Profile model summary (shown when a profile is selected) — AC-012 */}
        {selectedProfile && (
          <Box
            sx={{
              p: 2,
              borderRadius: 'var(--geo-radius-md)',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
              Dettagli profilo selezionato
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Provider</Typography>
                <Typography variant="body2" fontWeight={600}>{selectedProfile.llmProvider}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Run model</Typography>
                <Typography variant="body2">{selectedProfile.runModel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Qgen model</Typography>
                <Typography variant="body2">{selectedProfile.qgenModel}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">NER model</Typography>
                <Typography variant="body2">{selectedProfile.nerModel}</Typography>
              </Box>
            </Box>
          </Box>
        )}

        {/* runIterations */}
        <TextField
          label="Numero di iterazioni"
          type="number"
          inputProps={{ min: 1, step: 1 }}
          {...register('runIterations', { valueAsNumber: true })}
          error={!!errors.runIterations}
          helperText={
            errors.runIterations?.message ??
            'Quante volte ogni query viene eseguita (per affidabilità statistica)'
          }
        />

        <Divider sx={{ my: 1 }} />

        {/* ── Section 2: Optional (collapsible Accordion) — forms.md */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body1" fontWeight={600}>
              Opzioni avanzate
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* keywordsOverride */}
              <Controller
                name="keywordsOverride"
                control={control}
                render={({ field }) => (
                  <TagInput
                    label="Override keyword (facoltativo)"
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Aggiungi keyword e premi Invio"
                  />
                )}
              />

              {/* locales multi-select */}
              <Controller
                name="locales"
                control={control}
                render={({ field }) => (
                  <TagInput
                    label="Locale (facoltativo)"
                    value={field.value}
                    onChange={field.onChange}
                    options={LOCALE_OPTIONS}
                    placeholder="Seleziona locale"
                  />
                )}
              />

              {/* testMode */}
              <Controller
                name="testMode"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Test mode (numero ridotto di query)"
                  />
                )}
              />

              {/* debugMode */}
              <Controller
                name="debugMode"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value} onChange={field.onChange} />}
                    label="Debug mode (log dettagliati)"
                  />
                )}
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* Submit / cancel */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
          <Button
            variant="text"
            onClick={() => router.push(`/domains/${clientKey}`)}
            disabled={createRunMutation.isPending}
            sx={{ color: 'text.secondary' }}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={createRunMutation.isPending}
          >
            {createRunMutation.isPending ? 'Avvio…' : 'Avvia run'}
          </Button>
        </Box>
      </Box>

      {/* Queued banner (AC-013) */}
      <Snackbar
        open={queuedBanner}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="info">
          Run in coda — partirà automaticamente al termine della run in corso. Reindirizzamento…
        </Alert>
      </Snackbar>

      {/* Error toast */}
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
