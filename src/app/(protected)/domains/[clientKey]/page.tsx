/**
 * SC-012 — Domain homepage (run history).
 *
 * Left/top: domain info card (brand, targetDomain, clientKey, settori, aliases).
 * Main: run history table ordered by timestamp desc.
 * Columns: runId, status chip, profileKey, runIterations, startedAt.
 * Row click → SC-021. "New run" CTA always visible. Paginated.
 *
 * States:
 * - Loading: skeleton domain card + skeleton table rows
 * - Error 403/404: "Accesso negato" or "Dominio non trovato"
 * - Error 500: banner with retry
 * - Empty (first-use): domain info + "Nessuna run ancora" + CTA
 * - Populated: domain info card + run table
 *
 * @implements US-006, US-011
 * @validates AC-010, AC-018
 * @spec L1_design/screen-inventory.md §"SC-012"
 * @spec L1_design/states-and-empty.md §"SC-012"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import TablePagination from '@mui/material/TablePagination'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import StatusChip from '@/components/StatusChip'
import { getDomain, getRuns, deleteDomain, ApiError } from '@/lib/api-client'
import type { RunListItem } from '@/lib/api-client'

interface DomainPageProps {
  params: { clientKey: string }
}

// ── Relative time formatter ────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'proprio ora'
  if (mins < 60) return `${mins} min fa`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} ore fa`
  const days = Math.floor(hours / 24)
  return `${days} giorni fa`
}

// ── Page ───────────────────────────────────────────────────────

export default function DomainPage({ params }: DomainPageProps) {
  const { clientKey } = params
  const { data: session } = useSession()
  const router = useRouter()
  const [page, setPage] = useState(0)
  const rowsPerPage = 20
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteErrorToast, setDeleteErrorToast] = useState<string | null>(null)

  const deleteMutation = useMutation({
    mutationFn: () => deleteDomain(session?.accessToken ?? '', clientKey),
    onSuccess: () => router.push('/domains'),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteErrorToast('Impossibile eliminare: ci sono run attive (running o queued). Cancellale prima.')
      } else {
        setDeleteErrorToast('Errore durante l\'eliminazione. Riprova.')
      }
      setDeleteDialogOpen(false)
    },
  })

  const {
    data: domainData,
    isLoading: domainLoading,
    isError: domainError,
    error: domainErr,
  } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const {
    data: runsData,
    isLoading: runsLoading,
    isError: runsError,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['runs', clientKey, page],
    queryFn: () => getRuns(session?.accessToken ?? '', clientKey, { page: page + 1, limit: rowsPerPage }),
    enabled: !!session?.accessToken && !!domainData,
  })

  const domain = domainData?.data
  const runs: RunListItem[] = runsData?.data ?? []
  const totalRuns = runsData?.meta?.total ?? 0

  // 403/404 for domain
  const isDomainForbiddenOrNotFound =
    domainError &&
    domainErr instanceof ApiError &&
    (domainErr.status === 403 || domainErr.status === 404)

  if (isDomainForbiddenOrNotFound) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Accesso negato
        </Typography>
        <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
          Questo dominio non è nel tuo account o non esiste.
        </Typography>
        <Button variant="contained" onClick={() => router.push('/domains')}>
          Torna ai domini
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {domainLoading ? (
          <Skeleton variant="text" width={200} height={48} />
        ) : (
          <Typography variant="h1">{domain?.brand ?? clientKey}</Typography>
        )}

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={() => setDeleteDialogOpen(true)}
            disabled={domainLoading}
          >
            Elimina
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => router.push(`/domains/${clientKey}/edit`)}
          >
            Modifica
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/new`)}
          >
            Nuova run
          </Button>
        </Box>
      </Box>

      {/* Domain info card */}
      {domainLoading ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Skeleton variant="text" width="40%" height={28} />
            <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
            <Skeleton variant="text" width="50%" height={20} sx={{ mt: 0.5 }} />
          </CardContent>
        </Card>
      ) : domain ? (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.disabled">
                  Dominio target
                </Typography>
                <Typography variant="body1">{domain.targetDomain}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">
                  clientKey
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontFamily: 'var(--geo-font-mono)' }}
                >
                  {domain.clientKey}
                </Typography>
              </Box>
              {domain.settori && domain.settori.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.disabled">
                    Settori
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                    {domain.settori.map((s) => (
                      <Chip key={s} label={s} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Box>
              )}
              {domain.aliases && domain.aliases.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.disabled">
                    Alias
                  </Typography>
                  <Typography variant="body2">{domain.aliases.join(', ')}</Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {/* Run history section */}
      <Typography variant="h2" sx={{ mb: 2 }}>
        Cronologia run
      </Typography>

      {/* Error state — 500 */}
      {runsError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchRuns()}>
              Riprova
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Impossibile caricare la cronologia delle run.
        </Alert>
      )}

      {/* Loading state — skeleton rows */}
      {runsLoading && (
        <Paper>
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="text" height={52} sx={{ mb: 0.5 }} />
            ))}
          </Box>
        </Paper>
      )}

      {/* Empty state (first-use) — AC-010 */}
      {!runsLoading && !runsError && runs.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 200,
            gap: 2,
          }}
        >
          <Typography variant="h3" color="text.secondary">
            Nessuna run ancora
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Avvia la prima analisi per questo dominio.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/new`)}
          >
            Nuova run
          </Button>
        </Box>
      )}

      {/* Populated state — run table */}
      {!runsLoading && runs.length > 0 && (
        <Paper>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Run ID</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell>Profilo</TableCell>
                  <TableCell align="right">Iterazioni</TableCell>
                  <TableCell>Avviata</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <TableRow
                    key={run.runId}
                    hover
                    onClick={() =>
                      router.push(`/domains/${clientKey}/runs/${run.runId}`)
                    }
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: 'var(--geo-font-mono)',
                          maxWidth: 200,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {run.runId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={run.status} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{run.profileKey}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">{run.runIterations ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {run.startedAt ? relativeTime(run.startedAt) : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={totalRuns}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[20]}
            onPageChange={(_e, newPage) => setPage(newPage)}
          />
        </Paper>
      )}
      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Eliminare il dominio?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Stai per eliminare <strong>{clientKey}</strong>. Lo storico delle run
            rimarrà in MongoDB ma il dominio non sarà più accessibile dalla piattaforma.
            Questa azione non può essere annullata.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteMutation.isPending}>
            Annulla
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminazione…' : 'Elimina definitivamente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error toast */}
      <Snackbar
        open={!!deleteErrorToast}
        onClose={() => setDeleteErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setDeleteErrorToast(null)}>
          {deleteErrorToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
