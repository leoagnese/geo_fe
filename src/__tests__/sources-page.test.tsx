import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import SourcesPage from '@/app/(protected)/domains/[clientKey]/runs/[runId]/results/sources/page'
import { getRunSources, getDomainSuggestions } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getRunSources: jest.fn(),
  getDomainSuggestions: jest.fn(),
}))

const cell = { total: 3, target: 1, share: 33.33 }
const sources = (totalMentions = 3) => ({
  data: {
    lang: 'all', target: 'turismotorino.org',
    personas: [{ id: 'p1', name: 'Family' }], topics: ['Dove dormire'],
    topDomains: { rows: totalMentions ? [{ domain: 'booking.com', mentions: 2, queries: 2, weight: 66.67 }] : [], totalMentions, totalQueries: 3 },
    matrix: { topics: ['Dove dormire'], rows: [{ personaId: 'p1', cells: [cell], total: cell }], totals: { cells: [cell], total: cell } },
    examplePrompts: { p1: { it: 'Dove dormire con bambini?' } },
  },
})

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SourcesPage params={{ clientKey: 'acme', runId: 'r1' }} />
    </QueryClientProvider>,
  )

describe('SourcesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getRunSources as jest.Mock).mockResolvedValue(sources())
    ;(getDomainSuggestions as jest.Mock).mockResolvedValue({ data: [] })
  })

  it('shows top domains, matrix and example prompts', async () => {
    renderPage()
    expect(await screen.findByText('booking.com')).toBeInTheDocument()
    expect(screen.getByText(/Dove dormire con bambini\?/)).toBeInTheDocument()
    expect(getRunSources).toHaveBeenCalledWith('tok', 'acme', 'r1', 'all')
  })
  it('refetches when the language changes', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'FR' }))
    await waitFor(() => expect(getRunSources).toHaveBeenLastCalledWith('tok', 'acme', 'r1', 'fr'))
  })
  it('switches the metric to distinct queries', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Query' }))
    expect(screen.getByText('Query che citano')).toBeInTheDocument()
  })
  it('explains when no link was cited', async () => {
    ;(getRunSources as jest.Mock).mockResolvedValue(sources(0))
    renderPage()
    expect(await screen.findByText(/Nessun link citato/)).toBeInTheDocument()
  })
})
