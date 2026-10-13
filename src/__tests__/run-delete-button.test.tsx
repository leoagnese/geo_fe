import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: { accessToken: 'tok' }, status: 'authenticated' }),
}))
jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client')
  return { ...actual, deleteRunPermanently: jest.fn() }
})

import { ApiError, deleteRunPermanently, type RunListItem } from '@/lib/api-client'
import RunDeleteButton from '@/components/RunDeleteButton'

const run = (over: Partial<RunListItem> = {}): RunListItem => ({
  runId: 'r1', clientKey: 'acme', profileKey: 'p', status: 'done', runIterations: 1,
  plannedQueries: 5, doneQueries: 5, errorQueries: 0, createdAt: '2026-10-12T10:00:00Z', ...over,
})

function renderBtn(r: RunListItem, client = new QueryClient()) {
  const spy = jest.spyOn(client, 'invalidateQueries')
  const onParentClick = jest.fn()
  render(
    <QueryClientProvider client={client}>
      <div onClick={onParentClick}><RunDeleteButton clientKey="acme" run={r} /></div>
    </QueryClientProvider>,
  )
  return { spy, onParentClick }
}

describe('RunDeleteButton', () => {
  beforeEach(() => (deleteRunPermanently as jest.Mock).mockReset())

  it.each(['queued', 'running'] as const)('is not offered for a %s run', (status) => {
    renderBtn(run({ status }))
    expect(screen.queryByRole('button', { name: /Elimina run/i })).not.toBeInTheDocument()
  })

  it('is not offered for a run that belongs to a campaign', () => {
    renderBtn(run({ campaignId: 'camp1' }))
    expect(screen.queryByRole('button', { name: /Elimina run/i })).not.toBeInTheDocument()
  })

  it('asks for confirmation, deletes, refreshes the runs list and does not trigger the row click', async () => {
    ;(deleteRunPermanently as jest.Mock).mockResolvedValue({ data: { runId: 'r1', deleted: true } })
    const { spy, onParentClick } = renderBtn(run())
    const u = userEvent.setup()

    await u.click(screen.getByRole('button', { name: /Elimina run/i }))
    expect(deleteRunPermanently).not.toHaveBeenCalled()
    expect(screen.getByText(/irreversibile/i)).toBeInTheDocument()

    await u.click(screen.getByRole('button', { name: /^Elimina$/ }))
    await waitFor(() => expect(deleteRunPermanently).toHaveBeenCalledWith('tok', 'acme', 'r1'))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['runs', 'acme'] }))
    expect(onParentClick).not.toHaveBeenCalled()
  })

  it('cancelling the dialog deletes nothing', async () => {
    renderBtn(run())
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: /Elimina run/i }))
    await u.click(screen.getByRole('button', { name: /Annulla/i }))
    expect(deleteRunPermanently).not.toHaveBeenCalled()
  })

  it('shows the server message when the deletion is refused', async () => {
    ;(deleteRunPermanently as jest.Mock).mockRejectedValue(
      new ApiError(409, { error: { code: 'RUN_IN_CAMPAIGN', message: 'La run appartiene a una campagna' } } as any),
    )
    renderBtn(run())
    const u = userEvent.setup()
    await u.click(screen.getByRole('button', { name: /Elimina run/i }))
    await u.click(screen.getByRole('button', { name: /^Elimina$/ }))
    expect(await screen.findByText(/appartiene a una campagna/i)).toBeInTheDocument()
  })
})
