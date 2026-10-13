/**
 * Fonti — most cited domains, share of citations pointing to the target domain per persona × topic,
 * and example prompts. Shown in "Dati elaborati" mode.
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import DomainSuggestionsPanel from '@/components/DomainSuggestionsPanel'
import PersonaTopicMatrix from '@/components/PersonaTopicMatrix'
import TopDomainsTable from '@/components/TopDomainsTable'
import { getRunSources } from '@/lib/api-client'

export default function SourcesPage({ params }: { params: { clientKey: string; runId: string } }) {
  const { clientKey, runId } = params
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const [lang, setLang] = useState('all')
  const [metric, setMetric] = useState<'mentions' | 'queries'>('mentions')

  const { data } = useQuery({
    queryKey: ['run-sources', clientKey, runId, lang],
    queryFn: () => getRunSources(token, clientKey, runId, lang),
    enabled: !!token,
  })
  const s = data?.data
  const personaNames = Object.fromEntries((s?.personas ?? []).map((p) => [p.id, p.name]))

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <ToggleButtonGroup exclusive size="small" value={lang} onChange={(_e, v: string | null) => v && setLang(v)} aria-label="Lingua">
          <ToggleButton value="all">Tutte</ToggleButton>
          <ToggleButton value="it">IT</ToggleButton>
          <ToggleButton value="en">EN</ToggleButton>
          <ToggleButton value="fr">FR</ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup exclusive size="small" value={metric} onChange={(_e, v: 'mentions' | 'queries' | null) => v && setMetric(v)} aria-label="Metrica">
          <ToggleButton value="mentions">Menzioni</ToggleButton>
          <ToggleButton value="queries">Query</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {s && s.topDomains.totalMentions === 0 && (
        <Alert severity="info">Nessun link citato in questa run{lang !== 'all' ? ' per la lingua scelta' : ''}.</Alert>
      )}

      {s && s.topDomains.totalMentions > 0 && (
        <>
          <Card>
            <CardContent>
              <Typography variant="h3" fontWeight={700}>Top 10 domini citati</Typography>
              <Typography variant="caption" color="text.secondary">
                Totale: {s.topDomains.totalMentions} menzioni con link in {s.topDomains.totalQueries} query.
              </Typography>
              <TopDomainsTable rows={s.topDomains.rows} metric={metric} target={s.target} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h3" fontWeight={700}>Quota di citazioni al dominio target</Typography>
              <Typography variant="caption" color="text.secondary">
                Per persona e topic: citazioni di {s.target} sul totale delle citazioni.
              </Typography>
              <PersonaTopicMatrix matrix={s.matrix} personaNames={personaNames} />
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h3" fontWeight={700}>Prompt di esempio</Typography>
              <Typography variant="caption" color="text.secondary">
                Scelti automaticamente: per ogni persona e lingua, il prompt con più citazioni al dominio target.
              </Typography>
              {s.personas.map((p) => (
                <Box key={p.id} sx={{ mt: 1.5 }}>
                  <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                  {Object.entries(s.examplePrompts[p.id] ?? {}).map(([l, text]) => (
                    <Typography key={l} variant="body2" color="text.secondary">{l.toUpperCase()}: {text}</Typography>
                  ))}
                </Box>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <DomainSuggestionsPanel clientKey={clientKey} runId={runId} />
    </Box>
  )
}
