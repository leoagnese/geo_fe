import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import CampaignAggregatePage from '@/app/(protected)/domains/[clientKey]/campaigns/[campaignId]/aggregate/page'
import { getCampaignAggregate } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getCampaignAggregate: jest.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignAggregatePage params={{ clientKey: 'acme', campaignId: 'camp-1' }} />
    </QueryClientProvider>,
  )
}

const targetStat = {
  brand: 'acme.com',
  isTarget: true,
  mentions: 4,
  weight: 40,
  aiVisibilityScore: 40,
  avgRankPosition: 1.5,
  linkRate: 0.5,
  sentimentPositive: 0.5,
  sentimentNeutral: 0.5,
  sentimentNegative: 0,
}

const payload = {
  campaignId: 'camp-1',
  status: 'done' as const,
  coverage: { sectionsTotal: 1, sectionsDone: 1, sectionsMissing: [], plannedQueries: 10, doneQueries: 10, errorQueries: 0 },
  aggregate: {
    perSection: {
      'dove-dormire': {
        ranking: { totalMentions: 10, shareOfVoice: 40, target: targetStat, top: [targetStat] },
        insights: ['Il dominio target guida la classifica con 4 menzioni (Share of Voice 40%).'],
      },
    },
    overall: {
      ranking: { totalMentions: 10, shareOfVoice: 40, target: targetStat, top: [targetStat] },
      insights: ['Il dominio target guida la classifica con 4 menzioni (Share of Voice 40%).'],
    },
    matrix: { columns: ['dove-dormire'], rows: [{ personaId: 'p1', values: [72.5], total: 72.5 }] },
  },
}

describe('CampaignAggregatePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
  })

  it('renders the overall Share of Voice and highlights the target row', async () => {
    ;(getCampaignAggregate as jest.Mock).mockResolvedValue({ data: payload })
    renderPage()

    // NOTE: the fixture's `weight` (ranking table "Quota" column) and
    // `shareOfVoice` (headline SoV figure) are both 40, so "40%" legitimately
    // renders twice — once in the headline, once in the ranking table row.
    // Use findAllByText to tolerate that instead of the ambiguous findByText.
    expect(await screen.findAllByText('40%')).not.toHaveLength(0)
    expect(screen.getByText(/acme\.com \(target\)/)).toBeInTheDocument()
  })

  it('switches to a section tab and shows its own insights', async () => {
    ;(getCampaignAggregate as jest.Mock).mockResolvedValue({ data: payload })
    const user = userEvent.setup()
    renderPage()

    await screen.findAllByText('40%')
    await user.click(screen.getByRole('tab', { name: 'dove-dormire' }))
    expect(await screen.findByText(/Il dominio target guida la classifica/)).toBeInTheDocument()
  })
})
