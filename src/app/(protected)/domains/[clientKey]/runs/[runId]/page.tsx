/**
 * SC-021 + SC-022 — Run detail / monitor.
 *
 * Top strip: runId, StatusChip (animated if running), startedAt, profileKey, config summary.
 * RunProgressBar (visible if running or queued).
 * SC-022 banner: if status=queued, full-width MUI Alert info with "Run in coda" + Cancel button.
 * Cancel button (if running or queued): confirmation dialog → DELETE /domains/:clientKey/runs/:runId.
 * WebSocket: useRunSocket drives live progress + reasoning panel while status=running|queued.
 *   refetchInterval is disabled (false). Single refetch on terminalEvent arrival.
 * Auto-redirect to results/overview when status === 'done' (HTTP or socket terminalEvent).
 * Config accordion (AC-019). Debug log panel (if debugMode=true, AC-028).
 * Reasoning panel: visible while running and socket logs are arriving (Italian UI, Italian messages).
 *
 * States:
 * - Loading: skeleton top strip + counter blocks
 * - Error (fetch failure): stale data warning banner
 * - Error (run error status): red alert with errorMessage
 * - Empty (queued): SC-022 banner + 0/0/0 counters
 * - Populated running: live progress + reasoning panel + cancel button
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { useRunSocket } from '@/hooks/useRunSocket'

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

// ── Reasoning panel ────────────────────────────────────────────

/** Maps a pipeline phase to a bullet colour. */
function phaseColor(phase: string): string {
  switch (phase) {
    case 'qgen':
      return '#1976d2' // blue — var(--geo-color-primary)
    case 'audit':
      return '#ed6c02' // orange — var(--geo-color-warning)
    case 'finalizing':
      return '#2e7d32' // green — var(--geo-color-success)
    default:
      return '#9e9e9e' // grey — color.neutral.text.disabled
  }
}

interface ReasoningPanelProps {
  logs: Array<{ phase: string; message: string; ts: string }>
}

function ReasoningPanel({ logs }: ReasoningPanelProps) {
  // Show at most the last 10 entries (panel is fixed height, not scrollable)
  const visible = logs.slice(-10)

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        bgcolor: 'background.default',
      }}
    >
      {/* Title row with pulsing dot */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: '#1976d2',
            '@keyframes geo-pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.3 },
            },
            animation: 'geo-pulse 1.4s ease-in-out infinite',
          }}
        />
        <Typography variant="body1" fontWeight={600}>
          Analisi in corso
        </Typography>
      </Box>

      {/* Log entries — last 10, most recent at bottom, max-height 240px, no scroll */}
      <Box
        sx={{
          maxHeight: 240,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
        }}
      >
        {visible.map((entry, i) => {
          const isNewest = i === visible.length - 1
          const hh = entry.ts ? new Date(entry.ts).toLocaleTimeString('it-IT') : ''
          return (
            <Box
              key={`${entry.ts}-${i}`}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1,
                // Fade-in animation on the newest entry
                ...(isNewest && {
                  '@keyframes geo-fadein': {
                    from: { opacity: 0, transform: 'translateY(4px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  animation: 'geo-fadein 0.35s ease forwards',
                }),
              }}
            >
              {/* Phase bullet */}
              <Box
                sx={{
                  mt: '5px',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: phaseColor(entry.phase),
                  flexShrink: 0,
                }}
              />
              {/* Message */}
              <Typography
                variant="caption"
                sx={{
                  fontFamily: 'var(--geo-font-mono)',
                  fontSize: 'var(--geo-text-mono-sm)',
                  flex: 1,
                  lineHeight: 1.4,
                  color: 'text.primary',
                }}
              >
                {entry.message}
              </Typography>
              {/* Timestamp */}
              {hh && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{
                    fontFamily: 'var(--geo-font-mono)',
                    fontSize: 'var(--geo-text-mono-sm)',
                    flexShrink: 0,
                  }}
                >
                  {hh}
                </Typography>
              )}
            </Box>
          )
        })}
      </Box>
    </Paper>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function RunMonitorPage({ params }: RunMonitorPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
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
        // Reset stale timer — now used for socket connectivity, not polling
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
    // Poll every 15s when running/queued — socket is the fast path, polling is the safety net.
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'running' || status === 'queued' ? 15_000 : false
    },
  })

  const run = runData?.data

  // ── Socket layer — connect immediately on mount so run:done is never missed.
  // Disabled only once HTTP confirms a terminal status (done/error/cancelled).
  const TERMINAL = ['done', 'error', 'cancelled']
  const socketEnabled =
    !TERMINAL.includes(run?.status ?? '') && !!session?.accessToken

  const { connected, logs, progress, currentPhase, terminalEvent } = useRunSocket(
    runId,
    socketEnabled,
    session?.accessToken ?? undefined,
  )

  // Suppress stale-poll warning when socket is connected
  useEffect(() => {
    if (connected) setStalePollWarning(false)
  }, [connected])

  // Single refetch when socket signals the run is terminal (done/error)
  useEffect(() => {
    if (terminalEvent) {
      queryClient.invalidateQueries({ queryKey: ['run', clientKey, runId] })
    }
  }, [terminalEvent, queryClient, clientKey, runId])

  // Auto-redirect to results/overview when HTTP confirms status === 'done' (AC-017)
  // NOTE: intentionally uses only run?.status (HTTP-confirmed), NOT terminalEvent.
  // The WebSocket run:done event triggers invalidateQueries (above), which causes
  // a refetch; the redirect fires only after that refetch returns status='done'.
  // This prevents navigating to /results before the BE has committed all query data.
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

  // Resolve live counters: socket progress takes precedence over last HTTP snapshot
  const liveDoneQueries = progress?.done ?? run?.doneQueries ?? 0
  const livePlannedQueries = progress?.planned ?? run?.plannedQueries ?? 0
  const liveErrorQueries = run?.errorQueries ?? 0

  // Show reasoning panel while run is active (debug: always visible when running to confirm rendering)
  const showReasoningPanel = isRunning

  // Suppress the stale-poll warning banner while the socket is live
  const effectiveStalePollWarning = stalePollWarning && !connected

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

      {/* ── Socket debug banner (temporaneo) ── */}
      {isRunning && (
        <Alert
          severity={connected ? 'success' : 'warning'}
          sx={{ mb: 2, fontFamily: 'var(--geo-font-mono)', fontSize: '0.75rem' }}
        >
          WS: {connected ? '🟢 connesso' : '🔴 non connesso'} | log ricevuti: {logs.length} | wsUrl: {typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_WS_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'n/d') : '...'}
        </Alert>
      )}

      {/* ── Reasoning panel — socket log stream, running only ── */}
      {showReasoningPanel && (
        <ReasoningPanel logs={logs} />
      )}

      {/* ── Progress section — visible if running or queued ── */}
      {(isRunning || isQueued) && run && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Avanzamento
            {currentPhase && (
              <Typography
                component="span"
                variant="caption"
                color="text.disabled"
                sx={{ ml: 1.5, fontFamily: 'var(--geo-font-mono)' }}
              >
                [{currentPhase}]
              </Typography>
            )}
          </Typography>
          {isQueued && (
            <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
              La run inizierà automaticamente.
            </Typography>
          )}
          <RunProgressBar
            plannedQueries={livePlannedQueries}
            doneQueries={liveDoneQueries}
            errorQueries={liveErrorQueries}
            status={run.status}
            lastUpdated={lastUpdated}
            stalePollWarning={effectiveStalePollWarning}
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
