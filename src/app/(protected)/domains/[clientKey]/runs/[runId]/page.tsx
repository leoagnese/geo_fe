/**
 * SC-021 + SC-022 — Run detail / monitor.
 *
 * Top strip: runId, StatusChip (animated if running), startedAt, profileKey, config summary.
 * RunProgressBar (visible if running or queued).
 * SC-022 banner: if status=queued, full-width MUI Alert info with "Run in coda" + Cancel button.
 * Cancel button (if running or queued): confirmation dialog → DELETE /domains/:clientKey/runs/:runId.
 * Polling: useQuery with refetchInterval=10s when running; false otherwise.
 * Auto-redirect to results/overview when status === 'done'.
 * Config accordion (AC-019). Debug log panel (if debugMode=true, AC-028).
 *
 * States:
 * - Loading: skeleton top strip + counter blocks
 * - Error (polling failure): stale data warning banner
 * - Error (run error status): red alert with errorMessage
 * - Empty (queued): SC-022 banner + 0/0/0 counters
 * - Populated running: live progress + cancel button
 * - Populated done: results CTA
 * - Populated cancelled/error: frozen counters + info banner
 *
 * @implements US-009, US-010, US-012
 * @validates AC-015, AC-016, AC-017, AC-019, AC-028, AC-042, AC-043, AC-044, AC-045
 * @spec L1_design/screen-inventory.md §"SC-021"
 * @spec L1_design/states-and-empty.md §"SC-021", §"SC-022"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CancelIcon from '@mui/icons-material/Cancel'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import StatusChip from '@/components/StatusChip'
import RunProgressBar from '@/components/RunProgressBar'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getRun, cancelRun, ApiError } from '@/lib/api-client'

interface RunMonitorPageProps {
  params: { clientKey: string; runId: string }
}

// ── Debug log panel ────────────────────────────────────────────

interface DebugLogPanelProps {
  log: string[]
}

function DebugLogPanel({ log }: DebugLogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <Accordion defaultExpanded={false}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="body2" fontWeight={600}>
          Debug log ({log.length} voci)
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ p: 0 }}>
        <Box
          sx={{
            maxHeight: 320,
            overflow: 'auto',
            bgcolor: 'background.default', // color.neutral.bg
            fontFamily: 'var(--geo-font-mono)',
            fontSize: 'var(--geo-text-mono-sm)',
            px: 2,
            py: 1,
          }}
        >
          {log.length === 0 ? (
            <Typography variant="caption" color="text.disabled">
              Nessun log disponibile.
            </Typography>
          ) : (
            log.map((entry, i) => (
              <Box
                key={i}
                sx={{
                  py: 0.25,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                {entry}
              </Box>
            ))
          )}
          <div ref={bottomRef} />
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function RunMonitorPage({ params }: RunMonitorPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const router = useRouter()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [cancelSuccessToast, setCancelSuccessToast] = useState(false)
  const [cancelErrorToast, setCancelErrorToast] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [stalePollWarning, setStalePollWarning] = useState(false)
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const consecutiveFailsRef = useRef(0)

  const {
    data: runData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['run', clientKey, runId],
    queryFn: async () => {
      try {
        const result = await getRun(session?.accessToken ?? '', clientKey, runId)
        consecutiveFailsRef.current = 0
        setStalePollWarning(false)
        setLastUpdated(new Date())
        // Reset stale timer
        if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
        staleTimerRef.current = setTimeout(() => setStalePollWarning(true), 30_000)
        return result
      } catch (err) {
        consecutiveFailsRef.current += 1
        if (consecutiveFailsRef.current >= 3) setStalePollWarning(true)
        throw err
      }
    },
    enabled: !!session?.accessToken,
    // Poll every 10s only while running (AC-016)
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'running' ? 10_000 : false
    },
  })

  const run = runData?.data

  // Auto-redirect to results/overview when status transitions to done (AC-017)
  useEffect(() => {
    if (run?.status === 'done') {
      router.replace(`/domains/${clientKey}/runs/${runId}/results/overview`)
    }
  }, [run?.status, clientKey, runId, router])

  // Cleanup stale timer on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) clearTimeout(staleTimerRef.current)
    }
  }, [])

  const cancelMutation = useMutation({
    mutationFn: () => cancelRun(session?.accessToken ?? '', clientKey, runId),
    onSuccess: () => {
      setCancelDialogOpen(false)
      setCancelSuccessToast(true)
    },
    onError: (err) => {
      setCancelDialogOpen(false)
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setCancelErrorToast('La run non è più cancellabile (già completata o in errore).')
          return
        }
        if (err.status === 502) {
          setCancelErrorToast('Cancellazione fallita: impossibile contattare n8n.')
          return
        }
      }
      setCancelErrorToast('Errore durante la cancellazione. Riprova.')
    },
  })

  const canCancel = run?.status === 'running' || run?.status === 'queued'
  const isQueued = run?.status === 'queued'
  const isRunning = run?.status === 'running'

  // ── Loading state ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width="40%" height={48} />
        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
          <Skeleton variant="rounded" width={100} height={24} />
          <Skeleton variant="text" width={200} height={24} />
        </Box>
        <Box sx={{ mt: 4 }}>
          <Skeleton variant="rounded" height={8} />
          <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" width={80} height={60} />
            ))}
          </Box>
        </Box>
      </Box>
    )
  }

  // ── 404 / 403 ─────────────────────────────────────────────────
  if (isError && !run) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Run non trovata
        </Typography>
        <Button variant="contained" onClick={() => router.push(`/domains/${clientKey}`)}>
          Torna al dominio
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      {/* ── Top strip ──── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'var(--geo-font-mono)', display: 'block', mb: 0.5 }}
          >
            {runId}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {run && <StatusChip status={run.status} size="medium" />}
            <Typography variant="body2" color="text.secondary">
              Profilo: <strong>{run?.profileKey}</strong>
            </Typography>
            {run?.startedAt && (
              <Typography variant="body2" color="text.secondary">
                Avviata: {new Date(run.startedAt).toLocaleString('it-IT')}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Cancel button — visible if running OR queued (AC-042, AC-045) */}
        {canCancel && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => setCancelDialogOpen(true)}
          >
            Annulla run
          </Button>
        )}

        {/* Results CTA — when done */}
        {run?.status === 'done' && (
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() =>
              router.push(`/domains/${clientKey}/runs/${runId}/results/overview`)
            }
          >
            Visualizza risultati
          </Button>
        )}
      </Box>

      {/* ── SC-022 — Queue banner (inline state when queued) ── */}
      {isQueued && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            Run in coda
          </Typography>
          <Typography variant="body2">
            Partirà automaticamente al completamento della run in corso. La promozione è automatica.
          </Typography>
        </Alert>
      )}

      {/* ── Run error alert ── */}
      {run?.status === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            Pipeline fallita
          </Typography>
          {run.errorMessage && (
            <Typography variant="body2">{run.errorMessage}</Typography>
          )}
        </Alert>
      )}

      {/* ── Cancelled info ── */}
      {run?.status === 'cancelled' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Questa run è stata annullata dall&apos;utente.
          {run.completedAt &&
            ` Cancellata il ${new Date(run.completedAt).toLocaleString('it-IT')}.`}
        </Alert>
      )}

      {/* ── Progress section — visible if running or queued ── */}
      {(isRunning || isQueued) && run && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Avanzamento
          </Typography>
          {isQueued && (
            <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
              La run inizierà automaticamente.
            </Typography>
          )}
          <RunProgressBar
            plannedQueries={run.plannedQueries}
            doneQueries={run.doneQueries}
            errorQueries={run.errorQueries}
            status={run.status}
            lastUpdated={lastUpdated}
            stalePollWarning={stalePollWarning}
          />
        </Paper>
      )}

      {/* ── Done: frozen counters ── */}
      {(run?.status === 'done' ||
        run?.status === 'cancelled' ||
        run?.status === 'error') &&
        run && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Riepilogo query
            </Typography>
            <RunProgressBar
              plannedQueries={run.plannedQueries}
              doneQueries={run.doneQueries}
              errorQueries={run.errorQueries}
              status={run.status}
            />
          </Paper>
        )}

      <Divider sx={{ my: 3 }} />

      {/* ── Config detail accordion (AC-019) ── */}
      {run && (
        <Accordion defaultExpanded={false}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body1" fontWeight={600}>
              Configurazione run
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.disabled">Iterazioni</Typography>
                <Typography variant="body2">{run.runIterations}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Locale</Typography>
                <Typography variant="body2">
                  {run.locales?.join(', ') || 'Default'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Test mode</Typography>
                <Typography variant="body2">{run.testMode ? 'Sì' : 'No'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Debug mode</Typography>
                <Typography variant="body2">{run.debugMode ? 'Sì' : 'No'}</Typography>
              </Box>
              {run.keywordsOverride && run.keywordsOverride.length > 0 && (
                <Box sx={{ gridColumn: 'span 2' }}>
                  <Typography variant="caption" color="text.disabled">Keywords override</Typography>
                  <Typography variant="body2">{run.keywordsOverride.join(', ')}</Typography>
                </Box>
              )}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* ── Debug log panel (AC-028) — only if debugMode=true ── */}
      {run?.debugMode && run.debugLog && (
        <Box sx={{ mt: 2 }}>
          <DebugLogPanel log={run.debugLog} />
        </Box>
      )}
      {/* no empty state — debug panel is only rendered when debugMode=true on run config */}

      {/* ── Cancel confirmation dialog ── */}
      <ConfirmDialog
        open={cancelDialogOpen}
        title="Annulla run"
        description={
          isQueued
            ? 'La run è in coda. Vuoi annullarla? L\'operazione è irreversibile.'
            : 'La run è in esecuzione. Vuoi annullarla? L\'operazione è irreversibile.'
        }
        confirmLabel="Annulla run"
        cancelLabel="Mantieni run"
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelDialogOpen(false)}
        loading={cancelMutation.isPending}
        severity="error"
      />

      {/* Toasts */}
      <Snackbar
        open={cancelSuccessToast}
        autoHideDuration={4000}
        onClose={() => setCancelSuccessToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setCancelSuccessToast(false)}>
          Run annullata con successo.
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!cancelErrorToast}
        onClose={() => setCancelErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setCancelErrorToast(null)}>
          {cancelErrorToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
