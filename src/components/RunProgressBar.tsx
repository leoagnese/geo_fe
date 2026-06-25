/**
 * RunProgressBar — prediction-weighted progress indicator.
 *
 * Live mode: uses RunProgressState from useRunProgress (node-weighted %).
 * Terminal mode: shows frozen counters for done/cancelled/error runs.
 *
 * @spec L1_design/components/run-progress.md
 * @implements US-009, US-018
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import { geoColors } from '@/lib/theme'
import type { RunStatus } from '@/lib/api-client'
import type { RunProgressState } from '@/hooks/useRunProgress'
import type { RunPrediction } from '@/lib/runPrediction'

// ── helpers ────────────────────────────────────────────────────

function fmtEta(seconds: number): string {
  if (seconds < 60) return `< 1 min`
  const m = Math.round(seconds / 60)
  if (m < 60) return `~${m} min`
  const h = Math.floor(m / 60)
  const rem = m % 60
  return rem > 0 ? `~${h}h ${rem}min` : `~${h}h`
}

// ── Shared bar track ───────────────────────────────────────────

interface BarTrackProps {
  pct: number
  color: string
  showMarkers?: boolean
  prediction?: RunPrediction
}

function BarTrack({ pct, color }: BarTrackProps) {
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: 10,
        borderRadius: '9999px',
        bgcolor: 'var(--geo-color-neutral-border)',
        overflow: 'hidden',
      }}
    >
      {/* explicit top/left/height avoids conflict between inset:0 and width:X% */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: `${pct}%`,
          bgcolor: color,
          borderRadius: '9999px',
          transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1), background-color 0.4s ease',
        }}
      />
    </Box>
  )
}

// We need the markers outside the overflow:hidden container
interface BarWithMarkersProps extends BarTrackProps {
  prediction: RunPrediction
}

function BarWithMarkers({ pct, color, prediction }: BarWithMarkersProps) {
  const qgenEnd  = prediction.qgenWeight * 100
  const auditEnd = (prediction.qgenWeight + prediction.auditWeight) * 100

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <BarTrack pct={pct} color={color} />

      {/* Phase boundary: qgen → audit */}
      {qgenEnd > 0 && qgenEnd < 99 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${qgenEnd}%`,
            width: 1,
            bgcolor: 'background.paper',
            opacity: 0.6,
            zIndex: 2,
          }}
        />
      )}

      {/* Phase boundary: audit → finalize */}
      {auditEnd > 0 && auditEnd < 99 && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${auditEnd}%`,
            width: 1,
            bgcolor: 'background.paper',
            opacity: 0.6,
            zIndex: 2,
          }}
        />
      )}
    </Box>
  )
}

// ── Phase colors ───────────────────────────────────────────────

function phaseColor(phase: RunProgressState['phase']): string {
  if (phase === 'finalizing') return geoColors.status.done
  return geoColors.status.running
}

// ── Live bar (running/queued) ──────────────────────────────────

interface LiveProgressBarProps {
  progressState: RunProgressState
  prediction:    RunPrediction
  lastUpdated?:  Date | null
  stalePollWarning?: boolean
}

