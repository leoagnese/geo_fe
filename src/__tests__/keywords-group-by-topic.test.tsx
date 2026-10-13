import { render, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import KeywordsPage from '@/app/(protected)/domains/[clientKey]/runs/[runId]/results/keywords/page'
import { getRunKeywords, getRunPersonas } from '@/lib/api-client'
import { useDataMode } from '@/lib/useDataMode'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }), usePathname: () => '/x', useSearchParams: () => new URLSearchParams() }))
jest.mock('@/lib/useDataMode', () => ({ useDataMode: jest.fn() }))
jest.mock('@/lib/api-client', () => ({ ...jest.requireActual('@/lib/api-client'), getRunKeywords: jest.fn(), getRunPersonas: jest.fn() }))

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <KeywordsPage params={{ clientKey: 'acme', runId: 'r1' }} />
    </QueryClientProvider>,
  )

describe('KeywordsPage — data mode', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getRunKeywords as jest.Mock).mockResolvedValue({ data: [] })
    ;(getRunPersonas as jest.Mock).mockResolvedValue({ data: [] })
  })
  it('asks for topics in processed mode', async () => {
    ;(useDataMode as jest.Mock).mockReturnValue({ mode: 'processed', setMode: jest.fn() })
    renderPage()
    await waitFor(() => expect(getRunKeywords).toHaveBeenCalledWith('tok', 'acme', 'r1', 'topic'))
  })
  it('asks for plain keywords in raw mode', async () => {
    ;(useDataMode as jest.Mock).mockReturnValue({ mode: 'raw', setMode: jest.fn() })
    renderPage()
    await waitFor(() => expect(getRunKeywords).toHaveBeenCalledWith('tok', 'acme', 'r1', undefined))
  })
})
