/**
 * Admin: worker pool management.
 *
 * Lists every configured n8n worker with live occupancy (free / in use by
 * which run) and reachability (a periodic backend health-check pings each
 * worker's webhook), lets an admin add, edit, activate/deactivate, delete,
 * and manually re-test a worker. Polls every 10s so occupancy/health stay
 * current without a manual refresh, consistent with the platform's existing
 * polling convention for live operational state.
 *
 * Role-guarded: redirect if not admin.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck'
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  checkWorkerHealth,
  ApiError,
  type WorkerWithOccupancy,
} from '@/lib/api-client'

type EditTarget = 'new' | WorkerWithOccupancy | null

export default function AdminWorkersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [label, setLabel] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WorkerWithOccupancy | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-workers'],
    queryFn: () => getWorkers(session?.accessToken ?? ''),
    enabled: !!session?.accessToken && session?.user?.role === 'admin',
    refetchInterval: 10_000,
  })

  const workers = data?.data ?? []

  function openAdd() {
    setLabel('')
    setWebhookUrl('')
    setEditTarget('new')
  }

  function openEdit(worker: WorkerWithOccupancy) {
    setLabel(worker.label)
    setWebhookUrl(worker.webhookUrl)
    setEditTarget(worker)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editTarget === 'new') {
        return createWorker(session?.accessToken ?? '', { label, webhookUrl })
      }
      return updateWorker(session?.accessToken ?? '', (editTarget as WorkerWithOccupancy).workerId, { label, webhookUrl })
    },
    onSuccess: () => {
      setEditTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-workers'] })
    },
    onError: (err) => {
      setErrorToast(err instanceof ApiError ? err.message : 'Errore durante il salvataggio.')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (worker: WorkerWithOccupancy) =>
      updateWorker(session?.accessToken ?? '', worker.workerId, { active: !worker.active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-workers'] }),
    onError: (err) => {
      setErrorToast(err instanceof ApiError ? err.message : 'Errore durante l’aggiornamento.')
    },
  })

  const checkHealthMutation = useMutation({
    mutationFn: (workerId: string) => checkWorkerHealth(session?.accessToken ?? '', workerId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-workers'] }),
    onError: (err) => {
      setErrorToast(err instanceof ApiError ? err.message : 'Impossibile testare la connessione.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (workerId: string) => deleteWorker(session?.accessToken ?? '', workerId),
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-workers'] })
    },
    onError: (err) => {
      setDeleteTarget(null)
      setErrorToast(err instanceof ApiError ? err.message : 'Impossibile eliminare il worker.')
    },
  })

  if (session && session.user.role !== 'admin') return null

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h1">Worker pool</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Aggiungi worker
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refetch()}>Riprova</Button>} sx={{ mb: 2 }}>
          Impossibile caricare i worker.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Etichetta</TableCell>
              <TableCell>Webhook URL</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Raggiungibilità</TableCell>
              <TableCell>Occupazione</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && workers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Nessun worker configurato.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {workers.map((worker) => (
              <TableRow key={worker.workerId}>
                <TableCell>{worker.label}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{worker.webhookUrl}</Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={worker.active}
                    inputProps={{ 'aria-label': worker.label }}
                    onChange={() => toggleActiveMutation.mutate(worker)}
                  />
                </TableCell>
                <TableCell>
                  {worker.healthy === true && (
                    <Chip size="small" color="success" variant="outlined" label="OK" />
                  )}
                  {worker.healthy === false && (
                    <Tooltip title={worker.lastHealthCheckError ?? 'Errore sconosciuto'}>
                      <Chip size="small" color="error" label="Non raggiungibile" />
                    </Tooltip>
                  )}
                  {worker.healthy === null && (
                    <Chip size="small" variant="outlined" label="Non verificato" />
                  )}
                </TableCell>
                <TableCell>
                  {worker.inUse ? (
                    <Chip size="small" color="warning" label={`In uso — ${worker.inUse.clientKey} / ${worker.inUse.runId}`} />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="Libero" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    aria-label="Testa connessione"
                    disabled={checkHealthMutation.isPending}
                    onClick={() => checkHealthMutation.mutate(worker.workerId)}
                  >
                    <NetworkCheckIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Modifica worker" onClick={() => openEdit(worker)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Elimina worker" onClick={() => setDeleteTarget(worker)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit dialog */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget === 'new' ? 'Aggiungi worker' : 'Modifica worker'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Etichetta" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth size="small" />
          <TextField label="Webhook URL" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Annulla</Button>
          <Button variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Salvataggio…' : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminare il worker?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {deleteTarget?.label} verrà rimosso definitivamente dal pool.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.workerId)}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      <Alert
        severity="error"
        sx={{ display: errorToast ? 'flex' : 'none', position: 'fixed', bottom: 16, right: 16 }}
        onClose={() => setErrorToast(null)}
      >
        {errorToast}
      </Alert>
    </Box>
  )
}
