/**
 * Protected route group layout.
 *
 * Wraps all authenticated screens with AppShell (top nav + sidebar).
 * The auth guard is enforced at two layers:
 *   1. Middleware (src/middleware.ts) — fast first filter.
 *   2. This layout (server component) — authoritative defence-in-depth gate.
 *      If the middleware is misconfigured or temporarily disabled, this layer
 *      catches unauthenticated requests before any protected content renders.
 *
 * @spec L1_design/patterns/layouts.md §"Page shell"
 * @validates AC-001
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import AppShell from '@/components/AppShell'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  // Redirect when there's no session OR the Keycloak token can no longer be
  // refreshed — otherwise the shell renders but every BE call 401s silently.
  if (!session || session.error === 'RefreshAccessTokenError') redirect('/login')
  return <AppShell>{children}</AppShell>
}
