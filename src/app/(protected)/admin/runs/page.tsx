/**
 * SC-041 — Admin: global run monitor.
 *
 * All runs across all domains and analysts. DataGrid with search by domain or analyst.
 * Role-guarded: redirect if not admin.
 *
 * States:
 * - Loading: DataGrid skeleton + filters disabled
 * - Error 403: "Accesso negato" full-page
 * - Error 500: banner with retry
 * - Empty: "Nessuna run ancora sulla piattaforma"
 * - Populated: DataGrid with search
 *
 * @implements US-024
 * @validates AC-038
 * @spec L1_design/screen-inventory.md §"SC-041"
 * @spec L1_design/states-and-empty.md §"SC-041"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import StatusChip from '@/components/StatusChip'
import { getAdminRuns, type AdminRunRow, type RunStatus, type ApiSuccess } from '@/lib/api-client'

type AdminRunGridRow = AdminRunRow & { id: string }

const PAGE_SIZE = 50

export default function AdminRunsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<ApiSuccess<AdminRunRow[]>>({
    queryKey: ['admin-runs', page],
    queryFn: () =>
      getAdminRuns(session?.accessToken ?? '', { page: page + 1, limit: PAGE_SIZE }),
    enabled: !!session?.accessToken && session?.user?.role === 'admin',
  })

  if (session && session.user.role !== 'admin') return null

  const allRows: AdminRunGridRow[] = (data?.data ?? []).map((r) => ({ ...r, id: r.runId }))

  // Client-side search filter by clientKey
  const rows = search
    ? allRows.filter((r) => r.clientKey.toLowerCase().includes(search.toLowerCase()))
    : allRows

  const totalRuns = data?.meta?.total ?? 0

  const columns: GridColDef<AdminRunGridRow>[] = [
    {
      field: 'runId',
      headerName: 'Run ID',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Typography
          variant="caption"
          sx={{ fontFamily: 'var(--geo-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {params.value as string}
        </Typography>
      ),
    },
    { field: 'clientKey', headerName: 'Dominio', width: 160 },
    {
      field: 'status',
      headerName: 'Stato',
      width: 150,
      renderCell: (params) => <StatusChip status={params.value as RunStatus} />,
    },
    { field: 'profileKey', headerName: 'Profilo', width: 200 },
    {
      field: 'createdAt',
      headerName: 'Creata',
      width: 170,
      renderCell: (params) =>
        new Date(params.value as string).toLocaleString('it-IT'),
    },
    {
      field: 'completedAt',
      headerName: 'Completata',
      width: 170,
      renderCell: (params) =>
        params.value ? new Date(params.value as string).toLocaleString('it-IT') : '—',
    },
  ]

  if (isError) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Accesso negato
        </Typography>
        <Button variant="contained" onClick={() => router.push('/domains')}>
          Torna ai domini
        </Button>
      </Box>
    )
  }

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Run globali
      </Typography>

      <TextField
        placeholder="Cerca per domain (clientKey)…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="small"
        disabled={isLoading}
        sx={{ mb: 3, maxWidth: 400 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        }}
      />

      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void (refetch as () => void)()}>
              Riprova
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Impossibile caricare le run. Riprova.
        </Alert>
      )}

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          rowCount={totalRuns}
          paginationMode="server"
          paginationModel={{ page, pageSize: PAGE_SIZE }}
          onPaginationModelChange={(m) => setPage(m.page)}
          pageSizeOptions={[PAGE_SIZE]}
          disableRowSelectionOnClick
          onRowClick={(row) => {
            router.push(
              `/domains/${row.row.clientKey}/runs/${row.row.runId}`,
            )
          }}
          sx={{ cursor: 'pointer', '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' } }}
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
                  Nessuna run ancora sulla piattaforma.
                </Typography>
              </Box>
            ),
          }}
        />
      </Box>
    </Box>
  )
}
