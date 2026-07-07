# Campaign Wizard — Frontend Foundations Implementation Plan (Part A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay the two foundations the campaign wizard (Part B, separate plan) will build on: (1) remove `settori` from the FE entirely and add the new `CampaignSectionDto`/`CreateCampaignDto` shape, (2) extract the single-run form's field set into a shared `RunConfigFields` component so the wizard can reuse it per-section instead of duplicating ~700 lines.

**Architecture:** `RunConfigFields` is a presentational + form-registration component parameterized by a `namePrefix` string, consumed via `useFormContext()` so the exact same field markup works against a flat top-level form (`namePrefix=''`, used by the refactored `SingleRunForm`) or a nested array item (`namePrefix=\`sections.${i}.\``, used by the wizard in Part B). `SingleRunForm` is refactored to wrap its form in `FormProvider` and render `<RunConfigFields namePrefix="" />` instead of its own inline JSX — a pure structural refactor, not a behavior change.

**Tech Stack:** Next.js 14, MUI v6, react-hook-form (`useFormContext`, `FormProvider`, `useFieldArray`), zod, TanStack Query, Jest + React Testing Library.

## Global Constraints

- No new npm dependencies.
- This plan does not touch `CampaignForm.tsx` or `__tests__/app/campaign-form.test.tsx` — the old campaign form and its replacement are Part B, a separate plan.
- `RunConfigFields` field paths are built as template strings (`${namePrefix}fieldName`) — this deliberately sacrifices some end-to-end TypeScript path-checking (a known, accepted tradeoff of this react-hook-form pattern). Use `useFormContext()` without a generic (defaults to `FieldValues = Record<string, any>`); if `tsc --noEmit` complains about a specific `register`/`Controller`/`useFieldArray` call needing a narrower type, add a local `as any` on that one call — do not attempt to force a fully-typed generic through the whole component.
- Task 2 (the `RunConfigFields` extraction) is a **pure refactor**, not new behavior — there is no new feature to TDD. Its correctness is verified by the *existing* `__tests__/app/run-new-target-url.test.tsx` (which exercises `SingleRunForm` end-to-end through the real DOM) continuing to pass unchanged, plus the full suite showing no regression. Do not invent a new test file for `RunConfigFields` in isolation — testing it would require building a throwaway `FormProvider` test harness that duplicates coverage the existing test already provides through its real consumer.

---

## File structure

All paths relative to `/home/marco/Documenti/GEO/geo_fe/`.

| File | Action | Responsibility |
|---|---|---|
| `src/lib/api-client.ts` | Modify | Remove `settori`; add `CampaignSectionDto`; rewrite `CreateCampaignDto` |
| `src/app/(protected)/domains/new/page.tsx` | Modify | Remove `settori` field |
| `src/app/(protected)/domains/[clientKey]/edit/page.tsx` | Modify | Remove `settori` field |
| `src/app/(protected)/domains/[clientKey]/page.tsx` | Modify | Remove `settori` chip-list display (plan gap found mid-execution — this file reads `domain.settori` and was missing from the original file list; `CampaignForm.tsx` is the only file deliberately deferred to Part B) |
| `__tests__/app/run-new-target-url.test.tsx` | Modify | Remove now-dead `settori` from fixture |
| `src/__tests__/domains-page.test.tsx` | Modify | Remove now-dead `settori` from fixtures |
| `src/components/RunConfigFields.tsx` | Create | Shared run-config field set, parameterized by `namePrefix` |
| `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx` | Modify (full replace) | `SingleRunForm` refactored to use `RunConfigFields` |

---

### Task 1: Remove `settori` from the frontend

**Files:**
- Modify: `src/lib/api-client.ts`
- Modify: `src/app/(protected)/domains/new/page.tsx`
- Modify: `src/app/(protected)/domains/[clientKey]/edit/page.tsx`
- Modify: `__tests__/app/run-new-target-url.test.tsx`
- Modify: `src/__tests__/domains-page.test.tsx`

**Interfaces:**
- Produces: `CampaignSectionDto` (new export from `api-client.ts`), `CreateCampaignDto` now `{ sections: CampaignSectionDto[] }` — consumed by Part B (the wizard plan), not by anything in this plan.
- Consumes: nothing new — this task only removes a field and adds unused-for-now types.

- [ ] **Step 1: Remove `settori` from `api-client.ts`'s three domain interfaces**

In `src/lib/api-client.ts`, remove the line `settori?: string[]` from each of `Domain`, `CreateDomainDto`, `UpdateDomainDto` (three separate one-line removals, no other changes to those interfaces).

- [ ] **Step 2: Replace `CreateCampaignDto` and add `CampaignSectionDto`**

In `src/lib/api-client.ts`, find:

```typescript
export interface CreateCampaignDto {
  profileKey: string
  runIterations: number
  locales?: string[]
  activePersonaIds?: string[]
  /** Per-section keyword override; keys are sectionKey. Omitted sections auto-generate. */
  sectionKeywords?: Record<string, string[]>
  testMode?: boolean
  debugMode?: boolean
}
```

Replace it with:

