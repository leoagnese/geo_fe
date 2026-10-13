/** Edit domain page: the target domain (URL analysed by runs) is editable. */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import EditDomainPage from '@/app/(protected)/domains/[clientKey]/edit/page'
import { getDomain, updateDomain } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getDomain: jest.fn(),
  updateDomain: jest.fn(),
}))

const domain = {
  data: { _id: '1', clientKey: 'acme', targetDomain: 'gewiss.com', brand: 'Gewiss', aliases: [], keywords: [], brandRegistry: [], createdAt: '2026-01-01' },
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <EditDomainPage params={{ clientKey: 'acme' }} />
    </QueryClientProvider>,
  )
}

describe('EditDomainPage — target domain', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getDomain as jest.Mock).mockResolvedValue(domain)
  })

  it('shows the current target domain and sends the edited one on save', async () => {
    ;(updateDomain as jest.Mock).mockResolvedValue(domain)
    renderPage()
    const field = await screen.findByLabelText(/Dominio target/i)
    await waitFor(() => expect(field).toHaveValue('gewiss.com'))

    await userEvent.clear(field)
    await userEvent.type(field, 'gewiss.com/it')
    await userEvent.click(screen.getByRole('button', { name: /Salva modifiche/i }))

    await waitFor(() =>
      expect(updateDomain).toHaveBeenCalledWith('tok', 'acme', expect.objectContaining({ targetDomain: 'gewiss.com/it' })),
    )
  })

  it('does not allow an empty target domain', async () => {
    renderPage()
    const field = await screen.findByLabelText(/Dominio target/i)
    await waitFor(() => expect(field).toHaveValue('gewiss.com'))
    await userEvent.clear(field)
    await userEvent.click(screen.getByRole('button', { name: /Salva modifiche/i }))

    expect(await screen.findByText(/Dominio target è obbligatorio/i)).toBeInTheDocument()
    expect(updateDomain).not.toHaveBeenCalled()
  })
})
