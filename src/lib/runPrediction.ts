/**
 * runPrediction — pre-computes the expected total node executions for a run
 * and derives per-phase weights from the known n8n workflow structure.
 *
 * Node counts per phase are derived from the workflow connection graph:
 *   qgen task  ≈ 5 nodes  (Prep→Switch→LLM→Parse→geoqueries)
 *   audit query ≈ 12 nodes (Lock→Batch→Switch→LLM→Merge→Parse+NER→Build→Upsert×2→Metrics→Update)
 *   finalize   = 15 nodes  (Finalizer×3+Reporter×2+CSVs+LLM+XLSX+Upload×2+PatchDone)
 *   bootstrap  = 3  nodes  (Bootstrap+georuns+GotQueries)
 */

import type { Run } from './api-client'

const N_BOOTSTRAP        = 3
const N_QGEN_PER_TASK    = 5
const N_AUDIT_PER_QUERY  = 12
const N_FINALIZE         = 15

export interface RunPrediction {
  nQgenTasks:     number
  nQgenNodes:     number
  nAuditQueries:  number
  nAuditNodes:    number
  nFinalizeNodes: number
  nTotal:         number
  qgenWeight:     number  // fraction [0,1] — qgen phase share of total nodes
  auditWeight:    number
  finalizeWeight: number
}

export function predictRunWork(run: Run): RunPrediction {
  // Predicted qgen task count from questionsCountByLang
  const qCount = (run.questionsCountByLang ?? {}) as Record<string, number>
  const nQgenTasks = run.gotQueries
    ? 0
    : Object.values(qCount).reduce((s, n) => s + (Number(n) || 0), 0)
      || (run.locales?.length ?? 1) * 5

  // Use actual plannedQueries once known; otherwise estimate from config
  const personaCount = Math.max(
    run.personas?.length ?? 0,
    run.activePersonaIds?.length ?? 0,
    1,
  )
  const nAuditQueries = (run.plannedQueries ?? 0) > 0
    ? run.plannedQueries
    : nQgenTasks * personaCount * (run.runIterations ?? 1)

  const nQgenNodes    = nQgenTasks * N_QGEN_PER_TASK
  const nAuditNodes   = nAuditQueries * N_AUDIT_PER_QUERY
  const nTotal        = N_BOOTSTRAP + nQgenNodes + nAuditNodes + N_FINALIZE

  return {
    nQgenTasks,
    nQgenNodes,
    nAuditQueries,
    nAuditNodes,
    nFinalizeNodes: N_FINALIZE,
    nTotal,
    qgenWeight:      (N_BOOTSTRAP + nQgenNodes) / nTotal,
    auditWeight:     nAuditNodes / nTotal,
    finalizeWeight:  N_FINALIZE / nTotal,
  }
}

/**
 * Recalibrate a prediction against the ACTUAL audit-query total, known live
 * once the first `run:progress` event arrives. The pre-run estimate
 * (`run.plannedQueries` or config-derived) is frequently far off — e.g. a test
 * run plans ~450 queries but only executes a handful — which would peg the bar
 * at a few percent before jumping straight to done. Once we know the real total,
 * rebuild the audit node count and weights so the percentage tracks reality.
 */
export function recalibrateAudit(
  pred:               RunPrediction,
  actualAuditQueries: number,
): RunPrediction {
  if (actualAuditQueries <= 0 || actualAuditQueries === pred.nAuditQueries) {
    return pred
  }
  const nAuditNodes = actualAuditQueries * N_AUDIT_PER_QUERY
  const nTotal      = N_BOOTSTRAP + pred.nQgenNodes + nAuditNodes + N_FINALIZE

  return {
    ...pred,
    nAuditQueries: actualAuditQueries,
    nAuditNodes,
    nTotal,
    qgenWeight:     (N_BOOTSTRAP + pred.nQgenNodes) / nTotal,
    auditWeight:    nAuditNodes / nTotal,
    finalizeWeight: N_FINALIZE / nTotal,
  }
}

/**
 * Convert completed work units to an overall percentage (0–99).
 * Never reaches 100 — that is only emitted via run:done to avoid
 * showing 100% before the BE confirms completion.
 */
export function calcOverallPct(
  pred:       RunPrediction,
  qgenDone:   number,
  auditDone:  number,
  finalizing: boolean,
): number {
  const nodesDone =
    N_BOOTSTRAP
    + Math.min(qgenDone,  pred.nQgenTasks)    * N_QGEN_PER_TASK
    + Math.min(auditDone, pred.nAuditQueries) * N_AUDIT_PER_QUERY
    + (finalizing ? N_FINALIZE * 0.5 : 0)

  return Math.min(99, Math.round((nodesDone / pred.nTotal) * 100))
}
