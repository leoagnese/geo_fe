/**
 * AppShell — top nav + sidebar nav wrapping all (protected) routes.
 *
 * Top nav: 64px height, color.neutral.surface bg, shadow.card bottom.
 * Contents: logo (left), breadcrumb (center-left), user avatar + role badge (right).
 * Sidebar: Domains link + Admin section (admin role only).
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
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import DomainIcon from '@mui/icons-material/Language'
import AdminIcon from '@mui/icons-material/AdminPanelSettings'
import PeopleIcon from '@mui/icons-material/People'
import RunIcon from '@mui/icons-material/PlayCircle'
import ProfileIcon from '@mui/icons-material/Tune'
import DomainsAdminIcon from '@mui/icons-material/Storage'

const DRAWER_WIDTH = 240

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Domini', path: '/domains', icon: <DomainIcon /> },
]

const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: 'Utenti', path: '/admin/users', icon: <PeopleIcon />, adminOnly: true },
  { label: 'Run globali', path: '/admin/runs', icon: <RunIcon />, adminOnly: true },
  { label: 'Profili LLM', path: '/admin/profiles', icon: <ProfileIcon />, adminOnly: true },
  { label: 'Tutti i domini', path: '/admin/domains', icon: <DomainsAdminIcon />, adminOnly: true },
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

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setAnchorEl(null)
  }

  const handleSignOut = () => {
    handleUserMenuClose()
    void signOut({ callbackUrl: '/login' })
  }

  const isActive = (path: string) => pathname.startsWith(path)

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Top nav bar (64px, color.neutral.surface, shadow.card) ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: 'background.paper',          // color.neutral.surface
          borderBottom: '1px solid',
          borderColor: 'divider',               // color.neutral.border
          boxShadow: 'var(--geo-shadow-card)',
          height: 64,
        }}
      >
        <Toolbar sx={{ height: 64, minHeight: '64px !important' }}>
          {/* Logo */}
          <Typography
            variant="h3"
            color="primary"
            sx={{ fontWeight: 700, mr: 4, cursor: 'pointer', flexShrink: 0 }}
            onClick={() => router.push('/domains')}
          >
            Geo-SmartAudit
          </Typography>

          <Box sx={{ flex: 1 }} />

          {/* User avatar + role badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {isAdmin && (
              <Chip
                icon={<AdminIcon sx={{ fontSize: 14 }} />}
                label="Admin"
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
            <IconButton
              onClick={handleUserMenuOpen}
              aria-label="account menu"
              aria-controls="user-menu"
              aria-haspopup="true"
            >
              <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: '0.875rem' }}>
                {userInitial}
              </Avatar>
            </IconButton>
          </Box>

          {/* User dropdown menu */}
          <Menu
            id="user-menu"
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {session?.user?.email ?? ''}
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleSignOut}>Esci</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar navigation ── */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            top: 64, // below top nav
            height: 'calc(100% - 64px)',
            borderRight: '1px solid',
            borderColor: 'divider',
            boxShadow: 'none',
            bgcolor: 'background.paper',
          },
        }}
      >
        <List sx={{ pt: 2 }}>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              selected={isActive(item.path) && !pathname.startsWith('/admin')}
              onClick={() => router.push(item.path)}
              sx={{
                borderRadius: 'var(--geo-radius-sm)',
                mx: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}

          {/* Admin section — visible only to admin role */}
          {isAdmin && (
            <>
              <Divider sx={{ my: 2, mx: 2 }} />
              <Typography
                variant="overline"
                color="text.disabled"
                sx={{ px: 3, display: 'block', mb: 1 }}
              >
                Admin
              </Typography>
              {ADMIN_NAV_ITEMS.map((item) => (
                <ListItemButton
                  key={item.path}
                  selected={isActive(item.path)}
                  onClick={() => router.push(item.path)}
                  sx={{
                    borderRadius: 'var(--geo-radius-sm)',
                    mx: 1,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      '&:hover': { bgcolor: 'primary.dark' },
                      '& .MuiListItemIcon-root': { color: 'inherit' },
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </>
          )}
        </List>
      </Drawer>

      {/* ── Page content area ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          mt: '64px',         // below top nav
          ml: `${DRAWER_WIDTH}px`,
          bgcolor: 'background.default', // color.neutral.bg
          minHeight: 'calc(100vh - 64px)',
          px: { xs: 2, md: 4 },        // spacing.page-x: 32px desktop / 16px mobile
          py: 4,                        // spacing.page-y: 32px
        }}
      >
        {children}
      </Box>
    </Box>
  )
}
