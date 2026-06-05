/**
 * SC-032 — Query Metrics / Keyword Performance.
 *
 * Layout (screen9 mockup):
 *   1. Header + 3 KPI cards
 *   2. Two-column: ScatterChart risk matrix (left) | AI Insights sidebar (right)
 *   3. Keyword performance table with status badges, sort, and detail link
 *   4. Persona breakdown (collapsed)
 *
 * @implements US-015, US-016
 * @validates AC-024, AC-025
 */
'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import SearchIcon from '@mui/icons-material/Search'
import dynamic from 'next/dynamic'
import StatCard from '@/components/StatCard'
import StatusBadge from '@/components/StatusBadge'
import { getRunKeywords, getRunPersonas, type KeywordBreakdownRow } from '@/lib/api-client'

const ScatterChart = dynamic(
  () => import('@mui/x-charts/ScatterChart').then((m) => m.ScatterChart),
  { loading: () => <Skeleton variant="rounded" height={300} />, ssr: false },
)

interface KeywordsPageProps {
  params: { clientKey: string; runId: string }
}

// ── Keyword performance zone ────────────────────────────────────
type PerfZone = 'leading' | 'competitive' | 'rising' | 'critical'
function perfZone(vis: number): PerfZone {
  if (vis >= 0.6) return 'leading'
  if (vis >= 0.4) return 'competitive'
  if (vis >= 0.2) return 'rising'
  return 'critical'
}
const ZONE_COLOR: Record<PerfZone, string> = {
  leading:     '#16a34a',
  competitive: '#d97706',
  rising:      '#2563eb',
  critical:    '#dc2626',
}
const ZONE_BADGE: Record<PerfZone, React.ComponentProps<typeof StatusBadge>['variant']> = {
  leading:     'leading',
  competitive: 'competitive',
  rising:      'rising',
  critical:    'critical',
}

// ── AI insight helper ───────────────────────────────────────────
interface Insight { icon: string; title: string; body: string; severity: 'error' | 'warning' | 'info' | 'success' }
function computeInsights(rows: KeywordBreakdownRow[]): Insight[] {
  const insights: Insight[] = []
  if (rows.length === 0) return insights

  const critical = rows.filter((r) => r.visibilityPct < 0.2)
  const highRank  = rows.filter((r) => r.avgRankPosition !== null && r.avgRankPosition > 7)
  const lowLink   = rows.filter((r) => r.linkRatePct < 0.05)
  const leaders   = rows.filter((r) => r.visibilityPct >= 0.6)

  if (critical.length > 0) {
    insights.push({
      icon: '⚠️',
      title: `${critical.length} keyword critiche`,
      body: `Le keyword ${critical.slice(0, 2).map((r) => `"${r.keyword}"`).join(', ')}${critical.length > 2 ? ` +${critical.length - 2} altre` : ''} hanno visibilità < 20%. Priorità alta.`,
      severity: 'error',
    })
  }
  if (highRank.length > 2) {
    insights.push({
      icon: '📉',
      title: `${highRank.length} keyword con rank elevato`,
      body: `Rank medio > 7 per ${highRank.length} keyword. Contenuti poco rilevanti o ottimizzazione insufficiente.`,
      severity: 'warning',
    })
  }
  if (lowLink.length > 0) {
    insights.push({
      icon: '🔗',
      title: 'Opportunità link building',
      body: `${lowLink.length} keyword con link rate < 5%. Il brand non viene citato con link in queste query.`,
      severity: 'info',
    })
  }
  if (leaders.length > 0) {
    insights.push({
      icon: '✅',
      title: `${leaders.length} keyword leader`,
      body: `Stai dominando ${leaders.length} keyword strategiche. Mantieni i contenuti aggiornati per conservare il vantaggio.`,
      severity: 'success',
    })
  }
  return insights
}

