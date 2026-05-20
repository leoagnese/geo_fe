/**
 * SC-010 — Domains dashboard.
 *
 * Two tabs: "Domini" (grid of domain cards) + "Analisi precedenti" (flat run list
 * across all analyst's domains, sorted by date desc).
 *
 * @implements US-004
 * @validates AC-008
 */
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useQueries } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import StatusChip from '@/components/StatusChip'
import { getDomains, getRuns, type Domain } from '@/lib/api-client'
import type { RunListItem, RunStatus } from '@/lib/api-client'

// ── Skeleton card (loading state) ──────────────────────────────

function DomainCardSkeleton() {
  return (
    <Card sx={{ height: 180 }}>
      <CardContent>
        <Skeleton variant="text" width="60%" height={32} />
        <Skeleton variant="text" width="40%" height={20} sx={{ mt: 0.5 }} />
        <Skeleton variant="text" width="80%" height={20} sx={{ mt: 1 }} />
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Skeleton variant="rounded" width={80} height={24} />
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>
        <Skeleton variant="rounded" width={100} height={24} sx={{ mt: 2 }} />
      </CardContent>
    </Card>
  )
}

// ── Domain card (populated state) ─────────────────────────────

interface DomainCardProps {
  domain: Domain
  onClick: () => void
}

function DomainCard({ domain, onClick }: DomainCardProps) {
  const settoriVisible = domain.settori?.slice(0, 3) ?? []
  const settoriMore = (domain.settori?.length ?? 0) - 3

  return (
    <Card sx={{ height: '100%', cursor: 'pointer' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', alignItems: 'flex-start' }}>
        <CardContent>
          <Typography variant="h3" gutterBottom noWrap>
            {domain.brand}
          </Typography>
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'var(--geo-font-mono)', display: 'block', mb: 0.5 }}
          >
            {domain.clientKey}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {domain.targetDomain}
          </Typography>
          {settoriVisible.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
              {settoriVisible.map((s) => (
                <Box
                  key={s}
                  component="span"
                  sx={{
                    px: 1,
                    py: 0.25,
                    borderRadius: 'var(--geo-radius-xs)',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {s}
                </Box>
              ))}
              {settoriMore > 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ lineHeight: '20px' }}>
                  +{settoriMore}
                </Typography>
              )}
            </Box>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

// ── Page component ─────────────────────────────────────────────

export default function DomainsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(0)

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['domains'],
    queryFn: () => getDomains(session?.accessToken ?? '', 1, 100),
    enabled: !!session?.accessToken,
  })

  const domains: Domain[] = data?.data ?? []

  const domainMap = useMemo(
    () => Object.fromEntries(domains.map((d) => [d.clientKey, d])),
    [domains],
  )

  // Fetch runs per domain — activated only when the "Analisi precedenti" tab is open
  const runQueries = useQueries({
    queries: domains.map((d) => ({
      queryKey: ['runs', d.clientKey],
      queryFn: () => getRuns(session?.accessToken ?? '', d.clientKey, { limit: 50 }),
      enabled: !!session?.accessToken && activeTab === 1,
    })),
  })

  const allRuns: (RunListItem & { brand: string })[] = useMemo(() => {
    return runQueries
      .flatMap((q) =>
        (q.data?.data ?? []).map((r) => ({
          ...r,
          brand: domainMap[r.clientKey]?.brand ?? r.clientKey,
        })),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [runQueries, domainMap])

  const runsLoading = runQueries.some((q) => q.isLoading && q.fetchStatus !== 'idle')

  // Client-side filter by brand / clientKey / targetDomain
  const filtered = domains.filter((d) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      d.brand.toLowerCase().includes(q) ||
      d.clientKey.toLowerCase().includes(q) ||
      d.targetDomain.toLowerCase().includes(q)
    )
  })

  return (
    <Box>
      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h1">Domini</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/domains/new')}
        >
          Nuovo dominio
        </Button>
      </Box>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v: number) => setActiveTab(v)}
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Domini" />
        <Tab label="Analisi precedenti" />
      </Tabs>

      {/* ── Tab 0: Domini ── */}
      {activeTab === 0 && (
        <>
          {!isLoading && domains.length > 0 && (
            <TextField
              placeholder="Cerca per brand, clientKey o dominio…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="small"
              sx={{ mb: 3, maxWidth: 400 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
          )}

          {isError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void refetch()}>
                  Ricarica
                </Button>
              }
              sx={{ mb: 3 }}
            >
              Impossibile caricare i domini. Riprova.
            </Alert>
          )}

          {isLoading && (
            <Grid container spacing={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Grid key={i} item xs={12} sm={6} md={4}>
                  <DomainCardSkeleton />
                </Grid>
              ))}
            </Grid>
          )}

          {!isLoading && !isError && domains.length === 0 && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 320,
                gap: 2,
              }}
            >
              <Typography variant="h3" color="text.secondary">
                Nessun dominio ancora
              </Typography>
              <Typography variant="body2" color="text.disabled">
                Crea il tuo primo cliente per iniziare.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={() => router.push('/domains/new')}
              >
                Crea dominio
              </Button>
            </Box>
          )}

          {!isLoading && !isError && domains.length > 0 && filtered.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="body1" color="text.secondary">
                Nessun dominio corrisponde alla ricerca &quot;{search}&quot;.
              </Typography>
              <Button variant="text" onClick={() => setSearch('')} sx={{ mt: 1 }}>
                Rimuovi filtro
              </Button>
            </Box>
          )}

          {!isLoading && filtered.length > 0 && (
            <Grid container spacing={3}>
              {filtered.map((domain) => (
                <Grid key={domain.clientKey} item xs={12} sm={6} md={4}>
                  <DomainCard
                    domain={domain}
                    onClick={() => router.push(`/domains/${domain.clientKey}`)}
                  />
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* ── Tab 1: Analisi precedenti ── */}
      {activeTab === 1 && (
        <>
          {runsLoading && (
            <Box sx={{ py: 4 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rectangular" height={48} sx={{ mb: 1, borderRadius: 1 }} />
              ))}
            </Box>
          )}

          {!runsLoading && allRuns.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h3" color="text.secondary">
                Nessuna analisi ancora
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                Le analisi avviate sui tuoi domini appariranno qui.
              </Typography>
            </Box>
          )}

          {!runsLoading && allRuns.length > 0 && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { bgcolor: 'background.default', fontWeight: 600 } }}>
                    <TableCell>Brand</TableCell>
                    <TableCell>clientKey</TableCell>
                    <TableCell>Stato</TableCell>
                    <TableCell>Profilo</TableCell>
                    <TableCell>Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allRuns.map((run) => (
                    <TableRow
                      key={run.runId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/domains/${run.clientKey}/runs/${run.runId}`)}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {run.brand}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          sx={{ fontFamily: 'var(--geo-font-mono)', color: 'text.disabled' }}
                        >
                          {run.clientKey}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={run.status as RunStatus} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {run.profileKey}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(run.createdAt).toLocaleDateString('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  )
}
