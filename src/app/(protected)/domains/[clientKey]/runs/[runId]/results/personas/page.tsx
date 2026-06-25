/**
 * SC-033 — Personas Management & Report LLM.
 *
 * Manages personas for a run:
 * - Display configured personas with edit/delete actions
 * - Empty state: "No personas configured" with button to add
 * - Form to add new personas from static catalog
 * - Removes hardcoded personas, allows manual configuration per run
 *
 * @implements US-017
 * @validates AC-026, AC-027
 */
'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import DownloadIcon from '@mui/icons-material/Download'
import ArticleIcon from '@mui/icons-material/Article'
import TableChartIcon from '@mui/icons-material/TableChart'
import LightbulbIcon from '@mui/icons-material/Lightbulb'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { getRunReport, getRunKeywords, getRunPersonas, getDomain, postDomainPersona, deleteDomainPersona, type ReportFile, type Persona } from '@/lib/api-client'

interface PersonasPageProps {
  params: { clientKey: string; runId: string }
}

type ReportFileWithContent = ReportFile

interface ConfiguredPersona extends Persona {
  configuredAt?: string
}

// ── Markdown → safe HTML ────────────────────────────────────────
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[^]*?<\/li>)+/gm, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hulo\/<])/gm, '<p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<[hul])/g, '$1')
}

