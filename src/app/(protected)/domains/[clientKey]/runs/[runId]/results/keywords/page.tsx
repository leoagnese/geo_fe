/**
 * SC-032 — Keyword breakdown.
 *
 * Primary view: horizontal bar chart sorted by visibility % descending (top 25 keywords).
 * Bar length communicates visibility %; single color #1565C0 (color.brand.primary).
 * Detailed data: Accordion (collapsed by default) containing the full DataGrid.
 *
 * States:
 * - Loading: Skeleton height 320
 * - Error: inline error with retry
 * - Empty: "Nessuna keyword trovata" Typography
 * - Populated: horizontal BarChart + collapsed Accordion with DataGrid
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
import Skeleton from '@mui/material/Skeleton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { BarChart } from '@mui/x-charts/BarChart'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getRunKeywords, type KeywordBreakdownRow } from '@/lib/api-client'

interface KeywordsPageProps {
  params: { clientKey: string; runId: string }
}

type KeywordRow = KeywordBreakdownRow & { id: string }

/** Truncate a string to maxLen characters, appending ellipsis if needed */
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

  const allRows: KeywordRow[] = (data?.data ?? []).map((r) => ({
    ...r,
    id: r.keyword,
  }))

  // Top 25 keywords by visibility, descending — chart dataset
  const chartRows = [...allRows]
    .sort((a, b) => b.visibilityPct - a.visibilityPct)
    .slice(0, 25)

  // Chart dimensions — 36px per keyword row, minimum 240px
  const chartHeight = Math.max(240, chartRows.length * 36)

  // BarChart expects arrays of values aligned with yAxis categories
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

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>
        Breakdown per keyword
      </Typography>

      {/* ── Error state ── */}
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

      {/* ── Loading state ── */}
      {isLoading && (
        <Skeleton variant="rounded" height={320} sx={{ mb: 3 }} />
      )}

      {/* ── Empty state ── */}
      {!isLoading && !isError && allRows.length === 0 && (
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Nessuna keyword trovata.
        </Typography>
      )}

      {/* ── Populated state: horizontal BarChart + Accordion DataGrid ── */}
      {!isLoading && !isError && allRows.length > 0 && (
        <>
          {/* Horizontal bar chart — top 25 keywords by visibility */}
          <Box sx={{ mb: 3, overflowX: 'auto' }}>
            <BarChart
              layout="horizontal"
              yAxis={[
                {
                  data: chartLabels,
                  scaleType: 'band',
                  // Y axis shows keyword names — no % sign needed here per spec
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
                  color: '#1565C0', // color.brand.primary — bar length communicates value
                  label: 'Visibility %',
                  valueFormatter: (v: number | null) =>
                    v !== null ? `${v.toFixed(1)}%` : '',
                },
              ]}
              height={chartHeight}
              margin={{ left: 180, right: 60, top: 16, bottom: 40 }}
            />
          </Box>

          {/* Accordion with full DataGrid — collapsed by default */}
          <Accordion defaultExpanded={false} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
    </Box>
  )
}
