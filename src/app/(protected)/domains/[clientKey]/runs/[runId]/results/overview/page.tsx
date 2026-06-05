/**
 * SC-030 — Run Results Summary (Summary tab).
 *
 * Layout:
 *   1. 4 KPI stat cards: LLM Provider | Locales | Keywords | Avg Visibility
 *   2. Two-column: Visibility vs Avg Rank scatter | Top 5 Brands SOV list
 *   3. Top Performing Keywords table
 *
 * @implements US-013, US-017
 * @validates AC-020, AC-021, AC-026, AC-027
 */
'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import CircularProgress from '@mui/material/CircularProgress'
import FilterListIcon from '@mui/icons-material/FilterList'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import LanguageIcon from '@mui/icons-material/Language'
import VpnKeyIcon from '@mui/icons-material/VpnKey'
import { ScatterChart } from '@mui/x-charts/ScatterChart'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import type { BadgeVariant } from '@/components/StatusBadge'
import {
  getRunKpis,
  getRunRanking,
  getRunKeywords,
  getRun,
} from '@/lib/api-client'
import type { KeywordBreakdownRow } from '@/lib/api-client'
import { geoColors } from '@/lib/theme'

interface OverviewPageProps {
  params: { clientKey: string; runId: string }
}

// Derive keyword performance badge from visibility percentage
// visibilityPct is 0-1 from API (BE stores 0-100, converts /10000 before response)
function kwBadge(visibilityPct: number): BadgeVariant {
  if (visibilityPct >= 0.6) return 'leading'
  if (visibilityPct >= 0.4) return 'competitive'
  if (visibilityPct >= 0.2) return 'rising'
  return 'stable'
}