// ── Browser-side file download ──────────────────────────────────
function downloadFile(file: ReportFileWithContent) {
  let blob: Blob
  const name = file.fileName ?? `geo-report.${file.type}`

  if (file.type === 'md' && file.content) {
    blob = new Blob([file.content], { type: 'text/markdown;charset=utf-8' })
  } else if (file.type === 'xlsx' && file.base64) {
    const binary = atob(file.base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  } else if (file.driveUrl) {
    window.open(file.driveUrl, '_blank')
    return
  } else {
    return
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

// ── Navigation section item ─────────────────────────────────────
function TocItem({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      onClick={onClick}
      sx={{
        py: 0.75, px: 1.5,
        borderRadius: 'var(--geo-radius-sm)',
        cursor: 'pointer',
        bgcolor: active ? 'primary.main' : 'transparent',
        color: active ? 'white' : 'text.secondary',
        fontWeight: active ? 700 : 400,
        fontSize: '0.8125rem',
        transition: 'all 120ms ease',
        '&:hover': { bgcolor: active ? 'primary.main' : 'action.hover' },
      }}
    >
      {label}
    </Box>
  )
}

export default function PersonasPage({ params }: PersonasPageProps) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const queryClient = useQueryClient()

  const [configuredPersonas, setConfiguredPersonas] = useState<ConfiguredPersona[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemoving, setIsRemoving] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const contextRef = useRef<HTMLInputElement>(null)
  const searchStyleRef = useRef<HTMLInputElement>(null)

  // Load personas from domain catalog
  const { data: domainPersonas } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(token, clientKey),
    enabled: !!token,
    staleTime: 0,
    select: (data) => (data?.data?.personas ?? []) as ConfiguredPersona[],
  })

  // Seed local (mutable) state from the query result. Doing this in an effect —
  // NOT inside `select` — is essential: calling setState during render (which is
  // what `select` runs in) triggers an infinite render loop once the query
  // succeeds. React Query memoizes the select output, so this fires only when the
  // catalog actually changes.
  useEffect(() => {
    if (domainPersonas) setConfiguredPersonas(domainPersonas)
  }, [domainPersonas])

  const { data: reportData, isLoading: reportLoading, isError: reportError } = useQuery({
    queryKey: ['run-report', clientKey, runId],
    queryFn: () => getRunReport(token, clientKey, runId),
    enabled: !!token,
    retry: 3,
    refetchInterval: (query) => {
      // Stop polling once the request has errored — otherwise the page polls
      // a 404/500 forever and the spinner never resolves.
      if (query.state.status === 'error') return false
      const files = query.state.data?.data?.files
      return !files || files.length === 0 ? 5_000 : false
    },
  })

  const { data: kwData, isLoading: kwLoading } = useQuery({
    queryKey: ['run-keywords', clientKey, runId],
    queryFn: () => getRunKeywords(token, clientKey, runId),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const { data: personasData, isLoading: personasLoading } = useQuery({
    queryKey: ['run-personas', clientKey, runId],
    queryFn: () => getRunPersonas(token, clientKey, runId),
    enabled: !!token,
    staleTime: 5 * 60_000,
  })

  const report = reportData?.data
  const mdFile = report?.files.find((f) => f.type === 'md') as ReportFileWithContent | undefined
  const xlsxFile = report?.files.find((f) => f.type === 'xlsx')
  const isGenerating =
    !reportError && (reportLoading || (!report?.files.length && !report?.uploadError))

  const allKw = kwData?.data ?? []
  const allPersonas = personasData?.data ?? []

  const handleAddPersona = async () => {
    const name = nameRef.current?.value.trim() ?? ''
    const description = descRef.current?.value.trim() ?? ''
    const context = contextRef.current?.value.trim() ?? ''
    const searchStyle = searchStyleRef.current?.value.trim() ?? ''

    if (!name || !description || !context) {
      setFormError('Nome, descrizione e contesto sono obbligatori.')
      return
    }
    setFormError(null)
    setIsAddingPersona(true)
    try {
      await postDomainPersona(token, clientKey, { name, description, context, searchStyle: searchStyle || undefined })
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
      setOpenDialog(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    } finally {
      setIsAddingPersona(false)
    }
  }

  const handleRemovePersona = async (personaId: string) => {
    setIsRemoving(personaId)
    try {
      await deleteDomainPersona(token, clientKey, personaId)
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
    } catch {
      // silently fail — persona stays in UI
    } finally {
      setIsRemoving(null)
    }
  }

  const openAddDialog = () => {
    setFormError(null)
    setOpenDialog(true)
  }

  // ── Analytics derived for auto-generated report ────────────────
  const analytics = useMemo(() => {
    if (!allKw.length) return null
    const total = allKw.length
    const avgVis = allKw.reduce((s, r) => s + r.visibilityPct, 0) / total
    const leaders = allKw.filter((r) => r.visibilityPct >= 0.6)
    const critical = allKw.filter((r) => r.visibilityPct < 0.2)
    const topKw = [...allKw].sort((a, b) => b.visibilityPct - a.visibilityPct).slice(0, 5)
    const bottomKw = [...allKw].sort((a, b) => a.visibilityPct - b.visibilityPct).slice(0, 5)
    const avgRank = allKw.filter((r) => r.avgRankPosition !== null).reduce((s, r) => s + (r.avgRankPosition ?? 0), 0) / (allKw.filter((r) => r.avgRankPosition !== null).length || 1)
    return { total, avgVis, leaders, critical, topKw, bottomKw, avgRank }
  }, [allKw])

  const tocSections = ['Executive Summary', 'Performance keyword', 'Analisi persona', 'Raccomandazioni', 'Dettagli tecnici']

  return (
    <Box sx={{ display: 'flex', gap: 0, minHeight: '70vh' }}>

      {/* ── Left: ToC + quick stats ── */}
      <Box
        sx={{
          width: 220,
          flexShrink: 0,
          pr: 2.5,
          borderRight: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', lg: 'flex' },
          flexDirection: 'column',
          gap: 0.25,
        }}
      >
        <Typography variant="overline" sx={{ px: 1.5, mb: 0.5, fontSize: '0.625rem', color: 'text.disabled', display: 'block' }}>
          SEZIONI REPORT
        </Typography>
        {tocSections.map((s, i) => (
          <TocItem key={s} label={s} active={i === 0} />
        ))}

        <Divider sx={{ my: 2 }} />

        <Typography variant="overline" sx={{ px: 1.5, mb: 1, fontSize: '0.625rem', color: 'text.disabled', display: 'block' }}>
          STATISTICHE RAPIDE
        </Typography>
        {kwLoading ? (
          <Skeleton variant="rounded" height={96} sx={{ mx: 1.5, borderRadius: 1.5 }} />
        ) : analytics ? (
          <Box sx={{ px: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {[
              { label: 'Keyword totali', value: analytics.total.toString() },
              { label: 'Visibilità media', value: `${(analytics.avgVis * 100).toFixed(1)}%` },
              { label: 'Leader', value: analytics.leaders.length.toString() },
              { label: 'Critiche', value: analytics.critical.length.toString() },
            ].map((item) => (
              <Box key={item.label}>
                <Typography variant="caption" color="text.disabled" display="block">{item.label}</Typography>
                <Typography variant="body2" fontWeight={700}>{item.value}</Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>

      {/* ── Center: Report content ── */}
      <Box sx={{ flex: 1, px: { xs: 0, lg: 3 }, maxWidth: '100%', overflow: 'hidden' }}>

        {/* Generating state */}
        {isGenerating && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 10, gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body1" color="text.secondary" fontWeight={500}>
              Report LLM in generazione…
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Il report viene creato automaticamente da n8n. Aggiornamento ogni 5s.
            </Typography>
          </Box>
        )}

        {/* Report fetch failed (404 while not done, 5xx, etc.) */}
        {reportError && !report && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Impossibile caricare il report. La run potrebbe non essere ancora
            completata, oppure si è verificato un errore. Riprova più tardi.
          </Alert>
        )}

        {/* Upload error */}
        {report?.uploadError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {report.uploadError}
          </Alert>
        )}

        {/* Markdown content (from report file) */}
        {mdFile?.content && (
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ p: { xs: 2, md: 4 } }}>
              <Box
                sx={{
                  '& h1': { fontSize: '1.5rem', fontWeight: 800, mt: 0, mb: 2, color: 'text.primary' },
                  '& h2': { fontSize: '1.125rem', fontWeight: 700, mt: 3, mb: 1, color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 },
                  '& h3': { fontSize: '1rem', fontWeight: 600, mt: 2, mb: 0.75, color: 'text.primary' },
                  '& p': { mb: 1.5, lineHeight: 1.75, color: 'text.secondary', fontSize: '0.9375rem' },
                  '& ul, & ol': { pl: 3, mb: 1.5 },
                  '& li': { mb: 0.5, color: 'text.secondary', fontSize: '0.9375rem' },
                  '& strong': { color: 'text.primary', fontWeight: 600 },
                  '& code': { fontFamily: 'var(--geo-font-mono)', bgcolor: '#f1f5f9', px: 0.5, py: 0.125, borderRadius: 0.5, fontSize: '0.8125rem' },
                  '& table': { width: '100%', borderCollapse: 'collapse', mb: 2, fontSize: '0.875rem' },
                  '& th': { bgcolor: 'background.default', fontWeight: 700, p: 1, borderBottom: '2px solid', borderColor: 'divider', textAlign: 'left' },
                  '& td': { p: 1, borderBottom: '1px solid', borderColor: 'divider' },
                }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(mdFile.content) }}
              />
            </CardContent>
          </Card>
        )}

        {/* Auto-generated report from API data */}
        {!isGenerating && !mdFile?.content && !kwLoading && analytics && (
          <>
            {/* Executive Summary */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="h2" fontWeight={800}>Executive Summary</Typography>
                <Chip label="AUTO-GENERATO" size="small" sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700, fontSize: '0.5625rem', height: 18, borderRadius: 'var(--geo-radius-sm)', '& .MuiChip-label': { px: 1 } }} />
              </Box>
              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.75, mb: 2 }}>
                L'analisi ha coperto <strong>{analytics.total} keyword</strong> in questa run. Il brand registra una visibilità media
                LLM del <strong>{(analytics.avgVis * 100).toFixed(1)}%</strong> con un rank medio di posizione <strong>#{analytics.avgRank.toFixed(1)}</strong>.
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5 }}>
                <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 'var(--geo-radius-md)', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <CheckCircleOutlineIcon sx={{ color: '#16a34a', mt: 0.25, fontSize: '1.125rem' }} />
                  <Box>
                    <Typography variant="caption" color="#16a34a" fontWeight={700} display="block">Punti di forza</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analytics.leaders.length} keyword in posizione dominante (≥60% visibility).
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2, bgcolor: '#fef2f2', borderRadius: 'var(--geo-radius-md)', display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                  <ErrorOutlineIcon sx={{ color: '#dc2626', mt: 0.25, fontSize: '1.125rem' }} />
                  <Box>
                    <Typography variant="caption" color="#dc2626" fontWeight={700} display="block">Aree critiche</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {analytics.critical.length} keyword con visibilità inferiore al 20%.
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Keyword Performance */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h2" fontWeight={800} mb={2}>Performance keyword</Typography>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Top 5 keyword per visibilità LLM:
              </Typography>
              <TableContainer sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Keyword</TableCell>
                      <TableCell align="center">Visibilità</TableCell>
                      <TableCell align="center">Rank medio</TableCell>
                      <TableCell align="center">Link Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.topKw.map((r) => (
                      <TableRow key={r.keyword} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{r.keyword}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={700} color="#16a34a">{(r.visibilityPct * 100).toFixed(1)}%</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{r.avgRankPosition !== null ? `#${r.avgRankPosition.toFixed(1)}` : '—'}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{(r.linkRatePct * 100).toFixed(0)}%</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Keyword con maggiore margine di miglioramento:
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Keyword</TableCell>
                      <TableCell align="center">Visibilità</TableCell>
                      <TableCell align="center">Rank medio</TableCell>
                      <TableCell align="center">Menzioni</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analytics.bottomKw.map((r) => (
                      <TableRow key={r.keyword} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{r.keyword}</Typography></TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={700} color="#dc2626">{(r.visibilityPct * 100).toFixed(1)}%</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{r.avgRankPosition !== null ? `#${r.avgRankPosition.toFixed(1)}` : '—'}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{r.targetMentions}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Persona Configuration & Analysis */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h2" fontWeight={800}>Analisi persona</Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={openAddDialog}
                >
                  Aggiungi persona
                </Button>
              </Box>

              {/* Empty state */}
              {configuredPersonas.length === 0 ? (
                <Card sx={{ bgcolor: 'background.paper', border: '1px dashed', borderColor: 'divider' }}>
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" color="text.disabled" mb={2}>
                      Nessuna persona configurata
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
                      Aggiungi personas per analizzare come diversi segmenti di utenti trovano il tuo brand nei risultati LLM.
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={openAddDialog}
                    >
                      Configura la prima persona
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Configured personas list */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5, mb: 3 }}>
                    {configuredPersonas.map((p) => (
                      <Card key={p.id} sx={{ position: 'relative' }}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={700} mb={0.25}>
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                {p.description.substring(0, 80)}...
                              </Typography>
                            </Box>
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePersona(p.id)}
                              disabled={isRemoving === p.id}
                              sx={{ color: 'error.main' }}
                            >
                              {isRemoving === p.id
                                ? <CircularProgress size={14} color="inherit" />
                                : <DeleteIcon fontSize="small" />}
                            </IconButton>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>

                  {/* Persona breakdown results (only if personas are configured and results exist) */}
                  {personasLoading ? (
                    <Skeleton variant="rounded" height={160} />
                  ) : allPersonas.length > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 1.5 }}>
                      {allPersonas.slice(0, 4).map((p) => (
                        <Box
                          key={p.personaId}
                          sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 'var(--geo-radius-md)' }}
                        >
                          <Typography variant="body2" fontWeight={700} mb={0.25}>{p.personaName}</Typography>
                          <Typography variant="caption" color="text.disabled" display="block" mb={1.5}>
                            {p.queriesExecuted} query eseguite
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 2 }}>
                            <Box>
                              <Typography variant="caption" color="text.disabled" display="block">Visibilità</Typography>
                              <Typography variant="body2" fontWeight={700}>{(p.visibilityPct * 100).toFixed(1)}%</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.disabled" display="block">Rank medio</Typography>
                              <Typography variant="body2" fontWeight={700}>{p.avgRankPosition !== null ? `#${p.avgRankPosition.toFixed(1)}` : '—'}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.disabled" display="block">Menzioni</Typography>
                              <Typography variant="body2" fontWeight={700}>{p.targetMentions}</Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                </>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Recommendations */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h2" fontWeight={800} mb={2}>Raccomandazioni Strategiche</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {analytics.critical.length > 0 && (
                  <Alert severity="error" icon={<TrendingUpIcon />}>
                    <strong>Priorità Alta:</strong> Ottimizza i contenuti per le {analytics.critical.length} keyword critiche.
                    Considera la creazione di pagine dedicate, FAQ strutturate e contenuti Q&A mirati ai motori LLM.
                  </Alert>
                )}
                <Alert severity="info" icon={<LightbulbIcon />}>
                  <strong>Link Building:</strong> Aumenta la presenza di link nelle risposte LLM migliorando
                  l'autorevolezza del dominio e pubblicando contenuti citabili (whitepaper, ricerche, dati originali).
                </Alert>
                {analytics.leaders.length > 0 && (
                  <Alert severity="success" icon={<CheckCircleOutlineIcon />}>
                    <strong>Mantieni il vantaggio:</strong> Le {analytics.leaders.length} keyword leader
                    ({analytics.leaders.slice(0, 2).map((k) => `"${k.keyword}"`).join(', ')})
                    mostrano leadership consolidata. Aggiorna i contenuti ogni 30 giorni.
                  </Alert>
                )}
              </Box>
            </Box>
          </>
        )}

        {/* No data and not loading */}
        {!isGenerating && !analytics && !mdFile?.content && !kwLoading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="body1" color="text.disabled">
              Nessun dato disponibile per generare il report.
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Right: AI observations + downloads ── */}
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          pl: 2.5,
          borderLeft: '1px solid',
          borderColor: 'divider',
          display: { xs: 'none', xl: 'flex' },
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Download actions */}
        <Box>
          <Typography variant="overline" sx={{ fontSize: '0.625rem', color: 'text.disabled', mb: 1, display: 'block' }}>
            ESPORTA
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {xlsxFile && (xlsxFile.driveUrl || xlsxFile.base64) ? (
              <Button variant="outlined" startIcon={<TableChartIcon />} onClick={() => downloadFile(xlsxFile)} fullWidth sx={{ justifyContent: 'flex-start' }}>
                Scarica XLSX
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<TableChartIcon />} disabled fullWidth sx={{ justifyContent: 'flex-start' }}>
                XLSX — in attesa
              </Button>
            )}
            {mdFile && (mdFile.driveUrl || mdFile.content) ? (
              <Button variant="outlined" startIcon={<ArticleIcon />} onClick={() => downloadFile(mdFile)} fullWidth sx={{ justifyContent: 'flex-start' }}>
                Scarica Report MD
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<DownloadIcon />} disabled fullWidth sx={{ justifyContent: 'flex-start' }}>
                Report MD — in attesa
              </Button>
            )}
          </Box>
        </Box>

        <Divider />

        {/* AI observation cards */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
            <LightbulbIcon sx={{ fontSize: '1rem', color: 'primary.main' }} />
            <Typography variant="overline" sx={{ fontSize: '0.625rem', color: 'text.disabled' }}>
              OSSERVAZIONI AI
            </Typography>
          </Box>

          {kwLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1.25, borderRadius: 1.5 }} />
            ))
          ) : analytics ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>

              <Card variant="outlined" sx={{ border: '1px solid', borderColor: '#bbf7d0', bgcolor: '#f0fdf4' }}>
                <CardContent sx={{ py: '12px !important', px: '14px !important' }}>
                  <Typography variant="caption" fontWeight={700} color="#16a34a" display="block" mb={0.25}>
                    ✅ Performance positiva
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Il {((analytics.leaders.length / analytics.total) * 100).toFixed(0)}% delle keyword analizzate
                    supera il 60% di visibilità LLM.
                  </Typography>
                </CardContent>
              </Card>

              {analytics.critical.length > 0 && (
                <Card variant="outlined" sx={{ border: '1px solid', borderColor: '#fecaca', bgcolor: '#fef2f2' }}>
                  <CardContent sx={{ py: '12px !important', px: '14px !important' }}>
                    <Typography variant="caption" fontWeight={700} color="#dc2626" display="block" mb={0.25}>
                      ⚠️ Aree da ottimizzare
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      {analytics.critical.length} keyword critiche richiedono contenuti mirati
                      per migliorare la citation rate.
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <Card variant="outlined" sx={{ border: '1px solid', borderColor: '#bfdbfe', bgcolor: '#eff6ff' }}>
                <CardContent sx={{ py: '12px !important', px: '14px !important' }}>
                  <Typography variant="caption" fontWeight={700} color="#2563eb" display="block" mb={0.25}>
                    💡 Trend da monitorare
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Rank medio #{analytics.avgRank.toFixed(1)} — schedula una re-run in 30 giorni
                    per tracciare la progressione.
                  </Typography>
                </CardContent>
              </Card>

            </Box>
          ) : null}
        </Box>
      </Box>

      {/* Add Persona Dialog — free-form, no hardcoded catalog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuova persona</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 1 }}>{formError}</Alert>}
          <TextField
            label="Nome *"
            inputRef={nameRef}
            fullWidth
            size="small"
            placeholder="es. Turista Arte e Cultura – City Break"
          />
          <TextField
            label="Descrizione *"
            inputRef={descRef}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="Profilo demografico, motivazioni, comportamento di ricerca…"
          />
          <TextField
            label="Contesto *"
            inputRef={contextRef}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder="In prima persona: 'Sei Mario, 45 anni…'"
          />
          <TextField
            label="Search Style (opzionale)"
            inputRef={searchStyleRef}
            fullWidth
            size="small"
            placeholder="Query tipiche usate da questa persona"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annulla</Button>
          <Button
            variant="contained"
            onClick={handleAddPersona}
            disabled={isAddingPersona}
          >
            {isAddingPersona ? 'Aggiunta…' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
