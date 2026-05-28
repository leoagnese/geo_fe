/**
 * SC-043 — Admin: domain management (all domains, read-only oversight).
 *
 * Read-only DataGrid of all domains across all clientKeys.
 * Row click → SC-012 (domain homepage). No "Create domain" CTA (AC-004, AC-038).
 * Admin sees all; unlike SC-010 which is analyst-filtered.
 * Role-guarded.
 *
 * States:
 * - Loading: DataGrid skeleton
 * - Error 403: "Accesso negato"
 * - Error 500: banner with retry
 * - Empty: "Nessun dominio ancora sulla piattaforma"
 * - Populated: DataGrid with links
 *
 * @implements US-002, US-024
 * @validates AC-004, AC-038
 * @spec L1_design/screen-inventory.md §"SC-043"
 * @spec L1_design/states-and-empty.md §"SC-043"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getDomains, type Domain, type ApiSuccess } from '@/lib/api-client'

type DomainRow = Domain & { id: string }

export default function AdminDomainsPage() {
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  // Admin role → getDomains returns all domains (BE applies no filter for admin)
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<ApiSuccess<Domain[]>>({
    queryKey: ['admin-domains'],
    queryFn: () => getDomains(session?.accessToken ?? '', 1, 200),
    enabled: !!session?.accessToken && session?.user?.role === 'admin',
  })

  if (session && session.user.role !== 'admin') return null

  const rows: DomainRow[] = (data?.data ?? []).map((d) => ({ ...d, id: d._id }))

  const columns: GridColDef<DomainRow>[] = [
    { field: 'brand', headerName: 'Brand', flex: 1, minWidth: 180 },
    {
      field: 'clientKey',
      headerName: 'clientKey',
      width: 180,
      renderCell: (params) => (
        <Typography
          variant="caption"
          sx={{ fontFamily: 'var(--geo-font-mono)' }}
        >
          {params.value as string}
        </Typography>
      ),
    },
    { field: 'targetDomain', headerName: 'Dominio target', flex: 1, minWidth: 180 },
    {
      field: 'settori',
      headerName: 'Settori',
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {((params.value as string[]) ?? []).slice(0, 3).map((s: string) => (
            <Chip key={s} label={s} size="small" variant="outlined" />
          ))}
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Creato il',
      width: 150,
      renderCell: (params) =>
        new Date(params.value as string).toLocaleDateString('it-IT'),
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
      <Typography variant="h1" sx={{ mb: 1 }}>
        Tutti i domini
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Vista sola lettura — oversight admin. Click su una riga per vedere la homepage del dominio.
      </Typography>

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
          Impossibile caricare i domini. Riprova.
        </Alert>
      )}

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={isLoading}
          disableRowSelectionOnClick
          onRowClick={(row) => router.push(`/domains/${row.row.clientKey}`)}
          sx={{
            cursor: 'pointer',
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'background.default' },
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
                  Nessun dominio ancora sulla piattaforma.
                </Typography>
              </Box>
            ),
          }}
        />
      </Box>
    </Box>
  )
}
