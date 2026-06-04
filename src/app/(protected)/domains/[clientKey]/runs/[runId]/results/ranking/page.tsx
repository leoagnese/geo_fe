/**
 * SC-031 — Brand Analysis: Competitive Landscape, Sentiment by Brand, Brand Performance Matrix.
 *
 * Layout: 2-column grid (left ~68%, right sidebar ~32% sticky).
 * Left column:
 *   1. Competitive Landscape — ScatterChart (avgRankPosition vs aiVisibilityScore)
 *   2. Sentiment per Brand — stacked bar per brand (top 5 competitor + target)
 *   3. Brand Performance Matrix — target brand pinned row + DataGrid competitors
 * Right sidebar: "Configurazione Analisi" — brand checkbox filter with Apply button.
 *
 * States:
 * - Loading: Skeleton placeholders per section
 * - Error: Alert with retry CTA replacing all sections
 * - Empty (no competitors): DataGrid empty overlay
 * - Populated: full layout
 *
 * @implements US-014
 * @validates AC-022, AC-023
 * @spec L1_design/screen-inventory.md §"SC-031"
 * @spec L1_design/states-and-empty.md §"SC-031"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import Alert from '@mui/material/Alert'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'
import Checkbox from '@mui/material/Checkbox'
import Divider from '@mui/material/Divider'
import { useTheme } from '@mui/material/styles'
import TuneIcon from '@mui/icons-material/Tune'
import { ScatterChart } from '@mui/x-charts/ScatterChart'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunRanking, type BrandRankRow, type TargetBrandRow } from '@/lib/api-client'
import { getScoreColor } from '@/lib/theme'

interface RankingPageProps {
  params: { clientKey: string; runId: string }
}

type RankingRow = BrandRankRow & { id: number }

const PAGE_SIZE = 25

// ── Grid columns (sentiment columns removed — shown in Sentiment by Brand) ──
const gridColumns: GridColDef<RankingRow>[] = [
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
]

// ── Helper: small metric block used in the target brand pinned row ──
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ textAlign: 'right' }}>
      <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', fontSize: 10 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  )
}

export default function RankingPage({ params }: RankingPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const theme = useTheme()

  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: PAGE_SIZE })
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]) // vuoto = tutti
  const [pendingBrands, setPendingBrands] = useState<string[]>([])

  // Fetch all brands at once (limit 100) so charts have the full picture
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['run-ranking', clientKey, runId],
    queryFn: () =>
      getRunRanking(session?.accessToken ?? '', clientKey, runId, 1, 100),
    enabled: !!session?.accessToken,
  })

  const ranking = data?.data
  const targetBrandRow: TargetBrandRow | undefined = ranking?.targetBrandRow
  const allCompetitors: BrandRankRow[] = ranking?.competitors ?? []
  const totalCompetitors = data?.meta?.total ?? allCompetitors.length

  // All brand names (target first, then competitors)
  const allBrands: string[] = [
    ...(targetBrandRow ? [targetBrandRow.brand] : []),
    ...allCompetitors.map((c) => c.brand),
  ]

  // Initialise pendingBrands once when data arrives
  useEffect(() => {
    if (allBrands.length > 0 && pendingBrands.length === 0) {
      setPendingBrands(allBrands)
    }
    // intentionally depends only on allBrands.length to run once on data arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allBrands.length])

  // Applied filter — empty selectedBrands means "show all"
  const filteredCompetitors: BrandRankRow[] =
    selectedBrands.length === 0
      ? allCompetitors
      : allCompetitors.filter((c) => selectedBrands.includes(c.brand))

  // ── Section 1: Competitive Landscape scatter data ──
  const targetScatter =
    targetBrandRow && targetBrandRow.avgRankPosition !== null
      ? [
          {
            x: targetBrandRow.avgRankPosition ?? 0,
            y: targetBrandRow.aiVisibilityScore,
            id: targetBrandRow.brand,
          },
        ]
      : []

  const competitorScatter = filteredCompetitors
    .filter((c) => c.avgRankPosition !== null)
    .map((c) => ({
      x: c.avgRankPosition!,
      y: c.aiVisibilityScore,
      id: c.brand,
    }))

  // ── Section 2: Sentiment by Brand — target + top 5 competitors ──
  const sentimentBrands: Array<(TargetBrandRow | BrandRankRow) & { isTarget: boolean }> = [
    ...(targetBrandRow ? [{ ...targetBrandRow, isTarget: true as const }] : []),
    ...filteredCompetitors.slice(0, 5).map((c) => ({ ...c, isTarget: false as const })),
  ]

  // ── Section 3: DataGrid rows — client-side pagination over filteredCompetitors ──
  const pagedCompetitors: RankingRow[] = filteredCompetitors
    .slice(paginationModel.page * PAGE_SIZE, (paginationModel.page + 1) * PAGE_SIZE)
    .map((r) => ({ ...r, id: r.rank }))

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' },
        gap: 3,
        alignItems: 'flex-start',
      }}
    >
      {/* ════════════════════ LEFT COLUMN ════════════════════ */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* ── Error state ── */}
        {isError && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => void refetch()}>
                Riprova
              </Button>
            }
          >
            Impossibile caricare il ranking. Riprova.
          </Alert>
        )}

        {/* ══════════════ SECTION 1: Competitive Landscape ══════════════ */}
        {isLoading ? (
          <Skeleton variant="rounded" height={340} />
        ) : !isError ? (
          <Card sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="body1" fontWeight={700}>
                  Competitive Landscape
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Brand visibility vs posizione media
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Target brand
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'grey.400' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Competitor
                  </Typography>
                </Box>
              </Box>
            </Box>

            {targetScatter.length > 0 || competitorScatter.length > 0 ? (
              <ScatterChart
                series={[
                  ...(targetScatter.length > 0
                    ? [{ data: targetScatter, label: 'Target', color: theme.palette.primary.main, markerSize: 12 }]
                    : []),
                  ...(competitorScatter.length > 0
                    ? [{ data: competitorScatter, label: 'Competitor', color: '#90A4AE', markerSize: 8 }]
                    : []),
                ]}
                xAxis={[{ label: 'Posizione media', min: 0, reverse: false }]}
                yAxis={[{ label: 'AI Visibility Score' }]}
                height={300}
                margin={{ left: 60, right: 20, top: 20, bottom: 50 }}
              />
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ py: 4, textAlign: 'center' }}
              >
                Dati di posizione non disponibili per questa run.
              </Typography>
            )}
          </Card>
        ) : null}

        {/* ══════════════ SECTION 2: Sentiment per Brand ══════════════ */}
        {isLoading ? (
          <Skeleton variant="rounded" height={240} />
        ) : !isError ? (
          <Card sx={{ p: 2 }}>
            <Typography variant="body1" fontWeight={700} mb={2}>
              Sentiment per Brand
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {sentimentBrands.map((brand) => (
                <Box key={brand.brand}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        fontWeight={brand.isTarget ? 700 : 400}
                        color="text.primary"
                        sx={{ textTransform: 'uppercase', fontSize: 11 }}
                      >
                        {brand.brand}
                      </Typography>
                      {brand.isTarget && (
                        <Chip
                          label="target"
                          size="small"
                          color="primary"
                          sx={{
                            height: 16,
                            fontSize: 9,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      color={brand.sentimentPositive >= 0.6 ? 'success.main' : 'text.secondary'}
                      fontWeight={600}
                    >
                      {(brand.sentimentPositive * 100).toFixed(0)}% POSITIVO
                    </Typography>
                  </Box>

                  {/* Stacked sentiment bar */}
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      overflow: 'hidden',
                      display: 'flex',
                      bgcolor: 'divider',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${brand.sentimentPositive * 100}%`,
                        bgcolor: 'success.main',
                        transition: 'width 0.5s',
                      }}
                    />
                    <Box
                      sx={{
                        width: `${brand.sentimentNeutral * 100}%`,
                        bgcolor: 'grey.400',
                        transition: 'width 0.5s',
                      }}
                    />
                    <Box
                      sx={{
                        width: `${brand.sentimentNegative * 100}%`,
                        bgcolor: 'error.main',
                        transition: 'width 0.5s',
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>

            {/* Legend */}
            <Box sx={{ display: 'flex', gap: 3, mt: 2 }}>
              {(
                [
                  ['Positivo', 'success.main'],
                  ['Neutro', 'grey.400'],
                  ['Negativo', 'error.main'],
                ] as const
              ).map(([label, color]) => (
                <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Card>
        ) : null}

        {/* ══════════════ SECTION 3: Brand Performance Matrix ══════════════ */}
        {isLoading ? (
          <Skeleton variant="rounded" height={540} />
        ) : !isError ? (
          <Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1.5,
              }}
            >
              <Typography variant="body1" fontWeight={700}>
                Brand Performance Matrix
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Top {Math.min(filteredCompetitors.length, PAGE_SIZE)} di {totalCompetitors} brand
              </Typography>
            </Box>

            {/* Target brand pinned row — AC-023 */}
            {targetBrandRow && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  mb: 0.5,
                  bgcolor: 'primary.main',
                  borderRadius: 'var(--geo-radius-sm)',
                  color: 'primary.contrastText',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {targetBrandRow.brand[0]?.toUpperCase()}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: 'inherit' }}
                      noWrap
                    >
                      {targetBrandRow.brand}
                    </Typography>
                    <Chip
                      label="target"
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: 9,
                        bgcolor: 'rgba(255,255,255,0.25)',
                        color: 'inherit',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                  <Metric label="Menzioni" value={String(targetBrandRow.totalMentions)} />
                  <Metric
                    label="Link Rate"
                    value={`${(targetBrandRow.linkRate * 100).toFixed(1)}%`}
                  />
                  <Metric
                    label="Avg Rank"
                    value={
                      targetBrandRow.avgRankPosition !== null
                        ? `#${targetBrandRow.avgRankPosition.toFixed(1)}`
                        : 'N/D'
                    }
                  />
                </Box>
              </Box>
            )}

            <Box sx={{ height: 480 }}>
              <DataGrid
                rows={pagedCompetitors}
                columns={gridColumns}
                loading={isLoading}
                rowCount={filteredCompetitors.length}
                paginationMode="client"
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
                  '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
                }}
              />
            </Box>
          </Box>
        ) : null}
      </Box>

      {/* ════════════════════ RIGHT SIDEBAR ════════════════════ */}
      <Box sx={{ position: { lg: 'sticky' }, top: { lg: 80 } }}>
        <Card sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TuneIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="body1" fontWeight={700}>
              Configurazione Analisi
            </Typography>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ mb: 0.75, fontWeight: 600 }}
          >
            SELEZIONE BRAND
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
              mb: 2,
              maxHeight: 320,
              overflowY: 'auto',
            }}
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" height={32} />
                ))
              : allBrands.map((brand) => {
                  const isTarget = brand === targetBrandRow?.brand
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
                        gap: 1,
                        p: 0.75,
                        borderRadius: 1,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Checkbox
                        checked={pendingBrands.includes(brand)}
                        size="small"
                        disableRipple
                        sx={{ p: 0 }}
                        color={isTarget ? 'primary' : 'default'}
                      />
                      <Typography variant="body2" fontWeight={isTarget ? 600 : 400}>
                        {brand}
                      </Typography>
                      {isTarget && (
                        <Chip
                          label="target"
                          size="small"
                          color="primary"
                          sx={{
                            ml: 'auto',
                            height: 16,
                            fontSize: 9,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      )}
                    </Box>
                  )
                })}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Button
            variant="contained"
            fullWidth
            size="small"
            onClick={() =>
              setSelectedBrands(
                pendingBrands.length === allBrands.length ? [] : pendingBrands,
              )
            }
            disabled={!data}
            sx={{ borderRadius: '20px' }}
          >
            Applica configurazione
          </Button>

          {selectedBrands.length > 0 && (
            <Button
              variant="text"
              fullWidth
              size="small"
              onClick={() => {
                setSelectedBrands([])
                setPendingBrands(allBrands)
              }}
              sx={{ mt: 1, color: 'text.secondary', fontSize: 12 }}
            >
              Mostra tutti
            </Button>
          )}
        </Card>
      </Box>
    </Box>
  )
}
