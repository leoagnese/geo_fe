/**
 * Test stub — Run Monitor (SC-021 + SC-022)
 *
 * validates: AC-042, AC-043, AC-044, AC-045
 *
 * AC-042: Cancel button visible when status=running
 * AC-043: Cancel confirmation dialog opens on cancel click
 * AC-044: Cancel button NOT visible when run is done/error/cancelled
 * AC-045: Cancel button visible when status=queued (queued runs are cancellable)
 *
 * Note: Sprint 3 test-writer will add:
 * - Polling auto-stop when status changes to done
 * - Stale data warning after 3 consecutive polling fails
 * - Auto-redirect to /results/overview when status → done
 * - Debug log panel render when debugMode=true
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}))

jest.mock('@/lib/api-client', () => ({
  getRun: jest.fn(),
  cancelRun: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, body: { error: { code: string; message: string } }) {
      super(body.error.message)
      this.status = status
      this.code = body.error.code
    }
  },
}))

import { useQuery, useMutation } from '@tanstack/react-query'

const mockUseQuery = useQuery as jest.MockedFunction<typeof useQuery>
const mockUseMutation = useMutation as jest.MockedFunction<typeof useMutation>

const baseRun = {
  runId: '2026-05-15T10:00:00.000Z_caffevergnano.com',
  clientKey: 'caffevergnano',
  profileKey: 'openai-gpt4o-standard',
  runIterations: 3,
  locales: ['it-IT'],
  keywordsOverride: [],
  testMode: false,
  debugMode: false,
  plannedQueries: 42,
  doneQueries: 18,
  errorQueries: 0,
  errorMessage: null,
  startedAt: '2026-05-15T10:00:00.000Z',
  completedAt: null,
  createdAt: '2026-05-15T10:00:00.000Z',
  debugLog: [],
}

function setupPage(status: string) {
  mockUseQuery.mockReturnValue({
    data: { data: { ...baseRun, status } },
    isLoading: false,
    isError: false,
  } as ReturnType<typeof useQuery>)

  mockUseMutation.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  } as ReturnType<typeof useMutation>)

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RunMonitorPage = require('../app/(protected)/domains/[clientKey]/runs/[runId]/page').default
  return render(
    <RunMonitorPage params={{ clientKey: 'caffevergnano', runId: '2026-05-15T10:00:00.000Z_caffevergnano.com' }} />,
  )
}

describe('RunMonitorPage — SC-021/SC-022', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * validates: AC-042 — cancel button visible when running
   * Given: run status is 'running'
   * When: page renders
   * Then: "Annulla run" button is visible
   */
  it('AC-042: shows cancel button when status=running', async () => {
    setupPage('running')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Annulla run/i })).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-043 — cancel confirmation dialog
   * Given: run status is 'running'
   * When: user clicks "Annulla run"
   * Then: confirmation dialog opens
   */
  it('AC-043: opens confirmation dialog when cancel button clicked', async () => {
    setupPage('running')

    const cancelBtn = await screen.findByRole('button', { name: /Annulla run/i })
    await userEvent.click(cancelBtn)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-044 — cancel button NOT visible for terminal states
   * Given: run status is 'done'
   * When: page renders
   * Then: "Annulla run" button is NOT in the document
   */
  it('AC-044: hides cancel button when status=done', async () => {
    setupPage('done')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Annulla run/i })).not.toBeInTheDocument()
    })
  })

  /**
   * validates: AC-044 — cancel button NOT visible for error state
   * Given: run status is 'error'
   * When: page renders
   * Then: "Annulla run" button is NOT in the document
   */
  it('AC-044: hides cancel button when status=error', async () => {
    setupPage('error')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Annulla run/i })).not.toBeInTheDocument()
    })
  })

  /**
   * validates: AC-045 — cancel button visible for queued runs (OQ-014 resolved)
   * Given: run status is 'queued'
   * When: page renders
   * Then: "Annulla run" button is visible AND SC-022 queue banner is displayed
   */
  it('AC-045: shows cancel button and queue banner when status=queued', async () => {
    setupPage('queued')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Annulla run/i })).toBeInTheDocument()
      expect(screen.getByText(/Run in coda/i)).toBeInTheDocument()
    })
  })
})
