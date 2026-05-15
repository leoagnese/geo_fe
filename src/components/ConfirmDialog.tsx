/**
 * ConfirmDialog — reusable MUI Dialog for destructive action confirmation.
 *
 * Used by: run cancel confirmation on SC-021.
 * Shadow: shadow.dialog. Radius: radius.md.
 *
 * @spec L1_design/patterns/layouts.md
 */
'use client'

import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  /** Called when the user confirms the action */
  onConfirm: () => void
  /** Called when the user cancels (or closes) the dialog */
  onCancel: () => void
  /** When true, the confirm button shows a loading spinner */
  loading?: boolean
  /** Severity hint — affects confirm button color */
  severity?: 'error' | 'warning' | 'info'
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  onConfirm,
  onCancel,
  loading = false,
  severity = 'error',
}: ConfirmDialogProps) {
  const confirmColor = severity === 'error' ? 'error' : severity === 'warning' ? 'warning' : 'primary'

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle id="confirm-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="confirm-dialog-description">
          {description}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          variant="text"
          onClick={onCancel}
          disabled={loading}
          sx={{ color: 'text.secondary' }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          autoFocus
        >
          {loading ? 'Elaborazione…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
