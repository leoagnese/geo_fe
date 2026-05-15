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
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import geoTheme from '@/lib/theme'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'Geo-SmartAudit Platform',
  description: 'AI Visibility analytics for brands',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={geoTheme}>
            <CssBaseline />
            <Providers>{children}</Providers>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  )
}
