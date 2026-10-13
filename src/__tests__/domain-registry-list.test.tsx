import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import DomainRegistryList from '@/components/DomainRegistryList'
import { deleteDomainMerge, deleteDomainMergeVariant } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  deleteDomainMerge: jest.fn(),
  deleteDomainMergeVariant: jest.fn(),
}))

const entries = [{ canonical: 'tripadvisor.com', variants: ['tripadvisor.it', 'tripadvisor.fr'] }]
const renderList = (list = entries) =>
  render(<QueryClientProvider client={new QueryClient()}><DomainRegistryList clientKey="acme" entries={list} /></QueryClientProvider>)

describe('DomainRegistryList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(deleteDomainMerge as jest.Mock).mockResolvedValue(undefined)
    ;(deleteDomainMergeVariant as jest.Mock).mockResolvedValue(undefined)
  })

  it('renders nothing without entries', () => {
    const { container } = renderList([])
    expect(container).toBeEmptyDOMElement()
  })
  it('lists each merge with its variants', () => {
    renderList()
    expect(screen.getByText('tripadvisor.com')).toBeInTheDocument()
    expect(screen.getByText('tripadvisor.it')).toBeInTheDocument()
  })
  it('undoes a whole merge', async () => {
    renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Annulla fusione tripadvisor.com' }))
    await waitFor(() => expect(deleteDomainMerge).toHaveBeenCalledWith('tok', 'acme', 'tripadvisor.com'))
  })
  it('removes a single variant', async () => {
    renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Rimuovi tripadvisor.it' }))
    await waitFor(() => expect(deleteDomainMergeVariant).toHaveBeenCalledWith('tok', 'acme', 'tripadvisor.com', 'tripadvisor.it'))
  })
})
