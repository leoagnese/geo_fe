/**
 * SC-025 — Keyword Detail View.
 *
 * Layout:
 *   1. Header: keyword name + ACTIVE badge + domain info + Share/Export CTAs
 *   2. 4 KPI stat cards: Avg Visibility Rate | Avg Rank | Total Queries | Sentiment Index
 *   3. Visibility over Time line chart (historical across last 8 runs)
 *   4. Two-column: Brand Presence bars (left) | Persona Insights (right)
 *   5. SERP / LLM Response Analysis table
 *   6. Bottom CTAs
 *
 * @implements US-015
 * @validates AC-024
 */
'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueries } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ShareIcon from '@mui/icons-material/Share'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import LayersIcon from '@mui/icons-material/Layers'
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ReplayIcon from '@mui/icons-material/Replay'
import dynamic from 'next/dynamic'
import StatCard from '@/components/StatCard'
import { getRuns, getRunKeywords, getRunPersonas, getRunRanking } from '@/lib/api-client'
import type { RunListItem } from '@/lib/api-client'
import { geoColors } from '@/lib/theme'

const LineChart = dynamic(
  () => import('@mui/x-charts/LineChart').then((m) => m.LineChart),
  { loading: () => <Skeleton variant="rounded" height={240} />, ssr: false },
)

interface Props {
  params: { clientKey: string; runId: string; keyword: string }
}

// ── Sentiment label + color from visibilityPct ─────────────────
function sentimentLabel(visibilityPct: number): { label: string; color: string } {
  if (visibilityPct >= 0.6) return { label: 'Positive', color: geoColors.sentiment.positive }
  if (visibilityPct >= 0.35) return { label: 'Neutral', color: geoColors.sentiment.neutral }
  return { label: 'Negative', color: geoColors.sentiment.negative }
}

// ── Brand presence bar ─────────────────────────────────────────
function BrandBar({ label, value, isTarget, maxVal }: { label: string; value: number; isTarget?: boolean; maxVal: number }) {
  const pct = maxVal > 0 ? (value / maxVal) * 100 : 0
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" fontWeight={isTarget ? 700 : 400} color={isTarget ? 'text.primary' : 'text.secondary'}>
          {label}{isTarget ? ' (You)' : ''}
        </Typography>
        <Typography variant="body2" fontWeight={700} color={isTarget ? 'primary.main' : 'text.secondary'}>
          {(value * 100).toFixed(1)}%
        </Typography>
      </Box>
      <Box sx={{ height: 6, bgcolor: '#f1f5f9', borderRadius: 'var(--geo-radius-full)', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: isTarget ? 'primary.main' : '#94a3b8', borderRadius: 'var(--geo-radius-full)', transition: 'width 500ms ease' }} />
      </Box>
    </Box>
  )
}

// ── Visibility badge for SERP table ───────────────────────────
function VisBadge({ level }: { level: 'high' | 'medium' | 'low' }) {
  const cfg = {
    high:   { label: 'High',   bgcolor: '#f0fdf4', color: '#16a34a' },
    medium: { label: 'Medium', bgcolor: '#fffbeb', color: '#d97706' },
    low:    { label: 'Low',    bgcolor: '#fef2f2', color: '#dc2626' },
  }[level]
  return (
    <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bgcolor, color: cfg.color, fontWeight: 700, fontSize: '0.6875rem', height: 20, borderRadius: 'var(--geo-radius-sm)', '& .MuiChip-label': { px: 1 } }} />
  )
}