function LiveProgressBar({
  progressState,
  prediction,
  lastUpdated,
  stalePollWarning,
}: LiveProgressBarProps) {
  const {
    overallPct, phase, phaseLabel,
    qgenDone, qgenPlanned,
    auditDone, auditPlanned, auditErrors,
    velocity, etaSeconds,
  } = progressState

  const barColor = phaseColor(phase)

  return (
    <Box sx={{ width: '100%' }}>
      {stalePollWarning && (
        <Box
          sx={{
            mb: 1.5,
            px: 1.5,
            py: 0.5,
            bgcolor: 'warning.light',
            borderRadius: 'var(--geo-radius-sm)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <Typography variant="caption" color="warning.dark">
            Aggiornamento sospeso — connessione assente
          </Typography>
        </Box>
      )}

      {/* Header row: phase badge + percentage */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {phase !== 'idle' && (
            <>
              {/* Pulsing dot */}
              <Box
                sx={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  bgcolor: barColor,
                  '@keyframes geo-pulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%':      { opacity: 0.4, transform: 'scale(0.85)' },
                  },
                  animation: 'geo-pulse 1.4s ease-in-out infinite',
                  flexShrink: 0,
                }}
              />
              <Typography variant="body2" fontWeight={600} color="text.primary">
                {phaseLabel}
              </Typography>
            </>
          )}
        </Box>
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          {overallPct}%
        </Typography>
      </Box>

      {/* Progress bar with phase markers */}
      <BarWithMarkers pct={overallPct} color={barColor} prediction={prediction} />

      {/* Phase legend below bar */}
      <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2, flexWrap: 'wrap' }}>
        {/* Qgen counter */}
        {qgenPlanned > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: 1,
                bgcolor: qgenDone >= qgenPlanned ? geoColors.status.done : geoColors.status.running,
                opacity: 0.75,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {qgenDone}/{qgenPlanned} domande{qgenDone >= qgenPlanned ? ' ✓' : ''}
            </Typography>
          </Box>
        )}

        {/* Audit counter */}
        {auditPlanned > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: 1,
                bgcolor: geoColors.status.running,
                opacity: 0.75,
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {auditDone}/{auditPlanned} query
            </Typography>
            {auditErrors > 0 && (
              <Typography variant="caption" sx={{ color: geoColors.status.error }}>
                · {auditErrors} err
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* ETA + velocity row */}
      {(etaSeconds !== null || velocity > 0) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 0.75,
            px: 1.5,
            borderRadius: 'var(--geo-radius-sm)',
            bgcolor: 'background.default',
            mb: 1.5,
          }}
        >
          {etaSeconds !== null && (
            <Typography variant="caption" color="text.secondary">
              ⏱ {fmtEta(etaSeconds)} rimanenti
            </Typography>
          )}
          {velocity > 0 && (
            <Typography variant="caption" color="text.disabled">
              {velocity.toFixed(1)} query/min
            </Typography>
          )}
        </Box>
      )}

      {lastUpdated && (
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
          Aggiornato: {lastUpdated.toLocaleTimeString('it-IT')}
        </Typography>
      )}
    </Box>
  )
}

// ── Frozen bar (done / error / cancelled) ──────────────────────

interface FrozenProgressBarProps {
  plannedQueries: number
  doneQueries:    number
  errorQueries:   number
  status:         RunStatus
}

function FrozenProgressBar({ plannedQueries, doneQueries, errorQueries, status }: FrozenProgressBarProps) {
  const pct = plannedQueries > 0 ? Math.round((doneQueries / plannedQueries) * 100) : 0
  const barColor = status === 'done' ? geoColors.status.done : geoColors.status.error

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <BarTrack pct={status === 'done' ? 100 : pct} color={barColor} />
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>
          {status === 'done' ? '100%' : `${pct}%`}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 3 }}>
        <Box>
          <Typography variant="h2" sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
            {plannedQueries}
          </Typography>
          <Typography variant="caption" color="text.disabled">Pianificate</Typography>
        </Box>
        <Box>
          <Typography variant="h2" sx={{ color: geoColors.status.done, fontWeight: 700, lineHeight: 1 }}>
            {doneQueries}
          </Typography>
          <Typography variant="caption" color="text.disabled">Completate</Typography>
        </Box>
        {errorQueries > 0 && (
          <Box>
            <Typography variant="h2" sx={{ color: geoColors.status.error, fontWeight: 700, lineHeight: 1 }}>
              {errorQueries}
            </Typography>
            <Typography variant="caption" color="text.disabled">Errori</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

// ── Public component ───────────────────────────────────────────

interface RunProgressBarLiveProps {
  live:              true
  progressState:     RunProgressState
  prediction:        RunPrediction
  status:            RunStatus
  lastUpdated?:      Date | null
  stalePollWarning?: boolean
}

interface RunProgressBarFrozenProps {
  live:           false
  plannedQueries: number
  doneQueries:    number
  errorQueries:   number
  status:         RunStatus
}

type RunProgressBarProps = RunProgressBarLiveProps | RunProgressBarFrozenProps

export default function RunProgressBar(props: RunProgressBarProps) {
  if (props.live) {
    return (
      <LiveProgressBar
        progressState={props.progressState}
        prediction={props.prediction}
        lastUpdated={props.lastUpdated}
        stalePollWarning={props.stalePollWarning}
      />
    )
  }
  return (
    <FrozenProgressBar
      plannedQueries={props.plannedQueries}
      doneQueries={props.doneQueries}
      errorQueries={props.errorQueries}
      status={props.status}
    />
  )
}
