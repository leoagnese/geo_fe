/**
 * SC-042 — Admin: LLM profile management.
 *
 * Table of LLM profiles (profileKey, llmProvider, runModel, qgenModel, nerModel).
 * Create/Edit drawer with all Profile entity fields.
 * Changes immediately visible in SC-020 configurator for all analysts (AC-039).
 * Role-guarded.
 *
 * States:
 * - Loading: DataGrid skeleton + "Crea profilo" button disabled
 * - Error 403: "Accesso negato"
 * - Error 500: banner with retry
 * - Empty: "Nessun profilo LLM ancora" with note that analysts cannot start runs
 * - Populated: DataGrid + Create/Edit drawer
 *
 * @implements US-025
 * @validates AC-039
 * @spec L1_design/screen-inventory.md §"SC-042"
 * @spec L1_design/states-and-empty.md §"SC-042"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Drawer from '@mui/material/Drawer'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getProfiles, ApiError, type LlmProfile } from '@/lib/api-client'

// We call the backend directly for create/update using the api-client's apiFetch
// The profile management endpoints (E-016, E-017) are admin-only.
// Since api-client does not export standalone profile mutation functions,
// we implement them inline using fetch with the auth token.

type ProfilePayload = Omit<CreateProfileForm, 'webSearch'|'reasoningEffort'|'searchContextSize'|'includeWebSources'|'maxOutputTokens'|'maxToolCalls'|'active'|'responsesCfgJson'> & {
  active?: boolean
  responsesCfg?: Record<string, unknown>
}

async function createProfile(token: string, dto: ProfilePayload) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
  const res = await fetch(`${BASE_URL}/profiles`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function updateProfile(token: string, profileKey: string, dto: Partial<ProfilePayload>) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
  const res = await fetch(`${BASE_URL}/profiles/${profileKey}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const LLM_PROVIDERS = ['openai', 'gemini', 'perplexity'] as const
const REASONING_EFFORT = ['low', 'medium', 'high'] as const
const SEARCH_CONTEXT_SIZE = ['low', 'medium', 'high'] as const

const CreateProfileSchema = z.object({
  profileKey: z.string().min(1, 'profileKey è obbligatorio'),
  llmProvider: z.enum(LLM_PROVIDERS),
  runModel: z.string().min(1, 'runModel è obbligatorio'),
  qgenModel: z.string().min(1, 'qgenModel è obbligatorio'),
  nerModel: z.string().min(1, 'nerModel è obbligatorio'),
  reportModel: z.string().default('gpt-4o-mini'),
  batchSize: z.coerce.number().min(1).default(5),
  qgenBatchSize: z.coerce.number().min(1).default(5),
  active: z.boolean().default(true),
  webSearch: z.boolean().default(false),
  reasoningEffort: z.enum(REASONING_EFFORT).default('low'),
  searchContextSize: z.enum(SEARCH_CONTEXT_SIZE).default('medium'),
  includeWebSources: z.boolean().default(true),
  maxOutputTokens: z.coerce.number().min(0).default(4000),
  maxToolCalls: z.coerce.number().min(0).default(2),
  // Free-form JSON for the rest of responsesCfg (locale/domain filters etc.)
  responsesCfgJson: z
    .string()
    .default('')
    .refine(
      (val) => {
        if (!val.trim()) return true
        try { JSON.parse(val); return true } catch { return false }
      },
      { message: 'JSON non valido' },
    ),
})

type CreateProfileForm = z.infer<typeof CreateProfileSchema>
type ProfileRow = LlmProfile & { id: string }

const PROVIDER_COLORS: Record<string, 'default' | 'primary' | 'secondary'> = {
  openai: 'primary',
  gemini: 'secondary',
  perplexity: 'default',
}

export default function AdminProfilesPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<LlmProfile | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['profiles-admin'],
    queryFn: () => getProfiles(session?.accessToken ?? '', 1, 100),
    enabled: !!session?.accessToken && session.user.role === 'admin',
  })

  const createMutation = useMutation({
    mutationFn: (formData: ProfilePayload) =>
      createProfile(session?.accessToken ?? '', formData),
    onSuccess: () => {
      setDrawerOpen(false)
      setSuccessToast('Profilo creato con successo.')
      void queryClient.invalidateQueries({ queryKey: ['profiles-admin'] })
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (err) => {
      setErrorToast(`Errore durante la creazione: ${err instanceof Error ? err.message : 'sconosciuto'}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ key, dto }: { key: string; dto: Partial<ProfilePayload> }) =>
      updateProfile(session?.accessToken ?? '', key, dto),
    onSuccess: () => {
      setDrawerOpen(false)
      setEditingProfile(null)
      setSuccessToast('Profilo aggiornato.')
      void queryClient.invalidateQueries({ queryKey: ['profiles-admin'] })
      void queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
    onError: (err) => {
      setErrorToast(`Errore durante l'aggiornamento: ${err instanceof Error ? err.message : 'sconosciuto'}`)
    },
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateProfileForm>({
    resolver: zodResolver(CreateProfileSchema),
    defaultValues: { llmProvider: 'openai' },
  })

  if (session && session.user.role !== 'admin') return null

  const rows: ProfileRow[] = (data?.data ?? []).map((p) => ({ ...p, id: p._id }))

  const openCreateDrawer = () => {
    setEditingProfile(null)
    reset({
      llmProvider: 'openai', profileKey: '', runModel: '', qgenModel: '', nerModel: '',
      reportModel: 'gpt-4o-mini', batchSize: 5, qgenBatchSize: 5,
      active: true, webSearch: false, reasoningEffort: 'low', searchContextSize: 'medium',
      includeWebSources: true, maxOutputTokens: 4000, maxToolCalls: 2,
      responsesCfgJson: '',
    })
    setDrawerOpen(true)
  }

  const openEditDrawer = (profile: LlmProfile) => {
    setEditingProfile(profile)
    const cfg = (profile.responsesCfg ?? {}) as Record<string, unknown>
    // Keys edited via dedicated controls; everything else goes in the JSON textarea.
    const STRUCTURED_KEYS = ['webSearch', 'reasoningEffort', 'searchContextSize', 'includeWebSources', 'maxOutputTokens', 'maxToolCalls']
    const extraCfg = Object.fromEntries(
      Object.entries(cfg).filter(([k]) => !STRUCTURED_KEYS.includes(k)),
    )
    reset({
      profileKey: profile.profileKey,
      llmProvider: profile.llmProvider,
      runModel: profile.runModel,
      qgenModel: profile.qgenModel,
      nerModel: profile.nerModel,
      reportModel: profile.reportModel ?? 'gpt-4o-mini',
      batchSize: profile.batchSize ?? 5,
      qgenBatchSize: profile.qgenBatchSize ?? 5,
      active: profile.active ?? true,
      webSearch: (cfg.webSearch as boolean) ?? false,
      reasoningEffort: (cfg.reasoningEffort as typeof REASONING_EFFORT[number]) ?? 'low',
      searchContextSize: (cfg.searchContextSize as typeof SEARCH_CONTEXT_SIZE[number]) ?? 'medium',
      includeWebSources: (cfg.includeWebSources as boolean) ?? true,
      maxOutputTokens: (cfg.maxOutputTokens as number) ?? 4000,
      maxToolCalls: (cfg.maxToolCalls as number) ?? 2,
      responsesCfgJson: Object.keys(extraCfg).length > 0 ? JSON.stringify(extraCfg, null, 2) : '',
    })
    setDrawerOpen(true)
  }

  const buildResponsesCfg = (formData: CreateProfileForm): Record<string, unknown> => {
    let extra: Record<string, unknown> = {}
    if (formData.responsesCfgJson?.trim()) {
      try {
        const parsed = JSON.parse(formData.responsesCfgJson)
        if (parsed && typeof parsed === 'object') extra = parsed as Record<string, unknown>
      } catch {
        // Validation already guards this; ignore here.
      }
    }
    return {
      ...extra,
      webSearch: formData.webSearch,
      reasoningEffort: formData.reasoningEffort,
      searchContextSize: formData.searchContextSize,
      includeWebSources: formData.includeWebSources,
      maxOutputTokens: formData.maxOutputTokens,
      maxToolCalls: formData.maxToolCalls,
    }
  }

  const onSubmit = (formData: CreateProfileForm) => {
    const responsesCfg = buildResponsesCfg(formData)
    if (editingProfile) {
      updateMutation.mutate({
        key: editingProfile.profileKey,
        dto: {
          profileKey: formData.profileKey !== editingProfile.profileKey ? formData.profileKey : undefined,
          llmProvider: formData.llmProvider,
          runModel: formData.runModel,
          qgenModel: formData.qgenModel,
          nerModel: formData.nerModel,
          reportModel: formData.reportModel,
          batchSize: formData.batchSize,
          qgenBatchSize: formData.qgenBatchSize,
          active: formData.active,
          responsesCfg,
        },
      })
    } else {
      createMutation.mutate({
        profileKey: formData.profileKey,
        llmProvider: formData.llmProvider,
        runModel: formData.runModel,
        qgenModel: formData.qgenModel,
        nerModel: formData.nerModel,
        reportModel: formData.reportModel,
        batchSize: formData.batchSize,
        qgenBatchSize: formData.qgenBatchSize,
        responsesCfg,
      })
    }
  }

  const columns: GridColDef<ProfileRow>[] = [
    { field: 'profileKey', headerName: 'profileKey', flex: 1, minWidth: 200 },
    {
      field: 'llmProvider',
      headerName: 'Provider',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          color={PROVIDER_COLORS[params.value as string] ?? 'default'}
        />
      ),
    },
    { field: 'runModel', headerName: 'Run model', width: 180 },
    { field: 'qgenModel', headerName: 'Qgen model', width: 180 },
    { field: 'nerModel', headerName: 'NER model', width: 180 },
    {
      field: 'active',
      headerName: 'Attivo',
      width: 80,
      renderCell: (params) => (
        <Chip
          label={params.value ? 'sì' : 'no'}
          size="small"
          color={params.value ? 'success' : 'default'}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 80,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            openEditDrawer(params.row as LlmProfile)
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Typography variant="h1">Profili LLM</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreateDrawer}
          disabled={isLoading}
        >
          Crea profilo
        </Button>
      </Box>

      {/* Empty state warning — analysts cannot run without profiles */}
      {!isLoading && rows.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Nessun profilo LLM configurato. Gli analyst non possono avviare run senza almeno un profilo.
        </Alert>
      )}

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Riprova
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Impossibile caricare i profili. Riprova.
        </Alert>
      )}

      <Box sx={{ height: 500 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography color="text.secondary">
                  Nessun profilo LLM ancora — crea il primo profilo.
                </Typography>
              </Box>
            ),
          }}
          sx={{ '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' } }}
        />
      </Box>

      {/* Create/Edit Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingProfile(null) }}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h2">
            {editingProfile ? 'Modifica profilo' : 'Nuovo profilo LLM'}
          </Typography>
          <IconButton onClick={() => { setDrawerOpen(false); setEditingProfile(null) }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <TextField
            label="profileKey"
            {...register('profileKey')}
            error={!!errors.profileKey}
            helperText={errors.profileKey?.message ?? (editingProfile ? 'Modifica la chiave: aggiorna anche tutti i run che la referenziano.' : '')}
            InputProps={{ sx: { fontFamily: 'var(--geo-font-mono)' } }}
          />

          <Controller
            name="llmProvider"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Provider LLM"
                error={!!errors.llmProvider}
              >
                {LLM_PROVIDERS.map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </TextField>
            )}
          />

          <TextField
            label="runModel"
            {...register('runModel')}
            error={!!errors.runModel}
            helperText={errors.runModel?.message}
          />
          <TextField
            label="qgenModel"
            {...register('qgenModel')}
            error={!!errors.qgenModel}
            helperText={errors.qgenModel?.message}
          />
          <TextField
            label="nerModel"
            {...register('nerModel')}
            error={!!errors.nerModel}
            helperText={errors.nerModel?.message}
          />
          <TextField
            label="reportModel"
            {...register('reportModel')}
            error={!!errors.reportModel}
            helperText={errors.reportModel?.message ?? 'Modello usato per la generazione del report'}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="batchSize"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              {...register('batchSize')}
              error={!!errors.batchSize}
              helperText={errors.batchSize?.message}
              sx={{ flex: 1 }}
            />
            <TextField
              label="qgenBatchSize"
              type="number"
              inputProps={{ min: 1, step: 1 }}
              {...register('qgenBatchSize')}
              error={!!errors.qgenBatchSize}
              helperText={errors.qgenBatchSize?.message}
              sx={{ flex: 1 }}
            />
          </Box>

          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                label="Profilo attivo"
              />
            )}
          />

          <Divider sx={{ my: 1 }}>
            <Typography variant="caption" color="text.secondary">Responses Config</Typography>
          </Divider>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Controller
              name="webSearch"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                  label="Web Search"
                />
              )}
            />
            <Controller
              name="includeWebSources"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={e => field.onChange(e.target.checked)} />}
                  label="Include Sources"
                />
              )}
            />
          </Box>

          <Controller
            name="reasoningEffort"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Reasoning Effort">
                {REASONING_EFFORT.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            )}
          />

          <Controller
            name="searchContextSize"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Search Context Size">
                {SEARCH_CONTEXT_SIZE.map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
            )}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Max Output Tokens"
              type="number"
              {...register('maxOutputTokens')}
              error={!!errors.maxOutputTokens}
              helperText={errors.maxOutputTokens?.message}
              sx={{ flex: 1 }}
            />
            <TextField
              label="Max Tool Calls"
              type="number"
              {...register('maxToolCalls')}
              error={!!errors.maxToolCalls}
              helperText={errors.maxToolCalls?.message}
              sx={{ flex: 1 }}
            />
          </Box>

          <TextField
            label="responsesCfg avanzato (JSON)"
            {...register('responsesCfgJson')}
            error={!!errors.responsesCfgJson}
            helperText={
              errors.responsesCfgJson?.message ??
              'Chiavi extra: localeWebSearch, excludedDomains, allowedDomains, excludedDomainContains. Le chiavi sopra hanno priorità.'
            }
            multiline
            minRows={4}
            placeholder={'{\n  "excludedDomains": ["example.com"],\n  "allowedDomains": []\n}'}
            InputProps={{ sx: { fontFamily: 'var(--geo-font-mono)', fontSize: 13 } }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="text"
              onClick={() => { setDrawerOpen(false); setEditingProfile(null) }}
              sx={{ color: 'text.secondary' }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Salvataggio…'
                : editingProfile
                  ? 'Salva modifiche'
                  : 'Crea profilo'}
            </Button>
          </Box>
        </Box>
      </Drawer>

      {/* Toasts */}
      <Snackbar open={!!successToast} autoHideDuration={4000} onClose={() => setSuccessToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" onClose={() => setSuccessToast(null)}>{successToast}</Alert>
      </Snackbar>
      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
  )
}
