'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'

export interface StatCardDelta {
  label: string        // e.g. "+12.4%", "+3.2 pos", "-2.1%"
  positive: boolean    // true → green ↑, false → red ↓
}

interface StatCardProps {
  label: string
  value: string
  /** Previous period value shown below current (e.g. "30.4%") */
  previousValue?: string
  delta?: StatCardDelta
  icon?: ReactNode
  /** Extra content rendered below the value row (charts, bars, etc.) */
  children?: ReactNode
  sx?: object
}

/**
 * StatCard — KPI card used throughout the platform.
 * Shows: label, large value, optional delta trend, optional previous value.
 * Matches the card style from mockups (screen2 / screen3 / screen6 / screen8 / screen9).
 */
export default function StatCard({
  label,
  value,
  previousValue,
  delta,
  icon,
  children,
  sx,
}: StatCardProps) {
  return (
    <Card sx={{ flex: 1, minWidth: 0, ...sx }}>
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontSize: '0.6875rem', letterSpacing: '0.08em', lineHeight: 1.2 }}
          >
            {label}
          </Typography>
          {delta && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                bgcolor: delta.positive ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                color: delta.positive ? 'success.main' : 'error.main',
                borderRadius: 'var(--geo-radius-full)',
                px: 0.75,
                py: 0.25,
                fontSize: '0.6875rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {delta.positive
                ? <TrendingUpIcon sx={{ fontSize: '0.875rem' }} />
                : <TrendingDownIcon sx={{ fontSize: '0.875rem' }} />}
              {delta.label}
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography
                component="div"
                sx={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1.1, color: 'text.primary' }}
              >
                {value}
              </Typography>
              {previousValue && (
                <Typography
                  variant="body2"
                  color="text.disabled"
                  sx={{ textDecoration: 'line-through', fontSize: '0.9375rem' }}
                >
                  {previousValue}
                </Typography>
              )}
            </Box>
          </Box>
          {icon && (
            <Box sx={{ color: 'text.disabled', display: 'flex', alignItems: 'center' }}>
              {icon}
            </Box>
          )}
        </Box>

        {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
      </CardContent>
    </Card>
  )
}
