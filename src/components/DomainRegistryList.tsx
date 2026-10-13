/** Confirmed domain merges of a project (cited sites), with undo (whole merge or one variant). */
'use client'

import { useSession } from 'next-auth/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'
import { deleteDomainMerge, deleteDomainMergeVariant, type BrandRegistryEntry } from '@/lib/api-client'

export default function DomainRegistryList({ clientKey, entries }: { clientKey: string; entries: BrandRegistryEntry[] }) {
  const { data: session } = useSession()
  const token = session?.accessToken ?? ''
  const queryClient = useQueryClient()
  // A merge change alters every sources table and suggestion list computed for this project.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['domain', clientKey] }),
      queryClient.invalidateQueries({ queryKey: ['run-sources', clientKey] }),
      queryClient.invalidateQueries({ queryKey: ['domain-suggestions', clientKey] }),
    ])

  const removeMerge = useMutation({
    mutationFn: (canonical: string) => deleteDomainMerge(token, clientKey, canonical),
    onSuccess: refresh,
  })
  const removeVariant = useMutation({
    mutationFn: (v: { canonical: string; variant: string }) =>
      deleteDomainMergeVariant(token, clientKey, v.canonical, v.variant),
    onSuccess: refresh,
  })

  if (entries.length === 0) return null

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>Fusioni di domini confermate</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Questi domini vengono contati come un unico sito nelle tabelle Fonti.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {entries.map((e) => (
          <Box key={e.canonical} sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 'var(--geo-radius-sm)' }}>
            <Typography variant="body2" fontWeight={700}>{e.canonical}</Typography>
            {e.variants.map((v) => (
              <Chip
                key={v}
                size="small"
                label={v}
                deleteIcon={<span aria-label={`Rimuovi ${v}`} role="button">×</span>}
                onDelete={() => removeVariant.mutate({ canonical: e.canonical, variant: v })}
              />
            ))}
            <Button
              size="small"
              color="inherit"
              aria-label={`Annulla fusione ${e.canonical}`}
              onClick={() => removeMerge.mutate(e.canonical)}
              sx={{ ml: 'auto' }}
            >
              Annulla fusione
            </Button>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