```typescript
export interface CampaignSectionDto {
  /** Analysis name, shown in the wizard sidebar/recap and used to derive sectionKey. */
  label: string
  profileKey: string
  runIterations: number
  targetUrl?: string
  locales?: string[]
  keywordsByLang?: Record<string, string[]>
  questionsCountByLang?: Record<string, number>
  activePersonaIds?: string[]
  locationFocusByLang?: Record<string, string>
  topics?: Array<{ id: string; label: string; keywords?: string[] }>
  testMode?: boolean
  debugMode?: boolean
}

export interface CreateCampaignDto {
  sections: CampaignSectionDto[]
}
```

- [ ] **Step 3: Remove `settori` from the "create domain" form**

In `src/app/(protected)/domains/new/page.tsx`:

Remove this line from `CreateDomainSchema`:

```typescript
  settori: z.array(z.string()).default([]),
```

Change:

```typescript
    defaultValues: { aliases: [], settori: [], keywords: [] },
```

to:

```typescript
    defaultValues: { aliases: [], keywords: [] },
```

Remove this line from the `createMutation`'s `mutationFn`:

```typescript
        settori: data.settori,
```

Remove this entire block from the JSX (the settori tag input, between the `aliases` and `keywords` controllers):

```tsx
        {/* settori — tag input (facoltativo) */}
        <Controller
          name="settori"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Settori (facoltativo)"
              value={field.value}
              onChange={field.onChange}
              placeholder="Es. food-beverage"
            />
          )}
        />

```

- [ ] **Step 4: Remove `settori` from the "edit domain" form**

In `src/app/(protected)/domains/[clientKey]/edit/page.tsx`:

Remove this line from `EditDomainSchema`:

```typescript
  settori: z.array(z.string()).default([]),
```

Change:

```typescript
    defaultValues: { brand: '', aliases: [], settori: [], keywords: [] },
```

to:

```typescript
    defaultValues: { brand: '', aliases: [], keywords: [] },
```

Remove this line from the `reset({...})` call inside the pre-populate `useEffect`:

```typescript
        settori: domain.settori ?? [],
```

Remove this line from the `updateMutation`'s `mutationFn`:

```typescript
        settori: data.settori,
```

Remove this entire block from the JSX (between the `aliases` block and the `keywords` block):

```tsx
        {/* settori */}
        {isLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : (
          <Controller
            name="settori"
            control={control}
            render={({ field }) => (
              <TagInput
                label="Settori (facoltativo)"
                value={field.value}
                onChange={field.onChange}
                placeholder="Es. food-beverage"
              />
            )}
          />
        )}

```

- [ ] **Step 5: Clean up dead `settori` fixture data in two test files**

In `__tests__/app/run-new-target-url.test.tsx`, find:

```typescript
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', settori: [], personas: [], personaGroups: [], createdAt: '2026-01-01' },
```

Change to:

```typescript
      data: { clientKey: 'acme', targetDomain: 'acme.com', brand: 'Acme', personas: [], personaGroups: [], createdAt: '2026-01-01' },
```

In `src/__tests__/domains-page.test.tsx`, remove the line `settori: ['food-beverage'],` from the first `mockDomains` entry and `settori: ['coffee'],` from the second (both are unasserted decorative fixture data).

- [ ] **Step 6: Type-check and run the full suite**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npm run type-check && npm test`
Expected: no type errors; every suite passes (baseline was 10 suites / 43 tests before this task — confirm the exact count matches, since this task changes no behavior, only removes a field).

- [ ] **Step 7: Report progress**

This plan does not commit automatically — see the "Commits" note at the end of this document. Report the diff and test results to the controller instead of running `git commit`.

---

### Task 2: Extract `RunConfigFields` and refactor `SingleRunForm`

**Files:**
- Create: `src/components/RunConfigFields.tsx`
- Modify (full replace): `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx`

**Interfaces:**
- Consumes: `LlmProfile`, `Persona`, `PersonaGroup` types from `@/lib/api-client` (unchanged); `TagInput` from `@/components/TagInput` (unchanged)
- Produces: `RunConfigFields` default export with props `{ namePrefix, clientKey, profiles, profilesLoading, profilesError, onRetryProfiles, domainPersonas, domainGroups, isAddingPersona, onAddPersona, isRemovingPersonaId, onRemovePersona }`; named exports `LANG_OPTIONS`, `LangCode` (type), `slugifyTopic` — all consumed by the refactored `SingleRunForm` in this same task, and by the wizard in Part B (separate plan).

This is a pure refactor (see Global Constraints) — no new test file, verified by existing tests.

- [ ] **Step 1: Create `src/components/RunConfigFields.tsx`**

```tsx
/**
 * RunConfigFields — the shared run-configuration field set (target URL
 * override, profile, iterations, keywords/topics, personas, locales,
 * provider info, per-language target settings, advanced options).
 *
 * Used both by the single-run form (namePrefix='') and by each step of the
 * campaign wizard (namePrefix=`sections.${i}.`), via react-hook-form's
 * FormProvider/useFormContext so the same field-registration logic works
 * against either a flat form or a nested `sections[]` array without
 * duplicating ~700 lines of markup.
 *
 * Field paths are built as template strings (`${namePrefix}profileKey`), so
 * this component intentionally does not carry a specific FieldValues generic —
 * react-hook-form's Path<T> can't enumerate dynamic prefixed paths statically.
 *
 * @spec docs/superpowers/specs/2026-07-03-campaign-wizard-design.md §4.1
 */
'use client'

