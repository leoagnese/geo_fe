/**
 * SC-032 — Query Metrics.
 *
 * Sezione 1: horizontal bar chart top-25 keyword + accordion DataGrid dettagliato.
 * Sezione 2: breakdown per persona in DataGrid.
 *
 * States:
 * - Loading: Skeleton height 320
 * - Error: inline error con retry
 * - Empty: "Nessuna keyword trovata" Typography
 * - Populated: horizontal BarChart + Accordion DataGrid + sezione Personas
 *
 * @implements US-015, US-016
 * @validates AC-024, AC-025
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
import Skeleton from '@mui/material/Skeleton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { BarChart } from '@mui/x-charts/BarChart'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunKeywords, getRunPersonas, type KeywordBreakdownRow, type PersonaBreakdownRow } from '@/lib/api-client'

interface KeywordsPageProps {
  params: { clientKey: string; runId: string }
}

type KeywordRow = KeywordBreakdownRow & { id: string }
type PersonaRow = PersonaBreakdownRow & { id: string }

function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen)}…` : s
}

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

  const {
    data: personasData,
    isLoading: personasLoading,
  } = useQuery({
    queryKey: ['run-personas', clientKey, runId],
    queryFn: () => getRunPersonas(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const allRows: KeywordRow[] = (data?.data ?? []).map((r) => ({
    ...r,
    id: r.keyword,
  }))

  const chartRows = [...allRows]
    .sort((a, b) => b.visibilityPct - a.visibilityPct)
    .slice(0, 25)

  const chartHeight = Math.max(240, chartRows.length * 36)

  const chartLabels = chartRows.map((r) => truncate(r.keyword, 30))
  const chartValues = chartRows.map((r) =>
    parseFloat((r.visibilityPct * 100).toFixed(1))
  )

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

  const personaColumns: GridColDef<PersonaRow>[] = [
    { field: 'personaName', headerName: 'Persona', flex: 1, minWidth: 200 },
    { field: 'queriesExecuted', headerName: 'Query', width: 100, type: 'number' },
    {
      field: 'visibilityPct',
      headerName: 'Visibility %',
      width: 130,
      renderCell: (p) => `${((p.value as number) * 100).toFixed(1)}%`,
    },
    {
      field: 'avgRankPosition',
      headerName: 'Avg Rank',
      width: 110,
      renderCell: (p) => p.value !== null ? `#${(p.value as number).toFixed(1)}` : 'N/D',
    },
    { field: 'targetMentions', headerName: 'Menzioni', width: 120, type: 'number' },
  ]

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Query Metrics
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

      {isLoading && (
        <Skeleton variant="rounded" height={320} sx={{ mb: 3 }} />
      )}

      {!isLoading && !isError && allRows.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Nessuna keyword trovata.
        </Typography>
      )}

      {!isLoading && !isError && allRows.length > 0 && (
        <>
          <Box sx={{ mb: 3, overflowX: 'auto' }}>
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  data: chartLabels,
                  scaleType: 'band',
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
                  color: '#1565C0',
                  label: 'Visibility %',
                  valueFormatter: (v: number | null) =>
                    v !== null ? `${v.toFixed(1)}%` : '',
                },
              ]}
              height={chartHeight}
              margin={{ left: 180, right: 60, top: 16, bottom: 40 }}
            />
          </Box>

          <Accordion
            defaultExpanded={false}
            sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>
                Dati dettagliati
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Box sx={{ height: 520 }}>
                <DataGrid
                  rows={allRows}
                  columns={columns}
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
                    border: 'none',
                  }}
                />
              </Box>
            </AccordionDetails>
          </Accordion>
        </>
      )}

      <Box sx={{ mt: 5 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>
          Breakdown per Persona
        </Typography>

        {personasLoading && <Skeleton variant="rounded" height={200} />}

        {personasData && (
          <Box sx={{ height: 400 }}>
            <DataGrid
              rows={(personasData.data ?? []).map((r) => ({ ...r, id: r.personaId }))}
              columns={personaColumns}
              disableRowSelectionOnClick
              initialState={{ sorting: { sortModel: [{ field: 'visibilityPct', sort: 'desc' }] } }}
              sx={{ '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' } }}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
