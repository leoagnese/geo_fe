# Worker Pool — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin page to manage the worker pool (CRUD + activate/deactivate + live occupancy, polling every 10s), and surface queue position wherever a run or campaign section can be `queued`.

**Architecture:** A new admin page follows the existing admin-page conventions (role-guarded route, MUI table, TanStack Query). Queue position (`queuePosition`/`queueLength`) is additive data already returned by the backend (separate, already-completed plan) on the single-run creation response, the run detail response, and each `queued` campaign section — this plan only threads it through to the UI, no new BE calls beyond what's already wired.

**Tech Stack:** Next.js 14, MUI v6, TanStack Query, Jest + React Testing Library.

**Depends on:** `docs/superpowers/plans/2026-07-06-worker-pool-backend.md` (must be implemented and merged first — this plan calls `/admin/workers` and reads `queuePosition`/`queueLength` fields the backend plan introduces).

## Global Constraints

- No new npm dependencies.
- The admin worker page polls every 10s (`refetchInterval: 10_000`), consistent with the project's existing polling convention for live operational state (documented in this repo's `CLAUDE.md` for run monitoring).
- Queue position is only ever read from API responses — never computed or estimated client-side.
- This plan does not touch `CampaignWizard.tsx`, `SingleRunForm`'s field set, or `RunConfigFields.tsx` — only the specific banner/detail-view locations named in the file structure below.

---

## File structure

All paths relative to `/home/marco/Documenti/GEO/geo_fe/`.

| File | Action | Responsibility |
|---|---|---|
| `src/lib/api-client.ts` | Modify | `Worker` type, `getWorkers`/`createWorker`/`updateWorker`/`deleteWorker`; add `queuePosition`/`queueLength` to `Run`, `CampaignSection` |
| `src/app/(protected)/admin/workers/page.tsx` | Create | Admin worker management page |
| `__tests__/app/admin-workers.test.tsx` | Create | Coverage for the new admin page |
| `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx` | Modify | Enrich the "Run in coda" creation banner with queue position |
| `src/app/(protected)/domains/[clientKey]/runs/[runId]/page.tsx` | Modify | Show queue position in the existing SC-022 queue banner |
| `src/app/(protected)/domains/[clientKey]/campaigns/[campaignId]/page.tsx` | Modify | Show queue position next to each `queued` section |

---

### Task 1: Admin worker management page

**Files:**
- Modify: `src/lib/api-client.ts`
- Create: `src/app/(protected)/admin/workers/page.tsx`
- Test: `__tests__/app/admin-workers.test.tsx`

**Interfaces:**
- Produces: `Worker` interface, `WorkerWithOccupancy` interface, `getWorkers(token)`, `createWorker(token, dto)`, `updateWorker(token, workerId, dto)`, `deleteWorker(token, workerId)` — all new exports from `api-client.ts`, used only by this task's page.
- Consumes: nothing from other tasks in this plan (fully independent of Task 2).

- [ ] **Step 1: Write the failing test**

Create `__tests__/app/admin-workers.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import AdminWorkersPage from '@/app/(protected)/admin/workers/page'
import { getWorkers, createWorker, updateWorker, deleteWorker } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getWorkers: jest.fn(),
  createWorker: jest.fn(),
  updateWorker: jest.fn(),
  deleteWorker: jest.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminWorkersPage />
    </QueryClientProvider>,
  )
}

describe('AdminWorkersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok', user: { role: 'admin' } } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn() })
  })

  it('lists workers with their occupancy status', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [
        { workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: { runId: 'r1', clientKey: 'acme' } },
        { workerId: 'worker-2', label: 'Worker 2', webhookUrl: 'http://x/2', active: true, inUse: null },
      ],
    })
    renderPage()

    expect(await screen.findByText('Worker 1')).toBeInTheDocument()
    expect(await screen.findByText('Worker 2')).toBeInTheDocument()
    expect(screen.getByText(/acme/i)).toBeInTheDocument()
    expect(screen.getByText(/Libero/i)).toBeInTheDocument()
  })

  it('adds a new worker via the form', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({ data: [] })
    ;(createWorker as jest.Mock).mockResolvedValue({
      data: { workerId: 'worker-3', label: 'Worker 3', webhookUrl: 'http://x/3', active: true },
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Aggiungi worker/i }))
    await user.type(screen.getByLabelText(/Etichetta/i), 'Worker 3')
    await user.type(screen.getByLabelText(/Webhook URL/i), 'http://x/3')
    await user.click(screen.getByRole('button', { name: /Salva/i }))

    await waitFor(() =>
      expect(createWorker).toHaveBeenCalledWith('tok', { label: 'Worker 3', webhookUrl: 'http://x/3' }),
    )
  })

  it('toggles active state via the switch', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [{ workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null }],
    })
    ;(updateWorker as jest.Mock).mockResolvedValue({ data: {} })
    const user = userEvent.setup()
    renderPage()

    const toggle = await screen.findByRole('checkbox', { name: /Worker 1/i })
    await user.click(toggle)

    await waitFor(() =>
      expect(updateWorker).toHaveBeenCalledWith('tok', 'worker-1', { active: false }),
    )
  })

  it('deletes a worker after confirmation', async () => {
    ;(getWorkers as jest.Mock).mockResolvedValue({
      data: [{ workerId: 'worker-1', label: 'Worker 1', webhookUrl: 'http://x/1', active: true, inUse: null }],
    })
    ;(deleteWorker as jest.Mock).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByLabelText(/Elimina worker/i))
    await user.click(screen.getByRole('button', { name: /Conferma/i }))

    await waitFor(() => expect(deleteWorker).toHaveBeenCalledWith('tok', 'worker-1'))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/admin-workers.test.tsx`
