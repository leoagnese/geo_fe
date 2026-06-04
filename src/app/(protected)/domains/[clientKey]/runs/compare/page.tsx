'use client'

import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CompareArrowsIcon from '@mui/icons-material/CompareArrows'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'

interface Props {
  params: { clientKey: string }
}

export default function RunComparePage({ params }: Props) {
  const { clientKey } = params
  const router = useRouter()

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', py: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        variant="text"
        onClick={() => router.push(`/domains/${clientKey}`)}
        sx={{ mb: 3, color: 'text.secondary' }}
      >
        Torna alle campagne
      </Button>

      <Card>
        <CardContent sx={{ py: 6, textAlign: 'center' }}>
          <CompareArrowsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h2" gutterBottom>
            Confronto Run (Before / After)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Seleziona due run da confrontare per visualizzare il delta di visibilità,
            lo Share of Voice e lo spostamento di ranking per le keyword principali.
          </Typography>
          <Typography variant="caption" color="text.disabled">
            SCREEN_18 / SCREEN_13 — disponibile nel prossimo sprint
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
