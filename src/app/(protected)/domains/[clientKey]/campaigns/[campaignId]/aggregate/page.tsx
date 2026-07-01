/**
 * Campaign aggregate view — minimal tables, no dashboard-style charts.
 * "Complessivo" + one tab per section mirrors the macro-cluster selector
 * from the legacy dashboard_ttp.html, as a Tabs bar instead of a dropdown.
 *
 * @spec docs/superpowers/specs/2026-06-30-campagne-multi-settore-design.md §4.3
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import { getCampaignAggregate, type CampaignRanking } from '@/lib/api-client'

interface Props {
  params: { clientKey: string; campaignId: string }
}

function RankingTable({ ranking }: { ranking: CampaignRanking }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          <TableCell>Dominio</TableCell>
          <TableCell align="right">Menzioni</TableCell>
          <TableCell align="right">Quota</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {ranking.top.map((row, i) => (
          <TableRow key={row.brand} sx={row.isTarget ? { bgcolor: 'action.selected' } : undefined}>
            <TableCell>{i + 1}</TableCell>
            <TableCell sx={{ fontWeight: row.isTarget ? 700 : 400 }}>
              {row.brand}
              {row.isTarget ? ' (target)' : ''}
            </TableCell>
            <TableCell align="right">{row.mentions}</TableCell>
            <TableCell align="right">{row.weight}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default function CampaignAggregatePage({ params }: Props) {
  const { clientKey, campaignId } = params
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('overall')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaign-aggregate', clientKey, campaignId],
    queryFn: () => getCampaignAggregate(session?.accessToken ?? '', clientKey, campaignId),
    enabled: !!session?.accessToken,
  })

  const payload = data?.data

  if (isLoading) return <Skeleton variant="rounded" height={400} />
  if (isError || !payload?.aggregate) {
    return <Alert severity="warning">Aggregato non ancora disponibile per questa campagna.</Alert>
  }

  const { aggregate, coverage } = payload
  const sectionKeys = Object.keys(aggregate.perSection)
  const current = activeTab === 'overall' ? aggregate.overall : aggregate.perSection[activeTab]

  return (
    <Box>
      <Typography variant="h1" gutterBottom>
        Report aggregato
      </Typography>
      {coverage && coverage.sectionsMissing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Settori esclusi dall&apos;aggregato: {coverage.sectionsMissing.join(', ')}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}>
        <Tab value="overall" label="Complessivo" />
        {sectionKeys.map((key) => (
          <Tab key={key} value={key} label={key} />
        ))}
      </Tabs>

      {current && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Share of Voice del target
            </Typography>
            <Typography variant="h2">{current.ranking.shareOfVoice}%</Typography>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Top 10 domini citati
            </Typography>
            <RankingTable ranking={current.ranking} />
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>
              Insight
            </Typography>
            <Box component="ul" sx={{ pl: 3, m: 0 }}>
              {current.insights.map((line, i) => (
                <li key={i}>
                  <Typography variant="body2">{line}</Typography>
                </li>
              ))}
            </Box>
          </Paper>

          {activeTab === 'overall' && (
            <Paper sx={{ p: 3, overflowX: 'auto' }}>
              <Typography variant="h3" sx={{ mb: 2 }}>
                Matrice persona × settore (visibility %)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Persona</TableCell>
                    {aggregate.matrix.columns.map((col) => (
                      <TableCell key={col} align="right">
                        {col}
                      </TableCell>
                    ))}
                    <TableCell align="right">Totale</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregate.matrix.rows.map((row) => (
                    <TableRow key={row.personaId}>
                      <TableCell>{row.personaId}</TableCell>
                      {row.values.map((v, i) => (
                        <TableCell key={i} align="right">
                          {v}
                        </TableCell>
                      ))}
                      <TableCell align="right">{Math.round(row.total * 100) / 100}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )}
        </Box>
      )}
    </Box>
  )
}
