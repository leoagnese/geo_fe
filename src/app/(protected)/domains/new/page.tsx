/**
 * SC-011 — Create domain form.
 *
 * Form fields: clientKey, targetDomain, brand (required); aliases, settori (optional tag inputs).
 * Validation: react-hook-form + Zod schema.
 * clientKey: async uniqueness check on blur (debounced GET /domains/:clientKey, error if 200).
 * Submit: POST /domains → redirect to /domains/[clientKey].
 *
 * States:
 * - Loading: none (form renders immediately; only clientKey check has inline async)
 * - Error: inline field errors (409 duplicate, 422 validation, 500 toast)
 * - Empty: initial blank form
 * - Populated: successful submit → toast + redirect (AC-005)
 *
 * @implements US-003
 * @validates AC-005, AC-006, AC-007
 * @spec L1_design/screen-inventory.md §"SC-011"
 * @spec L1_design/states-and-empty.md §"SC-011"
 * @spec L1_design/patterns/forms.md
 * @figma — (Figma file not yet created)
 */
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import TagInput from '@/components/TagInput'
import { createDomain, getDomain, ApiError } from '@/lib/api-client'

// ── Zod schema (AC-007 — required field validation) ────────────

const CreateDomainSchema = z.object({
  clientKey: z
    .string()
    .min(1, 'clientKey è obbligatorio')
    .regex(
      /^[a-z0-9\-_]+$/,
      'clientKey deve contenere solo lettere minuscole, numeri, trattini o underscore',
    ),
  targetDomain: z.string().min(1, 'Dominio target è obbligatorio'),
  brand: z.string().min(1, 'Brand è obbligatorio'),
  aliases: z.array(z.string()).default([]),
  settori: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

type CreateDomainForm = z.infer<typeof CreateDomainSchema>

// ── Page ───────────────────────────────────────────────────────

export default function NewDomainPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [successToast, setSuccessToast] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // clientKey uniqueness async check state
  const [clientKeyChecking, setClientKeyChecking] = useState(false)
  const [clientKeyTaken, setClientKeyTaken] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateDomainForm>({
    resolver: zodResolver(CreateDomainSchema),
    defaultValues: { aliases: [], settori: [], keywords: [] },
  })

  const clientKeyValue = watch('clientKey')

  // Debounced async uniqueness check on clientKey (AC-006)
  const checkClientKeyUnique = (value: string) => {
    if (!value || !session?.accessToken) return
    if (!/^[a-z0-9\-_]+$/.test(value)) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setClientKeyChecking(true)
      setClientKeyTaken(false)
      try {
        // If GET /domains/:clientKey returns 200, the key is taken
        await getDomain(session.accessToken, value)
        setClientKeyTaken(true)
        setError('clientKey', { message: 'Questo clientKey è già in uso.' })
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // 404 = not found = key is available
          setClientKeyTaken(false)
        }
      } finally {
        setClientKeyChecking(false)
      }
    }, 400)
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const createMutation = useMutation({
    mutationFn: (data: CreateDomainForm) =>
      createDomain(session?.accessToken ?? '', {
        clientKey: data.clientKey,
        targetDomain: data.targetDomain,
        brand: data.brand,
        aliases: data.aliases,
        settori: data.settori,
        keywords: data.keywords,
      }),
    onSuccess: (result) => {
      setSuccessToast(true)
      // Redirect to domain homepage (SC-012)
      setTimeout(() => {
        router.push(`/domains/${result.data.clientKey}`)
      }, 800)
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorToast('Sessione scaduta — esci e accedi di nuovo.')
          return
        }
        if (err.status === 409) {
          setError('clientKey', { message: 'Questo clientKey è già in uso.' })
          return
        }
        if (err.status === 422 || err.status === 400) {
          setErrorToast(`Validazione fallita: ${err.message}`)
          return
        }
      }
      setErrorToast('Errore durante la creazione del dominio. Riprova.')
    },
  })

  const onSubmit = (data: CreateDomainForm) => {
    if (clientKeyTaken) return
    createMutation.mutate(data)
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h1" gutterBottom>
        Crea dominio
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        I campi senza "(facoltativo)" sono obbligatori.
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {/* clientKey — with async uniqueness check */}
        <TextField
          label="clientKey"
          {...register('clientKey', {
            onBlur: (e) => checkClientKeyUnique(e.target.value),
          })}
          error={!!errors.clientKey}
          helperText={
            errors.clientKey?.message ??
            'Slug univoco: solo lettere minuscole, numeri, trattini, underscore'
          }
          InputProps={{
            endAdornment: clientKeyChecking ? (
              <InputAdornment position="end">
                <CircularProgress size={16} />
              </InputAdornment>
            ) : undefined,
            sx: { fontFamily: 'var(--geo-font-mono)' },
          }}
        />

        {/* targetDomain */}
        <TextField
          label="Dominio target"
          {...register('targetDomain')}
          error={!!errors.targetDomain}
          helperText={errors.targetDomain?.message ?? 'Es. caffevergnano.com'}
        />

        {/* brand */}
        <TextField
          label="Brand"
          {...register('brand')}
          error={!!errors.brand}
          helperText={errors.brand?.message}
        />

        {/* aliases — tag input (facoltativo) */}
        <Controller
          name="aliases"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Alias (facoltativo)"
              value={field.value}
              onChange={field.onChange}
              placeholder="Aggiungi alias e premi Invio"
            />
          )}
        />

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

        {/* keywords — usate da n8n come base per la generazione delle query */}
        <Controller
          name="keywords"
          control={control}
          render={({ field }) => (
            <TagInput
              label="Keyword (facoltativo)"
              value={field.value}
              onChange={field.onChange}
              placeholder="Es. caffè espresso, macchina caffè — premi Invio"
              helperText="Keyword di riferimento per l'analisi AI Visibility. Usate da n8n per generare le query di audit."
            />
          )}
        />

        {/* Submit / cancel buttons — right-aligned per forms.md */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
          <Button
            variant="text"
            onClick={() => router.back()}
            disabled={isSubmitting || createMutation.isPending}
            sx={{ color: 'text.secondary' }}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || createMutation.isPending || clientKeyTaken}
          >
            {createMutation.isPending ? 'Creazione…' : 'Crea dominio'}
          </Button>
        </Box>
      </Box>

      {/* Success toast (AC-005) */}
      <Snackbar
        open={successToast}
        autoHideDuration={4000}
        onClose={() => setSuccessToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessToast(false)}>
          Dominio creato con successo.
        </Alert>
      </Snackbar>

      {/* Error toast */}
      <Snackbar
        open={!!errorToast}
        onClose={() => setErrorToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="error" onClose={() => setErrorToast(null)}>
          {errorToast}
        </Alert>
      </Snackbar>
    </Box>
  )
}
