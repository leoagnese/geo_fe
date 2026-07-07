import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import NewRunPage from '@/app/(protected)/domains/[clientKey]/runs/new/page'
import { getProfiles, getDomain, createRun } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getProfiles: jest.fn(),
  getDomain: jest.fn(),
  createRun: jest.fn(),
  postDomainPersona: jest.fn(),
  deleteDomainPersona: jest.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <NewRunPage params={{ clientKey: 'acme' }} />
    </QueryClientProvider>,
  )
}

describe('SingleRunForm — target URL override', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
    ;(getProfiles as jest.Mock).mockResolvedValue({
      data: [{ profileKey: 'gpt5-mini', llmProvider: 'openai', runModel: 'gpt-5-mini', qgenModel: 'gpt-5-mini', nerModel: 'gpt-5-mini', active: true, createdAt: '2026-01-01' }],
    })
    ;(getDomain as jest.Mock).mockResolvedValue({
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', personas: [], personaGroups: [], createdAt: '2026-01-01' },
    })
  })

  it('defaults to "Stesso URL del progetto" and omits targetUrl from the payload', async () => {
    ;(createRun as jest.Mock).mockResolvedValue({ data: { runId: 'run-1', status: 'running' } })
    const user = userEvent.setup()
    renderPage()

    // The topics repeater starts with one empty, required-label row; fill it
    // in so the form's own pre-existing validation doesn't block submission.
    await user.type(screen.getByLabelText(/Etichetta topic/i), 'Topic principale')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))
    await user.click(screen.getByRole('button', { name: /Avvia run/i }))

    await waitFor(() =>
      expect(createRun).toHaveBeenCalledWith(
        'tok',
        'acme',
        expect.objectContaining({ targetUrl: undefined }),
      ),
    )
  })

  it('sends the typed URL when "URL diverso" is selected', async () => {
    ;(createRun as jest.Mock).mockResolvedValue({ data: { runId: 'run-1', status: 'running' } })
    const user = userEvent.setup()
    renderPage()

    // The topics repeater starts with one empty, required-label row; fill it
    // in so the form's own pre-existing validation doesn't block submission.
    await user.type(screen.getByLabelText(/Etichetta topic/i), 'Topic principale')
    await user.click(await screen.findByRole('button', { name: 'URL diverso' }))
    await user.type(screen.getByLabelText(/URL da analizzare/i), 'acme.com/hotel-torino')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))
    await user.click(screen.getByRole('button', { name: /Avvia run/i }))

    await waitFor(() =>
      expect(createRun).toHaveBeenCalledWith(
        'tok',
        'acme',
        expect.objectContaining({ targetUrl: 'acme.com/hotel-torino' }),
      ),
    )
  })
})
