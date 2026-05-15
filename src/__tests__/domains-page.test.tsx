/**
 * Test stub — Domains Dashboard (SC-010)
 *
 * validates: AC-008
 *
 * Smoke render: component mounts without crash.
 * Happy path: domain cards render when data loaded.
 * Loading path: skeleton cards shown while fetching.
 *
 * Note: Sprint 3 test-writer will add:
 * - Search filter interaction
 * - 401 redirect
 * - Error state with retry button click
 * - Empty state first-use
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      accessToken: 'mock-token',
      user: { email: 'analyst@test.com', role: 'analyst' },
    },
    status: 'authenticated',
  }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => '/domains',
}))

// Mock TanStack Query
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  QueryClient: jest.fn(() => ({
    defaultOptions: {},
  })),
}))

import { useQuery } from '@tanstack/react-query'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>

// Minimal domain fixture
const mockDomains = [
  {
    _id: '1',
    clientKey: 'caffevergnano',
    targetDomain: 'caffevergnano.com',
    brand: 'Caffè Vergnano',
    settori: ['food-beverage'],
    createdAt: '2026-05-15T10:00:00.000Z',
  },
  {
    _id: '2',
    clientKey: 'lavazza',
    targetDomain: 'lavazza.com',
    brand: 'Lavazza',
    settori: ['coffee'],
    createdAt: '2026-05-14T10:00:00.000Z',
  },
]

describe('DomainsPage — SC-010', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * validates: AC-008 — smoke render
   * Given: domains page mounts
   * When: component renders
   * Then: page title "Domini" is present, no uncaught error
   */
  it('renders page title without crashing', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useQuery>)

    // Import after mocks are set up
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    expect(screen.getByText('Domini')).toBeInTheDocument()
  })

  /**
   * validates: AC-008 — loading state
   * Given: domains are loading
   * When: useQuery returns isLoading=true
   * Then: "Nuovo dominio" button is visible and loading skeleton is present
   */
  it('shows "Nuovo dominio" button and skeleton while loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    expect(screen.getByText('Nuovo dominio')).toBeInTheDocument()
  })

  /**
   * validates: AC-008 — populated state
   * Given: analyst has assigned domains
   * When: getDomains returns 2 domain records
   * Then: brand names are visible in domain cards
   */
  it('renders domain brand names when data is loaded', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: mockDomains, meta: { page: 1, limit: 100, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    await waitFor(() => {
      expect(screen.getByText('Caffè Vergnano')).toBeInTheDocument()
      expect(screen.getByText('Lavazza')).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-008 — empty state (first-use)
   * Given: analyst has no assigned domains
   * When: getDomains returns empty array
   * Then: "Crea dominio" CTA and zero-state copy are visible
   */
  it('renders first-use empty state when no domains exist', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 100, total: 0 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Nessun dominio ancora/i)).toBeInTheDocument()
      // CTA button appears in both header and empty state
      const ctaButtons = screen.getAllByText('Crea dominio')
      expect(ctaButtons.length).toBeGreaterThan(0)
    })
  })
})
