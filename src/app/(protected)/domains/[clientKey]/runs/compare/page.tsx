/**
 * SC-018 / SC-013 — Run Comparison (Before / After).
 *
 * Layout:
 *   1. Analysis Mode header + dual run selector (Run A baseline / Run B current)
 *   2. 3 KPI delta cards: Avg Visibility Rate | Avg Rank | Target Brand Mentions
 *   3. Two-column: Visibility Over Time bar chart (left) | Competitor SOV shift (right)
 *   4. Keyword Performance Delta table (biggest movers / biggest drops toggle)
 *
 * No backend compare endpoint — deltas computed client-side from two parallel
 * getRunKpis / getRunKeywords / getRunRanking calls.
 *
 * @implements US-011
 * @validates AC-018
 */
'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import RemoveIcon from '@mui/icons-material/Remove'
import VisibilityIcon from '@mui/icons-material/Visibility'
import BarChartIcon from '@mui/icons-material/BarChart'
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail'
import dynamic from 'next/dynamic'
import { getRuns, getRunKpis, getRunKeywords, getRunRanking } from '@/lib/api-client'
import type { RunListItem, KeywordBreakdownRow, BrandRankRow, TargetBrandRow } from '@/lib/api-client'

const BarChart = dynamic(
  () => import('@mui/x-charts/BarChart').then((m) => m.BarChart),
  { loading: () => <Skeleton variant="rounded" height={280} />, ssr: false },
)

interface Props {
  params: { clientKey: string }
}

// ── Delta badge ────────────────────────────────────────────────
function DeltaBadge({ value, unit = '' }: { value: number; unit?: string }) {
  const positive = value > 0
  const zero = value === 0
  const color = zero ? 'text.disabled' : positive ? 'success.main' : 'error.main'
  const Icon = zero ? RemoveIcon : positive ? TrendingUpIcon : TrendingDownIcon
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        bgcolor: zero
          ? '#f1f5f9'
          : positive
          ? 'rgba(22,163,74,0.1)'
          : 'rgba(220,38,38,0.1)',
        color,
        borderRadius: 'var(--geo-radius-full)',
        px: 0.75,
        py: 0.25,
        fontSize: '0.6875rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      <Icon sx={{ fontSize: '0.875rem' }} />
      {positive ? '+' : ''}{value.toFixed(1)}{unit}
    </Box>
  )
}

