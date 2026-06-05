/**
 * SC-010 — Projects & Domains overview.
 *
 * Layout: search + filter bar → domain table (TARGET DOMAIN / CLIENT KEY /
 * ACTIVE RUNS / LAST ANALYSIS / VISIBILITY SCORE / ACTIONS) → 4 KPI summary
 * cards at bottom.
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
import Card from '@mui/material/Card'
import Skeleton from '@mui/material/Skeleton'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import InputAdornment from '@mui/material/InputAdornment'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import FilterListIcon from '@mui/icons-material/FilterList'
import LanguageIcon from '@mui/icons-material/Language'
import PublicIcon from '@mui/icons-material/Public'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import VisibilityIcon from '@mui/icons-material/Visibility'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import CloseIcon from '@mui/icons-material/Close'
import StatCard from '@/components/StatCard'
import { getDomains, getRuns, type Domain } from '@/lib/api-client'
import { getScoreColor } from '@/lib/theme'

const PAGE_SIZE = 8

// ── Visibility bar cell ────────────────────────────────────────

function VisibilityBar({ score }: { score: number | null }) {
  if (score === null) {
    return <Typography variant="caption" color="text.disabled">N/D</Typography>
  }
  const color = getScoreColor(score)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          flex: 1,
          maxWidth: 96,
          height: 6,
          bgcolor: '#f1f5f9',
          borderRadius: 'var(--geo-radius-full)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            height: '100%',
            width: `${score}%`,
            bgcolor: color,
            borderRadius: 'var(--geo-radius-full)',
          }}
        />
      </Box>
      <Typography
        sx={{ fontSize: '0.875rem', fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}
      >
        {score}%
      </Typography>
    </Box>
  )
}

// ── Active filter chip ─────────────────────────────────────────

function FilterChip({ label, onDelete }: { label: string; onDelete: () => void }) {
  return (
    <Chip
      label={label}
      onDelete={onDelete}
      deleteIcon={<CloseIcon sx={{ fontSize: '0.75rem !important' }} />}
      size="small"
      sx={{
        bgcolor: 'rgba(236,91,19,0.08)',
        color: 'primary.main',
        fontWeight: 600,
        fontSize: '0.75rem',
        '& .MuiChip-deleteIcon': { color: 'primary.main' },
      }}
    />
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function DomainsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['domains'],
    queryFn: () => getDomains(session?.accessToken ?? '', 1, 100),
    enabled: !!session?.accessToken,
  })

  const domains: Domain[] = data?.data ?? []

  const totalDomains = domains.length

  // Fetch runs per domain for "Active Runs" count and "Last Analysis" date
  const runQueries = useQueries({
    queries: domains.map((d) => ({
      queryKey: ['runs-count', d.clientKey],
      queryFn: () => getRuns(session?.accessToken ?? '', d.clientKey, { limit: 5 }),
      enabled: !!session?.accessToken && !isLoading,
    })),
  })

  const runCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    domains.forEach((d, i) => {
      map[d.clientKey] = runQueries[i]?.data?.meta?.total ?? runQueries[i]?.data?.data?.length ?? 0
    })
    return map
  }, [domains, runQueries])

  const lastRunMap = useMemo(() => {
    const map: Record<string, string | null> = {}
    domains.forEach((d, i) => {
      const runs = runQueries[i]?.data?.data ?? []
      map[d.clientKey] = runs[0]?.createdAt ?? null
    })
    return map
  }, [domains, runQueries])

  const totalActiveRuns = useMemo(
    () => Object.values(runCountMap).reduce((s, n) => s + n, 0),
    [runCountMap],
  )

  // Client-side filter
  const filtered = useMemo(() => {
    if (!search) return domains
    const q = search.toLowerCase()
    return domains.filter(
      (d) =>
        d.brand.toLowerCase().includes(q) ||
        d.clientKey.toLowerCase().includes(q) ||
        d.targetDomain.toLowerCase().includes(q),
    )
  }, [domains, search])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSearch = (v: string) => {
    setSearch(v)
    setPage(1)
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h1" sx={{ fontWeight: 800, mb: 0.5 }}>
            Projects &amp; Domains
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestisci i domini monitorati e le attività del workspace.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push('/domains/new')}
          sx={{ flexShrink: 0 }}
        >
          Create New Project
        </Button>
      </Box>

      {/* Search + filter bar */}
      <Card sx={{ mb: 2, p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            placeholder="Search domains (e.g. turismotorino.org)..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterListIcon />}
            sx={{ color: 'text.secondary', borderColor: 'divider', fontWeight: 500 }}
          >
            Client Key
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ color: 'text.secondary', borderColor: 'divider', fontWeight: 500 }}
          >
            Status: Active
          </Button>
        </Box>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {activeFilters.map((f) => (
              <FilterChip
                key={f}
                label={f}
                onDelete={() => setActiveFilters((prev) => prev.filter((x) => x !== f))}
              />
            ))}
            <Button
              variant="text"
              size="small"
              sx={{ color: 'primary.main', fontWeight: 600, fontSize: '0.75rem', p: 0, minWidth: 0 }}
              onClick={() => setActiveFilters([])}
            >
              Clear all filters
            </Button>
          </Box>
        )}
      </Card>

      {/* Error */}
      {isError && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void refetch()}>
              Ricarica
            </Button>
          }
          sx={{ mb: 2 }}
        >
          Impossibile caricare i domini.
        </Alert>
      )}

      {/* Domain table */}
      <Card sx={{ mb: 4, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Target Domain</TableCell>
                <TableCell>Client Key</TableCell>
                <TableCell align="center">Active Runs</TableCell>
                <TableCell>Last Analysis</TableCell>
                <TableCell>Visibility Score</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton variant="text" width={j === 0 ? 160 : j === 4 ? 120 : 80} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

              {!isLoading && paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">
                      {search ? `Nessun risultato per "${search}"` : 'Nessun dominio trovato.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!isLoading &&
                paginated.map((domain) => {
                  const lastRun = lastRunMap[domain.clientKey]
                  const score: number | null = null
                  const activeRuns = runCountMap[domain.clientKey] ?? 0

                  return (
                    <TableRow
                      key={domain.clientKey}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/domains/${domain.clientKey}`)}
                    >
                      {/* Target domain */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: '1rem', color: 'text.disabled' }} />
                          </Box>
                          <Typography variant="body2" fontWeight={600}>
                            {domain.targetDomain || domain.brand}
                          </Typography>
                        </Box>
                      </TableCell>

                      {/* Client key */}
                      <TableCell>
                        <Chip
                          label={domain.clientKey}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: 'text.secondary',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            borderRadius: 'var(--geo-radius-sm)',
                          }}
                        />
                      </TableCell>

                      {/* Active runs */}
                      <TableCell align="center">
                        <Typography variant="body2" fontWeight={600}>
                          {activeRuns}
                        </Typography>
                      </TableCell>

                      {/* Last analysis */}
                      <TableCell>
                        {lastRun ? (
                          <Box>
                            <Typography variant="body2" fontWeight={500}>
                              {new Date(lastRun).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </Typography>
                            <Typography variant="caption" color="text.disabled">
                              {new Date(lastRun).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>

                      {/* Visibility score */}
                      <TableCell sx={{ minWidth: 160 }}>
                        <VisibilityBar score={score} />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => router.push(`/domains/${domain.clientKey}`)}
                          sx={{
                            borderColor: 'primary.main',
                            color: 'primary.main',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            '&:hover': { bgcolor: 'rgba(236,91,19,0.06)' },
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {!isLoading && filtered.length > PAGE_SIZE && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Showing {(page - 1) * PAGE_SIZE + 1} to{' '}
              {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} results
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              size="small"
              sx={{
                '& .MuiPaginationItem-root.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                },
              }}
            />
          </Box>
        )}
      </Card>

      {/* Bottom KPI summary cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
        <StatCard
          label="Total Domains"
          value={isLoading ? '—' : String(totalDomains)}
          icon={<PublicIcon sx={{ fontSize: '1.5rem' }} />}
        />
        <StatCard
          label="Active Runs"
          value={isLoading ? '—' : String(totalActiveRuns)}
          icon={<RocketLaunchIcon sx={{ fontSize: '1.5rem' }} />}
        />
        <StatCard
          label="Avg. Visibility"
          value="—"
          icon={<VisibilityIcon sx={{ fontSize: '1.5rem' }} />}
        />
        <StatCard
          label="New Clients (MoM)"
          value="+12%"
          delta={{ label: '+12%', positive: true }}
          icon={<TrendingUpIcon sx={{ fontSize: '1.5rem' }} />}
        />
      </Box>
    </Box>
  )
}
