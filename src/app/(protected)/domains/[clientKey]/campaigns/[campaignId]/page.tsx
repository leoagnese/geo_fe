/**
 * Campaign detail / monitor page.
 *
 * Polls GET /domains/:clientKey/campaigns/:campaignId every 8s while the
 * campaign is not in a terminal state (done/partial/error). Each section
 * links to its underlying run detail page — no per-section progress UI here,
 * that already exists on the run detail page.
 *
 * @spec docs/superpowers/specs/2026-06-30-campagne-multi-settore-design.md §4.2
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import ReplayIcon from '@mui/icons-material/Replay'
import CancelIcon from '@mui/icons-material/Cancel'
import StatusChip from '@/components/StatusChip'
import ConfirmDialog from '@/components/ConfirmDialog'
import { getCampaign, rerunCampaignSection, cancelCampaign, ApiError } from '@/lib/api-client'

const TERMINAL = ['done', 'partial', 'error']

interface Props {
  params: { clientKey: string; campaignId: string }
}

export default function CampaignDetailPage({ params }: Props) {
  const { clientKey, campaignId } = params
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [actionErrorToast, setActionErrorToast] = useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['campaign', clientKey, campaignId],
    queryFn: () => getCampaign(session?.accessToken ?? '', clientKey, campaignId),
    enabled: !!session?.accessToken,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status && !TERMINAL.includes(status) ? 8_000 : false
    },
  })

  const campaign = data?.data

  const rerunMutation = useMutation({
    mutationFn: (sectionKey: string) =>
      rerunCampaignSection(session?.accessToken ?? '', clientKey, campaignId, sectionKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaign', clientKey, campaignId] }),
    onError: (err) => {
      setActionErrorToast(err instanceof ApiError ? err.message : 'Errore durante il rilancio del settore.')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelCampaign(session?.accessToken ?? '', clientKey, campaignId),
    onSuccess: () => {
      setCancelDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['campaign', clientKey, campaignId] })
    },
    onError: (err) => {
      setCancelDialogOpen(false)
      setActionErrorToast(err instanceof ApiError ? err.message : "Errore durante l'annullamento.")
    },
  })

  if (isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width="40%" height={48} />
        <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />
      </Box>
    )
  }

  if (isError || !campaign) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Campagna non trovata
        </Typography>
      </Box>
    )
  }

  const isCancelled = campaign.status === 'error' && campaign.errorMessage === 'CAMPAIGN_CANCELLED'
  const canCancel = !TERMINAL.includes(campaign.status)
  const showAggregateCta = campaign.status === 'done' || campaign.status === 'partial'

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'var(--geo-font-mono)', display: 'block', mb: 0.5 }}>
            {campaignId}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <StatusChip status={campaign.status} size="medium" />
            <Typography variant="body2" color="text.secondary">
              Profilo: <strong>{campaign.profileKey}</strong>
            </Typography>
            {campaign.coverage && (
              <Typography variant="body2" color="text.secondary">
                {campaign.coverage.sectionsDone}/{campaign.coverage.sectionsTotal} settori completati
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {canCancel && (
            <Button variant="outlined" color="error" startIcon={<CancelIcon />} onClick={() => setCancelDialogOpen(true)}>
              Annulla campagna
            </Button>
          )}
          {showAggregateCta && (
            <Button
              variant="contained"
              startIcon={<OpenInNewIcon />}
              onClick={() => router.push(`/domains/${clientKey}/campaigns/${campaignId}/aggregate`)}
            >
              Visualizza aggregato
            </Button>
          )}
        </Box>
      </Box>

      {isCancelled && <Alert severity="info" sx={{ mb: 3 }}>Questa campagna è stata annullata dall&apos;utente.</Alert>}
      {campaign.status === 'error' && !isCancelled && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {campaign.errorMessage === 'AGGREGATION_FAILED'
            ? 'Tutti i settori sono stati completati ma il calcolo del report aggregato è fallito. Riprova più tardi.'
            : 'La campagna è terminata con un errore.'}
        </Alert>
      )}
      {campaign.status === 'partial' && campaign.coverage && campaign.coverage.sectionsMissing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Settori non completati: {campaign.coverage.sectionsMissing.join(', ')}. Puoi rilanciarli singolarmente qui sotto.
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Settori
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {campaign.sections.map((section) => (
            <Box
              key={section.sectionKey}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StatusChip status={section.status === 'missing' ? 'error' : section.status} />
                <Typography variant="body2" fontWeight={600}>
                  {section.label}
                </Typography>
                {section.status === 'queued' && section.queuePosition && section.queueLength && (
                  <Typography variant="caption" color="text.secondary">
                    (posizione {section.queuePosition} di {section.queueLength})
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {section.status === 'error' && (
                  <Button
                    size="small"
                    startIcon={<ReplayIcon />}
                    disabled={rerunMutation.isPending}
                    onClick={() => rerunMutation.mutate(section.sectionKey)}
                  >
                    Rilancia
                  </Button>
                )}
                <Button
                  size="small"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  onClick={() => router.push(`/domains/${clientKey}/runs/${section.runId}`)}
                >
                  Dettaglio
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      <ConfirmDialog
        open={cancelDialogOpen}
        title="Annulla campagna"
        description="Tutti i settori non ancora completati verranno annullati. L'operazione è irreversibile."
        confirmLabel="Annulla campagna"
        cancelLabel="Mantieni campagna"
        onConfirm={() => cancelMutation.mutate()}
        onCancel={() => setCancelDialogOpen(false)}
        loading={cancelMutation.isPending}
        severity="error"
      />

      <Snackbar
        open={!!actionErrorToast}
        onClose={() => setActionErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setActionErrorToast(null)}>
          {actionErrorToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
