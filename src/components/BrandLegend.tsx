/**
 * Legend for the competitive-landscape scatter: one swatch + name per brand.
 * Names are plain text (never coloured) — the swatch carries the identity.
 */
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { LegendItem } from '@/lib/brandScatter'

export default function BrandLegend({ items }: { items: LegendItem[] }) {
  if (items.length === 0) return null
  return (
    <Box
      component="ul"
      aria-label="Legenda brand"
      sx={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', listStyle: 'none', m: 0, p: 0, mt: 1 }}
    >
      {items.map(({ label, color }) => (
        <Box component="li" key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            data-testid={`legend-swatch-${label}`}
            sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }}
          />
          <Typography variant="caption" color="text.secondary">{label}</Typography>
        </Box>
      ))}
    </Box>
  )
}
