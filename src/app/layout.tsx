/**
 * Root layout — server component.
 *
 * Wires: MUI ThemeProvider + CssBaseline, TanStack Query, NextAuth SessionProvider.
 * All client-side providers are hoisted into <Providers> (a "use client" leaf)
 * so this layout stays a server component per P8.
 *
 * @spec L1_design/patterns/layouts.md §"Page shell"
 */
import type { Metadata } from 'next'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Geo-SmartAudit Piattaforma',
  description: 'AI Visibility analytics per brand',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700;800;900&display=swap"
        />
      </head>
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
