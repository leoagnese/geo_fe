/**
 * SC-010 — Domains dashboard.
 *
 * Primary landing page after login. Grid of domain cards, each showing
 * clientKey, targetDomain, brand, latest run status + date.
 * Search bar (client-side filter). "New domain" CTA button.
 *
 * States:
 * - Loading: skeleton grid (4-6 card placeholders)
 * - Error: full-width error banner with retry
 * - Empty (first-use): centered illustration + "Crea dominio" CTA (AC-008)
 * - Populated: grid of domain cards (AC-008)
 *
 * @implements US-004
 * @validates AC-008
 * @spec L1_design/screen-inventory.md §"SC-010"
 * @spec L1_design/states-and-empty.md §"SC-010"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
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
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import StatusChip from '@/components/StatusChip'
import { getDomains, type Domain } from '@/lib/api-client'
import type { RunStatus } from '@/lib/api-client'

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
          {/* Brand name — text.scale.h3 */}
          <Typography variant="h3" gutterBottom noWrap>
            {domain.brand}
          </Typography>

          {/* clientKey — text.scale.caption, monospace */}
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ fontFamily: 'var(--geo-font-mono)', display: 'block', mb: 0.5 }}
          >
            {domain.clientKey}
          </Typography>

          {/* targetDomain — text.scale.body2 */}
          <Typography variant="body2" color="text.secondary" noWrap>
            {domain.targetDomain}
          </Typography>

          {/* Settori tags */}
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
          mb: 3,
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

      {/* Search bar */}
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

      {/* Error state */}
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

      {/* Loading state — skeleton grid (4-6 placeholders) */}
      {isLoading && (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} item xs={12} sm={6} md={4}>
              <DomainCardSkeleton />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state (first-use) — AC-008 */}
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

      {/* Filtered-empty state */}
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

      {/* Populated state — domain cards grid */}
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
    </Box>
  )
}
