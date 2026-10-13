import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import DataModeToggle from '@/components/DataModeToggle'
import { useDataMode } from '@/lib/useDataMode'

const mockReplace = jest.fn()
let mockSearch = ''
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  usePathname: () => '/domains/acme/runs/r1/results/overview',
  useSearchParams: () => new URLSearchParams(mockSearch),
}))

beforeEach(() => { mockReplace.mockClear(); mockSearch = '' })

describe('useDataMode', () => {
  it('defaults to raw', () => {
    expect(renderHook(() => useDataMode()).result.current.mode).toBe('raw')
  })
  it('reads ?data=processed and ignores unknown values', () => {
    mockSearch = 'data=processed'
    expect(renderHook(() => useDataMode()).result.current.mode).toBe('processed')
    mockSearch = 'data=banana'
    expect(renderHook(() => useDataMode()).result.current.mode).toBe('raw')
  })
})

describe('DataModeToggle', () => {
  it('shows both modes with the active one pressed', () => {
    mockSearch = 'data=processed'
    render(<DataModeToggle />)
    expect(screen.getByRole('button', { name: 'Dati elaborati' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Dati raw' })).toHaveAttribute('aria-pressed', 'false')
  })
  it('writes the mode in the URL, keeping other parameters, and drops it for raw', async () => {
    mockSearch = 'x=1'
    const { rerender } = render(<DataModeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Dati elaborati' }))
    expect(mockReplace).toHaveBeenCalledWith('/domains/acme/runs/r1/results/overview?x=1&data=processed')
    mockSearch = 'x=1&data=processed'
    rerender(<DataModeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Dati raw' }))
    expect(mockReplace).toHaveBeenLastCalledWith('/domains/acme/runs/r1/results/overview?x=1')
  })
})
