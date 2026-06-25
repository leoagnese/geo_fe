/**
 * Client-side providers: TanStack Query + NextAuth SessionProvider.
 *
 * Kept as a separate "use client" leaf component so the root layout
 * can remain a server component (P8 — server-vs-client boundary).
 *
 * Note: DEV_SESSION has been permanently removed (incident 2026-05-20-frontend-auth-bypass).
 * If a client-side auth bypass is needed in future, re-introduce it via an explicit PR
 * with a documented security review — do not resurrect an ad-hoc constant here.
 */
'use client'

import { QueryClient, QueryClientProvider, QueryCache } from '@tanstack/react-query'
import { SessionProvider, signOut } from 'next-auth/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useState, type ReactNode } from 'react'
import geoTheme from '@/lib/theme'
import { ApiError } from '@/lib/api-client'

interface ProvidersProps {
  children: ReactNode
}

// Guard so a burst of parallel 401s (every results query fails at once)
// triggers exactly one sign-out / redirect, not a stampede.
let handlingAuthFailure = false

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // Any authenticated call that 401s means the stored BE token is invalid
        // (expired OR signed with a stale JWT_SECRET). The server layout only
        // checks token EXPIRY, not signature, so a bad-signature token slips
        // through and leaves the UI "logged in" while every call fails. Forcing
        // a clean re-login here is the authoritative recovery path.
        queryCache: new QueryCache({
          onError: (error) => {
            if (
              error instanceof ApiError &&
              error.status === 401 &&
              !handlingAuthFailure
            ) {
              handlingAuthFailure = true
              void signOut({ callbackUrl: '/login' })
            }
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            // Don't retry a 401 — the token won't become valid on retry.
            retry: (failureCount, error) => {
              if (error instanceof ApiError && error.status === 401) return false
              return failureCount < 1
            },
          },
        },
      }),
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={geoTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
