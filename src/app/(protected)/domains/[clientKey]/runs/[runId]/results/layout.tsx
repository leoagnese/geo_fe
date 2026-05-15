/**
 * Results shared layout — MUI Tabs sub-navigation for SC-030/031/032/033.
 *
 * Tabs: Overview (/overview), Brand Ranking (/ranking),
 *       Keywords (/keywords), Personas (/personas).
 * Sticky below the page top nav per layouts.md §"Tab / sub-nav pattern".
 *
 * @spec L1_design/patterns/layouts.md §"Tab / sub-nav pattern"
 * @spec L1_design/screen-inventory.md §"SC-030–SC-033"
 */
'use client'

import { usePathname, useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

interface ResultsLayoutProps {
  children: React.ReactNode
  params: { clientKey: string; runId: string }
}

export default function ResultsLayout({ children, params }: ResultsLayoutProps) {
  const { clientKey, runId } = params
  const pathname = usePathname()
  const router = useRouter()

  const base = `/domains/${clientKey}/runs/${runId}/results`

  const tabs = [
    { label: 'Overview', path: `${base}/overview` },
    { label: 'Brand Ranking', path: `${base}/ranking` },
    { label: 'Keywords', path: `${base}/keywords` },
    { label: 'Personas', path: `${base}/personas` },
  ]

  const currentTab = tabs.findIndex((t) => pathname.startsWith(t.path))

  return (
    <Box>
      {/* Run context header */}
      <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'var(--geo-font-mono)', display: 'block', mb: 1 }}>
        {runId}
      </Typography>
      <Typography variant="h1" sx={{ mb: 2 }}>
        Risultati
      </Typography>

      {/* Sticky tab bar */}
      <Box
        sx={{
          position: 'sticky',
          top: 64, // below AppBar
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

      <Divider />

      {/* Tab content */}
      <Box sx={{ pt: 3 }}>{children}</Box>
    </Box>
  )
}
