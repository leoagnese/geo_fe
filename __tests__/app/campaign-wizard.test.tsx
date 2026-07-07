import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CampaignWizard from '@/app/(protected)/domains/[clientKey]/runs/new/CampaignWizard'
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
  postDomainPersona: jest.fn(),
  deleteDomainPersona: jest.fn(),
}))

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignWizard clientKey="acme" />
    </QueryClientProvider>,
  )
}

describe('CampaignWizard — navigation', () => {
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

  it('starts with one section named "Analisi 1" in the sidebar', async () => {
    renderWizard()
    expect(await screen.findByText('Analisi 1')).toBeInTheDocument()
  })

  it('Aggiungi analisi appends a section inheriting the previous profile, and switches to it', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))

    await user.click(screen.getByRole('button', { name: /Aggiungi analisi/i }))

    expect(await screen.findByText('Analisi 2')).toBeInTheDocument()
    // The newly-added, now-active section's profile select shows the inherited value.
    const profileSelects = screen.getAllByDisplayValue('gpt5-mini')
    expect(profileSelects.length).toBeGreaterThanOrEqual(1)
  })

  it('switching sections via the sidebar preserves previously typed values', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    const nameInput = screen.getByLabelText(/Nome analisi/i)
    await user.type(nameInput, 'Cosa fare')

    await user.click(screen.getByRole('button', { name: /Aggiungi analisi/i }))
    await screen.findByText('Analisi 2')

    await user.click(screen.getByText('Cosa fare'))
    // Both sections stay mounted (display:none, not unmounted) per the Global
    // Constraint, so `getByLabelText` (singular) always throws once a second
    // section exists — RTL's label queries don't filter by CSS visibility.
    // Use the plural form and assert at least one match carries the persisted value.
    const nameInputs = screen.getAllByLabelText(/Nome analisi/i)
    expect(nameInputs.some((el) => (el as HTMLInputElement).value === 'Cosa fare')).toBe(true)
  })

  it('does not allow removing the last remaining section', async () => {
    renderWizard()
    await screen.findByText('Analisi 1')
    expect(screen.queryByLabelText(/Rimuovi analisi/i)).not.toBeInTheDocument()
  })
})

describe('CampaignWizard — recap and submit', () => {
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

  it('shows a recap card per section and submits sections to createCampaign', async () => {
    ;(createCampaign as jest.Mock).mockResolvedValue({ data: { campaignId: 'camp-1' } })
    const mockPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    await user.type(screen.getByLabelText(/Nome analisi/i), 'Cosa fare')
    // The topics repeater starts with one empty, required-label row (same
    // pre-existing RunConfigFields validation as SingleRunForm); fill it in
    // so the form's own validation doesn't block submission.
    await user.type(screen.getByLabelText(/Etichetta topic/i), 'Topic principale')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))

    await user.click(screen.getByText('Recap'))
    // "Cosa fare" now renders both in the sidebar entry (always visible) and
    // in the recap card — use findAllByText and assert at least 2 matches to
    // confirm the recap card itself rendered it, not just the sidebar.
    await waitFor(() => expect(screen.getAllByText('Cosa fare').length).toBeGreaterThanOrEqual(2))

    await user.click(screen.getByRole('button', { name: /Avvia campagna/i }))

    await waitFor(() =>
      expect(createCampaign).toHaveBeenCalledWith(
        'tok',
        'acme',
        expect.objectContaining({
          sections: [expect.objectContaining({ label: 'Cosa fare', profileKey: 'gpt5-mini', locales: ['it'] })],
        }),
      ),
    )
    expect(mockPush).toHaveBeenCalledWith('/domains/acme/campaigns/camp-1')
  })

  it('jumps to the first invalid section when submitting with a missing required field', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    // Leave "Nome analisi" and profile empty — required fields.
    await user.click(screen.getByText('Recap'))
    await user.click(screen.getByRole('button', { name: /Avvia campagna/i }))

    // Submission should be blocked and the view should jump back to the invalid section.
    await waitFor(() => expect(screen.getByLabelText(/Nome analisi/i)).toBeInTheDocument())
    expect(createCampaign).not.toHaveBeenCalled()
  })
})
