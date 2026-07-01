import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CampaignDetailPage from '@/app/(protected)/domains/[clientKey]/campaigns/[campaignId]/page'
import { getCampaign, rerunCampaignSection } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getCampaign: jest.fn(),
  rerunCampaignSection: jest.fn(),
  cancelCampaign: jest.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignDetailPage params={{ clientKey: 'acme', campaignId: 'camp-1' }} />
    </QueryClientProvider>,
  )
}

const baseCampaign = {
  campaignId: 'camp-1',
  clientKey: 'acme',
  profileKey: 'gpt5-mini',
  status: 'partial' as const,
  concurrency: 3,
  coverage: {
    sectionsTotal: 2,
    sectionsDone: 1,
    sectionsMissing: ['dove-mangiare'],
    plannedQueries: 20,
    doneQueries: 10,
    errorQueries: 0,
  },
  sections: [
    { sectionKey: 'dove-dormire', label: 'dove-dormire', runId: 'run-1', status: 'done' as const },
    { sectionKey: 'dove-mangiare', label: 'dove-mangiare', runId: 'run-2', status: 'error' as const },
  ],
  createdAt: '2026-06-30T00:00:00.000Z',
}

describe('CampaignDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
  })

  it('shows a rerun button only for the failed section', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue({ data: baseCampaign })
    renderPage()

    await screen.findByText('dove-dormire')
    expect(screen.getAllByRole('button', { name: /Rilancia/i })).toHaveLength(1)
  })

  it('calls rerunCampaignSection with the failed sectionKey on click', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue({ data: baseCampaign })
    ;(rerunCampaignSection as jest.Mock).mockResolvedValue({ data: baseCampaign })
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('dove-dormire')
    await user.click(screen.getByRole('button', { name: /Rilancia/i }))

    await waitFor(() =>
      expect(rerunCampaignSection).toHaveBeenCalledWith('tok', 'acme', 'camp-1', 'dove-mangiare'),
    )
  })

  it('shows the missing-sections banner from coverage.sectionsMissing', async () => {
    ;(getCampaign as jest.Mock).mockResolvedValue({ data: baseCampaign })
    renderPage()

    expect(await screen.findByText(/Settori non completati/)).toBeInTheDocument()
  })
})
