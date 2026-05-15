/**
 * Root redirect — authenticated users land on /domains (SC-010).
 * Middleware handles unauthenticated → /login.
 */
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/domains')
}
