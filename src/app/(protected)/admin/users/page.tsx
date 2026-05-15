/**
 * SC-040 — Admin: user management.
 *
 * Table of analyst accounts (email, role, clientKeys[], status active/inactive).
 * Create button opens drawer form: email, role, clientKeys multi-select.
 * Route is 403-guarded for analyst role (US-002). Client-side role check + redirect.
 *
 * States:
 * - Loading: DataGrid skeleton
 * - Error 403 (analyst): "Accesso negato" full-page
 * - Error 500: banner with retry
 * - Empty: "Nessun analyst ancora" DataGrid empty state
 * - Populated: DataGrid + Create drawer
 *
 * @implements US-023, US-002
 * @validates AC-037, AC-004
 * @spec L1_design/screen-inventory.md §"SC-040"
 * @spec L1_design/states-and-empty.md §"SC-040"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState } from 'react'
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
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import StatusChip from '@/components/StatusChip'
import { getAdminUsers, createAdminUser, updateAdminUser, ApiError, type UserProfile } from '@/lib/api-client'

const CreateUserSchema = z.object({
  userId: z.string().min(1, 'userId (Keycloak sub) è obbligatorio'),
  email: z.string().email('Email non valida'),
  role: z.enum(['analyst', 'admin']),
  clientKeys: z.array(z.string()).default([]),
})

type CreateUserForm = z.infer<typeof CreateUserSchema>

type UserRow = UserProfile & { id: string }

export default function AdminUsersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Client-side role guard — AC-004
  if (session && session.user.role !== 'admin') {
    router.replace('/domains')
    return null
  }

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers(session?.accessToken ?? ''),
    enabled: !!session?.accessToken && session.user.role === 'admin',
  })

  const rows: UserRow[] = (data?.data ?? []).map((u) => ({ ...u, id: u._id }))

  const createMutation = useMutation({
    mutationFn: (formData: CreateUserForm) =>
      createAdminUser(session?.accessToken ?? '', formData),
    onSuccess: () => {
      setDrawerOpen(false)
      setSuccessToast('Utente creato con successo.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setErrorToast('userId già presente.')
        return
      }
      setErrorToast('Errore durante la creazione. Riprova.')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, active }: { userId: string; active: boolean }) =>
      updateAdminUser(session?.accessToken ?? '', userId, { active }),
    onSuccess: () => {
      setSuccessToast('Stato utente aggiornato.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => setErrorToast('Operazione fallita. Riprova.'),
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { role: 'analyst', clientKeys: [] },
  })

  // Error 403 at API level (belt-and-suspenders — middleware already blocks)
  if (isError) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Accesso negato
        </Typography>
        <Button variant="contained" onClick={() => router.push('/domains')}>
          Torna ai domini
        </Button>
      </Box>
    )
  }

  const columns: GridColDef<UserRow>[] = [
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 220 },
    {
      field: 'role',
      headerName: 'Ruolo',
      width: 110,
      renderCell: (params) => (
        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
          {params.value}
        </Typography>
      ),
    },
    {
      field: 'clientKeys',
      headerName: 'Domini assegnati',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography variant="body2" noWrap>
          {(params.value as string[]).join(', ') || '—'}
        </Typography>
      ),
    },
    {
      field: 'active',
      headerName: 'Attivo',
      width: 100,
      renderCell: (params) => (
        <Switch
          checked={params.value as boolean}
          size="small"
          onChange={(e) => {
            toggleActiveMutation.mutate({
              userId: params.row.userId,
              active: e.target.checked,
            })
          }}
        />
      ),
    },
  ]

  return (
    <Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
      >
        <Typography variant="h1">Gestione utenti</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            reset()
            setDrawerOpen(true)
          }}
          disabled={isLoading}
        >
          Crea analyst
        </Button>
      </Box>

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
          Impossibile caricare gli utenti. Riprova.
        </Alert>
      )}

      <Box sx={{ height: 520 }}>
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
                  Nessun analyst ancora — crea il primo account.
                </Typography>
              </Box>
            ),
          }}
          sx={{ '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' } }}
        />
      </Box>

      {/* ── Create user drawer (480px per layouts.md) ── */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}
        >
          <Typography variant="h2">Nuovo analyst</Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 3 }} />

        <Box
          component="form"
          onSubmit={handleSubmit((d) => createMutation.mutate(d))}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <TextField
            label="Keycloak userId (sub)"
            {...register('userId')}
            error={!!errors.userId}
            helperText={errors.userId?.message}
          />
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label="Ruolo">
                <MenuItem value="analyst">Analyst</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </TextField>
            )}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button variant="text" onClick={() => setDrawerOpen(false)} sx={{ color: 'text.secondary' }}>
              Annulla
            </Button>
            <Button type="submit" variant="contained" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creazione…' : 'Crea utente'}
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