Expected: FAIL with `Cannot find module '@/app/(protected)/admin/workers/page'` (and `getWorkers`/`createWorker`/`updateWorker`/`deleteWorker` not exported from `api-client.ts` yet).

- [ ] **Step 3: Add `Worker` type and CRUD functions to `api-client.ts`**

In `src/lib/api-client.ts`, add near the other admin-endpoint functions (after `deleteAdminUser`):

```typescript
// ──────────────────────────────────────────────────────────────
// Worker pool (admin)
// ──────────────────────────────────────────────────────────────

export interface Worker {
  workerId: string
  label: string
  webhookUrl: string
  active: boolean
}

export interface WorkerWithOccupancy extends Worker {
  inUse: { runId: string; clientKey: string } | null
}

export interface CreateWorkerDto {
  label: string
  webhookUrl: string
}

export interface UpdateWorkerDto {
  label?: string
  webhookUrl?: string
  active?: boolean
}

export async function getWorkers(token: string): Promise<ApiSuccess<WorkerWithOccupancy[]>> {
  return apiFetch<ApiSuccess<WorkerWithOccupancy[]>>('/admin/workers', token)
}

export async function createWorker(
  token: string,
  dto: CreateWorkerDto,
): Promise<ApiSuccess<Worker>> {
  return apiFetch<ApiSuccess<Worker>>('/admin/workers', token, {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export async function updateWorker(
  token: string,
  workerId: string,
  dto: UpdateWorkerDto,
): Promise<ApiSuccess<Worker>> {
  return apiFetch<ApiSuccess<Worker>>(`/admin/workers/${workerId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

export async function deleteWorker(token: string, workerId: string): Promise<void> {
  await apiFetch<void>(`/admin/workers/${workerId}`, token, { method: 'DELETE' })
}
```

- [ ] **Step 4: Create `src/app/(protected)/admin/workers/page.tsx`**

```tsx
/**
 * Admin: worker pool management.
 *
 * Lists every configured n8n worker with live occupancy (free / in use by
 * which run), lets an admin add, edit, activate/deactivate, and delete
 * workers. Polls every 10s so occupancy stays current without a manual
 * refresh, consistent with the platform's existing polling convention for
 * live operational state.
 *
 * Role-guarded: redirect if not admin.
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Alert from '@mui/material/Alert'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  ApiError,
  type WorkerWithOccupancy,
} from '@/lib/api-client'

type EditTarget = 'new' | WorkerWithOccupancy | null

export default function AdminWorkersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [label, setLabel] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<WorkerWithOccupancy | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      router.replace('/domains')
    }
  }, [session, router])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-workers'],
    queryFn: () => getWorkers(session?.accessToken ?? ''),
    enabled: !!session?.accessToken && session?.user?.role === 'admin',
    refetchInterval: 10_000,
  })

  const workers = data?.data ?? []

  function openAdd() {
    setLabel('')
    setWebhookUrl('')
    setEditTarget('new')
  }

  function openEdit(worker: WorkerWithOccupancy) {
    setLabel(worker.label)
    setWebhookUrl(worker.webhookUrl)
    setEditTarget(worker)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editTarget === 'new') {
        return createWorker(session?.accessToken ?? '', { label, webhookUrl })
      }
      return updateWorker(session?.accessToken ?? '', (editTarget as WorkerWithOccupancy).workerId, { label, webhookUrl })
    },
    onSuccess: () => {
      setEditTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-workers'] })
    },
    onError: (err) => {
      setErrorToast(err instanceof ApiError ? err.message : 'Errore durante il salvataggio.')
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: (worker: WorkerWithOccupancy) =>
      updateWorker(session?.accessToken ?? '', worker.workerId, { active: !worker.active }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['admin-workers'] }),
    onError: (err) => {
      setErrorToast(err instanceof ApiError ? err.message : 'Errore durante l’aggiornamento.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (workerId: string) => deleteWorker(session?.accessToken ?? '', workerId),
    onSuccess: () => {
      setDeleteTarget(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-workers'] })
    },
    onError: (err) => {
      setDeleteTarget(null)
      setErrorToast(err instanceof ApiError ? err.message : 'Impossibile eliminare il worker.')
    },
  })

  if (session && session.user.role !== 'admin') return null

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h1">Worker pool</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Aggiungi worker
        </Button>
      </Box>

      {isError && (
        <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void refetch()}>Riprova</Button>} sx={{ mb: 2 }}>
          Impossibile caricare i worker.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Etichetta</TableCell>
              <TableCell>Webhook URL</TableCell>
              <TableCell>Stato</TableCell>
              <TableCell>Occupazione</TableCell>
              <TableCell align="right">Azioni</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {!isLoading && workers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    Nessun worker configurato.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {workers.map((worker) => (
              <TableRow key={worker.workerId}>
                <TableCell>{worker.label}</TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{worker.webhookUrl}</Typography>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={worker.active}
                    inputProps={{ 'aria-label': worker.label }}
                    onChange={() => toggleActiveMutation.mutate(worker)}
                  />
                </TableCell>
                <TableCell>
                  {worker.inUse ? (
                    <Chip size="small" color="warning" label={`In uso — ${worker.inUse.clientKey} / ${worker.inUse.runId}`} />
                  ) : (
                    <Chip size="small" color="success" variant="outlined" label="Libero" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label="Modifica worker" onClick={() => openEdit(worker)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" aria-label="Elimina worker" onClick={() => setDeleteTarget(worker)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit dialog */}
      <Dialog open={editTarget !== null} onClose={() => setEditTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{editTarget === 'new' ? 'Aggiungi worker' : 'Modifica worker'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField label="Etichetta" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth size="small" />
          <TextField label="Webhook URL" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} fullWidth size="small" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>Annulla</Button>
          <Button variant="contained" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            {saveMutation.isPending ? 'Salvataggio…' : 'Salva'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>Eliminare il worker?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {deleteTarget?.label} verrà rimosso definitivamente dal pool.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annulla</Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.workerId)}
          >
            Conferma
          </Button>
        </DialogActions>
      </Dialog>

      <Alert
        severity="error"
        sx={{ display: errorToast ? 'flex' : 'none', position: 'fixed', bottom: 16, right: 16 }}
        onClose={() => setErrorToast(null)}
      >
        {errorToast}
      </Alert>
    </Box>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/admin-workers.test.tsx`
Expected: PASS, 4/4.

- [ ] **Step 6: Type-check and run the full suite**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit && npm test`
Expected: no type errors; every suite passes (baseline going in: 10 suites / 47 tests, per the completed campaign-wizard-frontend-b plan — confirm the exact baseline in your own checkout before starting, since this task adds no behavior change to any existing file, only a new page/test). Coming out: 11 suites / 51 tests (this task's 1 new suite, 4 new tests).

- [ ] **Step 7: Report progress**

Report the diff and test results to the controller — do not run `git commit`.

---

### Task 2: Queue position display

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx`
- Modify: `src/app/(protected)/domains/[clientKey]/runs/[runId]/page.tsx`
- Modify: `src/app/(protected)/domains/[clientKey]/campaigns/[campaignId]/page.tsx`

**Interfaces:**
- Consumes: `queuePosition`/`queueLength` fields the backend plan adds to the run-creation response, the run-detail response, and each `queued` entry in a campaign's `sections[]` — already present on the wire, this task only reads and displays them.

This task does not touch `CampaignWizard.tsx`'s own creation flow (no dedicated banner there, per the design — the immediate redirect to the campaign detail page already shows per-section position via this task's Step 4).

- [ ] **Step 1: Add `queuePosition`/`queueLength` to the relevant `api-client.ts` types**

In `src/lib/api-client.ts`, add `queuePosition?: number` and `queueLength?: number` to the `Run` interface (after `status: RunStatus`):

```typescript
  status: RunStatus
  queuePosition?: number
  queueLength?: number
```

Add the same two fields to `CampaignSection` (after `status: SectionStatus`):

```typescript
export interface CampaignSection {
  sectionKey: string
  label: string
  runId: string
  status: SectionStatus
  queuePosition?: number
  queueLength?: number
}
```

- [ ] **Step 2: Enrich the single-run creation banner**

In `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx`, the `SingleRunForm`'s mutation currently has:

```typescript
    onSuccess: (result) => {
      const { runId, status } = result.data
      if (status === 'queued') {
        setQueuedBanner(true)
        setTimeout(() => router.push(`/domains/${clientKey}/runs/${runId}`), 2000)
      } else {
        router.push(`/domains/${clientKey}/runs/${runId}`)
      }
    },
```

Replace it with:

```typescript
    onSuccess: (result) => {
      const { runId, status, queuePosition, queueLength } = result.data
      if (status === 'queued') {
        setQueuedBanner(
          queuePosition && queueLength
            ? `Run in coda (posizione ${queuePosition} di ${queueLength}) — reindirizzamento…`
            : 'Run in coda — reindirizzamento…',
        )
        setTimeout(() => router.push(`/domains/${clientKey}/runs/${runId}`), 2000)
      } else {
        router.push(`/domains/${clientKey}/runs/${runId}`)
      }
    },
```

`setQueuedBanner` currently holds a `boolean` (`useState(false)`) — change its declaration and the `Snackbar` that reads it. Find:

```typescript
  const [queuedBanner, setQueuedBanner] = useState(false)
```

Replace with:

```typescript
  const [queuedBanner, setQueuedBanner] = useState<string | null>(null)
```

Find the corresponding `Snackbar`:

```tsx
      <Snackbar open={queuedBanner} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info">Run in coda — reindirizzamento…</Alert>
      </Snackbar>
```

Replace with:

```tsx
      <Snackbar open={queuedBanner !== null} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info">{queuedBanner}</Alert>
      </Snackbar>
```

- [ ] **Step 3: Show queue position in the run detail page's SC-022 banner**

In `src/app/(protected)/domains/[clientKey]/runs/[runId]/page.tsx`, find the existing queue banner:

```tsx
      {/* ── SC-022 — Queue banner (inline state when queued) ── */}
      {isQueued && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            Run in coda
          </Typography>
          <Typography variant="body2">
            Partirà automaticamente al completamento della run in corso. La promozione è automatica.
          </Typography>
        </Alert>
      )}
