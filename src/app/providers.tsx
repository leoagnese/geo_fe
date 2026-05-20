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

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useState, type ReactNode } from 'react'
import geoTheme from '@/lib/theme'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
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
