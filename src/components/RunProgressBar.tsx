/**
 * RunProgressBar — visual progress indicator for an active run.
 *
 * Shows plannedQueries / doneQueries / errorQueries as a LinearProgress bar
 * plus three counter blocks (Pianificate / Completate / Errori).
 *
 * Color transitions from color.status.running (blue) to color.status.done (green)
 * when doneQueries === plannedQueries (completion).
 *
 * @spec L1_design/components/run-progress.md §"progress-bar" §"counter-block"
 * @implements US-009, US-018
 * @validates AC-016, AC-017, AC-028
 */
import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'
import { geoColors } from '@/lib/theme'
import type { RunStatus } from '@/lib/api-client'

interface RunProgressBarProps {
  plannedQueries: number
  doneQueries: number
  errorQueries: number
  status: RunStatus
  lastUpdated?: Date | null
  stalePollWarning?: boolean
}

export default function RunProgressBar({
  plannedQueries,
  doneQueries,
  errorQueries,
  status,
  lastUpdated,
  stalePollWarning = false,
}: RunProgressBarProps) {
  const pct = plannedQueries > 0 ? Math.round((doneQueries / plannedQueries) * 100) : 0
  const isDone = status === 'done'

  // color.status.running → color.status.done on completion
  const barColor = isDone ? geoColors.status.done : geoColors.status.running

  return (
    <Box sx={{ width: '100%' }}>
      {/* Stale data warning (OQ-DESIGN-006: >30s without update) */}
      {stalePollWarning && (
        <Box
          sx={{
            mb: 1,
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

      {/* Progress bar — height 8px, radius.full, motion.slow transition */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            flex: 1,
            height: 8,
            borderRadius: 'var(--geo-radius-full)',
            bgcolor: 'var(--geo-color-neutral-border)', // track: color.neutral.border
            '& .MuiLinearProgress-bar': {
              bgcolor: barColor,
              borderRadius: 'var(--geo-radius-full)',
              transition: `background-color var(--geo-motion-slow) var(--geo-motion-ease-std),
                          transform var(--geo-motion-slow) var(--geo-motion-ease-std)`,
            },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ minWidth: 36, textAlign: 'right' }}
        >
          {pct}%
        </Typography>
      </Box>

      {/* Counter blocks — three side-by-side blocks per run-progress.md */}
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Pianificate — color.neutral.text.secondary */}
        <Box>
          <Typography
            variant="h2"
            sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}
          >
            {plannedQueries}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Pianificate
          </Typography>
        </Box>

        {/* Completate — color.status.done */}
        <Box>
          <Typography
            variant="h2"
            sx={{ color: geoColors.status.done, fontWeight: 700, lineHeight: 1 }}
          >
            {doneQueries}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Completate
          </Typography>
        </Box>

        {/* Errori — color.status.error */}
        <Box>
          <Typography
            variant="h2"
            sx={{ color: geoColors.status.error, fontWeight: 700, lineHeight: 1 }}
          >
            {errorQueries}
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Errori
          </Typography>
        </Box>
      </Box>

      {/* Last-updated timestamp */}
      {lastUpdated && (
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ display: 'block', mt: 0.5 }}
        >
          Ultimo aggiornamento: {lastUpdated.toLocaleTimeString('it-IT')}
        </Typography>
      )}
    </Box>
  )
}
