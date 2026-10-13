/**
 * Campaign sources: top domains summed over the done sections, target share per persona × section,
 * and the download of the data the dashboard consumes (one block per section plus the overall one).
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PersonaTopicMatrix from '@/components/PersonaTopicMatrix'
import TopDomainsTable from '@/components/TopDomainsTable'
import { getCampaignDashboardData, getCampaignSources } from '@/lib/api-client'
import { downloadText } from '@/lib/download'

export default function CampaignSources({ clientKey, campaignId }: { clientKey: string; campaignId: string }) {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const [lang, setLang] = useState('all')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const { data } = useQuery({
    queryKey: ['campaign-sources', clientKey, campaignId, lang],
    queryFn: () => getCampaignSources(token, clientKey, campaignId, lang),
    enabled: !!token,
  })
  const s = data?.data
  const personaNames = Object.fromEntries((s?.personas ?? []).map((p) => [p.id, p.name]))

  const download = async () => {
    setBusy(true)
    setError(false)
    try {
      const res = await getCampaignDashboardData(token, clientKey, campaignId)
      downloadText(JSON.stringify(res.data, null, 2), `dashboard-data-${campaignId}.json`)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="h3" fontWeight={700}>Fonti citate</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_e, v: string | null) => v && setLang(v)} aria-label="Lingua">
            <ToggleButton value="all">Tutte</ToggleButton>
            <ToggleButton value="it">IT</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="fr">FR</ToggleButton>
          </ToggleButtonGroup>
          <Button variant="outlined" size="small" startIcon={<FileDownloadIcon />} disabled={busy} onClick={download}>
            Scarica dati dashboard (JSON)
          </Button>
        </Box>
      </Box>
      {error && <Alert severity="error">Download non riuscito. Riprova.</Alert>}
      {s && (
        <>
          <Typography variant="caption" color="text.secondary">
            {s.topDomains.totalMentions} menzioni con link in {s.topDomains.totalQueries} query, sommate sui settori completati.
          </Typography>
          <TopDomainsTable rows={s.topDomains.rows} metric="mentions" target={null} />
          <Typography variant="subtitle2">Quota di citazioni al dominio target per persona e settore</Typography>
          <PersonaTopicMatrix matrix={s.matrix} personaNames={personaNames} />
        </>
      )}
    </Paper>
  )
}
