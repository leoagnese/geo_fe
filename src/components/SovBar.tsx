import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

interface SovEntry {
  label: string
  percentage: number   // 0-100
  isTarget?: boolean   // true → orange bar, false → gray
  delta?: string       // e.g. "+4.2% GROWTH" or "-1.5% LOSS" or "STABLE"
  deltaPositive?: boolean
}

interface SovBarProps {
  entries: SovEntry[]
}

/**
 * SovBar — Share of Voice comparison bars.
 * Target brand: orange (#ec5b13). Competitors: gray (#94a3b8).
 * Matches the "Competitor Share Shift (SOV)" panel in the Run Comparison mockup (screen6).
 */
export default function SovBar({ entries }: SovBarProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {entries.map((entry) => (
        <Box key={entry.label}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography
              sx={{
                fontSize: '0.6875rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: entry.isTarget ? 'text.primary' : 'text.secondary',
              }}
            >
              {entry.label}
            </Typography>
            {entry.delta && (
              <Typography
                sx={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: entry.deltaPositive === true
                    ? 'success.main'
                    : entry.deltaPositive === false
                    ? 'error.main'
                    : 'text.disabled',
                }}
              >
                {entry.delta}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              height: 8,
              bgcolor: '#f1f5f9',
              borderRadius: 'var(--geo-radius-full)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${Math.min(100, entry.percentage)}%`,
                bgcolor: entry.isTarget ? 'primary.main' : '#94a3b8',
                borderRadius: 'var(--geo-radius-full)',
                transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
            <Typography variant="caption" color="text.disabled">0%</Typography>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: entry.isTarget ? 'text.primary' : 'text.secondary' }}
            >
              {entry.percentage.toFixed(1)}%
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  )
}
