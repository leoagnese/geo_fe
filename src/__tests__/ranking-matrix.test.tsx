/**
 * Ranking page — brand performance matrix shows citations (with link) and
 * mentions (without link) as separate columns.
 */
import { render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import RankingPage from '@/app/(protected)/domains/[clientKey]/runs/[runId]/results/ranking/page'
import { getRunRanking, getRunKpis, getBrandSuggestions } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('next/dynamic', () => () => () => null)
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getRunRanking: jest.fn(),
  getRunKpis: jest.fn(),
  getBrandSuggestions: jest.fn(),
}))

const row = (brand: string, citations: number, mentionsOnly: number) => ({
  brand, citations, mentionsOnly, totalMentions: citations + mentionsOnly,
  aiVisibilityScore: 50, avgRankPosition: 2, linkRate: 0.5,
  sentimentPositive: 0.5, sentimentNeutral: 0.3, sentimentNegative: 0.2,
})

describe('Ranking page — matrix', () => {
  beforeEach(() => {
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(getRunKpis as jest.Mock).mockResolvedValue({ data: null })
    ;(getBrandSuggestions as jest.Mock).mockResolvedValue({ data: [] })
    ;(getRunRanking as jest.Mock).mockResolvedValue({
      data: {
        targetBrandRow: row('Gewiss', 12, 3),
        competitors: [{ rank: 1, ...row('ABB', 4, 9) }],
      },
      meta: { total: 1 },
    })
  })

  it('has separate "Citazioni" and "Menzioni" columns with the right counts', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RankingPage params={{ clientKey: 'acme', runId: 'r1' }} />
      </QueryClientProvider>,
    )

    const table = await screen.findByRole('table')
    await within(table).findByText('ABB') // wait for the data, not just the loading skeleton
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(expect.arrayContaining(['Menzioni', 'Citazioni']))
    expect(headers.indexOf('Citazioni')).toBe(headers.indexOf('Menzioni') + 1)

    const cellsOf = (brand: string) =>
      within(within(table).getByText(brand).closest('tr')!).getAllByRole('cell').map((c) => c.textContent)
    const col = (name: string) => headers.indexOf(name)

    expect(cellsOf('Gewiss')[col('Menzioni')]).toBe('3')
    expect(cellsOf('Gewiss')[col('Citazioni')]).toBe('12')
    expect(cellsOf('ABB')[col('Menzioni')]).toBe('9')
    expect(cellsOf('ABB')[col('Citazioni')]).toBe('4')
  })

  it('shows how many names were merged and lists merged spellings on hover', async () => {
    ;(getRunRanking as jest.Mock).mockResolvedValue({
      data: {
        targetBrandRow: row('Gewiss', 12, 3),
        competitors: [{ rank: 1, ...row('MAVIL', 4, 9), variants: ['Mavil'] }],
      },
      meta: { total: 1, mergedNames: 3 },
    })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <RankingPage params={{ clientKey: 'acme', runId: 'r1' }} />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('3 nomi uniti')).toBeInTheDocument()
    expect(await screen.findByLabelText('Nomi uniti: Mavil')).toBeInTheDocument()
  })
})
