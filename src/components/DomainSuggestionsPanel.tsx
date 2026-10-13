/**
 * "Suggerimenti di unione domini" — national variants of one site (e.g. tripadvisor.it / tripadvisor.com).
 * Nothing is merged without a click: "Unisci" confirms (stored in the project's domain registry),
 * "Non unire" is remembered.
 */
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  getDomainSuggestions,
  confirmDomainMerge,
  rejectDomainMerge,
  type DomainMergeSuggestion,
} from '@/lib/api-client'

export default function DomainSuggestionsPanel({ clientKey, runId }: { clientKey: string; runId: string }) {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const queryClient = useQueryClient()
  const [chosen, setChosen] = useState<Record<string, string>>({}) // suggestion.canonical → final name

  const { data } = useQuery({
    queryKey: ['domain-suggestions', clientKey, runId],
    queryFn: () => getDomainSuggestions(token, clientKey, runId),
    enabled: !!token,
  })

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['domain-suggestions', clientKey, runId] }),
      queryClient.invalidateQueries({ queryKey: ['run-sources', clientKey, runId] }),
      queryClient.invalidateQueries({ queryKey: ['domain', clientKey] }),
    ])
  }

  const merge = useMutation({
    mutationFn: (dto: { canonical: string; variants: string[] }) => confirmDomainMerge(token, clientKey, dto),
    onSuccess: refresh,
  })
  const reject = useMutation({
    mutationFn: async (s: DomainMergeSuggestion) => {
      for (const v of s.variants) await rejectDomainMerge(token, clientKey, s.canonical, v.name)
    },
    onSuccess: refresh,
  })

  const suggestions = data?.data ?? []
  if (suggestions.length === 0) return null
  const busy = merge.isPending || reject.isPending

  return (
    <Card>
      <CardContent>
        <Typography variant="h3" fontWeight={700}>Suggerimenti di unione domini</Typography>
        <Typography variant="caption" color="text.secondary">
          Versioni nazionali dello stesso sito (es. tripadvisor.it e tripadvisor.com). Unendole, le citazioni vengono contate insieme.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
          {suggestions.map((s) => {
            const names = [s.canonical, ...s.variants.map((v) => v.name)]
            const final = chosen[s.canonical] ?? s.canonical
            return (
              <Box
                key={s.canonical}
                sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 'var(--geo-radius-sm)' }}
              >
                <Box sx={{ flex: '1 1 260px' }}>
                  <Typography variant="body2" fontWeight={600}>
                    {s.canonical} <Typography component="span" variant="caption" color="text.secondary">({s.canonicalCount} occorrenze)</Typography>
                  </Typography>
                  {s.variants.map((v) => (
                    <Typography key={v.name} variant="body2" color="text.secondary">
                      + {v.name} ({v.count} occorrenze)
                    </Typography>
                  ))}
                </Box>
                <TextField
                  select
                  size="small"
                  label="Nome finale"
                  value={final}
                  onChange={(e) => setChosen((prev) => ({ ...prev, [s.canonical]: e.target.value }))}
                  sx={{ minWidth: 200 }}
                >
                  {names.map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </TextField>
                <Button
                  variant="contained"
                  size="small"
                  disabled={busy}
                  onClick={() => merge.mutate({ canonical: final, variants: names.filter((n) => n !== final) })}
                >
                  Unisci
                </Button>
                <Button size="small" color="inherit" disabled={busy} onClick={() => reject.mutate(s)}>
                  Non unire
                </Button>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}
