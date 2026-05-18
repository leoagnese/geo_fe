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

async function createProfile(token: string, dto: CreateProfileForm) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
  const res = await fetch(`${BASE_URL}/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function updateProfile(token: string, profileKey: string, dto: Partial<CreateProfileForm>) {
  const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1'
  const res = await fetch(`${BASE_URL}/profiles/${profileKey}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const LLM_PROVIDERS = ['openai', 'gemini', 'perplexity'] as const

const CreateProfileSchema = z.object({
  profileKey: z.string().min(1, 'profileKey è obbligatorio'),
  llmProvider: z.enum(LLM_PROVIDERS),
  runModel: z.string().min(1, 'runModel è obbligatorio'),
  qgenModel: z.string().min(1, 'qgenModel è obbligatorio'),
  nerModel: z.string().min(1, 'nerModel è obbligatorio'),
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
    mutationFn: (formData: CreateProfileForm) =>
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
    mutationFn: ({ key, dto }: { key: string; dto: Partial<CreateProfileForm> }) =>
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
    reset({ llmProvider: 'openai', profileKey: '', runModel: '', qgenModel: '', nerModel: '' })
    setDrawerOpen(true)
  }

  const openEditDrawer = (profile: LlmProfile) => {
    setEditingProfile(profile)
    reset({
      profileKey: profile.profileKey,
      llmProvider: profile.llmProvider,
      runModel: profile.runModel,
      qgenModel: profile.qgenModel,
      nerModel: profile.nerModel,
    })
    setDrawerOpen(true)
  }

  const onSubmit = (formData: CreateProfileForm) => {
    if (editingProfile) {
      updateMutation.mutate({
        key: editingProfile.profileKey,
        dto: { runModel: formData.runModel, qgenModel: formData.qgenModel, nerModel: formData.nerModel },
      })
    } else {
      createMutation.mutate(formData)
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
            disabled={!!editingProfile}
            error={!!errors.profileKey}
            helperText={errors.profileKey?.message ?? (editingProfile ? 'profileKey non modificabile' : '')}
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
                disabled={!!editingProfile}
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
