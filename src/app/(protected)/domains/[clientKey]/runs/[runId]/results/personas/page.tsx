/**
 * SC-033 — Report LLM.
 *
 * Mostra il report markdown generato da n8n, con link per scaricare XLSX e MD da Drive.
 * Polling ogni 5 s finché files è vuoto.
 *
 * States:
 * - Loading / generazione in corso: spinner + messaggio
 * - Upload error: Alert warning non-bloccante
 * - Populated (md): Card con rendering HTML del markdown
 * - Populated (solo xlsx): bottone download, nessun contenuto testuale
 *
 * @implements US-017
 * @validates AC-026, AC-027
 * @spec L1_design/screen-inventory.md §"SC-033"
 * @spec L1_design/states-and-empty.md §"SC-033"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Card from '@mui/material/Card'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadIcon from '@mui/icons-material/Download'
import { getRunReport, type ReportFile } from '@/lib/api-client'

interface ReportLlmPageProps {
  params: { clientKey: string; runId: string }
}

type ReportFileWithContent = ReportFile & { content?: string }

function markdownToHtml(md: string): string {
  return md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^]*?<\/li>)/gm, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo])/gm, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
}

export default function ReportLlmPage({ params }: ReportLlmPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()

  const {
    data: reportData,
    isLoading: reportLoading,
  } = useQuery({
    queryKey: ['run-report', clientKey, runId],
    queryFn: () => getRunReport(session?.accessToken ?? '', clientKey, runId),
    enabled: !!session?.accessToken,
    refetchInterval: (query) => {
      const files = query.state.data?.data?.files
      return !files || files.length === 0 ? 5_000 : false
    },
  })

  const report = reportData?.data
  const mdFile = report?.files.find((f) => f.type === 'md') as ReportFileWithContent | undefined
  const xlsxFile = report?.files.find((f) => f.type === 'xlsx')

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2">Report LLM</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {xlsxFile?.driveUrl && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              href={xlsxFile.driveUrl}
              target="_blank"
              size="small"
            >
              Scarica XLSX
            </Button>
          )}
          {mdFile?.driveUrl && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              href={mdFile.driveUrl}
              target="_blank"
              size="small"
            >
              Scarica Report
            </Button>
          )}
        </Box>
      </Box>

      {report?.uploadError && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {report.uploadError}
        </Alert>
      )}

      {(reportLoading || (!report?.files.length && !report?.uploadError)) && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 4 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Report in generazione, disponibile a breve…
          </Typography>
        </Box>
      )}

      {mdFile?.content && (
        <Card sx={{ p: { xs: 2, md: 4 } }}>
          <Box
            sx={{
              '& h1': { fontSize: '1.5rem', fontWeight: 700, mt: 3, mb: 1.5, color: 'text.primary' },
              '& h2': { fontSize: '1.125rem', fontWeight: 700, mt: 3, mb: 1, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
              '& h3': { fontSize: '1rem', fontWeight: 600, mt: 2, mb: 0.5 },
              '& p': { mb: 1.5, lineHeight: 1.7, color: 'text.secondary' },
              '& ul, & ol': { pl: 3, mb: 1.5 },
              '& li': { mb: 0.5, color: 'text.secondary' },
              '& strong': { color: 'text.primary', fontWeight: 600 },
              '& table': { width: '100%', borderCollapse: 'collapse', mb: 2 },
              '& th': { bgcolor: 'background.default', fontWeight: 600, p: 1, borderBottom: '2px solid', borderColor: 'divider', textAlign: 'left' },
              '& td': { p: 1, borderBottom: '1px solid', borderColor: 'divider' },
            }}
            dangerouslySetInnerHTML={{ __html: markdownToHtml(mdFile.content) }}
          />
        </Card>
      )}
    </Box>
  )
}