// ── SOV shift row ──────────────────────────────────────────────
function SovShiftRow({
  label,
  pctA,
  pctB,
  isTarget,
}: {
  label: string
  pctA: number
  pctB: number
  isTarget?: boolean
}) {
  const delta = pctB - pctA
  const deltaLabel =
    Math.abs(delta) < 0.1
      ? 'STABLE'
      : delta > 0
      ? `+${delta.toFixed(1)}% GROWTH`
      : `${delta.toFixed(1)}% LOSS`
  const deltaColor =
    Math.abs(delta) < 0.1 ? 'text.disabled' : delta > 0 ? 'success.main' : 'error.main'
  const maxPct = Math.max(pctA, pctB, 1)

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.6875rem',
            color: isTarget ? 'text.primary' : 'text.secondary',
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, color: deltaColor, fontSize: '0.6875rem' }}
        >
          {deltaLabel}
        </Typography>
      </Box>

      {/* Run A bar (gray) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box
          sx={{
            flex: 1,
            height: 6,
            bgcolor: '#f1f5f9',
            borderRadius: 'var(--geo-radius-full)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${(pctA / maxPct) * 100}%`,
              bgcolor: '#94a3b8',
              borderRadius: 'var(--geo-radius-full)',
            }}
          />
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ minWidth: 36, textAlign: 'right' }}>
          Run A: {pctA.toFixed(1)}%
        </Typography>
      </Box>

      {/* Run B bar (orange if target, blue otherwise) */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            flex: 1,
            height: 6,
            bgcolor: '#f1f5f9',
            borderRadius: 'var(--geo-radius-full)',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              height: '100%',
              width: `${(pctB / maxPct) * 100}%`,
              bgcolor: isTarget ? 'primary.main' : '#3b82f6',
              borderRadius: 'var(--geo-radius-full)',
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{
            minWidth: 36,
            textAlign: 'right',
            fontWeight: 600,
            color: isTarget ? 'primary.main' : 'text.secondary',
          }}
        >
          Run B: {pctB.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function RunComparePage({ params }: Props) {
  const { clientKey } = params
  const { data: session } = useSession()

  const [runAId, setRunAId] = useState<string>('')
  const [runBId, setRunBId] = useState<string>('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [kwMode, setKwMode] = useState<'movers' | 'drops'>('movers')

  // ── Available runs list ──
  const { data: runsData, isLoading: runsLoading } = useQuery({
    queryKey: ['runs', clientKey],
    queryFn: () => getRuns(session?.accessToken ?? '', clientKey, { limit: 50 }),
    enabled: !!session?.accessToken,
  })
  const runs: RunListItem[] = (runsData?.data ?? []).filter((r) => r.status === 'done')

  // ── Run A data ──
  const enabled = !!session?.accessToken
  const { data: kpisAData, isLoading: kpisALoading } = useQuery({
    queryKey: ['run-kpis', clientKey, runAId, refreshKey],
    queryFn: () => getRunKpis(session?.accessToken ?? '', clientKey, runAId),
    enabled: enabled && !!runAId,
  })
  const { data: kwAData } = useQuery({
    queryKey: ['run-kw', clientKey, runAId, refreshKey],
    queryFn: () => getRunKeywords(session?.accessToken ?? '', clientKey, runAId),
    enabled: enabled && !!runAId,
  })
  const { data: rankAData } = useQuery({
    queryKey: ['run-ranking', clientKey, runAId, refreshKey],
    queryFn: () => getRunRanking(session?.accessToken ?? '', clientKey, runAId, 1, 20),
    enabled: enabled && !!runAId,
  })

  // ── Run B data ──
  const { data: kpisBData, isLoading: kpisBLoading } = useQuery({
    queryKey: ['run-kpis', clientKey, runBId, refreshKey],
    queryFn: () => getRunKpis(session?.accessToken ?? '', clientKey, runBId),
    enabled: enabled && !!runBId,
  })
  const { data: kwBData } = useQuery({
    queryKey: ['run-kw', clientKey, runBId, refreshKey],
    queryFn: () => getRunKeywords(session?.accessToken ?? '', clientKey, runBId),
    enabled: enabled && !!runBId,
  })
  const { data: rankBData } = useQuery({
    queryKey: ['run-ranking', clientKey, runBId, refreshKey],
    queryFn: () => getRunRanking(session?.accessToken ?? '', clientKey, runBId, 1, 20),
    enabled: enabled && !!runBId,
  })

  const kpisA = kpisAData?.data
  const kpisB = kpisBData?.data
  const kwA: KeywordBreakdownRow[] = kwAData?.data ?? []
  const kwB: KeywordBreakdownRow[] = kwBData?.data ?? []
  const rankA = rankAData?.data
  const rankB = rankBData?.data

  const bothSelected = !!runAId && !!runBId && runAId !== runBId
  const loading = kpisALoading || kpisBLoading

  // ── KPI deltas ──
  const kpiDelta = useMemo(() => {
    if (!kpisA || !kpisB) return null
    return {
      visibility: { a: kpisA.aiVisibilityScore, b: kpisB.aiVisibilityScore, delta: kpisB.aiVisibilityScore - kpisA.aiVisibilityScore },
      rank: { a: kpisA.avgRankPosition ?? 0, b: kpisB.avgRankPosition ?? 0, delta: (kpisA.avgRankPosition ?? 0) - (kpisB.avgRankPosition ?? 0) },
      mentions: { a: kpisA.totalMentions, b: kpisB.totalMentions, delta: kpisB.totalMentions - kpisA.totalMentions },
    }
  }, [kpisA, kpisB])

  // ── Bar chart: top 8 keywords visibility A vs B ──
  const barData = useMemo(() => {
    if (!kwA.length || !kwB.length) return { labels: [], seriesA: [], seriesB: [] }
    const mapB = Object.fromEntries(kwB.map((k) => [k.keyword, k]))
    const joined = kwA
      .map((k) => ({ kw: k.keyword, a: k.visibilityPct, b: mapB[k.keyword]?.visibilityPct ?? 0 }))
      .sort((x, y) => Math.abs(y.b - y.a) - Math.abs(x.b - x.a))
      .slice(0, 8)
    return {
      labels: joined.map((j) => j.kw.length > 14 ? j.kw.slice(0, 14) + '…' : j.kw),
      seriesA: joined.map((j) => parseFloat(j.a.toFixed(1))),
      seriesB: joined.map((j) => parseFloat(j.b.toFixed(1))),
    }
  }, [kwA, kwB])

  // ── SOV shift: target + top 4 competitors ──
  type BrandEntry = (BrandRankRow | TargetBrandRow) & { isTarget?: boolean }
  const sovEntries = useMemo(() => {
    if (!rankA || !rankB) return []
    const mapB = new Map<string, number>()
    if (rankB.targetBrandRow) mapB.set(rankB.targetBrandRow.brand, rankB.targetBrandRow.aiVisibilityScore)
    rankB.competitors?.forEach((c) => mapB.set(c.brand, c.aiVisibilityScore))

    const entries: Array<{ label: string; pctA: number; pctB: number; isTarget: boolean }> = []
    if (rankA.targetBrandRow) {
      entries.push({
        label: rankA.targetBrandRow.brand,
        pctA: rankA.targetBrandRow.aiVisibilityScore,
        pctB: mapB.get(rankA.targetBrandRow.brand) ?? 0,
        isTarget: true,
      })
    }
    rankA.competitors?.slice(0, 3).forEach((c) => {
      entries.push({
        label: c.brand,
        pctA: c.aiVisibilityScore,
        pctB: mapB.get(c.brand) ?? 0,
        isTarget: false,
      })
    })
    return entries
  }, [rankA, rankB])

  // ── Keyword delta table ──
  const kwDelta = useMemo(() => {
    if (!kwA.length || !kwB.length) return []
    const mapA = Object.fromEntries(kwA.map((k) => [k.keyword, k]))
    const mapB = Object.fromEntries(kwB.map((k) => [k.keyword, k]))
    const allKw = Array.from(new Set([...kwA.map((k) => k.keyword), ...kwB.map((k) => k.keyword)]))
    return allKw.map((kw) => {
      const a = mapA[kw]
      const b = mapB[kw]
      return {
        keyword: kw,
        rankA: a?.avgRankPosition ?? null,
        rankB: b?.avgRankPosition ?? null,
        rankDelta: a?.avgRankPosition != null && b?.avgRankPosition != null
          ? a.avgRankPosition - b.avgRankPosition
          : null,
        visA: a?.visibilityPct ?? 0,
        visB: b?.visibilityPct ?? 0,
        visDelta: (b?.visibilityPct ?? 0) - (a?.visibilityPct ?? 0),
      }
    })
  }, [kwA, kwB])

  const sortedKwDelta = useMemo(() => {
    const sorted = [...kwDelta].sort((x, y) =>
      kwMode === 'movers' ? y.visDelta - x.visDelta : x.visDelta - y.visDelta,
    )
    return sorted.slice(0, 10)
  }, [kwDelta, kwMode])

  // ── Run label helper ──
  const runLabel = (r: RunListItem) => {
    const date = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${r.profileKey} · ${date}`
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header + run selectors ── */}
      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 3,
            }}
          >
            {/* Left: title */}
            <Box>
              <Chip
                label="ANALYSIS MODE"
                size="small"
                sx={{
                  mb: 1,
                  bgcolor: 'rgba(236,91,19,0.1)',
                  color: 'primary.main',
                  fontWeight: 700,
                  fontSize: '0.625rem',
                  height: 20,
                  borderRadius: 'var(--geo-radius-sm)',
                  '& .MuiChip-label': { px: 1 },
                }}
              />
              <Typography variant="h1" sx={{ fontWeight: 800, mb: 0.5 }}>
                Run Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Detailed analysis of visibility and ranking shifts between strategic monitoring periods.
              </Typography>
            </Box>

            {/* Right: run selectors */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                flexShrink: 0,
                flexWrap: 'wrap',
              }}
            >
              {/* Run A */}
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontWeight: 600, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Run A (Baseline)
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={runAId}
                    onChange={(e) => setRunAId(e.target.value)}
                    displayEmpty
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.disabled" variant="body2">Select run…</Typography>
                      const r = runs.find((x) => x.runId === v)
                      return r ? runLabel(r) : v
                    }}
                  >
                    {runsLoading && <MenuItem disabled>Loading…</MenuItem>}
                    {runs.filter((r) => r.runId !== runBId).map((r) => (
                      <MenuItem key={r.runId} value={r.runId}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{r.profileKey}</Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <ArrowForwardIcon sx={{ color: 'text.disabled', mt: 2.5 }} />

              {/* Run B */}
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontWeight: 600, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Run B (Current)
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <Select
                    value={runBId}
                    onChange={(e) => setRunBId(e.target.value)}
                    displayEmpty
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.disabled" variant="body2">Select run…</Typography>
                      const r = runs.find((x) => x.runId === v)
                      return r ? runLabel(r) : v
                    }}
                  >
                    {runsLoading && <MenuItem disabled>Loading…</MenuItem>}
                    {runs.filter((r) => r.runId !== runAId).map((r) => (
                      <MenuItem key={r.runId} value={r.runId}>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>{r.profileKey}</Typography>
                          <Typography variant="caption" color="text.disabled">
                            {new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={() => setRefreshKey((k) => k + 1)}
                disabled={!bothSelected}
                sx={{ mt: 2.5 }}
              >
                Refresh
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ── Empty state ── */}
      {!bothSelected && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <BarChartIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h3" color="text.secondary" gutterBottom>
              Select two runs to compare
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Choose Run A (baseline) and Run B (current) from the dropdowns above to see the delta analysis.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* ── KPI delta cards ── */}
      {bothSelected && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={110} sx={{ borderRadius: 2 }} />
              ))
            : kpiDelta
            ? (
              <>
                {/* Avg Visibility Rate */}
                <Card>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <VisibilityIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
                          Avg Visibility Rate
                        </Typography>
                      </Box>
                      <DeltaBadge value={kpiDelta.visibility.delta} unit="%" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
                        {kpiDelta.visibility.b.toFixed(1)}%
                      </Typography>
                      <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                        {kpiDelta.visibility.a.toFixed(1)}%
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* Avg Rank */}
                <Card>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <BarChartIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
                          Avg Rank
                        </Typography>
                      </Box>
                      {/* Rank: positive delta means improvement (lower number) */}
                      <DeltaBadge value={kpiDelta.rank.delta} unit=" pos" />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
                        #{kpiDelta.rank.b.toFixed(1)}
                      </Typography>
                      <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                        #{kpiDelta.rank.a.toFixed(1)}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>

                {/* Target Brand Mentions */}
                <Card>
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <AlternateEmailIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, fontSize: '0.6875rem' }}>
                          Target Brand Mentions
                        </Typography>
                      </Box>
                      <DeltaBadge value={kpiDelta.mentions.delta} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography sx={{ fontSize: '1.75rem', fontWeight: 800 }}>
                        {kpiDelta.mentions.b.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through' }}>
                        {kpiDelta.mentions.a.toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </>
            )
            : null}
        </Box>
      )}

      {/* ── Bar chart + SOV shift ── */}
      {bothSelected && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '3fr 2fr' }, gap: 2 }}>

          {/* Visibility Over Time (keyword-level comparison) */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>Visibility Over Time</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Keyword visibility comparison between the two runs
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[{ label: 'Run B', color: '#ec5b13' }, { label: 'Run A', color: '#cbd5e1' }].map(({ label, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: color }} />
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {loading || !barData.labels.length ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                <BarChart
                  xAxis={[{ scaleType: 'band', data: barData.labels, tickLabelStyle: { fontSize: 10 } }]}
                  series={[
                    { data: barData.seriesA, label: 'Run A', color: '#cbd5e1' },
                    { data: barData.seriesB, label: 'Run B', color: '#ec5b13' },
                  ]}
                  height={280}
                  margin={{ left: 40, right: 10, top: 10, bottom: 60 }}
                  slotProps={{ legend: { hidden: true } as never }}
                />
              )}
            </CardContent>
          </Card>

          {/* Competitor SOV shift */}
          <Card>
            <CardContent>
              <Typography variant="h3" fontWeight={700} mb={2.5}>
                Competitor Share Shift (SOV)
              </Typography>

              {loading || !sovEntries.length ? (
                <Skeleton variant="rounded" height={280} />
              ) : (
                sovEntries.map((entry) => (
                  <SovShiftRow
                    key={entry.label}
                    label={entry.label}
                    pctA={entry.pctA}
                    pctB={entry.pctB}
                    isTarget={entry.isTarget}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Keyword Performance Delta table ── */}
      {bothSelected && (
        <Card>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h3" fontWeight={700}>
                Keyword Performance Delta
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {(['movers', 'drops'] as const).map((mode) => (
                  <Button
                    key={mode}
                    size="small"
                    variant={kwMode === mode ? 'contained' : 'outlined'}
                    onClick={() => setKwMode(mode)}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      ...(kwMode !== mode && { borderColor: 'divider', color: 'text.secondary' }),
                    }}
                  >
                    {mode === 'movers' ? 'Biggest Movers' : 'Biggest Drops'}
                  </Button>
                ))}
              </Box>
            </Box>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell align="center">Run A Rank</TableCell>
                    <TableCell align="center">Run B Rank</TableCell>
                    <TableCell align="center">Delta</TableCell>
                    <TableCell align="right">Run A Vis</TableCell>
                    <TableCell align="right">Run B Vis</TableCell>
                    <TableCell align="right">Vis Delta</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <TableCell key={j}><Skeleton variant="text" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    : sortedKwDelta.map((row) => (
                        <TableRow key={row.keyword} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {row.keyword}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" color="text.secondary">
                              {row.rankA != null ? `#${row.rankA.toFixed(0)}` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="body2" fontWeight={600}>
                              {row.rankB != null ? `#${row.rankB.toFixed(0)}` : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {row.rankDelta != null ? (
                              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
                                {row.rankDelta > 0
                                  ? <TrendingUpIcon sx={{ fontSize: '0.875rem', color: 'success.main' }} />
                                  : row.rankDelta < 0
                                  ? <TrendingDownIcon sx={{ fontSize: '0.875rem', color: 'error.main' }} />
                                  : <RemoveIcon sx={{ fontSize: '0.875rem', color: 'text.disabled' }} />}
                                <Typography
                                  variant="body2"
                                  fontWeight={700}
                                  sx={{
                                    color: row.rankDelta > 0 ? 'success.main' : row.rankDelta < 0 ? 'error.main' : 'text.disabled',
                                  }}
                                >
                                  {row.rankDelta > 0 ? '+' : ''}{row.rankDelta.toFixed(0)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.disabled">—</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color="text.secondary">
                              {row.visA.toFixed(0)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {row.visB.toFixed(0)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={700}
                              sx={{
                                color: row.visDelta > 0 ? 'success.main' : row.visDelta < 0 ? 'error.main' : 'text.secondary',
                              }}
                            >
                              {row.visDelta > 0 ? '+' : ''}{row.visDelta.toFixed(0)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}

                  {!loading && sortedKwDelta.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.disabled">
                          Seleziona due run con dati keyword per vedere il delta.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {kwDelta.length > 10 && (
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button variant="text" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  View All Keyword Deltas ({kwDelta.length})
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
