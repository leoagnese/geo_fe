'use client'

import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import ManageSearchIcon from '@mui/icons-material/ManageSearch'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Chip from '@mui/material/Chip'

interface Props {
  params: { clientKey: string; runId: string; keyword: string }
}

export default function KeywordDetailPage({ params }: Props) {
  const { clientKey, runId, keyword } = params
  const router = useRouter()
  const decodedKeyword = decodeURIComponent(keyword)

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', py: 4 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        variant="text"
        onClick={() => router.push(`/domains/${clientKey}/runs/${runId}/results/keywords`)}
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        Torna a Query Metrics
      </Button>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
        <Typography variant="h1">Keyword Detail</Typography>
        <Chip label={decodedKeyword} color="primary" />
      </Box>

      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <ManageSearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h2" gutterBottom>
            Analisi granulare keyword
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Storico di visibilità, analisi LLM per singola query
            e suggerimenti strategici per <strong>{decodedKeyword}</strong>.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            SCREEN_25 — disponibile nel prossimo sprint
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
