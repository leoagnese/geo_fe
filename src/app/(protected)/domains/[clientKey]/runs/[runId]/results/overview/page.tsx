/**
 * SC-030 — Results overview (KPI panel).
 *
 * Hero: AI Visibility Score (large numeral), avg rank, link rate, sentiment.
 * Target brand highlighted in "Focus sul target" card (AC-023).
 * Drive report links section with download CTAs (AC-026).
 * Error state if Drive upload failed (AC-027) — non-blocking.
 *
 * States:
 * - Loading: skeleton hero KPI + skeleton report links
 * - Error (data load): full-width error with retry
 * - Empty (zero visibility — AC-021): score "0" in color.score.low + explanatory caption
 * - Populated: score hero + metric chips + sentiment donut chart + drive links
 *
 * @implements US-013, US-017
 * @validates AC-020, AC-021, AC-026, AC-027
 * @spec L1_design/screen-inventory.md §"SC-030"
 * @spec L1_design/states-and-empty.md §"SC-030"
 * @spec L1_design/components/kpi-cards.md
 * @figma — (Figma file not yet created)
 */
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadIcon from '@mui/icons-material/Download'
import { PieChart } from '@mui/x-charts/PieChart'
import { ScoreHero, MetricChip } from '@/components/KpiCards'
import { getRunKpis, getRunReport } from '@/lib/api-client'
import { geoColors } from '@/lib/theme'

interface OverviewPageProps {
  params: { clientKey: string; runId: string }
}