import { useState, useRef } from 'react'
import { useFormContext, Controller, useFieldArray } from 'react-hook-form'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import FormControlLabel from '@mui/material/FormControlLabel'
import Switch from '@mui/material/Switch'
import Checkbox from '@mui/material/Checkbox'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import LockIcon from '@mui/icons-material/Lock'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import TagInput from '@/components/TagInput'
import type { LlmProfile, Persona, PersonaGroup } from '@/lib/api-client'

export const LANG_OPTIONS = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹', defaultLocation: 'Italia' },
  { code: 'en', label: 'English', flag: '🇬🇧', defaultLocation: 'United Kingdom' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', defaultLocation: 'France' },
] as const

export type LangCode = (typeof LANG_OPTIONS)[number]['code']

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  perplexity: 'Perplexity AI',
}

/** Derive a stable id from a topic label: lowercase, non-alphanumeric → '_'. */
export function slugifyTopic(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export interface RunConfigFieldsProps {
  /** '' for the top-level single-run form, `sections.${i}.` for a wizard step. */
  namePrefix: string
  clientKey: string
  profiles: LlmProfile[]
  profilesLoading: boolean
  profilesError: boolean
  onRetryProfiles: () => void
  domainPersonas: Persona[]
  domainGroups: PersonaGroup[]
  isAddingPersona: boolean
  onAddPersona: (persona: { name: string; description: string; context: string; searchStyle?: string }) => Promise<void>
  isRemovingPersonaId: string | null
  onRemovePersona: (personaId: string) => Promise<void>
}

export default function RunConfigFields({
  namePrefix,
  clientKey,
  profiles,
  profilesLoading,
  profilesError,
  onRetryProfiles,
  domainPersonas,
  domainGroups,
  isAddingPersona,
  onAddPersona,
  isRemovingPersonaId,
  onRemovePersona,
}: RunConfigFieldsProps) {
  const { register, control, watch, setValue, formState: { errors: allErrors } } = useFormContext()
  const errors: any = namePrefix
    ? (namePrefix.split('.').filter(Boolean).reduce((acc: any, key) => acc?.[key], allErrors) ?? {})
    : allErrors

  const [activeLangTab, setActiveLangTab] = useState<LangCode>('it')
  const [openPersonaDialog, setOpenPersonaDialog] = useState(false)
  const [personaFormError, setPersonaFormError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const contextRef = useRef<HTMLInputElement>(null)
  const searchStyleRef = useRef<HTMLInputElement>(null)

  const p = (field: string) => `${namePrefix}${field}`

  const { fields: topicFields, append: appendTopic, remove: removeTopic } = useFieldArray({
    control,
    name: p('topics'),
  })

  const selectedProfileKey = watch(p('profileKey')) as string
  const activeLocales = (watch(p('activeLocales')) as string[]) ?? []
  const activePersonaIds = (watch(p('activePersonaIds')) as string[]) ?? []
  const useCustomTargetUrl = watch(p('useCustomTargetUrl')) as boolean
  const selectedProfile = profiles.find((prof) => prof.profileKey === selectedProfileKey)
  const allPersonaIds = domainPersonas.map((persona) => persona.id)

  // Pre-select all domain personas on first load.
  if (domainPersonas.length > 0 && activePersonaIds.length === 0) {
    setValue(p('activePersonaIds'), allPersonaIds)
  }

  function toggleLocale(code: string) {
    const next = activeLocales.includes(code)
      ? activeLocales.filter((l) => l !== code)
      : [...activeLocales, code]
    setValue(p('activeLocales'), next, { shouldValidate: true })
    if (!next.includes(activeLangTab)) {
      const first = LANG_OPTIONS.find((l) => next.includes(l.code))
      if (first) setActiveLangTab(first.code)
    }
  }

  function togglePersona(id: string) {
    const next = activePersonaIds.includes(id)
      ? activePersonaIds.filter((x) => x !== id)
      : [...activePersonaIds, id]
    setValue(p('activePersonaIds'), next, { shouldValidate: true })
  }

  async function handleAddPersona() {
    const name = nameRef.current?.value.trim() ?? ''
    const description = descRef.current?.value.trim() ?? ''
    const context = contextRef.current?.value.trim() ?? ''
    const searchStyle = searchStyleRef.current?.value.trim() ?? ''
    if (!name || !description || !context) {
      setPersonaFormError('Nome, descrizione e contesto sono obbligatori.')
      return
    }
    setPersonaFormError(null)
    try {
      await onAddPersona({ name, description, context, searchStyle: searchStyle || undefined })
      setOpenPersonaDialog(false)
    } catch (err) {
      setPersonaFormError(err instanceof Error ? err.message : 'Errore durante il salvataggio.')
    }
  }

  const visibleLangTabs = LANG_OPTIONS.filter((l) => activeLocales.includes(l.code))

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          1. ACTIVE RUN SETTINGS
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="1" title="Impostazioni run">

        {/* Client key — read-only */}
        <FieldRow label="Client Key">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              label={clientKey}
              size="small"
              sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}
            />
            <Typography variant="caption" color="text.secondary">dominio attivo</Typography>
          </Box>
        </FieldRow>

        {/* Target URL override */}
        <FieldRow label="URL da analizzare">
          <Controller
            name={p('useCustomTargetUrl')}
            control={control}
            render={({ field }) => (
              <ToggleButtonGroup
                value={field.value ? 'custom' : 'same'}
                exclusive
                size="small"
                onChange={(_, next) => next && field.onChange(next === 'custom')}
              >
                <ToggleButton value="same">Stesso URL del progetto</ToggleButton>
                <ToggleButton value="custom">URL diverso</ToggleButton>
              </ToggleButtonGroup>
            )}
          />
          {useCustomTargetUrl && (
            <TextField
              label="URL da analizzare"
              size="small"
              fullWidth
              {...register(p('targetUrl'))}
              error={!!errors.targetUrl}
              helperText={errors.targetUrl?.message ?? 'Es. acme.com/hotel-torino'}
              sx={{ mt: 1.5, maxWidth: 400 }}
            />
          )}
        </FieldRow>

        {/* Profile selection */}
        <FieldRow label="Selezione profilo">
          {profilesError ? (
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={onRetryProfiles}>Riprova</Button>
            }>
              Impossibile caricare i profili LLM.
            </Alert>
          ) : (
            <Controller
              name={p('profileKey')}
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Profilo LLM"
                  size="small"
                  fullWidth
                  disabled={profilesLoading}
                  error={!!errors.profileKey}
                  helperText={errors.profileKey?.message ?? (profilesLoading ? 'Caricamento…' : undefined)}
                >
                  {profiles.map((prof) => (
                    <MenuItem key={prof.profileKey} value={prof.profileKey}>
                      {prof.profileKey}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          )}
        </FieldRow>

        {/* Run iterations */}
        <FieldRow label="Iterazioni">
          <TextField
            label="Iterazioni"
            type="number"
            size="small"
            inputProps={{ min: 1, step: 1 }}
            {...register(p('runIterations'), { valueAsNumber: true })}
            error={!!errors.runIterations}
            helperText={errors.runIterations?.message ?? 'Numero di ripetizioni per affidabilità statistica'}
            sx={{ maxWidth: 200 }}
          />
        </FieldRow>

      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          2. QUERY MANAGEMENT
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="2" title="Gestione query">

        {/* Global keywords */}
        <FieldRow label="Keywords">
          <Controller
            name={p('globalKeywords')}
            control={control}
            render={({ field }) => (
              <TagInput
                label="Keyword globali (tutte le lingue)"
                value={field.value}
                onChange={field.onChange}
                placeholder="Aggiungi keyword e premi Invio"
              />
            )}
          />
          <Typography variant="caption" color="text.secondary">
            Queste keyword vengono aggiunte a tutte le lingue attive. Keyword specifiche per lingua si configurano nella sezione 4.
          </Typography>
        </FieldRow>

        <Divider />

        {/* Topics repeater */}
        <FieldRow
          label="Topic"
          badge={`${topicFields.length}`}
        >
          <Typography variant="caption" color="text.secondary">
            Definisci almeno un topic: il workflow distribuisce le query di analisi tra i topic.
            L&apos;<code>id</code> è derivato automaticamente dall&apos;etichetta.
          </Typography>
          {topicFields.length === 0 && (
            <Alert severity="warning" sx={{ my: 1 }}>
              Nessun topic definito. Aggiungine almeno uno per consentire l&apos;analisi.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {topicFields.map((topicField, index) => {
              const label = (watch(p(`topics.${index}.label`)) as string) ?? ''
              const derivedId = slugifyTopic(label)
              return (
                <Box
                  key={topicField.id}
                  sx={{
                    display: 'flex', flexDirection: 'column', gap: 1,
                    p: 1.5,
                    border: '1px solid', borderColor: 'divider',
                    borderRadius: 'var(--geo-radius-sm)',
                    bgcolor: 'background.default',
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      label="Etichetta topic"
                      size="small"
                      fullWidth
                      {...register(p(`topics.${index}.label`))}
                      error={!!errors.topics?.[index]?.label}
                      helperText={
                        errors.topics?.[index]?.label?.message ??
                        (derivedId ? `id: ${derivedId}` : 'es. "dove dormire a Torino"')
                      }
                    />
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeTopic(index)}
                      sx={{ mt: 0.5 }}
                      aria-label="Rimuovi topic"
                    >
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Box>
                  <Controller
                    name={p(`topics.${index}.keywords`)}
                    control={control}
                    render={({ field }) => (
                      <TagInput
                        label="Keyword del topic (facoltative)"
                        value={field.value ?? []}
                        onChange={field.onChange}
                        placeholder="Aggiungi keyword e premi Invio"
                      />
                    )}
                  />
                </Box>
              )
            })}
            <Button
              size="small"
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => appendTopic({ label: '', keywords: [] })}
              sx={{ alignSelf: 'flex-start' }}
            >
              Aggiungi topic
            </Button>
          </Box>
        </FieldRow>

        <Divider />

        {/* Custom query mode — locked */}
        <FieldRow label="Custom Query">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="Le query vengono generate automaticamente dall'AI. La modalità custom query non è ancora disponibile." placement="top">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Switch disabled checked={false} size="small" />
                <Typography variant="body2" color="text.disabled">Custom query mode</Typography>
                <LockIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              </Box>
            </Tooltip>
            <Chip label="AI-generated" size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
          </Box>
        </FieldRow>

        <Divider />

        {/* Persona selection + management */}
        <FieldRow
          label="Personas"
          badge={`${activePersonaIds.length}/${domainPersonas.length} attive`}
        >
          {/* Quick-select by group */}
          {domainGroups.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1.25, alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>Gruppo:</Typography>
              {domainGroups.map((g) => (
                <Chip
                  key={g.id}
                  label={`${g.name} (${g.personaIds.length})`}
                  size="small"
                  variant={g.personaIds.every((id) => activePersonaIds.includes(id)) && activePersonaIds.length === g.personaIds.length ? 'filled' : 'outlined'}
                  color="primary"
                  onClick={() => setValue(p('activePersonaIds'), g.personaIds, { shouldValidate: true })}
                  sx={{ cursor: 'pointer', fontSize: 11 }}
                />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
              onClick={() => setValue(p('activePersonaIds'), allPersonaIds, { shouldValidate: true })}
              disabled={domainPersonas.length === 0}>
              Tutte
            </Button>
            <Button size="small" variant="outlined" sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0 }}
              onClick={() => setValue(p('activePersonaIds'), [], { shouldValidate: true })}
              disabled={domainPersonas.length === 0}>
              Nessuna
            </Button>
            <Button size="small" variant="contained" startIcon={<AddIcon />}
              sx={{ fontSize: 11, py: 0.25, px: 1.5, ml: 'auto' }}
              onClick={() => { setPersonaFormError(null); setOpenPersonaDialog(true) }}>
              Aggiungi
            </Button>
          </Box>

          {domainPersonas.length === 0 ? (
            <Typography variant="caption" color="text.secondary">
              Nessuna persona configurata per questo dominio. Clicca "Aggiungi" per crearne una.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
              {domainPersonas.map((persona) => {
                const checked = activePersonaIds.includes(persona.id)
                return (
                  <PersonaCard
                    key={persona.id}
                    persona={persona}
                    checked={checked}
                    onToggle={() => togglePersona(persona.id)}
                    onRemove={() => onRemovePersona(persona.id)}
                    isRemoving={isRemovingPersonaId === persona.id}
                  />
                )
              })}
            </Box>
          )}
        </FieldRow>

        <Divider />

        {/* Country selection */}
        <FieldRow
          label="Paese / Lingua"
          badge={`${activeLocales.length} ${activeLocales.length === 1 ? 'paese' : 'paesi'}`}
        >
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            {LANG_OPTIONS.map(({ code, label, flag }) => {
              const active = activeLocales.includes(code)
              return (
                <Box
                  key={code}
                  onClick={() => toggleLocale(code)}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1,
                    px: 2, py: 1,
                    border: '1px solid',
                    borderColor: active ? 'primary.main' : 'divider',
                    borderRadius: 'var(--geo-radius-md)',
                    bgcolor: active ? 'primary.main' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                    '&:hover': { borderColor: 'primary.main' },
                  }}
                >
                  <Checkbox
                    checked={active} size="small" disableRipple
                    sx={{ p: 0, color: active ? 'primary.contrastText' : 'text.disabled',
                      '&.Mui-checked': { color: 'primary.contrastText' } }}
                  />
                  <Typography variant="body2" fontWeight={600}
                    sx={{ color: active ? 'primary.contrastText' : 'text.primary' }}>
                    {flag} {label}
                  </Typography>
                </Box>
              )
            })}
          </Box>
          {errors.activeLocales && (
            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
              {errors.activeLocales.message}
            </Typography>
          )}
        </FieldRow>

      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          3. PROFILE & PROVIDER MANAGEMENT
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="3" title="Gestione profilo & provider">
        {!selectedProfile ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Seleziona un profilo LLM nella sezione 1 per vedere la configurazione provider.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Provider + run model */}
            <FieldRow label="Provider LLM">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={PROVIDER_LABELS[selectedProfile.llmProvider] ?? selectedProfile.llmProvider}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 700 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {selectedProfile.profileKey}
                </Typography>
              </Box>
            </FieldRow>

            <FieldRow label="Versione modello">
              <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {[
                  ['Run model', selectedProfile.runModel],
                  ['QGen model', selectedProfile.qgenModel],
                  ['NER model', selectedProfile.nerModel],
                ].map(([lbl, val]) => (
                  <Box key={lbl}>
                    <Typography variant="caption" color="text.secondary" display="block">{lbl}</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>{val}</Typography>
                  </Box>
                ))}
              </Box>
            </FieldRow>

            {/* Response config (if present) */}
            {selectedProfile.responsesCfg && Object.keys(selectedProfile.responsesCfg).length > 0 && (
              <FieldRow label="Configurazione risposte">
                <Box sx={{
                  display: 'flex', gap: 1, flexWrap: 'wrap',
                  p: 1.5,
                  bgcolor: 'background.default',
                  borderRadius: 'var(--geo-radius-sm)',
                  border: '1px solid', borderColor: 'divider',
                }}>
                  {Object.entries(selectedProfile.responsesCfg).map(([key, val]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${String(val)}`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: 11, fontFamily: 'monospace' }}
                    />
                  ))}
                </Box>
              </FieldRow>
            )}
          </>
        )}
      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          4. TARGET SETTINGS & KEYWORDS
      ═══════════════════════════════════════════════════════ */}
      <ConfigSection label="4" title="Impostazioni target & keyword">
        {activeLocales.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.disabled">
              Seleziona almeno un paese nella sezione 2 per configurare le impostazioni per lingua.
            </Typography>
          </Box>
        ) : (
          <>
            {/* Tab bar — only active languages */}
            <Tabs
              value={visibleLangTabs.some((l) => l.code === activeLangTab) ? activeLangTab : visibleLangTabs[0]?.code}
              onChange={(_, v: LangCode) => setActiveLangTab(v)}
              sx={{ borderBottom: '1px solid', borderColor: 'divider', mb: 3 }}
            >
              {visibleLangTabs.map(({ code, label, flag }) => (
                <Tab key={code} value={code} label={`${flag} ${label}`} sx={{ fontWeight: 600, fontSize: 13 }} />
              ))}
            </Tabs>

            {/* Tab content */}
            {visibleLangTabs.map(({ code, defaultLocation }) => {
              const currentTab = visibleLangTabs.some((l) => l.code === activeLangTab)
                ? activeLangTab
                : visibleLangTabs[0]?.code
              if (code !== currentTab) return null
              return (
                <Box key={code} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                  {/* Keyword list manager */}
                  <FieldRow label="Lista keyword">
                    <Controller
                      name={p(`langs.${code}.keywords`)}
                      control={control}
                      render={({ field }) => (
                        <TagInput
                          label={`Keyword specifiche per ${code.toUpperCase()}`}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Aggiungi keyword e premi Invio"
                        />
                      )}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Vengono aggiunte alle keyword globali della sezione 2.
                      {((watch(p('globalKeywords')) as string[]) ?? []).length > 0 && (
                        <> Keyword globali attive: <strong>{((watch(p('globalKeywords')) as string[]) ?? []).join(', ')}</strong></>
                      )}
                    </Typography>
                  </FieldRow>

                  {/* Max questions per run */}
                  <FieldRow label="Domande max / run">
                    <Controller
                      name={p(`langs.${code}.questionsCount`)}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          label="Domande per keyword"
                          type="number"
                          size="small"
                          inputProps={{ min: 1, step: 1 }}
                          error={!!errors.langs?.[code]?.questionsCount}
                          helperText={errors.langs?.[code]?.questionsCount?.message ?? 'Quante domande AI generare per ciascuna keyword'}
                          sx={{ maxWidth: 200 }}
                        />
                      )}
                    />
                  </FieldRow>

                  {/* Location focus */}
                  <FieldRow label="Focus geografico">
                    <Controller
                      name={p(`langs.${code}.locationFocus`)}
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Città / Area (facoltativo)"
                          size="small"
                          placeholder={defaultLocation}
                          helperText="Override della localizzazione per le ricerche web. Lascia vuoto per usare il default paese."
                          sx={{ maxWidth: 320 }}
                        />
                      )}
                    />
                  </FieldRow>

                </Box>
              )
            })}
          </>
        )}
      </ConfigSection>

      {/* ═══════════════════════════════════════════════════════
          Advanced options (collapsible)
      ═══════════════════════════════════════════════════════ */}
      <Accordion sx={{
        border: '1px solid', borderColor: 'divider',
        borderRadius: 'var(--geo-radius-md) !important',
        '&:before': { display: 'none' }, boxShadow: 'none',
      }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight={600} color="text.secondary">Opzioni avanzate</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller name={p('testMode')} control={control} render={({ field }) => (
              <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Test mode — numero ridotto di query" />
            )} />
            <Controller name={p('debugMode')} control={control} render={({ field }) => (
              <FormControlLabel control={<Switch checked={field.value} onChange={field.onChange} />}
                label="Debug mode — log dettagliati" />
            )} />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Add Persona Dialog */}
      <Dialog open={openPersonaDialog} onClose={() => setOpenPersonaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuova persona</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {personaFormError && <Alert severity="error">{personaFormError}</Alert>}
          <TextField label="Nome *" inputRef={nameRef} fullWidth size="small"
            placeholder="es. Turista Arte e Cultura – City Break" />
          <TextField label="Descrizione *" inputRef={descRef} fullWidth size="small" multiline rows={3}
            placeholder="Profilo demografico, motivazioni, comportamento di ricerca…" />
          <TextField label="Contesto *" inputRef={contextRef} fullWidth size="small" multiline rows={3}
            placeholder="In prima persona: 'Sei Mario, 45 anni…'" />
          <TextField label="Search Style (opzionale)" inputRef={searchStyleRef} fullWidth size="small"
            placeholder="Query tipiche usate da questa persona" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPersonaDialog(false)}>Annulla</Button>
          <Button variant="contained" onClick={handleAddPersona} disabled={isAddingPersona}>
            {isAddingPersona ? 'Aggiunta…' : 'Aggiungi'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfigSection({
  label,
  title,
  children,
}: {
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{
      border: '1px solid', borderColor: 'divider',
      borderRadius: 'var(--geo-radius-md)',
      overflow: 'hidden',
      bgcolor: 'background.paper',
    }}>
      {/* Header */}
      <Box sx={{
        px: 3, py: 1.75,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.default',
      }}>
        <Box sx={{
          width: 24, height: 24, borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: 'primary.contrastText', lineHeight: 1 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="body1" fontWeight={700}>{title}</Typography>
      </Box>

      {/* Body */}
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {children}
      </Box>
    </Box>
  )
}

function FieldRow({
  label,
  badge,
  children,
}: {
  label: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: { xs: 1, sm: 2 }, alignItems: 'flex-start' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: { sm: 0.5 } }}>
        <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {label}
        </Typography>
        {badge && (
          <Chip label={badge} size="small" sx={{ height: 18, fontSize: 10, ml: 'auto' }} />
        )}
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {children}
      </Box>
    </Box>
  )
}

function PersonaCard({
  persona,
  checked,
  onToggle,
  onRemove,
  isRemoving,
}: {
  persona: Persona
  checked: boolean
  onToggle: () => void
  onRemove: () => void
  isRemoving: boolean
}) {
  return (
    <Box
      sx={{
        display: 'flex', gap: 1, alignItems: 'flex-start',
        p: 1.5,
        border: '1px solid',
        borderColor: checked ? 'primary.main' : 'divider',
        borderRadius: 'var(--geo-radius-sm)',
        bgcolor: checked ? 'primary.main' : 'background.paper',
        transition: 'all 0.12s',
        '&:hover': { borderColor: 'primary.main' },
      }}
    >
      <Box onClick={onToggle} sx={{ display: 'flex', gap: 1, flex: 1, cursor: 'pointer', alignItems: 'flex-start' }}>
        <Checkbox
          checked={checked} size="small" disableRipple
          sx={{ p: 0, mt: 0.25, flexShrink: 0,
            color: checked ? 'primary.contrastText' : 'text.disabled',
            '&.Mui-checked': { color: 'primary.contrastText' } }}
        />
        <Box>
          <Typography variant="body2" fontWeight={600}
            sx={{ color: checked ? 'primary.contrastText' : 'text.primary', lineHeight: 1.3 }}>
            {persona.name}
          </Typography>
          <Typography variant="caption"
            sx={{ color: checked ? 'primary.contrastText' : 'text.secondary', opacity: checked ? 0.85 : 1, display: 'block', mt: 0.25 }}>
            {persona.description}
          </Typography>
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        disabled={isRemoving}
        sx={{ flexShrink: 0, color: checked ? 'primary.contrastText' : 'error.main', opacity: 0.7, '&:hover': { opacity: 1 } }}
      >
        {isRemoving ? <CircularProgress size={12} color="inherit" /> : <DeleteIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Box>
  )
}
```

- [ ] **Step 2: Type-check the new file in isolation**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit`
Expected: this will show errors from `runs/new/page.tsx` still referencing the OLD inline field markup (unused imports, duplicate `ConfigSection`/`FieldRow`/`PersonaCard` — that's expected until Step 3 replaces it). If `RunConfigFields.tsx` itself has an error unrelated to the not-yet-updated `page.tsx`, fix it now before proceeding — most likely spot: a `register`/`Controller`/`useFieldArray` `name` prop rejecting the dynamic string; add a local `as any` on that exact call per the Global Constraints note.

- [ ] **Step 3: Replace `src/app/(protected)/domains/[clientKey]/runs/new/page.tsx` in full**

Replace the entire file with:

```tsx
/**
 * SC-020 — New run configurator + campaign mode toggle.
 *
 * "Run singola" renders SingleRunForm (this file); "Campagna" renders a
 * separate wizard built in a later plan. Both consume the shared
 * RunConfigFields component for the actual field set.
 *
 * Submit → POST /domains/:clientKey/runs.
 *
 * @implements US-007, US-008
 * @validates AC-011, AC-012, AC-013, AC-014, AC-015
 */
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import RunConfigFields, { slugifyTopic, type LangCode } from '@/components/RunConfigFields'
import CampaignForm from './CampaignForm'
import {
  getProfiles,
  getDomain,
  postDomainPersona,
  deleteDomainPersona,
  createRun,
  ApiError,
  type LlmProfile,
  type Persona,
  type PersonaGroup,
} from '@/lib/api-client'

// ─── Zod schema ───────────────────────────────────────────────────────────────

const LangSettingsSchema = z.object({
  keywords: z.array(z.string()).default([]),
  questionsCount: z.number().int().min(1).default(10),
  locationFocus: z.string().default(''),
})

const TopicSchema = z.object({
  label: z.string().min(1, 'Etichetta obbligatoria'),
  keywords: z.array(z.string()).default([]),
})

const NewRunSchema = z.object({
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

type NewRunForm = z.infer<typeof NewRunSchema>

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: { clientKey: string }
}

export default function NewRunPage({ params }: Props) {
  const { clientKey } = params
  const [mode, setMode] = useState<'single' | 'campaign'>('single')

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 2 }}>
      <Typography variant="h1" gutterBottom>Nuova run</Typography>
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={(_, next) => next && setMode(next)}
        size="small"
        sx={{ mb: 3 }}
      >
        <ToggleButton value="single">Run singola</ToggleButton>
        <ToggleButton value="campaign">Campagna</ToggleButton>
      </ToggleButtonGroup>
      {mode === 'single' ? <SingleRunForm clientKey={clientKey} /> : <CampaignForm clientKey={clientKey} />}
    </Box>
  )
}

function SingleRunForm({ clientKey }: { clientKey: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [queuedBanner, setQueuedBanner] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)
  const [isAddingPersona, setIsAddingPersona] = useState(false)
  const [isRemovingPersona, setIsRemovingPersona] = useState<string | null>(null)

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

  const methods = useForm<NewRunForm>({
    resolver: zodResolver(NewRunSchema),
    defaultValues: {
      profileKey: '',
      runIterations: 3,
      useCustomTargetUrl: false,
      targetUrl: '',
      globalKeywords: [],
      activeLocales: ['it'],
      activePersonaIds: [],
      topics: [{ label: '', keywords: [] }],
      langs: {
        it: { keywords: [], questionsCount: 10, locationFocus: '' },
        en: { keywords: [], questionsCount: 10, locationFocus: '' },
        fr: { keywords: [], questionsCount: 10, locationFocus: '' },
      },
      testMode: false,
      debugMode: false,
    },
  })
  const { handleSubmit, watch } = methods

  const activeLocales = watch('activeLocales')

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
      const current = methods.getValues('activePersonaIds')
      methods.setValue('activePersonaIds', current.filter((id) => id !== personaId))
    } finally {
      setIsRemovingPersona(null)
    }
  }

  const createRunMutation = useMutation({
    mutationFn: (data: NewRunForm) => {
      const keywordsByLang = Object.fromEntries(
        data.activeLocales.map((lang) => [
          lang,
          [...data.globalKeywords, ...data.langs[lang as LangCode].keywords],
        ]),
      )
      const questionsCountByLang = Object.fromEntries(
        data.activeLocales.map((lang) => [lang, data.langs[lang as LangCode].questionsCount]),
      )
      const locationFocusByLang = Object.fromEntries(
        data.activeLocales
          .filter((lang) => data.langs[lang as LangCode].locationFocus)
          .map((lang) => [lang, data.langs[lang as LangCode].locationFocus]),
      )

      const topics = data.topics
        .filter((t) => t.label.trim())
        .map((t) => ({
          id: slugifyTopic(t.label),
          label: t.label.trim(),
          keywords: t.keywords,
        }))

      return createRun(session?.accessToken ?? '', clientKey, {
        profileKey: data.profileKey,
        runIterations: data.runIterations,
        targetUrl: data.useCustomTargetUrl ? data.targetUrl.trim() : undefined,
        locales: data.activeLocales,
        keywordsByLang,
        questionsCountByLang,
        activePersonaIds: data.activePersonaIds,
        locationFocusByLang,
        topics,
        testMode: data.testMode,
        debugMode: data.debugMode,
      })
    },
    onSuccess: (result) => {
      const { runId, status } = result.data
      if (status === 'queued') {
        setQueuedBanner(true)
        setTimeout(() => router.push(`/domains/${clientKey}/runs/${runId}`), 2000)
      } else {
        router.push(`/domains/${clientKey}/runs/${runId}`)
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 502) { setErrorToast('Avvio run fallito: n8n non raggiungibile.'); return }
        if (err.status === 422) { setErrorToast(`Validazione fallita: ${err.message}`); return }
        if (err.status === 404) { setErrorToast(`Profilo o dominio non trovato: ${err.message}`); return }
      }
      setErrorToast('Errore interno. Riprova.')
    },
  })

  return (
    <Box sx={{ maxWidth: 820, mx: 'auto', pb: 6 }}>
      <FormProvider {...methods}>
        <Box
          component="form"
          onSubmit={handleSubmit((data) => createRunMutation.mutate(data))}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <RunConfigFields
            namePrefix=""
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

          {/* Actions */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="text" onClick={() => router.push(`/domains/${clientKey}`)}
              disabled={createRunMutation.isPending} sx={{ color: 'text.secondary' }}>
              Annulla
            </Button>
            <Button type="submit" variant="contained" disabled={createRunMutation.isPending || activeLocales.length === 0}>
              {createRunMutation.isPending ? 'Avvio…' : 'Avvia run'}
            </Button>
          </Box>
        </Box>
      </FormProvider>

      {/* Toasts */}
      <Snackbar open={queuedBanner} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity="info">Run in coda — reindirizzamento…</Alert>
      </Snackbar>
      <Snackbar open={!!errorToast} onClose={() => setErrorToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="error" onClose={() => setErrorToast(null)}>{errorToast}</Alert>
      </Snackbar>
    </Box>
  )
}
```

- [ ] **Step 4: Run the existing regression test**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx jest __tests__/app/run-new-target-url.test.tsx`
Expected: PASS, 2/2 — same two tests as before this refactor, now exercising the same behavior through `RunConfigFields` instead of inline JSX. If a selector fails, the DOM output (labels, roles, structure) is expected to be byte-identical to before this refactor — investigate any failure as a real regression, not something to route around by loosening the test.

- [ ] **Step 5: Type-check and run the full suite**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npx tsc --noEmit && npm test`
Expected: no type errors; every suite passes (10 suites / 43 tests going in — same count coming out, since this task changes no behavior, only structure).

- [ ] **Step 6: Manual smoke check**

Run: `cd /home/marco/Documenti/GEO/geo_fe && npm run dev`
Open the single-run form for a real `clientKey` and confirm visually: all 4 numbered sections render identically to before (Client Key chip, URL toggle, profile dropdown, iterations, keywords/topics/personas/locales, provider panel, per-language tabs, advanced options accordion), the "Aggiungi persona" dialog still opens/saves/closes correctly, and submitting still creates a run. Stop the dev server once confirmed.

- [ ] **Step 7: Report progress**

Report the diff and test results to the controller — do not run `git commit`.

---

## Commits

Per explicit standing instruction, **no task in this plan runs `git commit`, creates a branch, or does any other git-state-changing action.** Each task ends by reporting its diff and test evidence back to the controller; the controller presents it to the user and only commits/branches on explicit request.
