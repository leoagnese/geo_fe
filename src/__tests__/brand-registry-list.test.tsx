import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import BrandRegistryList from '@/components/BrandRegistryList'
import { deleteBrandMerge, deleteBrandMergeVariant } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  deleteBrandMerge: jest.fn(),
  deleteBrandMergeVariant: jest.fn(),
}))

const entries = [{ canonical: 'Gewiss', variants: ['GEWISS ReStart', 'IDP GEWISS'] }]

function renderList(list = entries) {
  const client = new QueryClient()
  const invalidate = jest.spyOn(client, 'invalidateQueries')
  render(
    <QueryClientProvider client={client}>
      <BrandRegistryList clientKey="acme" entries={list} />
    </QueryClientProvider>,
  )
  return { invalidate }
}

describe('BrandRegistryList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(deleteBrandMerge as jest.Mock).mockResolvedValue(undefined)
    ;(deleteBrandMergeVariant as jest.Mock).mockResolvedValue(undefined)
  })

  it('renders nothing without entries', () => {
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <BrandRegistryList clientKey="acme" entries={[]} />
      </QueryClientProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lists each merge with its canonical name and variants', () => {
    renderList()
    expect(screen.getByText('Fusioni brand confermate')).toBeInTheDocument()
    expect(screen.getByText('Gewiss')).toBeInTheDocument()
    expect(screen.getByText('GEWISS ReStart')).toBeInTheDocument()
    expect(screen.getByText('IDP GEWISS')).toBeInTheDocument()
  })

  it('removes a single variant', async () => {
    const { invalidate } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Rimuovi GEWISS ReStart' }))
    await waitFor(() => expect(deleteBrandMergeVariant).toHaveBeenCalledWith('tok', 'acme', 'Gewiss', 'GEWISS ReStart'))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['domain', 'acme'] }))
  })

  it('also refreshes the cached rankings and suggestions of the domain after an undo', async () => {
    const { invalidate } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Annulla fusione Gewiss' }))
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['run-ranking', 'acme'] }))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['brand-suggestions', 'acme'] })
  })

  it('undoes a whole merge', async () => {
    renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Annulla fusione Gewiss' }))
    await waitFor(() => expect(deleteBrandMerge).toHaveBeenCalledWith('tok', 'acme', 'Gewiss'))
  })
})
