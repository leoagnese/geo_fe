/**
 * Browser autofill fills the inputs without firing React's onChange, so the
 * labels must not depend on state to stay out of the way, and the submit
 * button must not be gated on state either.
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

const signIn = jest.fn().mockResolvedValue({ error: null })
jest.mock('next-auth/react', () => ({ signIn: (...a: unknown[]) => signIn(...a) }))
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const LoginPage = require('../app/(auth)/login/page').default

describe('LoginPage — browser autofill', () => {
  beforeEach(() => signIn.mockClear())

  it('keeps both labels shrunk so autofilled values are not overlapped', () => {
    render(<LoginPage />)
    for (const name of [/Username o email/i, /Password/i]) {
      const label = screen.getAllByText(name).find((el) => el.tagName === 'LABEL')!
      expect(label).toHaveAttribute('data-shrink', 'true')
    }
  })

  it('submits values written to the DOM without any change event', async () => {
    render(<LoginPage />)
    const user = screen.getByLabelText(/Username o email/i) as HTMLInputElement
    const pass = screen.getByLabelText(/^Password/i) as HTMLInputElement
    user.value = 'admin@geo.local' // what autofill does: no React event
    pass.value = 'secret'

    const button = screen.getByRole('button', { name: /Accedi/i })
    expect(button).toBeEnabled()
    fireEvent.click(button)

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith(
        'credentials',
        expect.objectContaining({ username: 'admin@geo.local', password: 'secret' }),
      ),
    )
  })
})
