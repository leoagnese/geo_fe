'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import { getRunProcessedItems, getRunReportBlob, getRunSources } from '@/lib/api-client'
import { downloadBlob } from '@/lib/download'
import { buildProcessedSheets } from '@/lib/processedWorkbook'
import { saveWorkbook } from '@/lib/saveWorkbook'
import { useDataMode } from '@/lib/useDataMode'

const LANGS = ['all', 'it', 'en', 'fr'] as const

/** Downloads the Excel that matches the data mode: the raw report of the run, or the processed workbook. */
export default function ResultsDownloadButton({ clientKey, runId }: { clientKey: string; runId: string }) {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const { mode } = useDataMode()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)

  const run = async () => {
    setBusy(true)
    setError(false)
    try {
      if (mode === 'raw') {
        downloadBlob(await getRunReportBlob(token, clientKey, runId, 'xlsx'), `${runId}.xlsx`)
      } else {
        const [list, items] = await Promise.all([
          Promise.all(LANGS.map((l) => getRunSources(token, clientKey, runId, l))),
          getRunProcessedItems(token, clientKey, runId),
        ])
        const [all, it, en, fr] = list.map((r) => r.data)
        await saveWorkbook(buildProcessedSheets({ sources: { all, it, en, fr }, items: items.data }), `${runId}-elaborato.xlsx`)
      }
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="outlined" startIcon={<FileDownloadIcon />} disabled={busy} onClick={run} sx={{ fontWeight: 600 }}>
        {mode === 'raw' ? 'Scarica Excel raw' : 'Scarica Excel elaborato'}
      </Button>
      {error && <Alert severity="error">Download non riuscito. Riprova.</Alert>}
    </>
  )
}
