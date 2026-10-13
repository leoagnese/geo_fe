import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import ResultsLayout from '@/app/(protected)/domains/[clientKey]/runs/[runId]/results/layout'
import { getDomain, getRun } from '@/lib/api-client'

let mockSearch = ''
let mockPathname = '/domains/acme/runs/r1/results/overview'
const mockReplace = jest.fn()
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockSearch),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getDomain: jest.fn(),
  getRun: jest.fn(),
}))

const renderLayout = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ResultsLayout params={{ clientKey: 'acme', runId: 'r1' }}><div>contenuto tab</div></ResultsLayout>
    </QueryClientProvider>,
  )

describe('ResultsLayout — data mode', () => {
  beforeEach(() => {
    mockPathname = '/domains/acme/runs/r1/results/overview'
    mockReplace.mockClear()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getDomain as jest.Mock).mockResolvedValue({ data: { clientKey: 'acme', brand: 'Gewiss', targetDomain: 'gewiss.com' } })
    ;(getRun as jest.Mock).mockResolvedValue({
      data: {
        runId: 'r1', clientKey: 'acme', profileKey: 'p1', status: 'done', runIterations: 2, plannedQueries: 70,
        doneQueries: 70, errorQueries: 0, testMode: false, debugMode: false, createdAt: '2026-10-12T10:00:00Z',
        targetDomain: 'gewiss.com', profileSnapshot: { runModel: 'gpt-5-mini' },
      },
    })
  })

  it('shows the Fonti tab only in processed mode', async () => {
    mockSearch = ''
    const { unmount } = renderLayout()
    await screen.findByRole('tab', { name: 'Riepilogo' })
    expect(screen.queryByRole('tab', { name: 'Fonti' })).not.toBeInTheDocument()
    unmount()
    mockSearch = 'data=processed'
    renderLayout()
    expect(await screen.findByRole('tab', { name: 'Fonti' })).toBeInTheDocument()
  })

  it('leaves the Fonti page for the overview when the mode goes back to raw', async () => {
    mockSearch = ''
    mockPathname = '/domains/acme/runs/r1/results/sources'
    renderLayout()
    await screen.findByRole('tab', { name: 'Riepilogo' })
    expect(mockReplace).toHaveBeenCalledWith('/domains/acme/runs/r1/results/overview')
  })

  it('stays on the Fonti page in processed mode', async () => {
    mockSearch = 'data=processed'
    mockPathname = '/domains/acme/runs/r1/results/sources'
    renderLayout()
    await screen.findByRole('tab', { name: 'Fonti' })
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
