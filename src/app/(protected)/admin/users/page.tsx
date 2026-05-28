/**
 * SC-040 — Admin: user management.
 *
 * Table of user accounts (email, role). Create button opens drawer.
 * Change role inline via select. Delete analyst via icon button + confirm dialog.
 *
 * @implements US-023, US-002
 * @validates AC-037, AC-004
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
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import InputAdornment from '@mui/material/InputAdornment'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  ApiError,
  type UserProfile,
  type ApiSuccess,
} from '@/lib/api-client'

const CreateUserSchema = z.object({
  username: z.string().min(1, 'Username obbligatorio').regex(/^[a-z0-9._-]+$/, 'Solo lettere minuscole, numeri, punti, trattini'),
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Almeno 8 caratteri'),
  role: z.enum(['analyst', 'admin']),
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
  const [deleteTarget, setDeleteTarget] = useState<{ userId: string; email: string } | null>(null)

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  const { data, isLoading, isError, refetch } = useQuery<ApiSuccess<UserProfile[]>>({
    queryKey: ['admin-users'],
    queryFn: () => getAdminUsers(session?.accessToken ?? ''),
    enabled: !!session?.accessToken && session?.user?.role === 'admin',
  })

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

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'analyst' | 'admin' }) =>
      updateAdminUser(session?.accessToken ?? '', userId, { role }),
    onSuccess: () => {
      setSuccessToast('Ruolo aggiornato.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => setErrorToast('Operazione fallita. Riprova.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(session?.accessToken ?? '', userId),
    onSuccess: () => {
      setDeleteTarget(null)
      setSuccessToast('Utente eliminato.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: () => {
      setDeleteTarget(null)
      setErrorToast('Eliminazione fallita. Riprova.')
    },
  })

  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<CreateUserForm>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { role: 'analyst' },
  })

  if (session && session.user.role !== 'admin') return null

  const rows: UserRow[] = (data?.data ?? []).map((u) => ({ ...u, id: u._id }))

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
      width: 140,
      renderCell: (params) => (
        <TextField
          select
          size="small"
          value={params.value as string}
          variant="standard"
          onChange={(e) => {
            updateRoleMutation.mutate({
              userId: params.row.userId,
              role: e.target.value as 'analyst' | 'admin',
            })
          }}
          sx={{ minWidth: 110 }}
        >
          <MenuItem value="analyst">Analyst</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </TextField>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <IconButton
          size="small"
          color="error"
          onClick={() => setDeleteTarget({ userId: params.row.userId, email: params.row.email })}
          aria-label={`Elimina ${params.row.email}`}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      ),
    },
  ]

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h1">Gestione utenti</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { reset(); setDrawerOpen(true) }}
          disabled={isLoading}
        >
          Crea utente
        </Button>
      </Box>

      {isError && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void (refetch as () => void)()}>Riprova</Button>}
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
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography color="text.secondary">
                  Nessun utente ancora — crea il primo account.
                </Typography>
              </Box>
            ),
          }}
          sx={{ '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' } }}
        />
      </Box>

      {/* Create user drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 3 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h2">Nuovo utente</Typography>
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
            label="Username"
            {...register('username')}
            error={!!errors.username}
            helperText={errors.username?.message ?? 'Solo lettere minuscole, numeri, punti, trattini'}
            InputProps={{ sx: { fontFamily: 'var(--geo-font-mono)' } }}
          />
          <TextField
            label="Email"
            type="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message ?? 'Almeno 8 caratteri'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowPassword((v) => !v)} edge="end">
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="Elimina utente"
        description={`Eliminare definitivamente l'account di ${deleteTarget?.email ?? ''}? L'operazione non è reversibile.`}
        confirmLabel="Elimina"
        severity="error"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.userId)}
        onCancel={() => setDeleteTarget(null)}
      />

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
