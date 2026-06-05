import Chip from '@mui/material/Chip'

export type SeverityLevel = 'critical' | 'high-risk' | 'monitoring'
export type PerformanceLevel = 'leading' | 'competitive' | 'rising' | 'stable'
export type BadgeVariant = SeverityLevel | PerformanceLevel

const CONFIG: Record<BadgeVariant, { label: string; bgcolor: string; color: string }> = {
  critical:     { label: 'CRITICO',      bgcolor: '#fef2f2', color: '#dc2626' },
  'high-risk':  { label: 'ALTO RISCHIO', bgcolor: '#fff7ed', color: '#ea580c' },
  monitoring:   { label: 'MONITORAGGIO', bgcolor: '#f1f5f9', color: '#475569' },
  leading:      { label: 'Leader',       bgcolor: '#f0fdf4', color: '#16a34a' },
  competitive:  { label: 'Competitivo',  bgcolor: '#fffbeb', color: '#d97706' },
  rising:       { label: 'In crescita',  bgcolor: '#eff6ff', color: '#2563eb' },
  stable:       { label: 'Stabile',      bgcolor: '#f1f5f9', color: '#475569' },
}

interface StatusBadgeProps {
  variant: BadgeVariant
  size?: 'small' | 'medium'
}

/**
 * StatusBadge — severity / performance chip.
 * Variants: critical | high-risk | monitoring | leading | competitive | rising | stable.
 * Used in Underperforming Keywords table and Top Keywords table.
 */
export default function StatusBadge({ variant, size = 'small' }: StatusBadgeProps) {
  const cfg = CONFIG[variant]
  return (
    <Chip
      label={cfg.label}
      size={size}
      sx={{
        bgcolor: cfg.bgcolor,
        color: cfg.color,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.625rem' : '0.75rem',
        height: size === 'small' ? 20 : 24,
        borderRadius: 'var(--geo-radius-sm)',
        '& .MuiChip-label': { px: 1 },
      }}
    />
  )
}
