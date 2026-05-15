/**
 * Protected route group layout.
 *
 * Wraps all authenticated screens with AppShell (top nav + sidebar).
 * The auth guard is enforced at middleware level (src/middleware.ts).
 *
 * @spec L1_design/patterns/layouts.md §"Page shell"
 */
import AppShell from '@/components/AppShell'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
