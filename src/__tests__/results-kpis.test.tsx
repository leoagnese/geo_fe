/**
 * Test stub — Results overview KPI panel (SC-030)
 *
 * validates: AC-020, AC-021
 *
 * AC-020: KPI cards render with correct values from API
 * AC-021: zero-mention state renders "0" score + explanatory caption
 *
 * Note: Sprint 3 test-writer will add:
 * - Drive links section render (AC-026)
 * - Drive upload error warning (AC-027)
 * - Sentiment bar segment widths
 * - Score color banding (high/mid/low)
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'mock-token', user: { email: 'analyst@test.com', role: 'analyst' } },
    status: 'authenticated',
  }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}))

import { useQuery } from '@tanstack/react-query'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

const mockKpis = {
  runId: '2026-05-15T10:00:00.000Z_caffevergnano.com',
  targetBrand: 'Caffè Vergnano',
  aiVisibilityScore: 67.4,
  avgRankPosition: 2.3,
  linkRate: 0.42,
  sentimentPositive: 0.55,
  sentimentNeutral: 0.35,
  sentimentNegative: 0.10,
  totalMentions: 84,
  totalQueries: 42,
}

const mockReport = {
  runId: '2026-05-15T10:00:00.000Z_caffevergnano.com',
  reportFolderId: null,
  files: [],
  uploadError: null,
}

describe('OverviewPage — SC-030', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * validates: AC-020 — KPI cards render with loaded data
   * Given: run KPIs are fetched successfully
   * When: OverviewPage renders with mock data
   * Then: AI Visibility Score and target brand name are visible
   */
  it('AC-020: renders AI Visibility Score and target brand', async () => {
    // First call: KPIs; second call: report
    mockUseQuery
      .mockReturnValueOnce({
        data: { data: mockKpis },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({
        data: { data: mockReport },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OverviewPage = require('../app/(protected)/domains/[clientKey]/runs/[runId]/results/overview/page').default
    render(
      <OverviewPage
        params={{ clientKey: 'caffevergnano', runId: '2026-05-15T10:00:00.000Z_caffevergnano.com' }}
      />,
    )

    await waitFor(() => {
      // AI Visibility Score value
      expect(screen.getByText('67.4')).toBeInTheDocument()
      // Target brand in "Focus sul target" card
      expect(screen.getAllByText('Caffè Vergnano').length).toBeGreaterThan(0)
    })
  })

  /**
   * validates: AC-021 — zero visibility state
   * Given: brand has 0 mentions (aiVisibilityScore=0, totalMentions=0)
   * When: OverviewPage renders
   * Then: score shows "0.0" and zero-visibility warning is present
   */
  it('AC-021: renders zero-visibility state when totalMentions is 0', async () => {
    const zeroKpis = {
      ...mockKpis,
      aiVisibilityScore: 0,
      avgRankPosition: null,
      linkRate: 0,
      totalMentions: 0,
      sentimentPositive: 0,
      sentimentNeutral: 0,
      sentimentNegative: 0,
    }

    mockUseQuery
      .mockReturnValueOnce({
        data: { data: zeroKpis },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      } as ReturnType<typeof useQuery>)
      .mockReturnValueOnce({
        data: { data: mockReport },
        isLoading: false,
        isError: false,
      } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OverviewPage = require('../app/(protected)/domains/[clientKey]/runs/[runId]/results/overview/page').default
    render(
      <OverviewPage
        params={{ clientKey: 'caffevergnano', runId: '2026-05-15T10:00:00.000Z_caffevergnano.com' }}
      />,
    )

    await waitFor(() => {
      // Score shows 0
      expect(screen.getByText('0.0')).toBeInTheDocument()
      // Zero-visibility explanatory warning (AC-021)
      expect(
        screen.getByText(/non è stato menzionato in nessuna risposta LLM/i),
      ).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-020 — loading state renders without crash
   * Given: KPIs are loading
   * When: OverviewPage renders
   * Then: page mounts without error (skeleton visible)
   */
  it('AC-020: renders loading state without crashing', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const OverviewPage = require('../app/(protected)/domains/[clientKey]/runs/[runId]/results/overview/page').default
    const { container } = render(
      <OverviewPage
        params={{ clientKey: 'caffevergnano', runId: '2026-05-15T10:00:00.000Z_caffevergnano.com' }}
      />,
    )

    // Component mounted without throwing
    expect(container).toBeTruthy()
  })
})
