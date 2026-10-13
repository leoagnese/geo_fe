import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import BrandSuggestionsPanel from '@/components/BrandSuggestionsPanel'
import { getBrandSuggestions, confirmBrandMerge, rejectBrandMerge } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getBrandSuggestions: jest.fn(),
  confirmBrandMerge: jest.fn(),
  rejectBrandMerge: jest.fn(),
}))

const suggestion = {
  canonical: 'Schneider',
  canonicalCount: 4,
  variants: [{ name: 'Schneider Electric', count: 2 }],
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <BrandSuggestionsPanel clientKey="acme" runId="r1" />
    </QueryClientProvider>,
  )
}

describe('BrandSuggestionsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(confirmBrandMerge as jest.Mock).mockResolvedValue({ data: {} })
    ;(rejectBrandMerge as jest.Mock).mockResolvedValue({ data: {} })
  })

  it('renders nothing when there are no suggestions', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [] })
    const { container } = renderPanel()
    await waitFor(() => expect(getBrandSuggestions).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('shows each suggestion with its names and counts', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    expect(await screen.findByText('Suggerimenti di unione')).toBeInTheDocument()
    expect(screen.getByText(/Schneider Electric/)).toBeInTheDocument()
    expect(screen.getByText(/2 occorrenze/)).toBeInTheDocument()
  })

  it('"Unisci" confirms the merge with the suggested name', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Unisci' }))
    await waitFor(() =>
      expect(confirmBrandMerge).toHaveBeenCalledWith('tok', 'acme', {
        canonical: 'Schneider',
        variants: ['Schneider Electric'],
      }),
    )
  })

  it('lets the user pick the final name before merging', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('combobox', { name: /nome finale/i }))
    await userEvent.click(await screen.findByRole('option', { name: 'Schneider Electric' }))
    await userEvent.click(screen.getByRole('button', { name: 'Unisci' }))
    await waitFor(() =>
      expect(confirmBrandMerge).toHaveBeenCalledWith('tok', 'acme', {
        canonical: 'Schneider Electric',
        variants: ['Schneider'],
      }),
    )
  })

  it('"Non unire" rejects every pair of the suggestion', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Non unire' }))
    await waitFor(() =>
      expect(rejectBrandMerge).toHaveBeenCalledWith('tok', 'acme', 'Schneider', 'Schneider Electric'),
    )
  })

  it('reloads suggestions after an action', async () => {
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [suggestion] })
    renderPanel()
    await userEvent.click(await screen.findByRole('button', { name: 'Unisci' }))
    await waitFor(() => expect((getBrandSuggestions as jest.Mock).mock.calls.length).toBeGreaterThan(1))
  })
})
