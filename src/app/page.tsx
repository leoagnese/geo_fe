/**
 * Root redirect — authenticated users land on /domains (SC-010).
 * Unauthenticated users are redirected to /login here as well as in
 * middleware, providing defence-in-depth (AC-001).
 */
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function RootPage() {
  const session = await auth()
  if (!session) redirect('/login')
  redirect('/domains')
}
