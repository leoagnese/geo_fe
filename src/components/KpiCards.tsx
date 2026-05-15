/**
 * KpiCards — three variants for the results overview panel (SC-030).
 *
 * Exports:
 *   ScoreHero        — large AI Visibility Score numeral with color band
 *   MetricChip       — single secondary metric (avg rank / link rate / mentions)
 *   SentimentBar     — three-segment horizontal bar (positive / neutral / negative)
 *
 * @spec L1_design/components/kpi-cards.md
 * @implements US-013
 * @validates AC-020, AC-021
 */
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Tooltip from '@mui/material/Tooltip'
import { geoColors, getScoreColor } from '@/lib/theme'

// ──────────────────────────────────────────────────────────────
// ScoreHero
// ──────────────────────────────────────────────────────────────

interface ScoreHeroProps {
  score: number // 0-100
  /** When true, renders the zero-data state (AC-021) */
  isZeroMentions?: boolean
}

/**
 * ScoreHero displays the AI Visibility Score [0–100] as a large numeral.
 * Color coding: high ≥70 / mid 30-69 / low <30 (color.score.* tokens).
 * Zero-data state: score shows "0" in color.score.low, label shows "N/D" variant.
 * Per kpi-cards.md §"score-hero".
 */
export function ScoreHero({ score, isZeroMentions = false }: ScoreHeroProps) {
  const scoreColor = getScoreColor(score) // color.score.high / mid / low

  return (
    <Card
      sx={{
        borderRadius: 'var(--geo-radius-lg)',   // radius.lg = 12px
        boxShadow: 'var(--geo-shadow-card)',
        bgcolor: 'background.paper',            // color.neutral.surface
        minWidth: 200,
        textAlign: 'center',
      }}
    >
      <CardContent sx={{ py: 3, px: 4 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', mb: 1, letterSpacing: '0.1em' }}
        >
          AI Visibility Score
        </Typography>

        {/* Large score numeral — text.scale.kpi (2.5rem / 700) */}
        <Typography
          component="div"
          sx={{
            fontSize: 'var(--geo-text-kpi-size)', // 2.5rem
            fontWeight: 700,
            lineHeight: 1.1,
            color: scoreColor,
          }}
        >
          {score.toFixed(1)}
        </Typography>

        {isZeroMentions && (
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            Il brand non è stato menzionato in nessuna risposta LLM per questa run.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────
// MetricChip
// ──────────────────────────────────────────────────────────────

interface MetricChipProps {
  value: string    // formatted string e.g. "#3.2", "42%", "128"
  label: string    // e.g. "Avg Rank", "Link Rate", "Menzioni"
}

/**
 * MetricChip — small card for a single secondary metric.
 * Per kpi-cards.md §"metric-chip".
 */
export function MetricChip({ value, label }: MetricChipProps) {
  return (
    <Card
      sx={{
        borderRadius: 'var(--geo-radius-md)',   // radius.md = 8px
        bgcolor: 'background.paper',            // color.neutral.surface
        border: '1px solid',
        borderColor: 'divider',                 // color.neutral.border
        boxShadow: 'none',
        minWidth: 120,
        textAlign: 'center',
      }}
    >
      <CardContent sx={{ py: 2, px: 3 }}>
        <Typography
          variant="h2"
          sx={{ fontWeight: 600, lineHeight: 1, mb: 0.5 }}
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  )
}

// ──────────────────────────────────────────────────────────────
// SentimentBar
// ──────────────────────────────────────────────────────────────

interface SentimentBarProps {
  positive: number // 0-1
  neutral: number  // 0-1
  negative: number // 0-1
}

const MIN_VISUAL_WIDTH = 8 // px — minimum segment width so 0% is still visible

/**
 * SentimentBar — three-segment horizontal bar.
 * Segment widths proportional to percentages. Min visual width: 8px.
 * Labels float above segment if segment wide enough (>32px).
 * Per kpi-cards.md §"sentiment-bar".
 */
export function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  const total = positive + neutral + negative
  const isZero = total === 0

  // Compute display widths with minimum 8px guarantee
  const toWidth = (v: number) =>
    isZero ? '33.33%' : `max(${MIN_VISUAL_WIDTH}px, ${(v / total) * 100}%)`

  const segments: Array<{ key: string; value: number; color: string; label: string }> = [
    {
      key: 'positive',
      value: positive,
      color: geoColors.sentiment.positive, // color.sentiment.positive
      label: 'Positivo',
    },
    {
      key: 'neutral',
      value: neutral,
      color: geoColors.sentiment.neutral,  // color.sentiment.neutral
      label: 'Neutro',
    },
    {
      key: 'negative',
      value: negative,
      color: geoColors.sentiment.negative, // color.sentiment.negative
      label: 'Negativo',
    },
  ]

  return (
    <Box>
      <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Sentiment
      </Typography>

      {/* Three-segment bar */}
      <Box
        sx={{
          display: 'flex',
          height: 20,
          borderRadius: 'var(--geo-radius-full)',
          overflow: 'hidden',
          bgcolor: isZero ? 'var(--geo-color-neutral-border)' : 'transparent',
        }}
      >
        {!isZero &&
          segments.map((seg) => (
            <Tooltip
              key={seg.key}
              title={`${seg.label}: ${(seg.value * 100).toFixed(0)}%`}
              arrow
            >
              <Box
                sx={{
                  width: toWidth(seg.value),
                  bgcolor: seg.color,
                  transition: 'width var(--geo-motion-base) var(--geo-motion-ease-std)',
                  cursor: 'default',
                }}
              />
            </Tooltip>
          ))}
      </Box>

      {/* Percentage labels */}
      <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
        {segments.map((seg) => (
          <Box key={seg.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: seg.color }} />
            <Typography variant="caption" color="text.secondary">
              {seg.label} {isZero ? '0%' : `${(seg.value * 100).toFixed(0)}%`}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
