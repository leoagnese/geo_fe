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
 * - Populated: score hero + metric chips + sentiment bar + drive links
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
import DownloadIcon from '@mui/icons-material/Download'
import { ScoreHero, MetricChip, SentimentBar } from '@/components/KpiCards'
import { getRunKpis, getRunReport } from '@/lib/api-client'

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
  })

  const kpis = kpisData?.data
  const report = reportData?.data
  const isZeroMentions = kpis !== undefined && kpis.totalMentions === 0

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
          <Skeleton variant="rounded" height={60} sx={{ mb: 3 }} />
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

          {/* ── Sentiment bar ── */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <SentimentBar
                positive={kpis.sentimentPositive}
                neutral={kpis.sentimentNeutral}
                negative={kpis.sentimentNegative}
              />
            </CardContent>
          </Card>

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

        {/* No files yet */}
        {report && !report.uploadError && report.files.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Report non ancora disponibile.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
