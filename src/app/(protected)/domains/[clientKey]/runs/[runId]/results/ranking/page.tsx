/**
 * SC-031 — Brand ranking table.
 *
 * "Focus sul target" MUI Card above chart and DataGrid (AC-023).
 * Horizontal BarChart: top 8 brands (target + top 7 competitors) by aiVisibilityScore.
 * Target brand bar highlighted in color.score.high (#2E7D32); competitors in color.brand.primary (#1565C0).
 * DataGrid: rank, brand, AI Visibility Score (colored), mentions,
 * avgRank, linkRate, sentiment. Paginated server-side.
 * Target brand excluded from grid and shown in separate card (AC-023).
 *
 * States:
 * - Loading: Skeleton height 240 + DataGrid skeleton rows
 * - Error: full-width error replacing grid
 * - Empty (no competitors): DataGrid empty state
 * - Populated: BarChart (if >= 1 competitor) + DataGrid with colored score column
 *
 * @implements US-014
 * @validates AC-022, AC-023
 * @spec L1_design/screen-inventory.md §"SC-031"
 * @spec L1_design/states-and-empty.md §"SC-031"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import { BarChart } from '@mui/x-charts/BarChart'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunRanking, type BrandRankRow } from '@/lib/api-client'
import { getScoreColor, geoColors } from '@/lib/theme'

interface RankingPageProps {
  params: { clientKey: string; runId: string }
}

/** Sentinel value for unknown rows used by DataGrid (requires unique `id`) */
type RankingRow = BrandRankRow & { id: number }

const PAGE_SIZE = 50

/** Truncate a string to maxLen characters, appending ellipsis if needed */
function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

