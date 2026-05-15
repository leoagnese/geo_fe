/**
 * SC-032 — Keyword breakdown table.
 *
 * DataGrid: keyword, queries executed, visibility %, avgRank, linkRate %, target mentions.
 * Sortable. Default sort: visibility % descending.
 *
 * States:
 * - Loading: DataGrid skeleton
 * - Error: inline error
 * - Empty: "Nessuna keyword trovata" DataGrid empty state
 * - Populated: sortable DataGrid
 *
 * @implements US-015
 * @validates AC-024
 * @spec L1_design/screen-inventory.md §"SC-032"
 * @spec L1_design/states-and-empty.md §"SC-032"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunKeywords, type KeywordBreakdownRow } from '@/lib/api-client'

interface KeywordsPageProps {
  params: { clientKey: string; runId: string }
}

type KeywordRow = KeywordBreakdownRow & { id: string }

export default function KeywordsPage({ params }: KeywordsPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['run-keywords', clientKey, runId],
    queryFn: () => getRunKeywords(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const rows: KeywordRow[] = (data?.data ?? []).map((r) => ({
    ...r,
    id: r.keyword,
  }))

  const columns: GridColDef<KeywordRow>[] = [
    { field: 'keyword', headerName: 'Keyword', flex: 1, minWidth: 200, sortable: true },
    {
      field: 'queriesExecuted',
      headerName: 'Query eseguite',
      width: 150,
      sortable: true,
      type: 'number',
    },
    {
      field: 'visibilityPct',
      headerName: 'Visibility %',
      width: 130,
      sortable: true,
      type: 'number',
      renderCell: (params) => `${((params.value as number) * 100).toFixed(1)}%`,
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
      field: 'linkRatePct',
      headerName: 'Link Rate %',
      width: 120,
      sortable: true,
      type: 'number',
      renderCell: (params) => `${((params.value as number) * 100).toFixed(1)}%`,
    },
    {
      field: 'targetMentions',
      headerName: 'Target Menzioni',
      width: 150,
      sortable: true,
      type: 'number',
    },
  ]

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Breakdown per keyword
      </Typography>

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Riprova
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Impossibile caricare il breakdown per keyword. Riprova.
        </Alert>
      )}

      <Box sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{
            sorting: { sortModel: [{ field: 'visibilityPct', sort: 'desc' }] },
          }}
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
                  Nessuna keyword trovata per questa run.
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
  )
}
