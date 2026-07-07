import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminWorkersPage from '@/app/(protected)/admin/workers/page'
import { getWorkers, createWorker, updateWorker, deleteWorker, checkWorkerHealth } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getWorkers: jest.fn(),
  createWorker: jest.fn(),
  updateWorker: jest.fn(),
  deleteWorker: jest.fn(),
  checkWorkerHealth: jest.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminWorkersPage />
    </QueryClientProvider>,
  )
}

describe('AdminWorkersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok', user: { role: 'admin' } } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn() })
  })

  it('lists workers with their occupancy status', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [
        { workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: { runId: 'r1', clientKey: 'acme' } },
        { workerId: 'worker-2', label: 'Worker 2', webhookUrl: 'http://x/2', active: true, inUse: null },
      ],
    })
    renderPage()

    expect(await screen.findByText('Worker 1')).toBeInTheDocument()
    expect(await screen.findByText('Worker 2')).toBeInTheDocument()
    expect(screen.getByText(/acme/i)).toBeInTheDocument()
    expect(screen.getByText(/Libero/i)).toBeInTheDocument()
  })

  it('adds a new worker via the form', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({ data: [] })
    ;(createWorker as jest.Mock).mockResolvedValue({
      data: { workerId: 'worker-3', label: 'Worker 3', webhookUrl: 'http://x/3', active: true },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Aggiungi worker/i }))
    await user.type(screen.getByLabelText(/Etichetta/i), 'Worker 3')
    await user.type(screen.getByLabelText(/Webhook URL/i), 'http://x/3')
    await user.click(screen.getByRole('button', { name: /Salva/i }))

    await waitFor(() =>
      expect(createWorker).toHaveBeenCalledWith('tok', { label: 'Worker 3', webhookUrl: 'http://x/3' }),
    )
  })

  it('toggles active state via the switch', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [{ workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null }],
    })
    ;(updateWorker as jest.Mock).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole('checkbox', { name: /Worker 1/i })
    await user.click(toggle)

    await waitFor(() =>
      expect(updateWorker).toHaveBeenCalledWith('tok', 'worker-1', { active: false }),
    )
  })

  it('shows reachability status and lets the admin manually re-test a worker', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [
        {
          workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null,
          healthy: false, lastHealthCheckAt: '2026-07-07T10:00:00.000Z', lastHealthCheckError: 'Request failed with status code 404',
        },
      ],
    })
    ;(checkWorkerHealth as jest.Mock).mockResolvedValue({
      data: { workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null, healthy: true, lastHealthCheckAt: '2026-07-07T10:05:00.000Z', lastHealthCheckError: null },
    })
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/Non raggiungibile/i)).toBeInTheDocument()

    await user.click(screen.getByLabelText(/Testa connessione/i))

    await waitFor(() => expect(checkWorkerHealth).toHaveBeenCalledWith('tok', 'worker-1'))
  })

  it('deletes a worker after confirmation', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [{ workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null }],
    })
    ;(deleteWorker as jest.Mock).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText(/Elimina worker/i))
    await user.click(screen.getByRole('button', { name: /Conferma/i }))

    await waitFor(() => expect(deleteWorker).toHaveBeenCalledWith('tok', 'worker-1'))
  })
})
