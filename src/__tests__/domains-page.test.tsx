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
  useQueries: jest.fn(() => []),
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
    createdAt: '2026-05-15T10:00:00.000Z',
  },
  {
    _id: '2',
    clientKey: 'lavazza',
    targetDomain: 'lavazza.com',
    brand: 'Lavazza',
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
   * Then: page title (containing "Domini") is present, no uncaught error
   *
   * Note: the page title copy was renamed from "Domini" to "Progetti & Domini"
   * in commit e4f64d3 (i18n pass); matching on the heading role + a substring
   * keeps this resilient to further copy tweaks while still asserting a title
   * renders.
   */
  it('renders page title without crashing', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    // Import after mocks are set up
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    expect(screen.getByRole('heading', { name: /Domini/i })).toBeInTheDocument()
  })

  /**
   * validates: AC-008 — loading state
   * Given: domains are loading
   * When: useQuery returns isLoading=true
   * Then: primary "create" CTA is visible and loading skeleton rows are present
   *
   * Note: the CTA copy was renamed from "Nuovo dominio" to "Crea nuovo
   * progetto" in commit e73fc63 (results/domains redesign); same button,
   * same behaviour (navigates to /domains/new), new label.
   */
  it('shows create-domain button and skeleton while loading', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    const { container } = render(<DomainsPage />)

    expect(screen.getByRole('button', { name: 'Crea nuovo progetto' })).toBeInTheDocument()
    expect(container.querySelectorAll('.MuiSkeleton-root').length).toBeGreaterThan(0)
  })

  /**
   * validates: AC-008 — populated state
   * Given: analyst has assigned domains
   * When: getDomains returns 2 domain records
   * Then: domain rows render with the loaded data
   *
   * Note: the domain table (added in e73fc63) shows each row's `targetDomain`
   * in the primary cell, falling back to `brand` only when targetDomain is
   * empty (see page.tsx: `{domain.targetDomain || domain.brand}`). Since the
   * fixture below sets targetDomain for both rows, brand names are not the
   * text actually rendered here anymore — asserting on targetDomain is the
   * faithful equivalent of the original "loaded data is visible" intent.
   */
  it('renders domain rows when data is loaded', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: mockDomains, meta: { page: 1, limit: 100, total: 2 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    await waitFor(() => {
      expect(screen.getByText('caffevergnano.com')).toBeInTheDocument()
      expect(screen.getByText('lavazza.com')).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-008 — empty state
   * Given: analyst has no assigned domains
   * When: getDomains returns empty array
   * Then: empty-state copy is visible and the create-domain CTA is present
   *
   * Note: the dedicated first-use empty-state illustration + in-row "Crea
   * dominio" CTA (from the original 67a4d9c implementation) was removed in
   * the e73fc63 redesign; the table now shows a single "Nessun dominio
   * trovato." row, and the only create-domain action is the persistent
   * header button ("Crea nuovo progetto", present in every state, not
   * empty-state-specific). There is no other empty-state implementation
   * elsewhere in the app — this is a confirmed, intentional simplification,
   * not lost functionality. Assertion updated to match current copy/CTA.
   */
  it('renders empty state when no domains exist', async () => {
    mockUseQuery.mockReturnValue({
      data: { data: [], meta: { page: 1, limit: 100, total: 0 } },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useQuery>)

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const DomainsPage = require('../app/(protected)/domains/page').default
    render(<DomainsPage />)

    await waitFor(() => {
      expect(screen.getByText('Nessun dominio trovato.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Crea nuovo progetto' })).toBeInTheDocument()
    })
  })
})
