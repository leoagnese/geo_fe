'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam ? 'Login fallito — verifica le credenziali.' : null,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) return

    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Credenziali non valide. Riprova.')
      return
    }

    router.replace('/domains')
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          bgcolor: 'background.paper',
          borderRadius: 'var(--geo-radius-lg)',
          boxShadow: 'var(--geo-shadow-panel)',
          p: 4,
        }}
      >
        <Typography
          variant="h2"
          color="primary"
          sx={{ fontWeight: 700, mb: 0.5, textAlign: 'center' }}
        >
          Geo-SmartAudit
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 4 }}
        >
          Piattaforma AI Visibility
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <TextField
            label="Username o email"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
            disabled={loading}
            fullWidth
          />

          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loading}
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((v) => !v)}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={loading || !username || !password}
            sx={{ mt: 1 }}
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : 'Accedi'}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    }>
      <LoginForm />
    </Suspense>
  )
}
