/**
 * SC-001 — Login / SSO handoff page.
 *
 * Thin shell: if the user has no session, triggers signIn('keycloak') immediately.
 * Shows a branded loading state while the OAuth redirect is in-flight.
 * Keycloak handles the actual auth UI — no form is rendered here.
 *
 * States:
 * - Loading: spinner + logo (while redirect runs or session is checked)
 * - Error: "Login fallito" banner (if Keycloak redirects back with ?error=...)
 * - Populated (success): authenticated → redirect to /domains (handled by middleware)
 * - Empty: not applicable — unauthenticated state IS the initial state
 *
 * @implements US-001
 * @validates AC-001, AC-002, AC-003
 * @spec L1_design/screen-inventory.md §"Auth (SC-001)"
 * @spec L1_design/states-and-empty.md §"SC-001"
 * @figma — (Figma file not yet created — see figma-links.md)
 */
'use client'

import { useEffect } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  useEffect(() => {
    if (status === 'unauthenticated') {
      // Trigger Keycloak OIDC flow immediately
      void signIn('keycloak', { callbackUrl: '/domains' })
    }
    if (status === 'authenticated') {
      // Already authenticated — redirect to Domains dashboard (SC-010)
      router.replace('/domains')
    }
  }, [status, router])

  return (
    // full-page centered layout per layouts.md §"SC-001"
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default', // color.neutral.bg
        gap: 3,
        px: 2,
      }}
    >
      {/* Product logo placeholder — replace with <Image> when asset is available */}
      <Typography
        variant="h2"
        color="primary"
        sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}
      >
        Geo-SmartAudit
      </Typography>

      {/* Error state: Keycloak returned an auth error (AC-003) */}
      {errorParam && (
        <Box sx={{ maxWidth: 400, width: '100%' }}>
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void signIn('keycloak', { callbackUrl: '/domains' })}
              >
                Riprova
              </Button>
            }
          >
            Login fallito — riprova o contatta l&apos;amministratore.
          </Alert>
        </Box>
      )}

      {/* Loading state: spinner while redirect is in-flight (AC-001, AC-002) */}
      {!errorParam && (
        <>
          <CircularProgress size={40} color="primary" />
          <Typography variant="body2" color="text.secondary">
            Accesso in corso…
          </Typography>
        </>
      )}
    </Box>
  )
}
