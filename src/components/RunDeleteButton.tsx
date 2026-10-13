/**
 * RunDeleteButton — permanent deletion of a finished run, with confirmation.
 *
 * Not rendered for active runs (they must be cancelled first) nor for runs that
 * belong to a campaign (the backend refuses those too: RUN_NOT_DELETABLE / RUN_IN_CAMPAIGN).
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteIcon from '@mui/icons-material/DeleteOutline'
import { ApiError, deleteRunPermanently, type RunListItem } from '@/lib/api-client'

interface Props {
  clientKey: string
  run: RunListItem
}

export default function RunDeleteButton({ clientKey, run }: Props) {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => deleteRunPermanently(session?.accessToken ?? '', clientKey, run.runId),
    onSuccess: () => {
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['runs', clientKey] })
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Errore durante l'eliminazione. Riprova."),
  })

  if (run.status === 'queued' || run.status === 'running' || run.campaignId) return null

  const close = () => { if (!mutation.isPending) { setOpen(false); setError(null) } }

  return (
    // The button lives inside a clickable table row: never let clicks reach it.
    <span onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Elimina run">
        <IconButton size="small" aria-label="Elimina run" onClick={() => setOpen(true)}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Dialog open={open} onClose={close}>
        <DialogTitle>Eliminare la run?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Verranno eliminati definitivamente la run, le sue query, le risposte degli LLM, i brand
            estratti e i report salvati. L&apos;operazione è irreversibile.
          </DialogContentText>
          <DialogContentText sx={{ mt: 1, fontFamily: 'var(--geo-font-mono)', fontSize: 12 }}>
            {run.runId}
          </DialogContentText>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={mutation.isPending}>Annulla</Button>
          <Button color="error" variant="contained" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Elimina
          </Button>
        </DialogActions>
      </Dialog>
    </span>
  )
}