export default function KeywordsPage({ params }: KeywordsPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['run-keywords', clientKey, runId],
    queryFn: () => getRunKeywords(token, clientKey, runId),
    enabled: !!token,
  })

  const { data: personasData, isLoading: personasLoading } = useQuery({
    queryKey: ['run-personas', clientKey, runId],
    queryFn: () => getRunPersonas(token, clientKey, runId),
    enabled: !!token,
  })

  // ── Derived ─────────────────────────────────────────────────────
  const allRows = data?.data ?? []

  const sorted = useMemo(
    () => [...allRows].sort((a, b) => b.visibilityPct - a.visibilityPct),
    [allRows],
  )

  const stats = useMemo(() => {
    if (!allRows.length) return { total: 0, avgVis: 0, critical: 0 }
    const avg = allRows.reduce((s, r) => s + r.visibilityPct, 0) / allRows.length
    const crit = allRows.filter((r) => r.visibilityPct < 0.2).length
    return { total: allRows.length, avgVis: avg, critical: crit }
  }, [allRows])

  const insights = useMemo(() => computeInsights(allRows), [allRows])

  // ScatterChart: 4 series by zone, x=visibility%, y=avgRank (inverted: lower rank = higher y-value)
  const scatterSeries = useMemo(() => {
    const zones: Record<PerfZone, Array<{ x: number; y: number; id: string }>> = {
      leading: [], competitive: [], rising: [], critical: [],
    }
    for (const r of allRows) {
      if (r.avgRankPosition === null) continue
      const zone = perfZone(r.visibilityPct)
      zones[zone].push({
        x: parseFloat((r.visibilityPct * 100).toFixed(1)),
        y: parseFloat((11 - r.avgRankPosition).toFixed(1)), // invert so y-up = better rank
        id: r.keyword,
      })
    }
    return (Object.keys(zones) as PerfZone[])
      .filter((z) => zones[z].length > 0)
      .map((zone) => ({
        type: 'scatter' as const,
        label: zone.charAt(0).toUpperCase() + zone.slice(1),
        data: zones[zone],
        color: ZONE_COLOR[zone],
        markerSize: 5,
      }))
  }, [allRows])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

      {/* ── Header ── */}
      <Box>
        <Typography variant="h2" fontWeight={800} mb={0.5}>Performance keyword</Typography>
        <Typography variant="body2" color="text.secondary">
          Risk matrix · Analisi visibilità per keyword estratte da questa run
        </Typography>
      </Box>

      {/* ── Error ── */}
      {isError && (
        <Alert
          severity="error"
          action={<Button size="small" color="inherit" onClick={() => void refetch()}>Riprova</Button>}
        >
          Impossibile caricare le keyword. Riprova.
        </Alert>
      )}

      {/* ── 3 KPI cards ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={96} sx={{ borderRadius: 2 }} />)
        ) : (
          <>
            <StatCard
              label="Keyword totali"
              value={stats.total.toString()}
              icon={<SearchIcon sx={{ fontSize: '1.25rem' }} />}
            >
              <Typography variant="caption" color="text.disabled">Analizzate in questa run</Typography>
            </StatCard>
            <StatCard
              label="Visibilità media"
              value={`${(stats.avgVis * 100).toFixed(1)}%`}
              delta={{ label: '+3.2%', positive: true }}
            >
              <Box sx={{ height: 4, bgcolor: '#f1f5f9', borderRadius: 'var(--geo-radius-full)', overflow: 'hidden', mt: 0.5 }}>
                <Box sx={{ height: '100%', width: `${stats.avgVis * 100}%`, bgcolor: 'primary.main', borderRadius: 'inherit' }} />
              </Box>
            </StatCard>
            <StatCard
              label="Sottoperformanti"
              value={stats.critical.toString()}
              delta={stats.critical > 0 ? { label: 'Richiede attenzione', positive: false } : undefined}
              icon={<WarningAmberIcon sx={{ fontSize: '1.25rem', color: '#dc2626' }} />}
            >
              <Typography variant="caption" color={stats.critical > 0 ? 'error' : 'text.disabled'}>
                {stats.critical > 0 ? `${stats.critical} keyword sotto il 20%` : 'Nessuna keyword critica'}
              </Typography>
            </StatCard>
          </>
        )}
      </Box>

      {/* ── Risk matrix + AI insights ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 2 }}>

        {/* Scatter: Risk matrix */}
        <Card>
          <CardContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h3" fontWeight={700}>Matrice di rischio</Typography>
              <Typography variant="caption" color="text.disabled">
                Visibility % (asse X) vs. AI Rank (asse Y, invertito: più alto = rank migliore)
              </Typography>
            </Box>

            {isLoading ? (
              <Skeleton variant="rounded" height={300} />
            ) : scatterSeries.length === 0 ? (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="body2" color="text.disabled">Dati insufficienti per la matrice.</Typography>
              </Box>
            ) : (
              <ScatterChart
                series={scatterSeries}
                xAxis={[{ min: 0, max: 100, label: 'Visibilità %', tickNumber: 5 }]}
                yAxis={[{ min: 0, max: 10, label: 'Rank (inv.)', tickNumber: 5 }]}
                height={300}
                margin={{ left: 50, right: 20, top: 20, bottom: 50 }}
                grid={{ horizontal: true, vertical: false }}
              />
            )}

            {/* Zone legend */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1.5 }}>
              {(Object.keys(ZONE_COLOR) as PerfZone[]).map((z) => (
                <Box key={z} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: ZONE_COLOR[z] }} />
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                    {z}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* AI Insights sidebar */}
        <Card sx={{ bgcolor: '#fafafa' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LightbulbIcon sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
              <Typography variant="h3" fontWeight={700}>AI Insights</Typography>
            </Box>

            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.5, borderRadius: 2 }} />
              ))
            ) : insights.length === 0 ? (
              <Typography variant="body2" color="text.disabled">
                Nessun insight disponibile.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {insights.map((ins, i) => (
                  <Alert
                    key={i}
                    severity={ins.severity}
                    icon={false}
                    sx={{
                      fontSize: '0.75rem',
                      alignItems: 'flex-start',
                      '& .MuiAlert-message': { fontSize: '0.75rem' },
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} display="block" mb={0.25}>
                      {ins.icon} {ins.title}
                    </Typography>
                    {ins.body}
                  </Alert>
                ))}

                {stats.critical > 0 && (
                  <Alert
                    severity="info"
                    icon={<TrendingDownIcon fontSize="small" />}
                    sx={{ fontSize: '0.75rem', '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                  >
                    <strong>Raccomandazione:</strong> Concentra i contenuti sulle keyword critiche con intento di acquisto. Considera Q&A strutturati per migliorare la citation rate nelle risposte LLM.
                  </Alert>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* ── Keyword performance table ── */}
      <Card>
        <CardContent sx={{ pb: '16px !important' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h3" fontWeight={700}>Tabella performance keyword</Typography>
            <Typography variant="caption" color="text.disabled">
              {allRows.length} keyword totali
            </Typography>
          </Box>

          {isLoading ? (
            <Skeleton variant="rounded" height={300} />
          ) : sorted.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: 'center' }}>
              Nessuna keyword trovata per questa run.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Keyword</TableCell>
                    <TableCell align="center">Stato</TableCell>
                    <TableCell align="center">Visibilità</TableCell>
                    <TableCell align="center">Rank medio</TableCell>
                    <TableCell align="center">Link Rate</TableCell>
                    <TableCell align="center">Menzioni</TableCell>
                    <TableCell align="right">Dettaglio</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sorted.slice(0, 20).map((row) => {
                    const zone = perfZone(row.visibilityPct)
                    return (
                      <TableRow key={row.keyword} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                            {row.keyword}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {row.queriesExecuted} query
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <StatusBadge variant={ZONE_BADGE[zone]} />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25 }}>
                            <Typography variant="body2" fontWeight={700} color={ZONE_COLOR[zone]}>
                              {(row.visibilityPct * 100).toFixed(1)}%
                            </Typography>
                            <Box sx={{ width: 56, height: 3, bgcolor: '#f1f5f9', borderRadius: 'var(--geo-radius-full)', overflow: 'hidden' }}>
                              <Box sx={{ height: '100%', width: `${row.visibilityPct * 100}%`, bgcolor: ZONE_COLOR[zone], borderRadius: 'inherit' }} />
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Typography
                            variant="body2"
                            fontWeight={700}
                            color={row.avgRankPosition !== null && row.avgRankPosition <= 3 ? 'success.main' : 'text.primary'}
                          >
                            {row.avgRankPosition !== null ? `#${row.avgRankPosition.toFixed(1)}` : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${(row.linkRatePct * 100).toFixed(0)}%`}
                            size="small"
                            sx={{
                              bgcolor: row.linkRatePct >= 0.7 ? '#fef2f2' : '#f8fafc',
                              color: row.linkRatePct >= 0.7 ? '#dc2626' : 'text.secondary',
                              fontWeight: 700,
                              height: 20,
                              fontSize: '0.6875rem',
                              borderRadius: 'var(--geo-radius-sm)',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {row.targetMentions}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Link
                            href={`/domains/${clientKey}/runs/${runId}/results/keywords/${encodeURIComponent(row.keyword)}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Button variant="text" size="small" sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem', minWidth: 0 }}>
                              Dettaglio →
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {sorted.length > 20 && (
            <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 1 }}>
              Mostrando 20 di {sorted.length} keyword. Usa i filtri per esplorare.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* ── Persona breakdown (collapsed) ── */}
      <Accordion
        sx={{
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 'var(--geo-radius-md) !important',
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={700}>Breakdown per Persona</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          {personasLoading ? (
            <Skeleton variant="rounded" height={200} sx={{ m: 2 }} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Persona</TableCell>
                    <TableCell align="center">Query</TableCell>
                    <TableCell align="center">Visibilità %</TableCell>
                    <TableCell align="center">Rank medio</TableCell>
                    <TableCell align="center">Menzioni</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(personasData?.data ?? []).map((p) => (
                    <TableRow key={p.personaId} hover>
                      <TableCell><Typography variant="body2" fontWeight={600}>{p.personaName}</Typography></TableCell>
                      <TableCell align="center"><Typography variant="body2">{p.queriesExecuted}</Typography></TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={700} color={ZONE_COLOR[perfZone(p.visibilityPct)]}>
                          {(p.visibilityPct * 100).toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {p.avgRankPosition !== null ? `#${p.avgRankPosition.toFixed(1)}` : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center"><Typography variant="body2">{p.targetMentions}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  )
}
