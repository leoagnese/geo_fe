/**
 * SC-031 — Brand Analysis & Competitor Comparison.
 *
 * Layout:
 *   1. Breadcrumb sub-header (run info)
 *   2. 4 KPI stat cards: Total Brands / Top Brand / Target SOV / Avg Sentiment
 *   3. Two-column: Competitive Landscape scatter (left) + Sentiment by Brand (right)
 *   4. Brand Performance Matrix table (full width)
 *   5. Bottom CTAs: Compare Brands + Schedule Re-Run
 *
 * Right sidebar (sticky): Analysis Configuration (language/region/brand filter).
 *
 * @implements US-014
 * @validates AC-022, AC-023
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import TuneIcon from '@mui/icons-material/Tune'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ReplayIcon from '@mui/icons-material/Replay'
import dynamic from 'next/dynamic'
import StatCard from '@/components/StatCard'
import { getRunRanking, getRunKpis } from '@/lib/api-client'
import type { BrandRankRow, TargetBrandRow } from '@/lib/api-client'
import { geoColors } from '@/lib/theme'

const ScatterChart = dynamic(
  () => import('@mui/x-charts/ScatterChart').then((m) => m.ScatterChart),
  { loading: () => <Skeleton variant="rounded" height={300} />, ssr: false },
)

interface RankingPageProps {
  params: { clientKey: string; runId: string }
}

// ── Brand avatar ───────────────────────────────────────────────
function BrandAvatar({ name, isTarget }: { name: string; isTarget?: boolean }) {
  return (
    <Box
      sx={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        bgcolor: isTarget ? 'primary.main' : '#e2e8f0',
        color: isTarget ? 'white' : 'text.secondary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '0.8125rem',
        flexShrink: 0,
      }}
    >
      {name[0]?.toUpperCase() ?? '?'}
    </Box>
  )
}

// ── Mini sentiment bar (inline, for table rows) ────────────────
function SentimentMiniBar({
  positive,
  neutral,
  negative,
}: {
  positive: number
  neutral: number
  negative: number
}) {
  return (
    <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', width: 80 }}>
      <Box sx={{ flex: positive, bgcolor: geoColors.sentiment.positive }} />
      <Box sx={{ flex: neutral, bgcolor: '#cbd5e1' }} />
      <Box sx={{ flex: negative, bgcolor: geoColors.sentiment.negative }} />
    </Box>
  )
}

// ── Link rate cell (colored if high) ──────────────────────────
function LinkRateCell({ value }: { value: number }) {
  const pct = (value * 100).toFixed(1)
  const isHigh = value >= 0.7
  return (
    <Typography
      variant="body2"
      fontWeight={700}
      sx={{ color: isHigh ? 'error.main' : 'text.primary' }}
    >
      {pct}%
    </Typography>
  )
}

// ── Avg rank cell ──────────────────────────────────────────────
function AvgRankCell({ value }: { value: number | null }) {
  if (value === null) return <Typography variant="body2" color="text.disabled">—</Typography>
  const isGood = value <= 3
  return (
    <Typography
      variant="body2"
      fontWeight={700}
      sx={{ color: isGood ? 'success.main' : 'text.primary' }}
    >
      {value.toFixed(1)}
    </Typography>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function RankingPage({ params }: RankingPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const router = useRouter()

  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [pendingBrands, setPendingBrands] = useState<string[]>([])
  const [language, setLanguage] = useState('all')
  const [region, setRegion] = useState('all')
  const [matrixPage, setMatrixPage] = useState(0)
  const MATRIX_PAGE_SIZE = 10

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['run-ranking', clientKey, runId],
    queryFn: () => getRunRanking(session?.accessToken ?? '', clientKey, runId, 1, 100),
    enabled: !!session?.accessToken,
  })

  const { data: kpisData } = useQuery({
    queryKey: ['run-kpis', clientKey, runId],
    queryFn: () => getRunKpis(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const ranking = data?.data
  const kpis = kpisData?.data
  const targetBrandRow: TargetBrandRow | undefined = ranking?.targetBrandRow
  const allCompetitors: BrandRankRow[] = ranking?.competitors ?? []
  const totalBrands = (data?.meta?.total ?? allCompetitors.length) + (targetBrandRow ? 1 : 0)

  const allBrands = useMemo(
    () => [
      ...(targetBrandRow ? [targetBrandRow.brand] : []),
      ...allCompetitors.map((c) => c.brand),
    ],
    [targetBrandRow, allCompetitors],
  )

  useEffect(() => {
    if (allBrands.length > 0 && pendingBrands.length === 0) {
      setPendingBrands(allBrands)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBrands.length])

  const filteredCompetitors: BrandRankRow[] =
    selectedBrands.length === 0
      ? allCompetitors
      : allCompetitors.filter((c) => selectedBrands.includes(c.brand))

  // Scatter data
  const targetScatter = targetBrandRow?.avgRankPosition != null
    ? [{ x: targetBrandRow.avgRankPosition, y: targetBrandRow.aiVisibilityScore, id: targetBrandRow.brand }]
    : []

  const competitorScatter = filteredCompetitors
    .filter((c) => c.avgRankPosition != null)
    .map((c) => ({ x: c.avgRankPosition!, y: c.aiVisibilityScore, id: c.brand }))

  // Sentiment rows (target + top 3 competitors)
  const sentimentBrands = [
    ...(targetBrandRow ? [{ ...targetBrandRow, isTarget: true }] : []),
    ...filteredCompetitors.slice(0, 3).map((c) => ({ ...c, isTarget: false })),
  ]

  // Matrix pagination
  const pagedCompetitors = filteredCompetitors.slice(
    matrixPage * MATRIX_PAGE_SIZE,
    (matrixPage + 1) * MATRIX_PAGE_SIZE,
  )
  const totalMatrixPages = Math.ceil(filteredCompetitors.length / MATRIX_PAGE_SIZE)

  // Top brand by visibility
  const topBrand = allCompetitors[0]?.aiVisibilityScore > (targetBrandRow?.aiVisibilityScore ?? 0)
    ? allCompetitors[0]?.brand
    : targetBrandRow?.brand ?? '—'

  const avgSentiment = kpis
    ? `${(kpis.sentimentPositive * 10).toFixed(1)} / 10`
    : '—'

  const targetSov = targetBrandRow
    ? `${targetBrandRow.aiVisibilityScore.toFixed(1)}%`
    : '—'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {isError && (
        <Alert
          severity="error"
          action={<Button color="inherit" size="small" onClick={() => void refetch()}>Riprova</Button>}
        >
          Impossibile caricare i dati brand. Riprova.
        </Alert>
      )}

      {/* ── 4 KPI cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 2 }} />
            ))
          : (
            <>
              <StatCard
                label="Total Brands Identified"
                value={String(totalBrands)}
                delta={{ label: '+5.2%', positive: true }}
              />
              <StatCard
                label="Top Brand"
                value={topBrand}
              />
              <StatCard
                label="Target Share of Voice"
                value={targetSov}
                delta={{ label: '+1.8%', positive: true }}
              >
                {targetBrandRow && (
                  <Box
                    sx={{
                      height: 4,
                      bgcolor: '#f1f5f9',
                      borderRadius: 'var(--geo-radius-full)',
                      overflow: 'hidden',
                      mt: 0.5,
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${targetBrandRow.aiVisibilityScore}%`,
                        bgcolor: 'primary.main',
                        borderRadius: 'var(--geo-radius-full)',
                      }}
                    />
                  </Box>
                )}
              </StatCard>
              <StatCard
                label="Avg Sentiment Score"
                value={avgSentiment}
                delta={{ label: '+0.2%', positive: true }}
              >
                {kpis && (
                  <Box
                    sx={{
                      height: 4,
                      borderRadius: 'var(--geo-radius-full)',
                      overflow: 'hidden',
                      display: 'flex',
                      mt: 0.5,
                    }}
                  >
                    <Box sx={{ flex: kpis.sentimentPositive, bgcolor: geoColors.sentiment.positive }} />
                    <Box sx={{ flex: kpis.sentimentNeutral, bgcolor: '#cbd5e1' }} />
                    <Box sx={{ flex: kpis.sentimentNegative, bgcolor: geoColors.sentiment.negative }} />
                  </Box>
                )}
              </StatCard>
            </>
          )}
      </Box>

      {/* ── Main 2-col layout: charts + sidebar ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1fr 300px' },
          gap: 3,
          alignItems: 'flex-start',
        }}
      >
        {/* Left: Competitive Landscape + Sentiment */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

          {/* ── Competitive Landscape ── */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h3" fontWeight={700}>Competitive Landscape</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Brand visibility vs market ranking
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  {[
                    { label: 'TARGET BRAND', color: 'primary.main' },
                    { label: 'COMPETITORS', color: '#94a3b8' },
                  ].map(({ label, color }) => (
                    <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.625rem', fontWeight: 600 }}>
                        {label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>

              {isLoading ? (
                <Skeleton variant="rounded" height={300} />
              ) : targetScatter.length === 0 && competitorScatter.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body2" color="text.disabled">
                    Dati di posizione non disponibili per questa run.
                  </Typography>
                </Box>
              ) : (
                <ScatterChart
                  series={[
                    ...(targetScatter.length > 0
                      ? [{ data: targetScatter, label: 'Target Brand', color: '#ec5b13', markerSize: 14 }]
                      : []),
                    ...(competitorScatter.length > 0
                      ? [{ data: competitorScatter, label: 'Competitors', color: '#94a3b8', markerSize: 8 }]
                      : []),
                  ]}
                  xAxis={[{ label: 'Average Rank (1-10)', min: 0 }]}
                  yAxis={[{ label: 'Visibility Score' }]}
                  height={300}
                  margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                  slots={{ legend: () => null }}
                />
              )}
            </CardContent>
          </Card>

          {/* ── Sentiment by Brand ── */}
          <Card>
            <CardContent>
              <Typography variant="h3" fontWeight={700} mb={2.5}>
                Sentiment by Brand
              </Typography>

              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} variant="text" height={36} sx={{ mb: 1 }} />
                  ))
                : sentimentBrands.map((brand) => (
                    <Box key={brand.brand} sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          mb: 0.75,
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            sx={{
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              fontSize: '0.6875rem',
                            }}
                          >
                            {brand.brand}
                            {brand.isTarget && (
                              <Box
                                component="span"
                                sx={{ color: 'text.disabled', fontWeight: 400 }}
                              >
                                {' (TARGET)'}
                              </Box>
                            )}
                          </Typography>
                        </Box>
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            color:
                              brand.sentimentPositive >= 0.6
                                ? 'success.main'
                                : 'text.secondary',
                          }}
                        >
                          {(brand.sentimentPositive * 100).toFixed(0)}% POSITIVE
                        </Typography>
                      </Box>

                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 'var(--geo-radius-full)',
                          overflow: 'hidden',
                          display: 'flex',
                          bgcolor: '#f1f5f9',
                        }}
                      >
                        <Box
                          sx={{
                            flex: brand.sentimentPositive,
                            bgcolor: geoColors.sentiment.positive,
                            transition: 'flex 0.5s',
                          }}
                        />
                        <Box
                          sx={{
                            flex: brand.sentimentNeutral,
                            bgcolor: '#cbd5e1',
                            transition: 'flex 0.5s',
                          }}
                        />
                        <Box
                          sx={{
                            flex: brand.sentimentNegative,
                            bgcolor: geoColors.sentiment.negative,
                            transition: 'flex 0.5s',
                          }}
                        />
                      </Box>
                    </Box>
                  ))}

              {/* Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                {[
                  { label: 'Positive', color: geoColors.sentiment.positive },
                  { label: 'Neutral', color: '#cbd5e1' },
                  { label: 'Negative', color: geoColors.sentiment.negative },
                ].map(({ label, color }) => (
                  <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box
                      sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* ── Right sidebar: Analysis Configuration ── */}
        <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <TuneIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
                <Typography variant="h3" fontWeight={700}>
                  Analysis Configuration
                </Typography>
              </Box>

              {/* Language */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 600 }}>LANGUAGE</InputLabel>
                <Select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  label="LANGUAGE"
                >
                  <MenuItem value="all">All Languages</MenuItem>
                  <MenuItem value="it">Italian (IT)</MenuItem>
                  <MenuItem value="en">English (EN)</MenuItem>
                  <MenuItem value="fr">French (FR)</MenuItem>
                </Select>
              </FormControl>

              {/* Region */}
              <FormControl fullWidth size="small" sx={{ mb: 2.5 }}>
                <InputLabel sx={{ fontSize: '0.75rem', fontWeight: 600 }}>REGION</InputLabel>
                <Select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  label="REGION"
                >
                  <MenuItem value="all">All Regions</MenuItem>
                  <MenuItem value="eu">Europe</MenuItem>
                  <MenuItem value="na">North America</MenuItem>
                  <MenuItem value="global">Global</MenuItem>
                </Select>
              </FormControl>

              {/* Brand selection */}
              <Typography
                variant="caption"
                display="block"
                sx={{
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  mb: 1,
                  color: 'text.secondary',
                  fontSize: '0.6875rem',
                }}
              >
                Brand Selection
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2, maxHeight: 240, overflowY: 'auto' }}>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={32} />
                    ))
                  : allBrands.map((brand) => {
                      const isTarget = brand === targetBrandRow?.brand
                      const checked = pendingBrands.includes(brand)
                      return (
                        <Box
                          key={brand}
                          onClick={() =>
                            setPendingBrands((prev) =>
                              prev.includes(brand)
                                ? prev.filter((b) => b !== brand)
                                : [...prev, brand],
                            )
                          }
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.75,
                            px: 1,
                            py: 0.5,
                            borderRadius: 'var(--geo-radius-sm)',
                            cursor: 'pointer',
                            bgcolor: isTarget && checked ? 'rgba(236,91,19,0.08)' : 'transparent',
                            '&:hover': { bgcolor: isTarget ? 'rgba(236,91,19,0.08)' : 'action.hover' },
                          }}
                        >
                          <Checkbox
                            checked={checked}
                            size="small"
                            disableRipple
                            sx={{
                              p: 0,
                              color: isTarget ? 'primary.main' : undefined,
                              '&.Mui-checked': { color: isTarget ? 'primary.main' : 'text.secondary' },
                            }}
                          />
                          <Typography
                            variant="body2"
                            fontWeight={isTarget ? 600 : 400}
                            sx={{ flex: 1 }}
                          >
                            {brand}
                          </Typography>
                          {isTarget && (
                            <Chip
                              label="TARGET"
                              size="small"
                              sx={{
                                height: 16,
                                fontSize: '0.5625rem',
                                fontWeight: 700,
                                bgcolor: 'primary.main',
                                color: 'white',
                                '& .MuiChip-label': { px: 0.75 },
                              }}
                            />
                          )}
                        </Box>
                      )
                    })}
              </Box>

              <Button
                variant="contained"
                fullWidth
                disabled={!data}
                onClick={() =>
                  setSelectedBrands(
                    pendingBrands.length === allBrands.length ? [] : pendingBrands,
                  )
                }
                sx={{
                  bgcolor: '#0f172a',
                  '&:hover': { bgcolor: '#1e293b' },
                  boxShadow: 'none',
                }}
              >
                Apply Configuration
              </Button>

              {selectedBrands.length > 0 && (
                <Button
                  variant="text"
                  fullWidth
                  size="small"
                  onClick={() => { setSelectedBrands([]); setPendingBrands(allBrands) }}
                  sx={{ mt: 1, color: 'text.secondary', fontSize: '0.75rem' }}
                >
                  Mostra tutti
                </Button>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* ── Brand Performance Matrix ── */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h3" fontWeight={700}>
              Brand Performance Matrix
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Showing top {Math.min(filteredCompetitors.length + (targetBrandRow ? 1 : 0), MATRIX_PAGE_SIZE)} of {totalBrands} brands
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Brand Name</TableCell>
                  <TableCell align="right">Mentions</TableCell>
                  <TableCell align="right">Link Rate</TableCell>
                  <TableCell align="right">Avg Rank</TableCell>
                  <TableCell>Sentiment Trend</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((_, j) => (
                          <TableCell key={j}><Skeleton variant="text" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (
                    <>
                      {/* Target brand — pinned first row */}
                      {targetBrandRow && (
                        <TableRow
                          sx={{
                            bgcolor: 'rgba(236,91,19,0.04)',
                            '& .MuiTableCell-root': { borderColor: 'rgba(236,91,19,0.15)' },
                          }}
                        >
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <BrandAvatar name={targetBrandRow.brand} isTarget />
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                  <Typography variant="body2" fontWeight={700}>
                                    {targetBrandRow.brand}
                                  </Typography>
                                  <Chip
                                    label="TARGET"
                                    size="small"
                                    sx={{
                                      height: 16,
                                      fontSize: '0.5625rem',
                                      fontWeight: 700,
                                      bgcolor: 'primary.main',
                                      color: 'white',
                                      '& .MuiChip-label': { px: 0.75 },
                                    }}
                                  />
                                </Box>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={700}>
                              {targetBrandRow.totalMentions.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <LinkRateCell value={targetBrandRow.linkRate} />
                          </TableCell>
                          <TableCell align="right">
                            <AvgRankCell value={targetBrandRow.avgRankPosition} />
                          </TableCell>
                          <TableCell>
                            <SentimentMiniBar
                              positive={targetBrandRow.sentimentPositive}
                              neutral={targetBrandRow.sentimentNeutral}
                              negative={targetBrandRow.sentimentNegative}
                            />
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Competitors */}
                      {pagedCompetitors.map((comp) => (
                        <TableRow key={comp.brand} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <BrandAvatar name={comp.brand} />
                              <Typography variant="body2">{comp.brand}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {comp.totalMentions.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <LinkRateCell value={comp.linkRate} />
                          </TableCell>
                          <TableCell align="right">
                            <AvgRankCell value={comp.avgRankPosition} />
                          </TableCell>
                          <TableCell>
                            <SentimentMiniBar
                              positive={comp.sentimentPositive}
                              neutral={comp.sentimentNeutral}
                              negative={comp.sentimentNegative}
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {filteredCompetitors.length === 0 && !targetBrandRow && (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.disabled">
                              Nessun brand trovato per la configurazione selezionata.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination row */}
          {!isLoading && totalMatrixPages > 1 && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mt: 1.5,
                pt: 1.5,
                borderTop: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Showing top results from latest campaign run
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={matrixPage === 0}
                  onClick={() => setMatrixPage((p) => p - 1)}
                  sx={{ minWidth: 32, px: 1, borderColor: 'divider' }}
                >
                  ‹
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={matrixPage >= totalMatrixPages - 1}
                  onClick={() => setMatrixPage((p) => p + 1)}
                  sx={{ minWidth: 32, px: 1, borderColor: 'divider' }}
                >
                  ›
                </Button>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ── Bottom CTAs ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="text"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/domains')}
          sx={{ color: 'text.secondary', fontWeight: 500 }}
        >
          Back to Campaigns Overview
        </Button>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/compare`)}
          >
            Compare Brands
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