```

Replace with:

```tsx
      {/* ── SC-022 — Queue banner (inline state when queued) ── */}
      {isQueued && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight={600}>
            Run in coda
            {run?.queuePosition && run?.queueLength && ` — posizione ${run.queuePosition} di ${run.queueLength}`}
          </Typography>
          <Typography variant="body2">
            Partirà automaticamente al completamento della run in corso. La promozione è automatica.
          </Typography>
        </Alert>
      )}
```

- [ ] **Step 4: Show queue position per section in the campaign detail page**

In `src/app/(protected)/domains/[clientKey]/campaigns/[campaignId]/page.tsx`, find the section row's status/label block:

```tsx
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StatusChip status={section.status === 'missing' ? 'error' : section.status} />
                <Typography variant="body2" fontWeight={600}>
                  {section.label}
                </Typography>
              </Box>
```

Replace with:

```tsx
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <StatusChip status={section.status === 'missing' ? 'error' : section.status} />
                <Typography variant="body2" fontWeight={600}>
                  {section.label}
                </Typography>
                {section.status === 'queued' && section.queuePosition && section.queueLength && (
                  <Typography variant="caption" color="text.secondary">
                    (posizione {section.queuePosition} di {section.queueLength})
                  </Typography>
                )}
              </Box>
