/**
 * AppShell — top nav con link orizzontali (nessuna sidebar).
 * Layout allineato ai mockup docs_legacy (projects-domains.html, brand-analysis.html).
 *
 * @spec L1_design/patterns/layouts.md §"Page shell"
 * @implements US-002
 * @validates AC-004
 */
'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'

interface NavLink {
  label: string
  path: string
  // exact: true → active only on exact path match; false → active on startsWith
  exact?: boolean
}

// Links visibili a tutti gli utenti autenticati
const USER_NAV_LINKS: NavLink[] = [
  { label: 'Progetti', path: '/domains', exact: false },
]

// Links visibili solo agli admin
const ADMIN_NAV_LINKS: NavLink[] = [
  { label: 'Run globali', path: '/admin/runs', exact: false },
  { label: 'Utenti',      path: '/admin/users', exact: true },
  { label: 'Profili LLM', path: '/admin/profiles', exact: false },
]

interface AppShellProps {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const isAdmin = session?.user?.role === 'admin'
  const userInitial = session?.user?.email?.[0]?.toUpperCase() ?? 'U'

  const visibleLinks = [
    ...USER_NAV_LINKS,
    ...(isAdmin ? ADMIN_NAV_LINKS : []),
  ]

  const isActive = (link: NavLink) =>
    link.exact ? pathname === link.path : pathname === link.path || pathname.startsWith(link.path + '/')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          zIndex: (t) => t.zIndex.appBar,
        }}
      >
        <Toolbar
          sx={{
            height: 56,
            minHeight: '56px !important',
            px: { xs: 2, md: 4 },
            gap: 4,
          }}
        >
          {/* Logo — 2×2 grid icon matching mockups */}
          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => router.push('/domains')}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                bgcolor: 'primary.main',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '3px',
                p: '6px',
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <Box key={i} sx={{ bgcolor: 'white', borderRadius: '2px' }} />
              ))}
            </Box>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: 'text.primary',
                letterSpacing: '-0.02em',
                fontSize: '1rem',
              }}
            >
              GEO Analytics
            </Typography>
          </Box>

          {/* Nav links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }}>
            {visibleLinks.map((link) => {
              const active = isActive(link)
              return (
                <Button
                  key={link.label}
                  onClick={() => router.push(link.path)}
                  disableRipple={false}
                  sx={{
                    color: active ? 'primary.main' : 'text.secondary',
                    fontWeight: active ? 700 : 500,
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.75,
                    borderBottom: active ? '2px solid' : '2px solid transparent',
                    borderColor: active ? 'primary.main' : 'transparent',
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0,
                    '&:hover': {
                      bgcolor: 'transparent',
                      color: 'primary.main',
                    },
                  }}
                >
                  {link.label}
                  {isAdmin && ADMIN_NAV_LINKS.some(a => a.label === link.label) && (
                    <Chip
                      label="Admin"
                      size="small"
                      sx={{
                        ml: 0.75,
                        height: 16,
                        fontSize: '0.5625rem',
                        fontWeight: 700,
                        bgcolor: 'primary.main',
                        color: 'white',
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                  )}
                </Button>
              )
            })}
          </Box>

          {/* Search bar */}
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'center', px: 2 }}>
            <TextField
              size="small"
              placeholder="Cerca brand…"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                maxWidth: 320,
                width: '100%',
                '& .MuiOutlinedInput-root': {
                  borderRadius: '20px',
                  bgcolor: 'background.default',
                },
              }}
            />
          </Box>

          {/* Notification bell */}
          <IconButton size="small" aria-label="notifiche">
            <NotificationsNoneIcon fontSize="small" />
          </IconButton>

          {/* User avatar */}
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            aria-label="account menu"
          >
            <Avatar
              sx={{
                width: 36,
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '0.875rem',
                fontWeight: 700,
              }}
            >
              {userInitial}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            slotProps={{
              paper: {
                sx: { mt: 1, borderRadius: '12px', minWidth: 200 },
              },
            }}
          >
            <MenuItem disabled sx={{ fontSize: '0.8125rem' }}>
              {session?.user?.email ?? ''}
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => { setAnchorEl(null); void signOut({ callbackUrl: '/login' }) }}
              sx={{ fontSize: '0.875rem', color: 'error.main' }}
            >
              Esci
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Page content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          bgcolor: 'background.default',
          px: { xs: 2, sm: 3, md: 5 },
          py: 4,
          maxWidth: 1280,
          width: '100%',
          mx: 'auto',
        }}
      >
        {children}
      </Box>

    </Box>
  )
}
