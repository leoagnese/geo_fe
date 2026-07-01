import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CampaignForm from '@/app/(protected)/domains/[clientKey]/runs/new/CampaignForm'
import { getProfiles, getDomain, createCampaign } from '@/lib/api-client'

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
  createCampaign: jest.fn(),
}))

const mockPush = jest.fn()

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignForm clientKey="acme" />
    </QueryClientProvider>,
  )
}

describe('CampaignForm', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(getProfiles as jest.Mock).mockResolvedValue({
      data: [{ profileKey: 'gpt5-mini', llmProvider: 'openai', runModel: 'gpt-5-mini', qgenModel: 'gpt-5-mini', nerModel: 'gpt-5-mini', active: true, createdAt: '2026-01-01' }],
    })
    ;(getDomain as jest.Mock).mockResolvedValue({
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', settori: ['dove-dormire', 'dove-mangiare'], personas: [], createdAt: '2026-01-01' },
    })
  })

  it('pre-selects all domain sectors by default', async () => {
    renderForm()
    expect(await screen.findByText('dove-dormire')).toBeInTheDocument()
    expect(screen.getByText('dove-mangiare')).toBeInTheDocument()
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.every((c) => (c as HTMLInputElement).checked)).toBe(true)
  })

  it('submits with the selected profile and redirects to the campaign detail page', async () => {
    ;(createCampaign as jest.Mock).mockResolvedValue({ data: { campaignId: 'camp-1' } })
    const user = userEvent.setup()
    renderForm()

    await screen.findByText('dove-dormire')
    await user.click(screen.getByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))
    await user.click(screen.getByRole('button', { name: /Avvia campagna/i }))

    await waitFor(() =>
      expect(createCampaign).toHaveBeenCalledWith(
        'tok',
        'acme',
        expect.objectContaining({ profileKey: 'gpt5-mini', locales: ['it'], sectionKeywords: undefined }),
      ),
    )
    expect(mockPush).toHaveBeenCalledWith('/domains/acme/campaigns/camp-1')
  })
})