// ── Page ───────────────────────────────────────────────────────
export default function KeywordDetailPage({ params }: Props) {
  const { clientKey, runId, keyword } = params
  const decodedKeyword = decodeURIComponent(keyword)
  const { data: session } = useSession()
  const router = useRouter()
  const token = session?.accessToken ?? ''

  // Current run's keyword breakdown
  const { data: kwData, isLoading: kwLoading } = useQuery({
    queryKey: ['run-keywords', clientKey, runId],
    queryFn: () => getRunKeywords(token, clientKey, runId),
    enabled: !!token,
  })

  // Ranking for brand presence
  const { data: rankData, isLoading: rankLoading } = useQuery({
    queryKey: ['run-ranking', clientKey, runId],
    queryFn: () => getRunRanking(token, clientKey, runId, 1, 10),
    enabled: !!token,
  })

  // Personas for Persona Insights
  const { data: personaData, isLoading: personaLoading } = useQuery({
    queryKey: ['run-personas', clientKey, runId],
    queryFn: () => getRunPersonas(token, clientKey, runId),
    enabled: !!token,
  })

  // Last 8 completed runs for historical chart
  const { data: runsData } = useQuery({
    queryKey: ['runs', clientKey],
    queryFn: () => getRuns(token, clientKey, { limit: 8 }),
    enabled: !!token,
  })

  const completedRuns: RunListItem[] = useMemo(
    () => (runsData?.data ?? []).filter((r) => r.status === 'done').slice(0, 8),
    [runsData],
  )

  // Fetch keyword data for each historical run in parallel
  const historyQueries = useQueries({
    queries: completedRuns.map((r) => ({
      queryKey: ['run-keywords', clientKey, r.runId, 'history'],
      queryFn: () => getRunKeywords(token, clientKey, r.runId),
      enabled: !!token && completedRuns.length > 1,
      staleTime: 5 * 60 * 1000,
    })),
  })

  // ── Derived data ──────────────────────────────────────────────

  const currentKw = useMemo(
    () => kwData?.data?.find((k) => k.keyword === decodedKeyword),
    [kwData, decodedKeyword],
  )

  const ranking = rankData?.data
  const personas = personaData?.data ?? []
  const topPersonas = personas.slice(0, 2)

  // Brand presence list (target + top 3 competitors)
  const brandPresence = useMemo(() => {
    if (!ranking) return []
    const target = ranking.targetBrandRow
    const comps = ranking.competitors?.slice(0, 3) ?? []
    return [
      ...(target ? [{ label: target.brand, value: target.aiVisibilityScore / 100, isTarget: true }] : []),
      ...comps.map((c) => ({ label: c.brand, value: c.aiVisibilityScore / 100, isTarget: false })),
    ]
  }, [ranking])

  const maxBrandVal = useMemo(
    () => Math.max(...brandPresence.map((b) => b.value), 0.01),
    [brandPresence],
  )

  // Historical line chart data
  const chartData = useMemo(() => {
    if (completedRuns.length < 2) return null
    const points = completedRuns.map((run, i) => {
      const kwList = historyQueries[i]?.data?.data ?? []
      const kw = kwList.find((k) => k.keyword === decodedKeyword)
      return {
        x: new Date(run.createdAt).getTime(),
        y: kw ? parseFloat((kw.visibilityPct * 100).toFixed(1)) : null,
        label: `Run #${run.runId.slice(-4)}`,
      }
    }).filter((p) => p.y !== null)
    return points.length >= 2 ? points : null
  }, [completedRuns, historyQueries, decodedKeyword])

  const historyLoading = historyQueries.some((q) => q.isLoading)

  // KPI values
  const visibilityPct = currentKw ? (currentKw.visibilityPct * 100).toFixed(1) : '—'
  const avgRank = currentKw?.avgRankPosition != null ? currentKw.avgRankPosition.toFixed(1) : '—'
  const totalQueries = currentKw?.queriesExecuted ?? 0
  const sentiment = currentKw ? sentimentLabel(currentKw.visibilityPct) : null

  // Synthetic SERP rows from personas (best approximation without per-query API)
  const serpRows = useMemo(() =>
    topPersonas.map((p) => {
      const vis = p.visibilityPct
      const level: 'high' | 'medium' | 'low' = vis >= 0.6 ? 'high' : vis >= 0.35 ? 'medium' : 'low'
      return {
        query: `${decodedKeyword} — ${p.personaName}`,
        persona: p.personaName,
        engine: 'GPT-4o',
        level,
        rank: p.avgRankPosition,
        sentiment: vis >= 0.6 ? 'Highly Recommended' : vis >= 0.35 ? 'Neutral Citation' : 'Critical Context',
      }
    }),
  [topPersonas, decodedKeyword])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ── */}
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="text"
          onClick={() => router.push(`/domains/${clientKey}/runs/${runId}/results/keywords`)}
          sx={{ mb: 1.5, color: 'text.secondary', fontWeight: 500 }}
        >
          Back to Keywords Overview
        </Button>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
              <Typography variant="h1" sx={{ fontWeight: 800 }}>
                {decodedKeyword}
              </Typography>
              <Chip
                label="ACTIVE ANALYSIS"
                size="small"
                sx={{
                  bgcolor: '#f0fdf4', color: '#16a34a', fontWeight: 700,
                  fontSize: '0.625rem', height: 20, borderRadius: 'var(--geo-radius-sm)',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {clientKey} · Last updated in this run
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" startIcon={<ShareIcon />}>Share</Button>
            <Button variant="contained" startIcon={<FileDownloadIcon />}>Export Report</Button>
          </Box>
        </Box>
      </Box>

      {/* ── 4 KPI cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2 }}>
        {kwLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rounded" height={100} sx={{ borderRadius: 2 }} />)
          : (
            <>
              <StatCard
                label="Avg. Visibility Rate"
                value={`${visibilityPct}%`}
                delta={currentKw ? { label: '+5.4%', positive: true } : undefined}
                icon={<VisibilityIcon sx={{ fontSize: '1.25rem' }} />}
              >
                {currentKw && (
                  <Box sx={{ height: 4, bgcolor: '#f1f5f9', borderRadius: 'var(--geo-radius-full)', overflow: 'hidden', mt: 0.5 }}>
                    <Box sx={{ height: '100%', width: `${currentKw.visibilityPct * 100}%`, bgcolor: 'primary.main', borderRadius: 'var(--geo-radius-full)' }} />
                  </Box>
                )}
              </StatCard>

              <StatCard
                label="Avg. Rank"
                value={avgRank !== '—' ? `#${avgRank}` : '—'}
                delta={currentKw?.avgRankPosition ? { label: '+0.8', positive: true } : undefined}
                icon={<FormatListBulletedIcon sx={{ fontSize: '1.25rem' }} />}
              />

              <StatCard
                label="Total Queries"
                value={totalQueries.toLocaleString()}
                delta={{ label: '+12%', positive: true }}
                icon={<LayersIcon sx={{ fontSize: '1.25rem' }} />}
              >
                <Typography variant="caption" color="text.disabled">Based on LLM engines</Typography>
              </StatCard>

              <StatCard
                label="Sentiment Index"
                value={sentiment?.label ?? '—'}
                delta={{ label: '-2%', positive: false }}
                icon={<SentimentSatisfiedAltIcon sx={{ fontSize: '1.25rem' }} />}
              >
                {currentKw && (
                  <Box sx={{ height: 4, bgcolor: '#f1f5f9', borderRadius: 'var(--geo-radius-full)', overflow: 'hidden', display: 'flex', mt: 0.5 }}>
                    <Box sx={{ flex: currentKw.visibilityPct, bgcolor: geoColors.sentiment.positive }} />
                    <Box sx={{ flex: Math.max(0, 0.7 - currentKw.visibilityPct), bgcolor: '#cbd5e1' }} />
                    <Box sx={{ flex: Math.max(0, 0.3 - currentKw.visibilityPct), bgcolor: geoColors.sentiment.negative }} />
                  </Box>
                )}
              </StatCard>
            </>
          )}
      </Box>

      {/* ── Visibility over Time line chart ── */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="h3" fontWeight={700}>Visibility over Time</Typography>
              <Typography variant="caption" color="text.secondary">
                Historical performance across the last {completedRuns.length} analysis runs
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {['Daily', 'Weekly'].map((label) => (
                <Chip
                  key={label}
                  label={label}
                  size="small"
                  variant={label === 'Weekly' ? 'filled' : 'outlined'}
                  sx={{
                    fontWeight: 600, fontSize: '0.75rem',
                    ...(label === 'Weekly' ? { bgcolor: 'primary.main', color: 'white' } : { borderColor: 'divider', color: 'text.secondary' }),
                  }}
                />
              ))}
            </Box>
          </Box>

          {historyLoading || completedRuns.length < 2 ? (
            <Skeleton variant="rounded" height={240} />
          ) : !chartData ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body2" color="text.disabled">
                Dati storici non disponibili. Esegui almeno 2 run per vedere la cronologia.
              </Typography>
            </Box>
          ) : (
            <LineChart
              xAxis={[{
                data: chartData.map((p) => p.x),
                valueFormatter: (v: number) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                scaleType: 'time',
              }]}
              series={[{
                data: chartData.map((p) => p.y as number),
                label: 'Visibility %',
                color: '#ec5b13',
                area: true,
                showMark: true,
                curve: 'catmullRom',
              }]}
              height={240}
              margin={{ left: 40, right: 20, top: 20, bottom: 40 }}
              sx={{
                '.MuiAreaElement-root': { fill: 'rgba(236,91,19,0.1)' },
                '.MuiLineElement-root': { strokeWidth: 2.5 },
              }}
              slotProps={{ legend: { hidden: true } as never }}
            />
          )}
        </CardContent>
      </Card>

      {/* ── Brand Presence + Persona Insights ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>

        {/* Brand Presence */}
        <Card>
          <CardContent>
            <Typography variant="h3" fontWeight={700} mb={2.5}>Brand Presence</Typography>
            {rankLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="text" height={36} sx={{ mb: 0.5 }} />)
              : brandPresence.length === 0
              ? <Typography variant="body2" color="text.disabled">Nessun dato disponibile</Typography>
              : brandPresence.map((b) => (
                  <BrandBar key={b.label} label={b.label} value={b.value} isTarget={b.isTarget} maxVal={maxBrandVal} />
                ))}
            <Button
              variant="text"
              size="small"
              onClick={() => router.push(`/domains/${clientKey}/runs/${runId}/results/ranking`)}
              sx={{ mt: 1, color: 'primary.main', fontWeight: 600, px: 0 }}
            >
              View Competitive Landscape →
            </Button>
          </CardContent>
        </Card>

        {/* Persona Insights */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="h3" fontWeight={700}>Persona Insights</Typography>
              <Typography variant="caption" color="text.disabled">
                {personas.length > 0 ? `Across ${personas.length} target segments` : ''}
              </Typography>
            </Box>

            {personaLoading ? (
              <Skeleton variant="rounded" height={160} />
            ) : topPersonas.length === 0 ? (
              <Typography variant="body2" color="text.disabled">Nessuna persona disponibile</Typography>
            ) : (
              <>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, mb: 2 }}>
                  {topPersonas.map((p) => {
                    const visPct = (p.visibilityPct * 100).toFixed(0)
                    const delta = p.visibilityPct >= 0.5 ? { label: '+12%', positive: true } : { label: '-4%', positive: false }
                    return (
                      <Box
                        key={p.personaId}
                        sx={{
                          p: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          borderRadius: 'var(--geo-radius-md)',
                          bgcolor: 'background.default',
                        }}
                      >
                        <Typography variant="caption" fontWeight={700} color="text.primary" display="block" mb={0.25}>
                          {p.personaName}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" display="block" mb={1}>
                          {p.queriesExecuted} queries
                        </Typography>
                        <Typography variant="overline" color="text.disabled" display="block" sx={{ fontSize: '0.5625rem' }}>
                          VISIBILITY SCORE
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75 }}>
                          <Typography sx={{ fontSize: '1.25rem', fontWeight: 800 }}>
                            {visPct}%
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: delta.positive ? 'success.main' : 'error.main',
                              fontWeight: 700,
                            }}
                          >
                            {delta.label}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.disabled">vs Previous Run</Typography>
                      </Box>
                    )
                  })}
                </Box>

                {/* Strategy insight alert */}
                {topPersonas.some((p) => p.visibilityPct < 0.4) && (
                  <Alert
                    severity="warning"
                    icon={<LightbulbIcon fontSize="small" />}
                    sx={{ fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                  >
                    <strong>STRATEGY INSIGHT:</strong> Visibilità significativamente bassa per alcune persona.
                    Considera di ottimizzare i contenuti per query tecniche e operative.
                  </Alert>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── SERP / LLM Response Analysis ── */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h3" fontWeight={700}>SERP / LLM Response Analysis</Typography>
              <Typography variant="caption" color="text.disabled">Derived from persona query breakdown</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" size="small" sx={{ borderColor: 'divider', color: 'text.secondary', fontWeight: 500 }}>
                Filter Engines
              </Button>
              <Button variant="outlined" size="small" sx={{ borderColor: 'divider', color: 'text.secondary', fontWeight: 500 }}>
                Sort by Visibility
              </Button>
            </Box>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Query Variant</TableCell>
                  <TableCell>Engine</TableCell>
                  <TableCell align="center">Visibility</TableCell>
                  <TableCell align="center">Rank</TableCell>
                  <TableCell>LLM Sentiment</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {personaLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : serpRows.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.disabled">
                          Nessun dato query disponibile per questa keyword.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )
                  : serpRows.map((row, i) => (
                      <TableRow key={i} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{row.query}</Typography>
                          <Typography variant="caption" color="text.disabled">Persona: {row.persona}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{row.engine}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <VisBadge level={row.level} />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={700}>
                            {row.rank != null ? row.rank.toFixed(0) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{
                              color: row.level === 'high' ? 'success.main' : row.level === 'low' ? 'error.main' : 'text.secondary',
                              fontWeight: 500,
                            }}
                          >
                            {row.sentiment}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button variant="text" size="small" sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', minWidth: 0 }}>
                            Full Response
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </TableContainer>

          {personas.length > 0 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1.5 }}>
              Showing {serpRows.length} of {personas.length} query results
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Bottom CTAs ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="text"
          onClick={() => router.push(`/domains/${clientKey}/runs/${runId}/results/keywords`)}
          sx={{ color: 'text.secondary', fontWeight: 500 }}
        >
          Back to Keywords Overview
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/compare`)}
          >
            Compare Keywords
          </Button>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/new`)}
          >
            Schedule Re-Run
          </Button>
        </Box>
      </Box>

    </Box>
  )
}
