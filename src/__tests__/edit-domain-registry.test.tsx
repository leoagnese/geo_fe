/**
 * Edit domain page: undoing a brand merge refetches the domain, which must not
 * wipe what the user has typed but not yet saved.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import EditDomainPage from '@/app/(protected)/domains/[clientKey]/edit/page'
import { getDomain } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getDomain: jest.fn(),
  updateDomain: jest.fn(),
}))

const domain = (registry: { canonical: string; variants: string[] }[]) => ({
  data: { _id: '1', clientKey: 'acme', targetDomain: 'gewiss.com', brand: 'Gewiss', aliases: [], keywords: [], brandRegistry: registry, createdAt: '2026-01-01' },
})

describe('EditDomainPage — brand registry refetch', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
  })

  it('keeps unsaved edits when the domain is refetched', async () => {
    const registry = [{ canonical: 'Gewiss', variants: ['GEWISS ReStart'] }]
    ;(getDomain as jest.Mock).mockResolvedValueOnce(domain(registry)).mockResolvedValue(domain([]))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <EditDomainPage params={{ clientKey: 'acme' }} />
      </QueryClientProvider>,
    )

    const brand = await screen.findByLabelText(/Brand/i)
    await waitFor(() => expect(brand).toHaveValue('Gewiss'))
    await userEvent.type(brand, ' Italia')
    expect(brand).toHaveValue('Gewiss Italia')

    expect(await screen.findByText('Fusioni brand confermate')).toBeInTheDocument()
    await client.invalidateQueries({ queryKey: ['domain', 'acme'] }) // what "Annulla fusione" does
    // the refetched domain has no merges left: wait until the page has re-rendered with it
    await waitFor(() => expect(screen.queryByText('Fusioni brand confermate')).not.toBeInTheDocument())

    expect(screen.getByLabelText(/Brand/i)).toHaveValue('Gewiss Italia')
  })
})
