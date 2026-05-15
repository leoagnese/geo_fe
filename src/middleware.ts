/**
 * NextAuth v5 middleware — protects all routes except /login and /api/auth/*.
 *
 * Unauthenticated users accessing protected routes are redirected to /login
 * where the Keycloak OIDC flow begins. AC-001.
 *
 * @implements US-001
 * @validates AC-001
 * @spec L1_design/screen-inventory.md §"Auth (SC-001)"
 */
export { auth as middleware } from '@/lib/auth'

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - /login (the SSO handoff page)
     * - /api/auth/* (NextAuth internal endpoints)
     * - /_next/* (Next.js internals)
     * - /favicon.ico, /robots.txt etc. (static files)
     */
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