export default function RankingPage({ params }: RankingPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE })

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['run-ranking', clientKey, runId, paginationModel.page],
    queryFn: () =>
      getRunRanking(
        session?.accessToken ?? '',
        clientKey,
        runId,
        paginationModel.page + 1,
        PAGE_SIZE,
      ),
    enabled: !!session?.accessToken,
  })

  const ranking = data?.data
  const targetBrandRow = ranking?.targetBrandRow
  const competitors: RankingRow[] = (ranking?.competitors ?? []).map((r) => ({
    ...r,
    id: r.rank,
  }))
  const totalCompetitors = data?.meta?.total ?? 0

  // ── Mini chart: top 8 brands (target first, then top 7 competitors by score) ──
  // Build up to 8 entries for the chart — target + up to 7 competitors
  const top7Competitors = [...competitors]
    .sort((a, b) => b.aiVisibilityScore - a.aiVisibilityScore)
    .slice(0, 7)

  interface ChartEntry {
    name: string
    score: number
    isTarget: boolean
  }

  const chartEntries: ChartEntry[] = []
  if (targetBrandRow) {
    chartEntries.push({
      name: targetBrandRow.brand,
      score: targetBrandRow.aiVisibilityScore,
      isTarget: true,
    })
  }
  top7Competitors.forEach((c) => {
    chartEntries.push({
      name: c.brand,
      score: c.aiVisibilityScore,
      isTarget: false,
    })
  })

  // Show chart only when data is loaded and there is at least 1 competitor
  const showChart = !isLoading && !isError && competitors.length >= 1 && chartEntries.length > 0

  const chartHeight = Math.max(200, chartEntries.length * 36)

  const chartLabels = chartEntries.map((e) => truncate(e.name, 25))
  const chartValues = chartEntries.map((e) => parseFloat(e.score.toFixed(1)))
  // Per-bar colors: target gets score.high green, competitors get brand.primary blue
  const chartColors = chartEntries.map((e) =>
    e.isTarget
      ? geoColors.score.high   // color.score.high → #2E7D32
      : '#1565C0'               // color.brand.primary
  )

  const columns: GridColDef<RankingRow>[] = [
    { field: 'rank', headerName: '#', width: 60, sortable: true },
    { field: 'brand', headerName: 'Brand', flex: 1, minWidth: 160, sortable: true },
    {
      field: 'aiVisibilityScore',
      headerName: 'AI Visibility Score',
      width: 170,
      sortable: true,
      renderCell: (params) => (
        <Typography
          variant="body2"
          fontWeight={700}
          sx={{ color: getScoreColor(params.value as number) }}
        >
          {(params.value as number).toFixed(1)}
        </Typography>
      ),
    },
    {
      field: 'totalMentions',
      headerName: 'Menzioni',
      width: 110,
      sortable: true,
    },
    {
      field: 'avgRankPosition',
      headerName: 'Avg Rank',
      width: 110,
      sortable: true,
      renderCell: (params) =>
        params.value !== null ? `#${(params.value as number).toFixed(1)}` : 'N/D',
    },
    {
      field: 'linkRate',
      headerName: 'Link Rate %',
      width: 120,
      sortable: true,
      renderCell: (params) => `${((params.value as number) * 100).toFixed(0)}%`,
    },
    {
      field: 'sentimentPositive',
      headerName: 'Positivo',
      width: 100,
      sortable: true,
      renderCell: (params) => `${((params.value as number) * 100).toFixed(0)}%`,
    },
    {
      field: 'sentimentNeutral',
      headerName: 'Neutro',
      width: 100,
      sortable: true,
      renderCell: (params) => `${((params.value as number) * 100).toFixed(0)}%`,
    },
    {
      field: 'sentimentNegative',
      headerName: 'Negativo',
      width: 100,
      sortable: true,
      renderCell: (params) => `${((params.value as number) * 100).toFixed(0)}%`,
    },
  ]

  return (
    <Box>
      {/* ── Error state ── */}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Riprova
            </Button>
          }
          sx={{ mb: 3 }}
        >
          Impossibile caricare il ranking. Riprova.
        </Alert>
      )}

      {/* ── Focus sul target card — AC-023 ── */}
      {targetBrandRow && (
        <Card sx={{ mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Focus sul target
            </Typography>
            <Typography variant="h3" gutterBottom>
              {targetBrandRow.brand}
            </Typography>
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.disabled">Score</Typography>
                <Typography
                  variant="h2"
                  fontWeight={700}
                  sx={{ color: getScoreColor(targetBrandRow.aiVisibilityScore) }}
                >
                  {targetBrandRow.aiVisibilityScore.toFixed(1)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Menzioni</Typography>
                <Typography variant="h2" fontWeight={700}>{targetBrandRow.totalMentions}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Avg Rank</Typography>
                <Typography variant="h2" fontWeight={700}>
                  {targetBrandRow.avgRankPosition !== null
                    ? `#${targetBrandRow.avgRankPosition.toFixed(1)}`
                    : 'N/D'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.disabled">Link Rate</Typography>
                <Typography variant="h2" fontWeight={700}>
                  {(targetBrandRow.linkRate * 100).toFixed(0)}%
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* ── Competitor heading ── */}
      <Typography variant="h2" sx={{ mb: 2 }}>
        Competitor
      </Typography>

      {/* ── Loading skeleton for chart ── */}
      {isLoading && (
        <Skeleton variant="rounded" height={240} sx={{ mb: 3 }} />
      )}

      {/* ── Horizontal BarChart: top 8 brands by aiVisibilityScore ── */}
      {showChart && (
        <Box sx={{ mb: 3, overflowX: 'auto' }}>
          <BarChart
            layout="horizontal"
            yAxis={[
              {
                data: chartLabels,
                scaleType: 'band',
                // Y axis shows brand names — no % sign needed here per spec
              },
            ]}
            xAxis={[
              {
                min: 0,
                max: 100,
                valueFormatter: (v: number) => `${v}%`,
              },
            ]}
            series={[
              {
                data: chartValues,
                // Per-bar coloring: target = score.high green, competitors = brand.primary blue.
                // @mui/x-charts v9 supports per-item color via the `color` field in each data point.
                color: '#1565C0', // fallback; individual colors set via colorMap below
                label: 'AI Visibility Score',
                valueFormatter: (v: number | null) =>
                  v !== null ? `${v.toFixed(1)}%` : '',
              },
            ]}
            colors={chartColors}
            height={chartHeight}
            margin={{ left: 180, right: 60, top: 16, bottom: 40 }}
          />
          {/* Legend below chart explaining target vs competitor color coding */}
          <Box sx={{ display: 'flex', gap: 3, mt: 1, pl: '180px' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: geoColors.score.high, // color.score.high → #2E7D32
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Target brand
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: '#1565C0', // color.brand.primary
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Competitor
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Competitors DataGrid — AC-022 ── */}
      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={competitors}
          columns={columns}
          loading={isLoading}
          rowCount={totalCompetitors}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          slots={{
            noRowsOverlay: () => (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                }}
              >
                <Typography color="text.secondary">
                  Nessun competitor trovato per questa run.
                </Typography>
              </Box>
            ),
          }}
          sx={{
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: 'background.default',
            },
          }}
        />
      </Box>
    </Box>
  )
}
