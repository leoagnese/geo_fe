/**
 * Client-side providers: TanStack Query + NextAuth SessionProvider.
 *
 * Kept as a separate "use client" leaf component so the root layout
 * can remain a server component (P8 — server-vs-client boundary).
 */
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { useState, type ReactNode } from 'react'
import type { Session } from 'next-auth'
import geoTheme from '@/lib/theme'

interface ProvidersProps {
  children: ReactNode
}

const DEV_SESSION: Session = {
  user: { id: 'dev-admin', name: 'Dev Admin', email: 'dev@example.com', role: 'admin' },
  expires: '2099-01-01',
  accessToken: 'dev-token',
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

  const session =
    process.env.NEXT_PUBLIC_AUTH_DISABLED === 'true' ? DEV_SESSION : undefined

  return (
    <SessionProvider session={session}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={geoTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  )
}
