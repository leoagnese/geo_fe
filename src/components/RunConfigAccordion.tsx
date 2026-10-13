/**
 * RunConfigAccordion — read-only summary of how a run was configured
 * (project, LLM profile snapshot, execution parameters, keywords, personas,
 * topics and, for custom-query runs, the queries themselves).
 *
 * Shown on the run page and on every results tab, so the configuration stays
 * consultable after the run has finished.
 */
'use client'

import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import type { Run } from '@/lib/api-client'

export default function RunConfigAccordion({ run }: { run: Run }) {
  // ── profileSnapshot values extracted as strings to avoid `unknown` in JSX ──
  const _snap = (run.profileSnapshot ?? {}) as Record<string, string | number | boolean | null | undefined>
  const snapLlmProvider = _snap.llmProvider != null ? String(_snap.llmProvider) : null
  const snapRunModel    = _snap.runModel     != null ? String(_snap.runModel)    : null
  const snapQgenModel   = _snap.qgenModel    != null ? String(_snap.qgenModel)   : null
  const snapNerModel    = _snap.nerModel     != null ? String(_snap.nerModel)    : null
  const snapReportModel = _snap.reportModel  != null ? String(_snap.reportModel) : null
  const snapBatchSize   = _snap.batchSize    != null ? String(_snap.batchSize)   : null

  return (
  <Accordion defaultExpanded={false}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="body1" fontWeight={600}>
        Configurazione run
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ pt: 1 }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Sezione: Progetto & Profilo ── */}
        <Box>
          <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
            Progetto &amp; Profilo LLM
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 1.5 }}>
            {run.targetDomain && (
              <Box>
                <Typography variant="caption" color="text.disabled">Dominio</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{run.targetDomain}</Typography>
              </Box>
            )}
            {run.targetUrl && (
              <Box>
                <Typography variant="caption" color="text.disabled">URL analizzato</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{run.targetUrl}</Typography>
              </Box>
            )}
            {run.brand && (
              <Box>
                <Typography variant="caption" color="text.disabled">Brand</Typography>
                <Typography variant="body2">{run.brand}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.disabled">Profilo</Typography>
              <Typography variant="body2" fontFamily="var(--geo-font-mono)">{run.profileKey}</Typography>
            </Box>
            {snapLlmProvider && (
              <Box>
                <Typography variant="caption" color="text.disabled">Provider</Typography>
                <Typography variant="body2">{snapLlmProvider}</Typography>
              </Box>
            )}
            {snapRunModel && (
              <Box>
                <Typography variant="caption" color="text.disabled">Modello run</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{snapRunModel}</Typography>
              </Box>
            )}
            {snapQgenModel && (
              <Box>
                <Typography variant="caption" color="text.disabled">Modello qgen</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{snapQgenModel}</Typography>
              </Box>
            )}
            {snapNerModel && (
              <Box>
                <Typography variant="caption" color="text.disabled">Modello NER</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{snapNerModel}</Typography>
              </Box>
            )}
            {snapReportModel && (
              <Box>
                <Typography variant="caption" color="text.disabled">Modello report</Typography>
                <Typography variant="body2" fontFamily="var(--geo-font-mono)">{snapReportModel}</Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Divider />

        {/* ── Sezione: Parametri esecuzione ── */}
        <Box>
          <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
            Parametri esecuzione
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.disabled">Iterazioni</Typography>
              <Typography variant="body2">{run.runIterations}</Typography>
            </Box>
            {snapBatchSize && (
              <Box>
                <Typography variant="caption" color="text.disabled">Batch size</Typography>
                <Typography variant="body2">{snapBatchSize}</Typography>
              </Box>
            )}
            <Box>
              <Typography variant="caption" color="text.disabled">Locali</Typography>
              <Typography variant="body2">{run.locales && run.locales.length > 0 ? run.locales.join(', ') : 'Default'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">Query pianificate</Typography>
              <Typography variant="body2">{run.plannedQueries}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">Test mode</Typography>
              <Typography variant="body2">{run.testMode ? 'Sì' : 'No'}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.disabled">Debug mode</Typography>
              <Typography variant="body2">{run.debugMode ? 'Sì' : 'No'}</Typography>
            </Box>
            {run.gotQueries && (
              <Box>
                <Typography variant="caption" color="text.disabled">Query pre-caricate</Typography>
                <Typography variant="body2">Sì</Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Sezione: Keywords ── */}
        {((run.keywordsOverride && run.keywordsOverride.length > 0) ||
          (run.keywordsByLang && Object.keys(run.keywordsByLang).some(k => run.keywordsByLang![k]?.length > 0))) && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
                Keywords
              </Typography>
              {run.keywordsOverride && run.keywordsOverride.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="caption" color="text.disabled">Override globale ({run.keywordsOverride.length})</Typography>
                  <Typography variant="body2">{run.keywordsOverride.join(', ')}</Typography>
                </Box>
              )}
              {run.keywordsByLang && Object.entries(run.keywordsByLang).map(([lang, kws]) =>
                kws && kws.length > 0 ? (
                  <Box key={lang} sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.disabled">{lang} ({kws.length} keywords{run.questionsCountByLang?.[lang] ? `, ${run.questionsCountByLang[lang]} domande/kw` : ''})</Typography>
                    <Typography variant="body2">{kws.join(', ')}</Typography>
                  </Box>
                ) : null
              )}
            </Box>
          </>
        )}

        {/* ── Sezione: Personas ── */}
        {run.personas && run.personas.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
                Personas ({run.personas.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {run.personas.map((p) => (
                  <Box
                    key={p.id}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Typography variant="body2" fontWeight={500}>{p.name}</Typography>
                    {p.description && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>{p.description}</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* ── Sezione: Topics ── */}
        {run.topics && run.topics.length > 0 && (
          <>
            <Divider />
            <Box>
              <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
                Topic ({run.topics.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {run.topics.map((t) => (
                  <Box
                    key={t.id}
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.default',
                    }}
                  >
                    <Typography variant="body2">{t.label}</Typography>
                    {t.keywords && t.keywords.length > 0 && (
                      <Typography variant="caption" color="text.disabled">{t.keywords.join(', ')}</Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          </>
        )}


          {/* ── Sezione: Query custom ── */}
          {run.gotQueries && run.queries && Object.values(run.queries).some((rows) => rows?.length > 0) && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.disabled" sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1 }}>
                  Query custom
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {Object.entries(run.queries).map(([lang, rows]) =>
                    rows && rows.length > 0 ? (
                      <Box key={lang}>
                        <Typography variant="caption" color="text.disabled">{lang.toUpperCase()} — {rows.length} query</Typography>
                        <Box sx={{ maxHeight: 280, overflowY: 'auto', mt: 0.5 }}>
                          {rows.map((q, i) => (
                            <Box key={i} sx={{ py: 0.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="body2">{q.query}</Typography>
                              <Typography variant="caption" color="text.disabled">
                                {q.keyword}{q.topicId ? ` · ${q.topicId}` : ''}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    ) : null,
                  )}
                </Box>
              </Box>
            </>
          )}
      </Box>
    </AccordionDetails>
  </Accordion>
  )
}
