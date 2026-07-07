# Campaign Wizard — Frontend Wizard Implementation Plan (Part B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed-taxonomy `CampaignForm` (checkbox list over `Domain.settori`) with `CampaignWizard` — an incrementally-built list of ad-hoc, fully independent analysis sections (each configured like a single run, via the shared `RunConfigFields` from Part A), navigable through a sidebar, with a recap step that submits the whole campaign.

**Architecture:** One react-hook-form instance holds `{ sections: SectionFormValues[] }`, managed via `useFieldArray`. Each section renders `<RunConfigFields namePrefix={\`sections.${i}.\`} />` (kept mounted but CSS-hidden when not the active view, so switching sections never loses in-progress edits) plus a "Nome analisi" field the wizard owns itself. A sidebar lists all sections + a "Recap" entry; the Recap view is the only place the final submit button lives, and it maps the wizard's per-section form state to `CreateCampaignDto.sections`.

**Tech Stack:** Next.js 14, MUI v6, react-hook-form (`useFieldArray`, `FormProvider`), zod, TanStack Query, Jest + React Testing Library.

## Global Constraints

- No new npm dependencies.
- Depends on Part A (`docs/superpowers/plans/2026-07-03-campaign-wizard-frontend-a.md`) being implemented first — this plan imports `RunConfigFields`, `slugifyTopic`, `LangCode` from `@/components/RunConfigFields`, and the `CampaignSectionDto`/`CreateCampaignDto` types from `@/lib/api-client` that Part A's Task 1 adds.
- `RunConfigFields` stays schema-agnostic (Part A doesn't export a zod schema) — this plan defines its own per-section zod schema in `CampaignWizard.tsx`, structurally identical to `SingleRunForm`'s schema plus a `label` field. This is intentional, small duplication (~25 lines): `RunConfigFields` shouldn't own validation rules, and the two schemas are unlikely to diverge in ways that matter.
- Sections stay mounted (CSS `display: none`, not conditionally unmounted) when not the active view, so switching between sections via the sidebar never discards unsaved edits or resets a section's internal state (e.g. its active per-language tab).
- The single "Avvia campagna" submit button lives only in the Recap view — there is no way to submit without visiting Recap first.
- No campaign-level settings (e.g. concurrency) are exposed in the wizard or recap — decided in the design spec, stays a backend default.

---

## File structure

All paths relative to `/home/marco/Documenti/GEO/geo_fe/`.

| File | Action | Responsibility |
|---|---|---|
| `src/app/(protected)/domains/[clientKey]/runs/new/CampaignWizard.tsx` | Create | The wizard: sections array, sidebar, add/remove, recap, submit |
| `__tests__/app/campaign-wizard.test.tsx` | Create | TDD coverage for the wizard |
| `src/app/(protected)/domains/[clientKey]/runs/new/CampaignForm.tsx` | Delete | Superseded by `CampaignWizard.tsx` |
| `__tests__/app/campaign-form.test.tsx` | Delete | Tested the file being deleted |
| `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx` | Modify | Import `CampaignWizard` instead of `CampaignForm` |

---

### Task 1: `CampaignWizard` core — sections, sidebar, add/remove

**Files:**
- Create: `src/app/(protected)/domains/[clientKey]/runs/new/CampaignWizard.tsx`
- Create: `__tests__/app/campaign-wizard.test.tsx`

**Interfaces:**
- Consumes: `RunConfigFields`, `slugifyTopic`, `LangCode` from `@/components/RunConfigFields` (Part A); `getProfiles`, `getDomain`, `postDomainPersona`, `deleteDomainPersona`, `createCampaign`, `ApiError`, `CampaignSectionDto`, `LlmProfile`, `Persona`, `PersonaGroup` from `@/lib/api-client` (Part A adds `CampaignSectionDto`/`CreateCampaignDto`)
- Produces: `CampaignWizard({ clientKey: string })` default export — consumed by Task 2's wiring into `runs/new/page.tsx`. This task builds the whole component (including the Recap view and submit logic, since they share the same file and form instance) but only tests the navigation/add/remove behavior; Task 2 adds the recap/submit tests and does the file deletion + wiring.

Known Jest/ESM issue from prior work on this branch (apply proactively): a bare `jest.mock('next-auth/react')`/`jest.mock('next/navigation')` fails under this project's Jest config. Use explicit factory mocks: `jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))` and `jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/campaign-wizard.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CampaignWizard from '@/app/(protected)/domains/[clientKey]/runs/new/CampaignWizard'
import { getProfiles, getDomain, createCampaign } from '@/lib/api-client'

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}))
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getProfiles: jest.fn(),
  getDomain: jest.fn(),
  createCampaign: jest.fn(),
  postDomainPersona: jest.fn(),
  deleteDomainPersona: jest.fn(),
}))

