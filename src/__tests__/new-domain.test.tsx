/**
 * Test stub — Create Domain form (SC-011)
 *
 * validates: AC-005, AC-006, AC-007
 *
 * Smoke render: form mounts without crash.
 * Happy path: required fields filled → submit button enabled.
 * Validation: empty required field → inline error shown (AC-007).
 * clientKey format: invalid chars → Zod error shown.
 *
 * Note: Sprint 3 test-writer will add:
 * - Async uniqueness check (AC-006) — mock getDomain returning 200
 * - 409 conflict toast mapping
 * - Redirect after successful creation (AC-005)
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
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}))

jest.mock('@tanstack/react-query', () => ({
  useMutation: () => ({
    mutate: jest.fn(),
    isPending: false,
  }),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}))

// Mock the api-client to prevent real fetch
jest.mock('@/lib/api-client', () => ({
  createDomain: jest.fn(),
  getDomain: jest.fn().mockRejectedValue({ status: 404 }),
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

describe('NewDomainPage — SC-011', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  /**
   * validates: AC-007 — smoke render
   * Given: create domain form
   * When: component mounts
   * Then: form fields are present
   */
  it('renders without crashing with required form fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NewDomainPage = require('../app/(protected)/domains/new/page').default
    render(<NewDomainPage />)

    expect(screen.getByText('Crea dominio')).toBeInTheDocument()
    // clientKey field
    expect(screen.getByLabelText(/clientKey/i)).toBeInTheDocument()
    // brand field
    expect(screen.getByLabelText(/Brand/i)).toBeInTheDocument()
  })

  /**
   * validates: AC-007 — FE validation fires on submit with empty required fields
   * Given: form with no input
   * When: user tries to submit
   * Then: inline validation errors appear; no API call made
   */
  it('shows inline validation errors for missing required fields', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NewDomainPage = require('../app/(protected)/domains/new/page').default
    render(<NewDomainPage />)

    const submitBtn = screen.getByRole('button', { name: /Crea dominio/i })
    await userEvent.click(submitBtn)

    await waitFor(() => {
      // Zod validation errors should appear for required fields
      expect(screen.getByText(/obbligatorio/i)).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-007 — clientKey format validation
   * Given: invalid clientKey (contains uppercase)
   * When: user blurs the clientKey field
   * Then: format error message appears
   */
  it('shows format error when clientKey contains invalid chars', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NewDomainPage = require('../app/(protected)/domains/new/page').default
    render(<NewDomainPage />)

    const clientKeyInput = screen.getByLabelText(/clientKey/i)
    await userEvent.type(clientKeyInput, 'Invalid Key With Spaces!')
    fireEvent.blur(clientKeyInput)

    await waitFor(() => {
      expect(
        screen.getByText(/solo lettere minuscole, numeri, trattini o underscore/i),
      ).toBeInTheDocument()
    })
  })

  /**
   * validates: AC-005 — form is submittable when valid data is entered
   * Given: all required fields filled with valid data
   * When: component renders
   * Then: submit button is not disabled
   */
  it('submit button is enabled when all required fields have valid values', async () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const NewDomainPage = require('../app/(protected)/domains/new/page').default
    render(<NewDomainPage />)

    await userEvent.type(screen.getByLabelText(/clientKey/i), 'caffevergnano')
    await userEvent.type(screen.getByLabelText(/Dominio target/i), 'caffevergnano.com')
    await userEvent.type(screen.getByLabelText(/Brand/i), 'Caffè Vergnano')

    // Submit button should not have a disabled state
    const submitBtn = screen.getByRole('button', { name: /Crea dominio/i })
    expect(submitBtn).not.toBeDisabled()
  })
})
