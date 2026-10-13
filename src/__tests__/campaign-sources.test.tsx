import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import CampaignSources from '@/components/CampaignSources'
import { getCampaignSources, getCampaignDashboardData } from '@/lib/api-client'
import { downloadText } from '@/lib/download'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/download', () => ({ downloadBlob: jest.fn(), downloadText: jest.fn() }))
jest.mock('@/lib/api-client', () => ({ ...jest.requireActual('@/lib/api-client'), getCampaignSources: jest.fn(), getCampaignDashboardData: jest.fn() }))

const cell = { total: 4, target: 1, share: 25 }

describe('CampaignSources', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getCampaignSources as jest.Mock).mockResolvedValue({ data: {
      lang: 'all', sections: [{ sectionKey: 'dove-dormire', label: 'Dove dormire' }], personas: [{ id: 'p1', name: 'Family' }],
      topDomains: { rows: [{ domain: 'booking.com', mentions: 3, queries: 2, weight: 75 }], totalMentions: 4, totalQueries: 3 },
      matrix: { topics: ['Dove dormire'], rows: [{ personaId: 'p1', cells: [cell], total: cell }], totals: { cells: [cell], total: cell } },
    } })
    ;(getCampaignDashboardData as jest.Mock).mockResolvedValue({ data: { complessivo: { name: 'Complessivo' } } })
  })

  const renderIt = () =>
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CampaignSources clientKey="acme" campaignId="c1" /></QueryClientProvider>)

  it('shows the summed top domains and the persona × section matrix', async () => {
    renderIt()
    expect(await screen.findByText('booking.com')).toBeInTheDocument()
    expect(screen.getByText('Dove dormire')).toBeInTheDocument()
    expect(getCampaignSources).toHaveBeenCalledWith('tok', 'acme', 'c1', 'all')
  })

  it('downloads the dashboard data as JSON', async () => {
    renderIt()
    await userEvent.click(await screen.findByRole('button', { name: 'Scarica dati dashboard (JSON)' }))
    await waitFor(() => expect(downloadText).toHaveBeenCalledTimes(1))
    const [content, fileName] = (downloadText as jest.Mock).mock.calls[0]
    expect(fileName).toBe('dashboard-data-c1.json')
    expect(JSON.parse(content)).toEqual({ complessivo: { name: 'Complessivo' } })
  })
})
