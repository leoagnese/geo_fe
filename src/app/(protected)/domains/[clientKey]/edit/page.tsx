/**
 * SC-013 — Edit domain form.
 *
 * Same form as SC-011 but clientKey is read-only (locked field).
 * Only brand, aliases, settori are editable.
 * PATCH /domains/:clientKey on submit. Success toast → redirect to domain homepage.
 *
 * States:
 * - Loading: skeleton input placeholders while fetching domain data
 * - Error 404: "Dominio non trovato" full-page error
 * - Error 500: toast on save failure
 * - Empty: not applicable (edit form always pre-populated)
 * - Populated: pre-filled form → on save, toast "Modifiche salvate." + redirect
 *
 * @implements US-005
 * @validates AC-009
 * @spec L1_design/screen-inventory.md §"SC-013"
 * @spec L1_design/states-and-empty.md §"SC-013"
 * @figma — (Figma file not yet created)
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Skeleton from '@mui/material/Skeleton'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import TagInput from '@/components/TagInput'
import { getDomain, updateDomain, ApiError } from '@/lib/api-client'

const EditDomainSchema = z.object({
  brand: z.string().min(1, 'Brand è obbligatorio'),
  aliases: z.array(z.string()).default([]),
  settori: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
})

type EditDomainForm = z.infer<typeof EditDomainSchema>

interface EditDomainPageProps {
  params: { clientKey: string }
}

export default function EditDomainPage({ params }: EditDomainPageProps) {
  const { clientKey } = params
  const { data: session } = useSession()
  const router = useRouter()
  const [successToast, setSuccessToast] = useState(false)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  const {
    data: domainData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['domain', clientKey],
    queryFn: () => getDomain(session?.accessToken ?? '', clientKey),
    enabled: !!session?.accessToken,
  })

  const domain = domainData?.data

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditDomainForm>({
    resolver: zodResolver(EditDomainSchema),
    defaultValues: { brand: '', aliases: [], settori: [], keywords: [] },
  })

  // Pre-populate form once domain data arrives
  useEffect(() => {
    if (domain) {
      reset({
        brand: domain.brand,
        aliases: domain.aliases ?? [],
        settori: domain.settori ?? [],
        keywords: domain.keywords ?? [],
      })
    }
  }, [domain, reset])

  const updateMutation = useMutation({
    mutationFn: (data: EditDomainForm) =>
      updateDomain(session?.accessToken ?? '', clientKey, {
        brand: data.brand,
        aliases: data.aliases,
        settori: data.settori,
        keywords: data.keywords,
      }),
    onSuccess: () => {
      setSuccessToast(true)
      setTimeout(() => router.push(`/domains/${clientKey}`), 800)
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 422) {
        setErrorToast(`Validazione fallita: ${err.message}`)
        return
      }
      setErrorToast('Impossibile salvare le modifiche. Riprova.')
    },
  })

  // 404 state
  if (isError && error instanceof ApiError && error.status === 404) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h2" color="text.secondary" gutterBottom>
          Dominio non trovato
        </Typography>
        <Button variant="contained" onClick={() => router.push('/domains')}>
          Torna ai domini
        </Button>
      </Box>
    )
  }

  return (
    <Box sx={{ maxWidth: 640, mx: 'auto' }}>
      <Typography variant="h1" gutterBottom>
        Modifica dominio
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit((data) => updateMutation.mutate(data))}
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
      >
        {/* clientKey — read-only */}
        <TextField
          label="clientKey"
          value={clientKey}
          disabled
          helperText="Il clientKey non può essere modificato dopo la creazione."
          InputProps={{ sx: { fontFamily: 'var(--geo-font-mono)' } }}
        />

        {/* brand */}
        {isLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : (
          <TextField
            label="Brand"
            {...register('brand')}
            error={!!errors.brand}
            helperText={errors.brand?.message}
          />
        )}

        {/* aliases */}
        {isLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : (
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
        )}

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

        {/* keywords — usate da n8n come base per la generazione delle query */}
        {isLoading ? (
          <Skeleton variant="rounded" height={56} />
        ) : (
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
        )}

        {/* Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
          <Button
            variant="text"
            onClick={() => router.push(`/domains/${clientKey}`)}
            disabled={isSubmitting || updateMutation.isPending}
            sx={{ color: 'text.secondary' }}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoading || isSubmitting || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Salvataggio…' : 'Salva modifiche'}
          </Button>
        </Box>
      </Box>

      {/* Success toast */}
      <Snackbar
        open={successToast}
        autoHideDuration={4000}
        onClose={() => setSuccessToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" onClose={() => setSuccessToast(false)}>
          Modifiche salvate.
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
