/**
 * SC-033 — Persona breakdown table.
 *
 * DataGrid: persona name, queries, visibility %, avgRank, linkRate %, target mentions.
 * Sortable. Layout mirrors SC-032. Default sort: visibility % descending.
 *
 * States:
 * - Loading: DataGrid skeleton
 * - Error: inline error
 * - Empty: "Nessuna persona trovata" DataGrid empty state
 * - Populated: sortable DataGrid
 *
 * @implements US-016
 * @validates AC-025
 * @spec L1_design/screen-inventory.md §"SC-033"
 * @spec L1_design/states-and-empty.md §"SC-033"
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
import { getRunPersonas, type PersonaBreakdownRow } from '@/lib/api-client'

interface PersonasPageProps {
  params: { clientKey: string; runId: string }
}

type PersonaRow = PersonaBreakdownRow & { id: string }

export default function PersonasPage({ params }: PersonasPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['run-personas', clientKey, runId],
    queryFn: () => getRunPersonas(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const rows: PersonaRow[] = (data?.data ?? []).map((r) => ({
    ...r,
    id: r.personaId,
  }))

  const columns: GridColDef<PersonaRow>[] = [
    {
      field: 'personaName',
      headerName: 'Persona',
      flex: 1,
      minWidth: 220,
      sortable: true,
    },
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
        Breakdown per persona
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
          Impossibile caricare il breakdown per persona. Riprova.
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
                  Nessuna persona trovata per questa run.
                  {rows.length === 0 && (
                    <Box component="span" display="block" mt={0.5}>
                      <Typography variant="caption" color="text.disabled">
                        Se la run era in testMode con 0 query, nessuna persona potrebbe essere stata processata.
                      </Typography>
                    </Box>
                  )}
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
