/**
 * SC-030 — Riepilogo risultati run.
 *
 * 4 KPI cards orizzontali (Total Brands, Top Brand, Share of Voice, Avg Sentiment),
 * poi donut chart sentiment, poi sezione Report con link Drive.
 *
 * States:
 * - Loading: skeleton grid 4 cards + skeleton chart + skeleton report
 * - Error (data load): full-width error con retry
 * - Empty (zero visibility — AC-021): score "0" con alert
 * - Populated: KPI grid + sentiment donut + drive links
 *
 * @implements US-013, US-017
 * @validates AC-020, AC-021, AC-026, AC-027
 * @spec L1_design/screen-inventory.md §"SC-030"
 * @spec L1_design/states-and-empty.md §"SC-030"
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
import { getRunKpis, getRunReport, getRunRanking } from '@/lib/api-client'
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
    refetchInterval: (query) => {
      const kpis = query.state.data?.data
      if (!kpis) return false
      return kpis.totalQueries === 0 ? 4_000 : false
    },
    refetchIntervalInBackground: false,
    retry: 5,
  })

  const {
    data: rankingData,
  } = useQuery({
    queryKey: ['run-ranking-total', clientKey, runId],
    queryFn: () => getRunRanking(session?.accessToken ?? '', clientKey, runId, 1, 1),
    enabled: !!session?.accessToken,
  })

  const {
    data: reportData,
    isLoading: reportLoading,
  } = useQuery({
    queryKey: ['run-report', clientKey, runId],
    queryFn: () => getRunReport(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
    refetchInterval: (query) => {
      const files = query.state.data?.data?.files
      return !files || files.length === 0 ? 5_000 : false
    },
  })

  const kpis = kpisData?.data
  const report = reportData?.data
  const totalBrands = rankingData?.meta?.total ?? 0

  const isDataPending = kpis !== undefined && kpis.totalQueries === 0
  const isZeroMentions = kpis !== undefined && !isDataPending && kpis.totalMentions === 0

  const sentimentPieData = kpis
    ? [
        {
          id: 'positive',
          value: parseFloat((kpis.sentimentPositive * 100).toFixed(1)),
          label: `Positivo ${(kpis.sentimentPositive * 100).toFixed(0)}%`,
          color: geoColors.sentiment.positive,
        },
        {
          id: 'neutral',
          value: parseFloat((kpis.sentimentNeutral * 100).toFixed(1)),
          label: `Neutro ${(kpis.sentimentNeutral * 100).toFixed(0)}%`,
          color: geoColors.sentiment.neutral,
        },
        {
          id: 'negative',
          value: parseFloat((kpis.sentimentNegative * 100).toFixed(1)),
          label: `Negativo ${(kpis.sentimentNegative * 100).toFixed(0)}%`,
          color: geoColors.sentiment.negative,
        },
      ]
    : []

  return (
    <Box>
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

      {kpisLoading && (
        <Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 4,
            }}
          >
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
            <Skeleton variant="rounded" height={100} />
          </Box>
          <Skeleton variant="rounded" height={220} sx={{ mb: 3 }} />
          <Skeleton variant="rounded" width="40%" height={36} />
          <Skeleton variant="rounded" width="40%" height={36} sx={{ mt: 1 }} />
        </Box>
      )}

      {kpis && (
        <Box>
          {isDataPending && (
            <Alert severity="info" sx={{ mb: 3 }} icon={<CircularProgress size={18} thickness={5} />}>
              Dati in finalizzazione, aggiornamento in corso…
            </Alert>
          )}

          {isZeroMentions && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              Il brand non è stato menzionato in nessuna risposta LLM per questa run. Visibilità AI: 0.
            </Alert>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mb: 4,
            }}
          >
            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Total Brands Identified
              </Typography>
              <Typography variant="h2" fontWeight={700} sx={{ fontSize: '1.75rem' }}>
                {totalBrands}
              </Typography>
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Top Brand
              </Typography>
              <Typography variant="h2" fontWeight={700} sx={{ fontSize: '1.25rem' }}>
                {kpis.targetBrand ?? '—'}
              </Typography>
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Target Share of Voice
              </Typography>
              <Typography variant="h2" fontWeight={700} sx={{ fontSize: '1.75rem' }}>
                {kpis.aiVisibilityScore != null ? `${kpis.aiVisibilityScore.toFixed(1)}%` : '—'}
              </Typography>
            </Card>

            <Card sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Avg Sentiment Score
              </Typography>
              <Typography variant="h2" fontWeight={700} sx={{ fontSize: '1.75rem' }}>
                {kpis.sentimentPositive != null
                  ? `${(kpis.sentimentPositive * 10).toFixed(1)} / 10`
                  : '—'}
              </Typography>
            </Card>
          </Box>

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
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.positive,
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

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.neutral,
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

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: geoColors.sentiment.negative,
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
        </Box>
      )}

      <Box>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Report
        </Typography>

        {report?.uploadError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Report non disponibile: {report.uploadError}
          </Alert>
        )}

        {reportLoading && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" width={160} height={44} />
            <Skeleton variant="rounded" width={160} height={44} />
          </Box>
        )}

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
