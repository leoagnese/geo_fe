/**
 * Results shared layout — MUI Tabs sub-navigation for SC-030/031/032/033.
 *
 * Tabs: Riepilogo (/overview), Query Metrics (/keywords),
 *       Brand Analysis (/ranking), Report LLM (/personas).
 * Sticky below the page top nav per layouts.md §"Tab / sub-nav pattern".
 *
 * @spec L1_design/patterns/layouts.md §"Tab / sub-nav pattern"
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
import TuneIcon from '@mui/icons-material/Tune'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { getDomain } from '@/lib/api-client'

interface ResultsLayoutProps {
  children: React.ReactNode
  params: { clientKey: string; runId: string }
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

  const base = `/domains/${clientKey}/runs/${runId}/results`

  const tabs = [
    { label: 'Riepilogo', path: `${base}/overview` },
    { label: 'Query Metrics', path: `${base}/keywords` },
    { label: 'Brand Analysis', path: `${base}/ranking` },
    { label: 'Report LLM', path: `${base}/personas` },
  ]

  const currentTab = tabs.findIndex((t) => pathname.startsWith(t.path))

  return (
    <Box>
      {/* Breadcrumb */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => router.push('/domains')}
        >
          Campagne
        </Typography>
        <Typography variant="caption" color="text.disabled">›</Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}
          onClick={() => router.push(`/domains/${clientKey}`)}
        >
          {domainData?.data?.brand ?? clientKey}
        </Typography>
        <Typography variant="caption" color="text.disabled">›</Typography>
        <Typography variant="caption" color="text.secondary">Brand Analysis</Typography>
      </Box>

      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h1">Brand Analysis & Competitor Comparison</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {domainData?.data?.brand ?? clientKey} · {runId.split('T')[0]}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0 }}>
          <Button variant="outlined" size="small" startIcon={<TuneIcon />} sx={{ borderRadius: '20px' }}>
            Filtri
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={() => router.push(`/domains/${clientKey}/runs/${runId}/results/personas`)}
            sx={{ borderRadius: '20px' }}
          >
            Esporta Report
          </Button>
        </Box>
      </Box>

      {/* Sticky tab bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 64,
          zIndex: 10,
          bgcolor: 'background.default',
          pb: 0,
        }}
      >
        <Tabs
          value={currentTab === -1 ? 0 : currentTab}
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
