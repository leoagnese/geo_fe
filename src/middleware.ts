/**
 * NextAuth v5 middleware — protects all routes except /login and /api/auth/*.
 *
 * Unauthenticated users accessing protected routes are redirected to /login
 * where the login form is. AC-001.
 *
 * AUTH_DISABLED=true skips auth entirely (dev/UI preview only).
 *
 * @implements US-001
 * @validates AC-001
 * @spec L1_design/screen-inventory.md §"Auth (SC-001)"
 */
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const middleware: any =
  process.env.AUTH_DISABLED === 'true' ? () => NextResponse.next() : auth

export const config = {
  matcher: [
    '/((?!login|api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