```

- [ ] **Step 5: Update the existing regression tests affected by the banner state-type change**

`__tests__/app/run-new-target-url.test.tsx` exercises `SingleRunForm` — if any of its 2 existing tests assert against the old boolean-driven `queuedBanner` Snackbar (e.g. checking for the literal text "Run in coda — reindirizzamento…"), the text is unchanged for the case where the create response has no `queuePosition`/`queueLength` (the ternary's fallback branch), so no assertion should need updating. Run the file first to confirm; only touch it if a real failure surfaces, and if so fix the test's expectation to match the new (but equivalent, for that test's fixture) banner text — do not weaken the assertion.

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/run-new-target-url.test.tsx`
Expected: PASS, 2/2, unchanged.

- [ ] **Step 6: Type-check and run the full suite**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit && npm test`
Expected: no type errors; every suite passes, same count as after Task 1 (11 suites / 51 tests) — this task changes no test count, only display logic in 3 already-tested-elsewhere files plus new optional fields on existing types.

- [ ] **Step 7: Manual smoke check**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npm run dev`
With the backend plan's worker pool deployed and configured with 1 active worker: start two single runs on two different domains back-to-back and confirm the second one's creation banner and detail page both show "posizione 1 di 1". Start a campaign with more sections than available workers and confirm the queued sections show their position on the campaign detail page. Stop the dev server once confirmed.

- [ ] **Step 8: Report progress**

Report the diff and test results to the controller — do not run `git commit`.

---

## Commits

Per explicit standing instruction, **no task in this plan runs `git commit`, creates a branch, or does any other git-state-changing action.** Each task ends by reporting its diff and test evidence back to the controller; the controller presents it to the user and only commits/branches on explicit request.
