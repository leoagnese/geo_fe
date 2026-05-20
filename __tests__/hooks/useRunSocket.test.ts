/**
 * useRunSocket — unit tests.
 *
 * validates: AC-016, AC-017
 *
 * Coverage floor (Sprint 2):
 *  - Smoke: hook initialises with sane defaults when disabled
 *  - AC-016: connects to /runs namespace and emits run:watch when enabled
 *  - AC-016: appends run:log events to logs (capped at 15)
 *  - AC-016: updates progress on run:progress event
 *  - AC-017: sets terminalEvent on run:done
 *  - AC-017: sets terminalEvent.status = 'error' on run:error
 *  - Cleanup: socket is disconnected when enabled becomes false
 *
 * Sprint 3 test-writer will add:
 *  - reconnection behaviour after transient disconnect
 *  - log ring-buffer at exact MAX_LOGS boundary
 *  - a11y / ARIA (N/A for a hook)
 */

import { renderHook, act } from '@testing-library/react'
import { useRunSocket } from '@/hooks/useRunSocket'

// ── socket.io-client mock ──────────────────────────────────────

type EventHandler = (...args: unknown[]) => void

interface MockSocket {
  emit: jest.Mock
  on: jest.Mock
  disconnect: jest.Mock
  // helper exposed by mock to simulate server-emitted events
  _trigger: (event: string, payload: unknown) => void
  _triggerConnect: () => void
}

let lastMockSocket: MockSocket | null = null

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => {
    const handlers: Record<string, EventHandler[]> = {}

    const socket: MockSocket = {
      emit: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn((event: string, handler: EventHandler) => {
        if (!handlers[event]) handlers[event] = []
        handlers[event].push(handler)
      }),
      _trigger: (event: string, payload: unknown) => {
        handlers[event]?.forEach((h) => h(payload))
      },
      _triggerConnect: () => {
        handlers['connect']?.forEach((h) => h())
      },
    }

    lastMockSocket = socket
    return socket
  }),
}))

// ── helpers ───────────────────────────────────────────────────

function makeLog(phase = 'audit', msg = 'Testing...') {
  return { phase, message: msg, ts: new Date().toISOString() }
}

// ── tests ─────────────────────────────────────────────────────

describe('useRunSocket', () => {
  beforeEach(() => {
    lastMockSocket = null
    jest.clearAllMocks()
  })

  it('smoke: returns safe defaults when disabled', () => {
    /**
     * validates: AC-016
     * Hook should not connect and should return empty state when enabled=false.
     */
    const { result } = renderHook(() => useRunSocket('run-abc', false))

    expect(result.current.connected).toBe(false)
    expect(result.current.logs).toHaveLength(0)
    expect(result.current.progress).toBeNull()
    expect(result.current.currentPhase).toBeNull()
    expect(result.current.terminalEvent).toBeNull()
    // io() must not be called when disabled
    const { io } = jest.requireMock('socket.io-client')
    expect(io).not.toHaveBeenCalled()
  })

  it('AC-016: connects to /runs namespace and emits run:watch on connect', () => {
    /**
     * validates: AC-016
     * When enabled=true, the hook should create a socket on the /runs namespace
     * and emit run:watch with the runId immediately on connect.
     */
    const { io } = jest.requireMock('socket.io-client')

    renderHook(() => useRunSocket('run-123', true))

    // io() should have been called with a URL ending in /runs
    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/runs'),
      expect.objectContaining({ transports: ['websocket'] }),
    )

    // Simulate server connect event
    act(() => {
      lastMockSocket!._triggerConnect()
    })

    expect(lastMockSocket!.emit).toHaveBeenCalledWith('run:watch', { runId: 'run-123' })
  })

  it('AC-016: appends run:log events and reflects connected=true', () => {
    /**
     * validates: AC-016
     * run:log events should accumulate in logs and connected should become true after connect.
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
    })

    expect(result.current.connected).toBe(true)

    act(() => {
      lastMockSocket!._trigger('run:log', makeLog('audit', 'Checking domain...'))
    })

    expect(result.current.logs).toHaveLength(1)
    expect(result.current.logs[0].message).toBe('Checking domain...')
    expect(result.current.logs[0].phase).toBe('audit')
  })

  it('AC-016: caps logs at 15 entries', () => {
    /**
     * validates: AC-016
     * The hook should keep at most 15 log entries (ring buffer).
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
      for (let i = 0; i < 20; i++) {
        lastMockSocket!._trigger('run:log', makeLog('qgen', `Message ${i}`))
      }
    })

    expect(result.current.logs).toHaveLength(15)
    // The oldest messages should have been dropped; last entry = Message 19
    expect(result.current.logs[14].message).toBe('Message 19')
  })

  it('AC-016: updates progress on run:progress event', () => {
    /**
     * validates: AC-016
     * run:progress should update the progress object in the hook state.
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
      lastMockSocket!._trigger('run:progress', { done: 5, planned: 10, pct: 50 })
    })

    expect(result.current.progress).toEqual({ done: 5, planned: 10, pct: 50 })
  })

  it('AC-016: updates currentPhase on run:phase event', () => {
    /**
     * validates: AC-016
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
      lastMockSocket!._trigger('run:phase', { phase: 'finalizing' })
    })

    expect(result.current.currentPhase).toBe('finalizing')
  })

  it('AC-017: sets terminalEvent on run:done', () => {
    /**
     * validates: AC-017
     * run:done should populate terminalEvent so the page can redirect without
     * waiting for a polling cycle.
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
      lastMockSocket!._trigger('run:done', {
        status: 'done',
        doneQueries: 10,
        plannedQueries: 10,
      })
    })

    expect(result.current.terminalEvent).toEqual({ status: 'done', doneQueries: 10 })
    // Progress should also be updated to 100%
    expect(result.current.progress?.pct).toBe(100)
  })

  it('AC-017: sets terminalEvent on run:error', () => {
    /**
     * validates: AC-017
     */
    const { result } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
      lastMockSocket!._trigger('run:error', { message: 'n8n pipeline failure' })
    })

    expect(result.current.terminalEvent?.status).toBe('error')
    // Error message should also appear in logs
    expect(result.current.logs.some((l) => l.message === 'n8n pipeline failure')).toBe(true)
  })

  it('cleanup: socket is disconnected on unmount', () => {
    /**
     * validates: AC-016
     * The socket must be disconnected when the component using the hook unmounts.
     */
    const { unmount } = renderHook(() => useRunSocket('run-123', true))

    act(() => {
      lastMockSocket!._triggerConnect()
    })

    unmount()

    expect(lastMockSocket!.disconnect).toHaveBeenCalledTimes(1)
  })
})