export default function OverviewPage({ params }: OverviewPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()

  const {
    data: kpisData,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ['run-kpis', clientKey, runId],
    queryFn: () => getRunKpis(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const {
    data: reportData,
    isLoading: reportLoading,
  } = useQuery({
    queryKey: ['run-report', clientKey, runId],
    queryFn: () => getRunReport(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
    // Poll every 5 s until at least one report file is saved by the n8n Reporter.
    // Stops automatically once files arrive (or on error).
    refetchInterval: (query) => {
      const files = query.state.data?.data?.files
      return !files || files.length === 0 ? 5_000 : false
    },
  })

  const kpis = kpisData?.data
  const report = reportData?.data
  const isZeroMentions = kpis !== undefined && kpis.totalMentions === 0

  // Sentiment donut chart data — values are 0-100 for display
  const sentimentPieData = kpis
    ? [
        {
          id: 'positive',
          value: parseFloat((kpis.sentimentPositive * 100).toFixed(1)),
          label: `Positivo ${(kpis.sentimentPositive * 100).toFixed(0)}%`,
          color: geoColors.sentiment.positive, // color.sentiment.positive → #388E3C
        },
        {
          id: 'neutral',
          value: parseFloat((kpis.sentimentNeutral * 100).toFixed(1)),
          label: `Neutro ${(kpis.sentimentNeutral * 100).toFixed(0)}%`,
          color: geoColors.sentiment.neutral, // color.sentiment.neutral → #757575
        },
        {
          id: 'negative',
          value: parseFloat((kpis.sentimentNegative * 100).toFixed(1)),
          label: `Negativo ${(kpis.sentimentNegative * 100).toFixed(0)}%`,
          color: geoColors.sentiment.negative, // color.sentiment.negative → #D32F2F
        },
      ]
    : []

  return (
    <Box>
      {/* ── Error state: KPI load failure ── */}
      {kpisError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetchKpis()}>
              Riprova
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Impossibile caricare i risultati. Riprova.
        </Alert>
      )}

      {/* ── Loading state: skeleton hero ── */}
      {kpisLoading && (
        <Box>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 4 }}>
            <Skeleton variant="rounded" width={200} height={140} />
            <Skeleton variant="rounded" width={130} height={140} />
            <Skeleton variant="rounded" width={130} height={140} />
            <Skeleton variant="rounded" width={130} height={140} />
          </Box>
          <Skeleton variant="rounded" height={220} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" width="40%" height={36} />
          <Skeleton variant="rounded" width="40%" height={36} sx={{ mt: 1 }} />
        </Box>
      )}

      {/* ── Populated / zero-visibility state ── */}
      {kpis && (
        <Box>
          {/* Zero-visibility state explanatory caption (AC-021) */}
          {isZeroMentions && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Il brand non è stato menzionato in nessuna risposta LLM per questa run. Visibilità AI: 0.
            </Alert>
          )}

          {/* ── KPI hero row ── */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'stretch', mb: 4 }}>
            {/* AI Visibility Score — text.scale.kpi, color.score.* */}
            <ScoreHero score={kpis.aiVisibilityScore} isZeroMentions={isZeroMentions} />

            {/* Metric chips — avg rank, link rate, mentions */}
            <MetricChip
              value={kpis.avgRankPosition !== null ? `#${kpis.avgRankPosition.toFixed(1)}` : 'N/D'}
              label="Avg Rank"
            />
            <MetricChip
              value={`${(kpis.linkRate * 100).toFixed(0)}%`}
              label="Link Rate"
            />
            <MetricChip
              value={String(kpis.totalMentions)}
              label="Menzioni totali"
            />
          </Box>

          {/* ── Sentiment section: donut chart + text summary ── */}
          {/* Zero-state: skip chart entirely, only the alert above communicates the empty state */}
          {!isZeroMentions && (
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Sentiment
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    gap: 4,
                  }}
                >
                  {/* Left: PieChart donut — innerRadius 50, outerRadius 90, height 220px */}
                  <Box sx={{ flexShrink: 0 }}>
                    <PieChart
                      series={[
                        {
                          data: sentimentPieData,
                          innerRadius: 50,
                          outerRadius: 90,
                          paddingAngle: 2,
                          cornerRadius: 3,
                          highlightScope: { fade: 'global', highlight: 'item' },
                        },
                      ]}
                      width={260}
                      height={220}
                    />
                  </Box>

                  {/* Right: stacked text summary */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      Brand menzionato in{' '}
                      <Box component="span" fontWeight={700} color="text.primary">
                        {kpis.totalMentions}
                      </Box>
                      {' '}/{' '}
                      <Box component="span" fontWeight={700} color="text.primary">
                        {kpis.totalQueries}
                      </Box>{' '}
                      query
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                      {/* Positivo */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.positive, // color.sentiment.positive
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Positivo:{' '}
                          <Box component="span" fontWeight={700} sx={{ color: geoColors.sentiment.positive }}>
                            {(kpis.sentimentPositive * 100).toFixed(0)}%
                          </Box>
                        </Typography>
                      </Box>

                      {/* Neutro */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.neutral, // color.sentiment.neutral
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Neutro:{' '}
                          <Box component="span" fontWeight={700} sx={{ color: geoColors.sentiment.neutral }}>
                            {(kpis.sentimentNeutral * 100).toFixed(0)}%
                          </Box>
                        </Typography>
                      </Box>

                      {/* Negativo */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.negative, // color.sentiment.negative
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          Negativo:{' '}
                          <Box component="span" fontWeight={700} sx={{ color: geoColors.sentiment.negative }}>
                            {(kpis.sentimentNegative * 100).toFixed(0)}%
                          </Box>
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* ── Focus sul target card (AC-023) ── */}
          <Card sx={{ mb: 4, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Focus sul target
              </Typography>
              <Typography variant="h3" gutterBottom>
                {kpis.targetBrand}
              </Typography>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <Box>
                  <Typography variant="caption" color="text.disabled">AI Visibility Score</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {kpis.aiVisibilityScore.toFixed(1)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">Avg Rank</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {kpis.avgRankPosition !== null ? `#${kpis.avgRankPosition.toFixed(1)}` : 'N/D'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">Link Rate</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {(kpis.linkRate * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled">Menzioni</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700 }}>
                    {kpis.totalMentions}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Drive report section (AC-026, AC-027) ── */}
      <Box>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Report
        </Typography>

        {/* Drive upload error state (AC-027) — non-blocking, KPI still visible */}
        {report?.uploadError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Report non disponibile: {report.uploadError}
          </Alert>
        )}

        {/* Loading skeleton */}
        {reportLoading && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" width={160} height={44} />
            <Skeleton variant="rounded" width={160} height={44} />
          </Box>
        )}

        {/* Download CTAs */}
        {report && !report.uploadError && report.files.length > 0 && (
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            {report.files.map((file) => (
              <Button
                key={file.type}
                variant="outlined"
                startIcon={<DownloadIcon />}
                href={file.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Scarica .{file.type}
              </Button>
            ))}
          </Box>
        )}

        {/* Generating — poll in progress */}
        {(!report || report.files.length === 0) && !report?.uploadError && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CircularProgress size={16} thickness={5} />
            <Typography variant="body2" color="text.secondary">
              Report in generazione, disponibile a breve…
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
