/**
 * useRunSocket — real-time run monitoring via Socket.io.
 *
 * Connects to the `/runs` namespace on the backend gateway.
 * Emits `run:watch` on connect so the server adds this client to the run's room.
 * Accumulates the last 15 `run:log` messages, tracks live progress, current phase,
 * and the terminal event (run:done / run:error).
 *
 * Only connects when `enabled === true && runId !== null`.
 * Disconnects on unmount or when `enabled` becomes false.
 *
 * WS base URL: `NEXT_PUBLIC_WS_URL` env var, falling back to the API base URL
 * stripped of `/api/v1`. If neither is available, defaults to same origin ('').
 *
 * @implements US-009, US-010
 * @validates AC-016, AC-017
 * @spec L1_design/screen-inventory.md §"SC-021"
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

// ── Event payload types (mirror NestJS gateway contracts) ──────

export interface RunLogEvent {
  phase: string
  message: string
  ts: string
  meta?: Record<string, unknown>
}

export interface RunProgressEvent {
  done: number
  planned: number
  pct: number
}

export interface RunPhaseEvent {
  phase: 'qgen' | 'audit' | 'finalizing' | 'running'
}

export interface RunDoneEvent {
  status: string
  doneQueries: number
  plannedQueries: number
}

export interface RunErrorEvent {
  message: string
  code?: string
}

export interface RunQgenProgressEvent {
  done: number
  planned: number
}

// ── Return type ────────────────────────────────────────────────

export interface UseRunSocketReturn {
  connected: boolean
  logs: Array<{ phase: string; message: string; ts: string }>
  progress: RunProgressEvent | null
  qgenProgress: RunQgenProgressEvent | null
  currentPhase: string | null
  terminalEvent: { status: string; doneQueries: number } | null
}

const MAX_LOGS = 15

/**
 * Derive the WebSocket base URL from environment variables.
 * `NEXT_PUBLIC_WS_URL` takes precedence; otherwise strips `/api/v1`
 * from `NEXT_PUBLIC_API_BASE_URL`; otherwise empty string (same origin).
 */
function resolveWsUrl(): string {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? ''
  // Remove trailing /api/v1 (or /api/v1/) to get the server origin
  return apiBase.replace(/\/api\/v1\/?$/, '')
}

export function useRunSocket(
  runId: string | null,
  enabled: boolean,
  token?: string,
): UseRunSocketReturn {
  const [connected, setConnected] = useState(false)
  const [logs, setLogs] = useState<Array<{ phase: string; message: string; ts: string }>>([])
  const [progress, setProgress] = useState<RunProgressEvent | null>(null)
  const [qgenProgress, setQgenProgress] = useState<RunQgenProgressEvent | null>(null)
  const [currentPhase, setCurrentPhase] = useState<string | null>(null)
  const [terminalEvent, setTerminalEvent] = useState<{
    status: string
    doneQueries: number
  } | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Only connect when explicitly enabled and a runId is provided
    if (!enabled || runId === null) return

    const wsUrl = resolveWsUrl()

    const socket = io(`${wsUrl}/runs`, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      auth: token ? { token } : undefined,
    })

    socketRef.current = socket

    // ── Connect: join the run's room ──────────────────────────
    socket.on('connect', () => {
      setConnected(true)
      socket.emit('run:watch', { runId })
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    // ── run:log — accumulate last MAX_LOGS entries ────────────
    socket.on('run:log', (payload: RunLogEvent) => {
      setLogs((prev) => {
        const entry = { phase: payload.phase, message: payload.message, ts: payload.ts }
        const next = [...prev, entry]
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
      })
    })

    // ── run:progress — update live counters ───────────────────
    socket.on('run:progress', (payload: RunProgressEvent) => {
      setProgress(payload)
    })

    // ── run:qgen_progress — qgen phase granular counter ───────
    socket.on('run:qgen_progress', (payload: RunQgenProgressEvent) => {
      setQgenProgress(payload)
    })

    // ── run:phase — update current phase label ────────────────
    socket.on('run:phase', (payload: RunPhaseEvent) => {
      setCurrentPhase(payload.phase)
    })

    // ── run:done — terminal success ───────────────────────────
    socket.on('run:done', (payload: RunDoneEvent) => {
      setTerminalEvent({ status: payload.status, doneQueries: payload.doneQueries })
      // Update progress to 100% on completion
      if (payload.plannedQueries > 0) {
        setProgress({
          done: payload.doneQueries,
          planned: payload.plannedQueries,
          pct: 100,
        })
      }
    })

    // ── run:error — terminal failure ──────────────────────────
    socket.on('run:error', (payload: RunErrorEvent) => {
      // RUN_NOT_FOUND is a transient race-condition error (socket connected before
      // the HTTP GET confirmed the run). Retry run:watch after a short backoff.
      if (payload.code === 'RUN_NOT_FOUND') {
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = setTimeout(() => {
          if (socket.connected) socket.emit('run:watch', { runId })
        }, 2_000)
        return
      }
      setTerminalEvent({ status: 'error', doneQueries: 0 })
      setLogs((prev) => {
        const entry = {
          phase: 'error',
          message: payload.message,
          ts: new Date().toISOString(),
        }
        const next = [...prev, entry]
        return next.length > MAX_LOGS ? next.slice(next.length - MAX_LOGS) : next
      })
    })

    // ── Cleanup ───────────────────────────────────────────────
    return () => {
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [runId, enabled, token])

  return { connected, logs, progress, qgenProgress, currentPhase, terminalEvent }
}
