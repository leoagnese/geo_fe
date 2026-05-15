/**
 * StatusChip — displays a run status with semantic color and optional pulse animation.
 *
 * Variants: queued | running | done | error | cancelled
 * The `running` variant includes a pulsing dot indicator (motion.animation.pulse).
 * Labels are always in Italian per components/status-chips.md.
 *
 * @spec L1_design/components/status-chips.md
 * @implements US-006, US-009, US-011, US-024
 */
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import { geoColors } from '@/lib/theme'
import type { RunStatus } from '@/lib/api-client'

interface StatusChipProps {
  status: RunStatus
  size?: 'small' | 'medium'
}

const STATUS_CONFIG: Record<
  RunStatus,
  { label: string; color: string; bgOpacity: number }
> = {
  queued: {
    label: 'In coda',
    color: geoColors.status.queued,    // color.status.queued
    bgOpacity: 0.10,
  },
  running: {
    label: 'In esecuzione',
    color: geoColors.status.running,   // color.status.running
    bgOpacity: 0.10,
  },
  done: {
    label: 'Completata',
    color: geoColors.status.done,      // color.status.done
    bgOpacity: 0.10,
  },
  error: {
    label: 'Errore',
    color: geoColors.status.error,     // color.status.error
    bgOpacity: 0.10,
  },
  cancelled: {
    label: 'Annullata',
    color: geoColors.status.cancelled, // color.status.cancelled
    bgOpacity: 0.10,
  },
}

/**
 * Hex color → rgba with given alpha.
 * Used to build the 10%-opacity chip background from the status color token.
 */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Hex color → rgba with given alpha for border (30% opacity per status-chips.md).
 */
function borderColor(hex: string): string {
  return hexToRgba(hex, 0.30)
}

export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  const cfg = STATUS_CONFIG[status]

  const isRunning = status === 'running'

  const label = isRunning ? (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      {/* Pulsing dot — motion.animation.pulse (1.4s ease-in-out infinite) */}
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor: cfg.color,
          animation: 'pulse 1.4s ease-in-out infinite', // --geo-motion-pulse
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </Box>
  ) : (
    cfg.label
  )

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        // pill shape: radius.full
        borderRadius: '9999px',
        height: 24,
        fontSize: '0.75rem',          // text.scale.caption
        fontWeight: 600,
        px: 1,                        // spacing.1 horizontal
        color: cfg.color,
        bgcolor: hexToRgba(cfg.color, cfg.bgOpacity),
        border: `1px solid ${borderColor(cfg.color)}`,
        '& .MuiChip-label': {
          px: 0,
          display: 'flex',
          alignItems: 'center',
        },
      }}
    />
  )
}
