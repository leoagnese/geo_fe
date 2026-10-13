import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import DomainSuggestionsPanel from '@/components/DomainSuggestionsPanel'
import { getDomainSuggestions, confirmDomainMerge, rejectDomainMerge } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getDomainSuggestions: jest.fn(),
  confirmDomainMerge: jest.fn(),
  rejectDomainMerge: jest.fn(),
}))

const suggestion = {
  canonical: 'tripadvisor.com',
  canonicalCount: 5,
  variants: [{ name: 'tripadvisor.it', count: 3 }],
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <DomainSuggestionsPanel clientKey="acme" runId="r1" />
    </QueryClientProvider>,
  )
}

describe('DomainSuggestionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(confirmDomainMerge as jest.Mock).mockResolvedValue({ data: {} })
    ;(rejectDomainMerge as jest.Mock).mockResolvedValue({ data: {} })
  })

  it('renders nothing when there are no suggestions', async () => {
    ;(getDomainSuggestions as jest.Mock).mockResolvedValue({ data: [] })
    const { container } = renderPanel()
    await waitFor(() => expect(getDomainSuggestions).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each suggestion with its domains and counts', async () => {
    ;(getDomainSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    expect(await screen.findByText('Suggerimenti di unione domini')).toBeInTheDocument()
    expect(screen.getByText('+ tripadvisor.it (3 occorrenze)')).toBeInTheDocument()
    expect(screen.getByText(/5 occorrenze/)).toBeInTheDocument()
  })

  it('"Unisci" confirms the merge with the suggested domain', async () => {
    ;(getDomainSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Unisci' }))
    await waitFor(() =>
      expect(confirmDomainMerge).toHaveBeenCalledWith('tok', 'acme', { canonical: 'tripadvisor.com', variants: ['tripadvisor.it'] }),
    )
  })

  it('"Non unire" rejects every pair of the suggestion', async () => {
    ;(getDomainSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Non unire' }))
    await waitFor(() => expect(rejectDomainMerge).toHaveBeenCalledWith('tok', 'acme', 'tripadvisor.com', 'tripadvisor.it'))
  })
})