function renderWizard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <CampaignWizard clientKey="acme" />
    </QueryClientProvider>,
  )
}

describe('CampaignWizard — navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
    ;(getProfiles as jest.Mock).mockResolvedValue({
      data: [{ profileKey: 'gpt5-mini', llmProvider: 'openai', runModel: 'gpt-5-mini', qgenModel: 'gpt-5-mini', nerModel: 'gpt-5-mini', active: true, createdAt: '2026-01-01' }],
    })
    ;(getDomain as jest.Mock).mockResolvedValue({
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', personas: [], personaGroups: [], createdAt: '2026-01-01' },
    })
  })

  it('starts with one section named "Analisi 1" in the sidebar', async () => {
    renderWizard()
    expect(await screen.findByText('Analisi 1')).toBeInTheDocument()
  })

  it('Aggiungi analisi appends a section inheriting the previous profile, and switches to it', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))

    await user.click(screen.getByRole('button', { name: /Aggiungi analisi/i }))

    expect(await screen.findByText('Analisi 2')).toBeInTheDocument()
    // The newly-added, now-active section's profile select shows the inherited value.
    const profileSelects = screen.getAllByDisplayValue('gpt5-mini')
    expect(profileSelects.length).toBeGreaterThanOrEqual(1)
  })

  it('switching sections via the sidebar preserves previously typed values', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    const nameInput = screen.getByLabelText(/Nome analisi/i)
    await user.type(nameInput, 'Cosa fare')

    await user.click(screen.getByRole('button', { name: /Aggiungi analisi/i }))
    await screen.findByText('Analisi 2')

    await user.click(screen.getByText('Cosa fare'))
    // Both sections stay mounted (display:none, not unmounted) per the Global
    // Constraint, so `getByLabelText` (singular) always throws once a second
    // section exists — RTL's label queries don't filter by CSS visibility.
    // Use the plural form and assert at least one match carries the persisted value.
    const nameInputs = screen.getAllByLabelText(/Nome analisi/i)
    expect(nameInputs.some((el) => (el as HTMLInputElement).value === 'Cosa fare')).toBe(true)
  })

  it('does not allow removing the last remaining section', async () => {
    renderWizard()
    await screen.findByText('Analisi 1')
    expect(screen.queryByLabelText(/Rimuovi analisi/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/campaign-wizard.test.tsx`
Expected: FAIL with "Cannot find module '.../CampaignWizard'".

- [ ] **Step 3: Implement `CampaignWizard.tsx`**

Create `src/app/(protected)/domains/[clientKey]/runs/new/CampaignWizard.tsx`:

```tsx
/**
 * CampaignWizard — incremental, sidebar-navigable wizard for creating a
 * campaign out of N fully independent analysis sections. Each section is
 * configured exactly like a single run (via the shared RunConfigFields)
 * plus a "Nome analisi" label. A Recap view lists every section and is the
 * only place the final submit button lives.
 *
 * Sections stay mounted (CSS-hidden, not unmounted) when not the active
 * view, so switching sections never discards in-progress edits.
 *
 * Submit → POST /domains/:clientKey/campaigns, redirect to the campaign
 * detail page.
 *
 * @spec docs/superpowers/specs/2026-07-03-campaign-wizard-design.md §4.3
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider, useFieldArray, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import RunConfigFields, { slugifyTopic, type LangCode } from '@/components/RunConfigFields'
import {
  getProfiles,
  getDomain,
  postDomainPersona,
  deleteDomainPersona,
  createCampaign,
  ApiError,
  type LlmProfile,
  type Persona,
  type PersonaGroup,
  type CampaignSectionDto,
} from '@/lib/api-client'

// ─── Zod schema — mirrors SingleRunForm's, plus `label` ────────────────────────

const LangSettingsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  questionsCount: z.number().int().min(1).default(10),
  locationFocus: z.string().default(''),
})

const TopicSchema = z.object({
  label: z.string().min(1, 'Etichetta obbligatoria'),
  keywords: z.array(z.string()).default([]),
})

const SectionSchema = z.object({
  label: z.string().min(1, 'Nome analisi obbligatorio'),
  profileKey: z.string().min(1, 'Seleziona un profilo LLM'),
  runIterations: z
    .number({ invalid_type_error: 'Inserisci un numero intero' })
    .int()
    .min(1, 'Almeno 1 iterazione'),
  useCustomTargetUrl: z.boolean().default(false),
  targetUrl: z.string().default(''),
  globalKeywords: z.array(z.string()).default([]),
  activeLocales: z.array(z.string()).min(1, 'Seleziona almeno un paese'),
  activePersonaIds: z.array(z.string()).default([]),
  topics: z.array(TopicSchema).default([]),
  langs: z.object({
    it: LangSettingsSchema,
    en: LangSettingsSchema,
    fr: LangSettingsSchema,
  }),
  testMode: z.boolean().default(false),
  debugMode: z.boolean().default(false),
}).refine(
  (data) => !data.useCustomTargetUrl || data.targetUrl.trim().length > 0,
  { message: 'Inserisci un URL', path: ['targetUrl'] },
)

const CampaignWizardSchema = z.object({
  sections: z.array(SectionSchema).min(1, "Aggiungi almeno un'analisi"),
})

type CampaignWizardForm = z.infer<typeof CampaignWizardSchema>
type SectionFormValues = z.infer<typeof SectionSchema>

function makeDefaultSection(overrides?: {
  profileKey?: string
  activeLocales?: string[]
  activePersonaIds?: string[]
  testMode?: boolean
  debugMode?: boolean
}): SectionFormValues {
  return {
    label: '',
    profileKey: overrides?.profileKey ?? '',
    runIterations: 3,
    useCustomTargetUrl: false,
    targetUrl: '',
    globalKeywords: [],
    activeLocales: overrides?.activeLocales ?? ['it'],
    activePersonaIds: overrides?.activePersonaIds ?? [],
    topics: [{ label: '', keywords: [] }],
    langs: {
      it: { keywords: [], questionsCount: 10, locationFocus: '' },
      en: { keywords: [], questionsCount: 10, locationFocus: '' },
      fr: { keywords: [], questionsCount: 10, locationFocus: '' },
    },
    testMode: overrides?.testMode ?? false,
    debugMode: overrides?.debugMode ?? false,
  }
}

type ViewId = number | 'recap'

interface Props {
  clientKey: string
}

export default function CampaignWizard({ clientKey }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [view, setView] = useState<ViewId>(0)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemovingPersona, setIsRemovingPersona] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const { data: profilesData, isLoading: profilesLoading, isError: profilesError, refetch: refetchProfiles } =
    useQuery({ queryKey: ['profiles'], queryFn: () => getProfiles(session?.accessToken ?? ''), enabled: !!session?.accessToken })
  const { data: domainData } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const profiles: LlmProfile[] = profilesData?.data ?? []
  const domainPersonas: Persona[] = (domainData?.data?.personas ?? []) as Persona[]
  const domainGroups: PersonaGroup[] = (domainData?.data?.personaGroups ?? []) as PersonaGroup[]

  const methods = useForm<CampaignWizardForm>({
    resolver: zodResolver(CampaignWizardSchema),
    defaultValues: { sections: [makeDefaultSection()] },
  })
  const { control, handleSubmit, watch, register, formState: { errors } } = methods

  const { fields: sectionFields, append: appendSection, remove: removeSection } = useFieldArray({
    control,
    name: 'sections',
  })

  const sections = watch('sections')

  async function handleAddPersonaSubmit(persona: { name: string; description: string; context: string; searchStyle?: string }) {
    setIsAddingPersona(true)
    try {
      await postDomainPersona(session?.accessToken ?? '', clientKey, persona)
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
    } finally {
      setIsAddingPersona(false)
    }
  }

  async function handleRemovePersona(personaId: string) {
    setIsRemovingPersona(personaId)
    try {
      await deleteDomainPersona(session?.accessToken ?? '', clientKey, personaId)
      await queryClient.invalidateQueries({ queryKey: ['domain', clientKey] })
    } finally {
      setIsRemovingPersona(null)
    }
  }

  function handleAddSection() {
    const last = sections[sections.length - 1]
    appendSection(makeDefaultSection({
      profileKey: last?.profileKey,
      activeLocales: last?.activeLocales,
      activePersonaIds: last?.activePersonaIds,
      testMode: last?.testMode,
      debugMode: last?.debugMode,
    }))
    setView(sections.length)
  }

  function handleRemoveSection(index: number) {
    removeSection(index)
    if (typeof view === 'number' && view >= sections.length - 1) {
      setView(Math.max(0, sections.length - 2))
    }
  }

  const createCampaignMutation = useMutation({
    mutationFn: (data: CampaignWizardForm) => {
      const sectionsPayload: CampaignSectionDto[] = data.sections.map((s) => {
        const keywordsByLang = Object.fromEntries(
          s.activeLocales.map((lang) => [
            lang,
            [...s.globalKeywords, ...s.langs[lang as LangCode].keywords],
          ]),
        )
        const questionsCountByLang = Object.fromEntries(
          s.activeLocales.map((lang) => [lang, s.langs[lang as LangCode].questionsCount]),
        )
        const locationFocusByLang = Object.fromEntries(
          s.activeLocales
            .filter((lang) => s.langs[lang as LangCode].locationFocus)
            .map((lang) => [lang, s.langs[lang as LangCode].locationFocus]),
        )
        const topics = s.topics
          .filter((t) => t.label.trim())
          .map((t) => ({ id: slugifyTopic(t.label), label: t.label.trim(), keywords: t.keywords }))

        return {
          label: s.label,
          profileKey: s.profileKey,
          runIterations: s.runIterations,
          targetUrl: s.useCustomTargetUrl ? s.targetUrl.trim() : undefined,
          locales: s.activeLocales,
          keywordsByLang,
          questionsCountByLang,
          activePersonaIds: s.activePersonaIds,
          locationFocusByLang,
          topics,
          testMode: s.testMode,
          debugMode: s.debugMode,
        }
      })

      return createCampaign(session?.accessToken ?? '', clientKey, { sections: sectionsPayload })
    },
    onSuccess: (result) => {
      router.push(`/domains/${clientKey}/campaigns/${result.data.campaignId}`)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) { setErrorToast('Avvio campagna fallito: n8n non raggiungibile.'); return }
        if (err.code === 'PROFILE_NOT_FOUND') { setErrorToast(err.message); return }
        if (err.status === 404) { setErrorToast(`Profilo o dominio non trovato: ${err.message}`); return }
      }
      setErrorToast('Errore interno. Riprova.')
    },
  })

  function onValid(data: CampaignWizardForm) {
    createCampaignMutation.mutate(data)
  }

  function onInvalid(formErrors: FieldErrors<CampaignWizardForm>) {
    const firstInvalidIndex = sections.findIndex((_, i) => !!formErrors.sections?.[i])
    if (firstInvalidIndex !== -1) setView(firstInvalidIndex)
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
      {/* Sidebar */}
      <Paper sx={{ width: 220, flexShrink: 0, p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {sectionFields.map((field, index) => {
          const hasError = !!errors.sections?.[index]
          const label = sections[index]?.label?.trim() || `Analisi ${index + 1}`
          return (
            <Box
              key={field.id}
              onClick={() => setView(index)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer',
                bgcolor: view === index ? 'primary.main' : 'transparent',
                color: view === index ? 'primary.contrastText' : 'text.primary',
                '&:hover': { bgcolor: view === index ? 'primary.main' : 'action.hover' },
              }}
            >
              {hasError ? (
                <ErrorIcon sx={{ fontSize: 16, color: view === index ? 'inherit' : 'error.main' }} />
              ) : (
                <CheckCircleIcon sx={{ fontSize: 16, color: view === index ? 'inherit' : 'success.main', opacity: 0.4 }} />
              )}
              <Typography variant="body2" noWrap sx={{ flex: 1 }}>{label}</Typography>
              {sectionFields.length > 1 && (
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleRemoveSection(index) }}
                  sx={{ color: 'inherit', opacity: 0.6, p: 0.25 }}
                  aria-label="Rimuovi analisi"
                >
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          )
        })}
        <Button size="small" startIcon={<AddIcon />} onClick={handleAddSection} sx={{ mt: 1 }}>
          Aggiungi analisi
        </Button>
        <Divider sx={{ my: 1 }} />
        <Box
          onClick={() => setView('recap')}
          sx={{
            px: 1.5, py: 1, borderRadius: 1, cursor: 'pointer',
            bgcolor: view === 'recap' ? 'primary.main' : 'transparent',
            color: view === 'recap' ? 'primary.contrastText' : 'text.primary',
            '&:hover': { bgcolor: view === 'recap' ? 'primary.main' : 'action.hover' },
          }}
        >
          <Typography variant="body2" fontWeight={600}>Recap</Typography>
        </Box>
      </Paper>

      {/* Main panel */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <FormProvider {...methods}>
          <Box component="form" onSubmit={handleSubmit(onValid, onInvalid)} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {sectionFields.map((field, index) => (
              <Box key={field.id} sx={{ display: view === index ? 'flex' : 'none', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Nome analisi"
                  size="small"
                  {...register(`sections.${index}.label` as const)}
                  error={!!errors.sections?.[index]?.label}
                  helperText={errors.sections?.[index]?.label?.message ?? 'Es. "Dove dormire a Torino"'}
                  sx={{ maxWidth: 400 }}
                />
                <RunConfigFields
                  namePrefix={`sections.${index}.`}
                  clientKey={clientKey}
                  profiles={profiles}
                  profilesLoading={profilesLoading}
                  profilesError={profilesError}
                  onRetryProfiles={() => void refetchProfiles()}
                  domainPersonas={domainPersonas}
                  domainGroups={domainGroups}
                  isAddingPersona={isAddingPersona}
                  onAddPersona={handleAddPersonaSubmit}
                  isRemovingPersonaId={isRemovingPersona}
                  onRemovePersona={handleRemovePersona}
                />
              </Box>
            ))}

            {view === 'recap' && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h3">Riepilogo campagna</Typography>
                {sections.map((s, index) => {
                  const filledTopics = s.topics.filter((t) => t.label.trim())
                  const totalKeywords = s.globalKeywords.length + filledTopics.reduce((sum, t) => sum + t.keywords.length, 0)
                  return (
                    <Paper key={index} sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="body1" fontWeight={600}>{s.label || `Analisi ${index + 1}`}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Profilo: {s.profileKey || '—'} · Lingue: {s.activeLocales.join(', ') || '—'} · Personas: {s.activePersonaIds.length}
                          {s.useCustomTargetUrl && s.targetUrl && <> · URL: {s.targetUrl}</>}
                          {' · '}Topic: {filledTopics.length} · Keyword: {totalKeywords}
                        </Typography>
                      </Box>
                      <Button size="small" onClick={() => setView(index)}>Modifica</Button>
                    </Paper>
                  )
                })}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button type="submit" variant="contained" disabled={createCampaignMutation.isPending}>
                    {createCampaignMutation.isPending ? 'Avvio…' : 'Avvia campagna'}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </FormProvider>
      </Box>

      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/campaign-wizard.test.tsx`
Expected: PASS, 4/4.

- [ ] **Step 5: Type-check**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Report progress**

This plan does not commit automatically — see the "Commits" note at the end of this document. Report the diff and test results to the controller instead of running `git commit`.

---

### Task 2: Recap/submit tests, remove old `CampaignForm`, wire into `runs/new/page.tsx`

**Files:**
- Modify: `__tests__/app/campaign-wizard.test.tsx` (add recap/submit tests)
- Delete: `src/app/(protected)/domains/[clientKey]/runs/new/CampaignForm.tsx`
- Delete: `__tests__/app/campaign-form.test.tsx`
- Modify: `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx`

**Interfaces:**
- Consumes: `CampaignWizard` from `./CampaignWizard` (Task 1)
- Produces: `runs/new/page.tsx`'s "Campagna" toggle now renders `CampaignWizard` instead of the deleted `CampaignForm`.

- [ ] **Step 1: Write the failing tests**

Add these two test cases to `__tests__/app/campaign-wizard.test.tsx`, in a new `describe` block after the existing `describe('CampaignWizard — navigation', ...)`:

```tsx
describe('CampaignWizard — recap and submit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
    ;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })
    ;(getProfiles as jest.Mock).mockResolvedValue({
      data: [{ profileKey: 'gpt5-mini', llmProvider: 'openai', runModel: 'gpt-5-mini', qgenModel: 'gpt-5-mini', nerModel: 'gpt-5-mini', active: true, createdAt: '2026-01-01' }],
    })
    ;(getDomain as jest.Mock).mockResolvedValue({
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', personas: [], personaGroups: [], createdAt: '2026-01-01' },
    })
  })

  it('shows a recap card per section and submits sections to createCampaign', async () => {
    ;(createCampaign as jest.Mock).mockResolvedValue({ data: { campaignId: 'camp-1' } })
    const mockPush = jest.fn()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    await user.type(screen.getByLabelText(/Nome analisi/i), 'Cosa fare')
    await user.click(await screen.findByLabelText(/Profilo LLM/i))
    await user.click(await screen.findByText('gpt5-mini'))

    await user.click(screen.getByText('Recap'))
    expect(await screen.findByText('Cosa fare')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Avvia campagna/i }))

    await waitFor(() =>
      expect(createCampaign).toHaveBeenCalledWith(
        'tok',
        'acme',
        expect.objectContaining({
          sections: [expect.objectContaining({ label: 'Cosa fare', profileKey: 'gpt5-mini', locales: ['it'] })],
        }),
      ),
    )
    expect(mockPush).toHaveBeenCalledWith('/domains/acme/campaigns/camp-1')
  })

  it('jumps to the first invalid section when submitting with a missing required field', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('Analisi 1')
    // Leave "Nome analisi" and profile empty — required fields.
    await user.click(screen.getByText('Recap'))
    await user.click(screen.getByRole('button', { name: /Avvia campagna/i }))

    // Submission should be blocked and the view should jump back to the invalid section.
    await waitFor(() => expect(screen.getByLabelText(/Nome analisi/i)).toBeInTheDocument())
    expect(createCampaign).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/campaign-wizard.test.tsx`
Expected: these 2 tests fail if `CampaignWizard.tsx` has any bug in the recap/submit path not caught by Task 1's tests (Task 1's implementation already includes this logic — this step is confirming it, not adding new implementation). If both pass immediately, that's expected too, since Task 1 already wrote the full component; either way, verify the earlier 4 tests still pass alongside these 2.

- [ ] **Step 3: Fix anything the new tests reveal**

If a test fails, fix `CampaignWizard.tsx` (not the test) to match the behavior described in the design spec, then re-run Step 2. If both pass without changes, proceed.

- [ ] **Step 4: Delete the old `CampaignForm.tsx` and its test**

Delete `src/app/(protected)/domains/[clientKey]/runs/new/CampaignForm.tsx`.
Delete `__tests__/app/campaign-form.test.tsx`.

- [ ] **Step 5: Wire `CampaignWizard` into `runs/new/page.tsx`**

In `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx`, change:

```tsx
import CampaignForm from './CampaignForm'
```

to:

```tsx
import CampaignWizard from './CampaignWizard'
```

And change:

```tsx
      {mode === 'single' ? <SingleRunForm clientKey={clientKey} /> : <CampaignForm clientKey={clientKey} />}
```

to:

```tsx
      {mode === 'single' ? <SingleRunForm clientKey={clientKey} /> : <CampaignWizard clientKey={clientKey} />}
```

- [ ] **Step 6: Run the full suite**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit && npm test`
Expected: no type errors; every suite passes. `campaign-form.test.tsx` no longer exists so it won't run; `campaign-wizard.test.tsx` runs all 6 tests (4 from Task 1, 2 from this task). Compare the total suite/test count against the baseline from the end of Part A to confirm the net change makes sense (minus 1 suite/minus however many `campaign-form.test.tsx` had, plus 1 suite/6 tests for `campaign-wizard.test.tsx`).

- [ ] **Step 7: Manual smoke check**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npm run dev`
Open the "Nuova run" page for a real `clientKey`, click "Campagna", and confirm: the wizard shows one section by default; "Aggiungi analisi" adds a new one and switches to it; the sidebar lets you jump between sections without losing typed values; "Recap" shows a card per section; "Avvia campagna" is only visible there; submitting with valid data redirects to the campaign detail page. Stop the dev server once confirmed.

- [ ] **Step 8: Report progress**

Report the diff and test results to the controller — do not run `git commit`.

---

## Commits

Per explicit standing instruction, **no task in this plan runs `git commit`, creates a branch, or does any other git-state-changing action.** Each task ends by reporting its diff and test evidence back to the controller; the controller presents it to the user and only commits/branches on explicit request.
