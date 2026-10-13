'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'

export type DataMode = 'raw' | 'processed'

/** Raw / processed data selector for the results pages; kept in the URL (?data=processed) so it survives tab changes. */
export function useDataMode() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const mode: DataMode = params?.get('data') === 'processed' ? 'processed' : 'raw'
  const setMode = (next: DataMode) => {
    const q = new URLSearchParams(params?.toString() ?? '')
    if (next === 'raw') q.delete('data'); else q.set('data', next)
    const qs = q.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }
  return { mode, setMode }
}
