/**
 * Bare /results redirect → /results/overview (OQ-028 resolved).
 *
 * @spec L1_design/screen-inventory.md §"SC-030" notes
 */
import { redirect } from 'next/navigation'

interface ResultsRedirectProps {
  params: { clientKey: string; runId: string }
}

export default function ResultsRedirectPage({ params }: ResultsRedirectProps) {
  redirect(
    `/domains/${params.clientKey}/runs/${params.runId}/results/overview`,
  )
}
