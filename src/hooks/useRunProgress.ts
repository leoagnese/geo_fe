'use client'

import { useEffect, useMemo, useState } from 'react'
import { predictRunWork, recalibrateAudit, calcOverallPct } from '@/lib/runPrediction'
import type { Run } from '@/lib/api-client'
import type { RunProgressEvent, RunQgenProgressEvent } from './useRunSocket'

export type RunPhase = 'qgen' | 'audit' | 'finalizing' | 'idle'

export interface RunProgressState {
  overallPct:    number        // 0-100, node-weighted prediction
  phase:         RunPhase
  phaseLabel:    string
  qgenDone:      number
  qgenPlanned:   number
  auditDone:     number
  auditPlanned:  number
  auditErrors:   number
  velocity:      number        // queries/min (audit phase only)
  etaSeconds:    number | null // null = not enough data
}

export function useRunProgress(
  run:          Run | undefined,
  progress:     RunProgressEvent | null,
  qgenProgress: RunQgenProgressEvent | null,
  isRunning:    boolean,
): RunProgressState {
  const [auditStartTime, setAuditStartTime] = useState<number | null>(null)

  const prediction = useMemo(
    () => (run ? predictRunWork(run) : null),
    // Re-run when plannedQueries becomes known (switches from estimate to exact)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [run?.runId, run?.plannedQueries],
  )

  const qgenDone     = qgenProgress?.done    ?? 0
  // planned:0 means "unknown" (gotQueries=true on BE), fall back to prediction
  const qgenPlanned  = (qgenProgress?.planned || prediction?.nQgenTasks) ?? 0
  const auditDone    = progress?.done        ?? run?.doneQueries  ?? 0
  const auditPlanned = progress?.planned     ?? run?.plannedQueries ?? 0
  const auditErrors  = run?.errorQueries     ?? 0

  const phase: RunPhase = useMemo(() => {
    if (!isRunning) return 'idle'
    if (auditPlanned > 0 && auditDone >= auditPlanned) return 'finalizing'
    if (auditPlanned > 0) return 'audit'
    return 'qgen'
  }, [isRunning, auditDone, auditPlanned])

  // Record when audit phase begins (for velocity / ETA)
  useEffect(() => {
    if (phase === 'audit' && auditStartTime === null) {
      setAuditStartTime(Date.now())
    }
    if (!isRunning) {
      setAuditStartTime(null)
    }
  }, [phase, isRunning, auditStartTime])

  // queries/min — recalculates every time auditDone changes
  const velocity = useMemo(() => {
    if (phase !== 'audit' || !auditStartTime || auditDone === 0) return 0
    const elapsedMin = (Date.now() - auditStartTime) / 60_000
    if (elapsedMin < 0.2) return 0
    return Math.round((auditDone / elapsedMin) * 10) / 10
  }, [phase, auditStartTime, auditDone])

  const etaSeconds = useMemo(() => {
    if (velocity === 0 || auditPlanned === 0) return null
    const remaining = auditPlanned - auditDone
    if (remaining <= 0) return null
    return Math.round((remaining / velocity) * 60)
  }, [velocity, auditDone, auditPlanned])

  const overallPct = useMemo(() => {
    if (!prediction || !isRunning) return 0
    // Once the live audit total is known, recalibrate against it — the pre-run
    // estimate is often far off (test runs especially), which would pin the bar
    // at a few percent until the run finishes.
    const effPred =
      auditPlanned > 0 ? recalibrateAudit(prediction, auditPlanned) : prediction
    return calcOverallPct(effPred, qgenDone, auditDone, phase === 'finalizing')
  }, [prediction, qgenDone, auditDone, auditPlanned, phase, isRunning])

  const phaseLabel =
    phase === 'qgen'       ? 'Generazione domande'
    : phase === 'audit'      ? 'Audit LLM'
    : phase === 'finalizing' ? 'Finalizzazione'
    : ''

  return {
    overallPct,
    phase,
    phaseLabel,
    qgenDone,
    qgenPlanned,
    auditDone,
    auditPlanned,
    auditErrors,
    velocity,
    etaSeconds,
  }
}
