/**
 * SC-031 — Brand ranking table.
 *
 * "Focus sul target" MUI Card above DataGrid (AC-023).
 * DataGrid: rank, brand, AI Visibility Score (colored), mentions,
 * avgRank, linkRate, sentiment. Paginated server-side.
 * Target brand excluded from grid and shown in separate card (AC-023).
 *
 * States:
 * - Loading: DataGrid skeleton rows
 * - Error: full-width error replacing grid
 * - Empty (no competitors): DataGrid empty state
 * - Populated: DataGrid with colored score column
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
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunRanking, type BrandRankRow } from '@/lib/api-client'
import { getScoreColor } from '@/lib/theme'

interface RankingPageProps {
  params: { clientKey: string; runId: string }
}

/** Sentinel value for unknown rows used by DataGrid (requires unique `id`) */
type RankingRow = BrandRankRow & { id: number }

const PAGE_SIZE = 50

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
      {/* Error state */}
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

      {/* Focus sul target card — AC-023 */}
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

      {/* Competitors DataGrid — AC-022 */}
      <Typography variant="h2" sx={{ mb: 2 }}>
        Competitor
      </Typography>
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
