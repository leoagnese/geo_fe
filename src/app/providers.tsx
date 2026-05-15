/**
 * Client-side providers: TanStack Query + NextAuth SessionProvider.
 *
 * Kept as a separate "use client" leaf component so the root layout
 * can remain a server component (P8 — server-vs-client boundary).
 */
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SessionProvider } from 'next-auth/react'
import { useState, type ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
}

export default function Providers({ children }: ProvidersProps) {
  // QueryClient created per-render (not module-level) to avoid shared state
  // across requests in a server-rendered context (Next.js docs recommendation).
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // staleTime: 30s is a sensible default for this dashboard
            staleTime: 30_000,
            retry: 1,
          },
        },
      }),
  )

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  )
}