// ── Mini sparkline (static, visual-only) ──────────────────────
function MiniTrend({ positive }: { positive: boolean }) {
  const color = positive ? geoColors.sentiment.positive : geoColors.sentiment.negative
  return (
    <svg width="60" height="24" viewBox="0 0 60 24">
      {positive ? (
        <polyline
          points="0,20 15,16 30,14 45,10 60,4"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <polyline
          points="0,4 15,8 30,12 45,16 60,20"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

// ── SOV bar row ────────────────────────────────────────────────
function SovRow({
  label,
  percentage,
  isTarget,
  maxPct,
}: {
  label: string
  percentage: number
  isTarget?: boolean
  maxPct: number
}) {
  const barWidth = maxPct > 0 ? (percentage / maxPct) * 100 : 0
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography
        variant="body2"
        sx={{
          minWidth: 140,
          fontWeight: isTarget ? 700 : 400,
          color: isTarget ? 'text.primary' : 'text.secondary',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {label}{isTarget ? ' (Tu)' : ''}
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 8,
          bgcolor: '#f1f5f9',
          borderRadius: 'var(--geo-radius-full)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${barWidth}%`,
            bgcolor: isTarget ? 'primary.main' : '#94a3b8',
            borderRadius: 'var(--geo-radius-full)',
            transition: 'width 500ms cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </Box>
      <Typography
        variant="body2"
        sx={{
          minWidth: 42,
          textAlign: 'right',
          fontWeight: 600,
          color: isTarget ? 'primary.main' : 'text.secondary',
        }}
      >
        {percentage.toFixed(1)}%
      </Typography>
    </Box>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function OverviewPage({ params }: OverviewPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const router = useRouter()

  const { data: runData } = useQuery({
    queryKey: ['run', clientKey, runId],
    queryFn: () => getRun(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const {
    data: kpisData,
    isLoading: kpisLoading,
    isError: kpisError,
    refetch: refetchKpis,
  } = useQuery({
    queryKey: ['run-kpis', clientKey, runId],
    queryFn: () => getRunKpis(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
    refetchInterval: (q) => (q.state.data?.data?.totalQueries === 0 ? 4_000 : false),
    retry: 5,
  })

  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ['run-ranking', clientKey, runId],
    queryFn: () => getRunRanking(session?.accessToken ?? '', clientKey, runId, 1, 10),
    enabled: !!session?.accessToken,
  })

  const { data: keywordsData, isLoading: kwLoading } = useQuery({
    queryKey: ['run-keywords', clientKey, runId],
    queryFn: () => getRunKeywords(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const kpis = kpisData?.data
  const run = runData?.data
  const ranking = rankingData?.data
  const keywords: KeywordBreakdownRow[] = keywordsData?.data ?? []

  const isDataPending = kpis !== undefined && kpis.totalQueries === 0
  const isZeroMentions = kpis !== undefined && !isDataPending && kpis.totalMentions === 0

  // Top 5 keywords by visibility
  const topKeywords = useMemo(
    () => [...keywords].sort((a, b) => b.visibilityPct - a.visibilityPct).slice(0, 5),
    [keywords],
  )

  // SOV list: targetBrand + top competitors
  const sovEntries = useMemo(() => {
    if (!ranking || !ranking.targetBrandRow) return []
    const target = {
      label: ranking.targetBrandRow.brand,
      percentage: ranking.targetBrandRow.aiVisibilityScore,
      isTarget: true,
    }
    const comps = (ranking.competitors ?? []).slice(0, 4).map((c) => ({
      label: c.brand,
      percentage: c.aiVisibilityScore,
      isTarget: false,
    }))
    return [target, ...comps]
  }, [ranking])

  const maxSov = useMemo(
    () => Math.max(...sovEntries.map((e) => e.percentage), 1),
    [sovEntries],
  )

  // Scatter chart data: target + competitors
  const scatterData = useMemo(() => {
    if (!ranking || !ranking.targetBrandRow) return { target: [], competitors: [] }
    const t = ranking.targetBrandRow
    return {
      target: t.avgRankPosition != null
        ? [{ x: t.avgRankPosition, y: parseFloat((t.aiVisibilityScore).toFixed(1)), id: t.brand }]
        : [],
      competitors: (ranking.competitors ?? [])
        .filter((c) => c.avgRankPosition != null)
        .map((c) => ({
          x: c.avgRankPosition!,
          y: parseFloat((c.aiVisibilityScore).toFixed(1)),
          id: c.brand,
        })),
    }
  }, [ranking])

  // KPI values from run + kpis
  const localesLabel = run?.locales?.join(', ') ?? '—'
  const visibilityLabel = kpis ? `${kpis.aiVisibilityScore.toFixed(1)}%` : '—'
  const kwCount = keywords.length
  const providerLabel = run?.profileKey ?? '—'

  return (
    <Box>
      {kpisError && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void refetchKpis()}>Riprova</Button>}
          sx={{ mb: 3 }}
        >
          Impossibile caricare i risultati.
        </Alert>
      )}

      {isDataPending && (
        <Alert severity="info" sx={{ mb: 3 }} icon={<CircularProgress size={18} thickness={5} />}>
          Dati in finalizzazione, aggiornamento in corso…
        </Alert>
      )}

      {isZeroMentions && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Il brand non è stato menzionato in nessuna risposta LLM per questa run.
        </Alert>
      )}

      {/* ── 4 KPI cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        {kpisLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 2 }} />
            ))
          : (
            <>
              <StatCard
                label="LLM Provider"
                value={kpisLoading ? '—' : providerLabel}
                icon={<SmartToyIcon sx={{ fontSize: '1.5rem', color: '#3b82f6' }} />}
                sx={{ bgcolor: '#eff6ff' }}
              />
              <StatCard
                label="Lingue"
                value={kpisLoading ? '—' : localesLabel}
                icon={<LanguageIcon sx={{ fontSize: '1.5rem', color: '#16a34a' }} />}
                sx={{ bgcolor: '#f0fdf4' }}
              />
              <StatCard
                label="Keywords"
                value={kwLoading ? '—' : `${kwCount} gestite`}
                icon={<VpnKeyIcon sx={{ fontSize: '1.5rem', color: '#d97706' }} />}
                sx={{ bgcolor: '#fffbeb' }}
              />
              <StatCard
                label="Visibilità media"
                value={kpisLoading ? '—' : visibilityLabel}
                delta={kpis ? { label: `${kpis.aiVisibilityScore.toFixed(1)}%`, positive: kpis.aiVisibilityScore >= 50 } : undefined}
                icon={<VisibilityIcon sx={{ fontSize: '1.5rem', color: '#7c3aed' }} />}
                sx={{ bgcolor: '#faf5ff' }}
              />
            </>
          )}
      </Box>

      {/* ── Scatter + SOV ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' },
          gap: 2,
          mb: 3,
        }}
      >
        {/* Visibility vs Average Rank scatter */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.25 }}>
                  Visibilità vs. Rank medio
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Score di visibilità brand vs posizione di rank sui motori LLM
                </Typography>
              </Box>
            </Box>

            {rankingLoading ? (
              <Skeleton variant="rounded" height={280} />
            ) : scatterData.target.length === 0 && scatterData.competitors.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280, color: 'text.disabled' }}>
                <Typography variant="body2">Dati non disponibili</Typography>
              </Box>
            ) : (
              <ScatterChart
                height={280}
                series={[
                  {
                    label: 'Il tuo brand',
                    data: scatterData.target,
                    color: geoColors.status.error,
                    markerSize: 10,
                  },
                  {
                    label: 'Competitor',
                    data: scatterData.competitors,
                    color: geoColors.status.done,
                    markerSize: 7,
                  },
                ]}
                xAxis={[{ label: 'Rank medio', min: 0 }]}
                yAxis={[{ label: 'Visibilità (%)' }]}
                slotProps={{ legend: { position: { vertical: 'bottom', horizontal: 'center' } } }}
              />
            )}
          </CardContent>
        </Card>

        {/* Top 5 Brands by SOV */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                Top 5 Brand per Share of Voice
              </Typography>
            </Box>

            {rankingLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="text" height={32} sx={{ mb: 1 }} />
              ))
            ) : sovEntries.length === 0 ? (
              <Typography variant="body2" color="text.disabled">Nessun dato disponibile</Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sovEntries.slice(0, 5).map((entry) => (
                  <SovRow
                    key={entry.label}
                    label={entry.label}
                    percentage={entry.percentage}
                    isTarget={entry.isTarget}
                    maxPct={maxSov}
                  />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── Top Performing Keywords table ── */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                Keyword più performanti
              </Typography>
              <Typography variant="caption" color="text.secondary">
                In base al score di visibilità e alla frequenza di menzione
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="text"
                size="small"
                startIcon={<FilterListIcon />}
                sx={{ color: 'text.secondary', fontWeight: 500 }}
              >
                Filtra
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={() =>
                  router.push(`/domains/${clientKey}/runs/${runId}/results/keywords`)
                }
                sx={{ color: 'primary.main', fontWeight: 700 }}
              >
                Vedi tutte
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Keyword</TableCell>
                  <TableCell>Stato</TableCell>
                  <TableCell align="right">Menzioni</TableCell>
                  <TableCell align="center">Andamento visibilità</TableCell>
                  <TableCell align="right">Rank medio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {kwLoading &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton variant="text" /></TableCell>
                      ))}
                    </TableRow>
                  ))}

                {!kwLoading && topKeywords.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.disabled">
                        Nessuna keyword disponibile
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {!kwLoading &&
                  topKeywords.map((kw) => (
                    <TableRow
                      key={kw.keyword}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() =>
                        router.push(
                          `/domains/${clientKey}/runs/${runId}/results/keywords/${encodeURIComponent(kw.keyword)}`,
                        )
                      }
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {kw.keyword}
                        </Typography>
                        <Typography variant="caption" color="text.disabled">
                          {kw.queriesExecuted} query
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusBadge variant={kwBadge(kw.visibilityPct)} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>
                          {kw.targetMentions}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <MiniTrend positive={kw.visibilityPct >= 40} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={kw.avgRankPosition != null && kw.avgRankPosition <= 3 ? 'success.main' : 'text.primary'}
                        >
                          {kw.avgRankPosition != null ? `#${kw.avgRankPosition.toFixed(1)}` : '—'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}
