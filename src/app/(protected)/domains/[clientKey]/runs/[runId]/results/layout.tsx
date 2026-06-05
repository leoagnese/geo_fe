/**
 * Results shared layout — header run + MUI Tabs sub-nav (SC-030–033).
 *
 * Header: run title, COMPLETED badge, ID + date, Export PDF + Re-run buttons.
 * Tabs: Summary | Query Metrics | Brand Analysis | LLM Report.
 *
 * @spec L1_design/screen-inventory.md §"SC-030–SC-033"
 */
'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Skeleton from '@mui/material/Skeleton'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ReplayIcon from '@mui/icons-material/Replay'
import { getDomain, getRun } from '@/lib/api-client'

interface ResultsLayoutProps {
  children: React.ReactNode
  params: { clientKey: string; runId: string }
}

const STATUS_LABEL: Record<string, { label: string; color: string; bgcolor: string }> = {
  done:      { label: 'COMPLETATA', color: '#16a34a', bgcolor: '#f0fdf4' },
  running:   { label: 'IN CORSO',   color: '#2563eb', bgcolor: '#eff6ff' },
  queued:    { label: 'IN CODA',    color: '#d97706', bgcolor: '#fffbeb' },
  error:     { label: 'ERRORE',     color: '#dc2626', bgcolor: '#fef2f2' },
  cancelled: { label: 'ANNULLATA',  color: '#475569', bgcolor: '#f1f5f9' },
}

export default function ResultsLayout({ children, params }: ResultsLayoutProps) {
  const { clientKey, runId } = params
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const { data: domainData } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const { data: runData, isLoading: runLoading } = useQuery({
    queryKey: ['run', clientKey, runId],
    queryFn: () => getRun(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
  })

  const domain = domainData?.data
  const run = runData?.data

  const base = `/domains/${clientKey}/runs/${runId}/results`
  const tabs = [
    { label: 'Riepilogo',          path: `${base}/overview` },
    { label: 'Query Metrics',      path: `${base}/keywords` },
    { label: 'Brand Analysis',     path: `${base}/ranking` },
    { label: 'Report LLM',         path: `${base}/personas` },
  ]
  const currentTab = Math.max(0, tabs.findIndex((t) => pathname.startsWith(t.path)))

  const statusCfg = STATUS_LABEL[run?.status ?? ''] ?? STATUS_LABEL.done
  const executedDate = run?.completedAt ?? run?.startedAt ?? run?.createdAt
  const shortRunId = runId.length > 12 ? runId.slice(0, 12) + '…' : runId

  const runTitle = domain?.brand
    ? `${domain.brand} — ${run?.profileKey ?? ''} Run`
    : runLoading
    ? ''
    : `Run ${shortRunId}`

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => router.push('/domains')}
        >
          Runs
        </Typography>
        <Typography variant="caption" color="text.disabled">›</Typography>
        <Typography variant="caption" color="primary.main" fontWeight={600}>
          {shortRunId} Analisi
        </Typography>
      </Box>

      {/* Page header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          {runLoading ? (
            <>
              <Skeleton variant="text" width={320} height={44} />
              <Skeleton variant="text" width={240} height={20} sx={{ mt: 0.5 }} />
            </>
          ) : (
            <>
              {/* Status badge + title */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                <Chip
                  label={statusCfg.label}
                  size="small"
                  sx={{
                    bgcolor: statusCfg.bgcolor,
                    color: statusCfg.color,
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    height: 22,
                    borderRadius: 'var(--geo-radius-sm)',
                    '& .MuiChip-label': { px: 1 },
                  }}
                />
              </Box>
              <Typography variant="h1" sx={{ fontWeight: 800, mb: 0.5 }}>
                {runTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ID:{' '}
                <Box component="span" sx={{ fontFamily: 'var(--geo-font-mono)', fontWeight: 600, color: 'primary.main' }}>
                  {runId}
                </Box>
                {executedDate && (
                  <>
                    {' · '}Eseguita:{' '}
                    {new Date(executedDate).toLocaleString('it-IT', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </Typography>
            </>
          )}
        </Box>

        {/* CTAs */}
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={() => router.push(`${base}/personas`)}
            sx={{ fontWeight: 600 }}
          >
            Esporta report
          </Button>
          <Button
            variant="contained"
            startIcon={<ReplayIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/new`)}
          >
            Avvia nuova run
          </Button>
        </Box>
      </Box>

      {/* Sticky tab bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 56,
          zIndex: 10,
          bgcolor: 'background.default',
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_e, idx: number) => router.push(tabs[idx].path)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          {tabs.map((tab) => (
            <Tab key={tab.path} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ pt: 3 }}>{children}</Box>
    </Box>
  )
}
