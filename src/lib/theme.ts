/**
 * MUI v6 theme — design tokens allineati ai mockup docs_legacy.
 *
 * Design system source: geo_be/docs_legacy/*.html
 * Primary: #ec5b13 (arancione) | Font: Public Sans | Radii: xl (12px) / 2xl (16px)
 * Palette: slate-based (neutral) + primary orange
 */
import { createTheme } from '@mui/material/styles'

// ──────────────────────────────────────────────────────────────
// Color tokens
// ──────────────────────────────────────────────────────────────
// primary             → #ec5b13  (arancione, da docs_legacy)
// background.default  → #f8f6f6
// background.paper    → #ffffff
// text.primary        → #0f172a  (slate-900)
// text.secondary      → #64748b  (slate-500)
// text.disabled       → #94a3b8  (slate-400)
// divider             → #e2e8f0  (slate-200)
// color.status.*      → invariati (semantici, non legati al brand)

const geoTheme = createTheme({
  palette: {
    mode: 'light',

    primary: {
      main: '#ec5b13',
      dark: '#c94a0a',
      light: '#f07a3a',
      contrastText: '#ffffff',
    },

    warning: {
      main: '#f59e0b',   // color.status.queued
    },

    success: {
      main: '#16a34a',   // color.status.done
    },

    error: {
      main: '#dc2626',   // color.status.error
    },

    info: {
      main: '#3b82f6',   // color.status.running
    },

    background: {
      default: '#f8f6f6',
      paper: '#ffffff',
    },

    divider: '#e2e8f0',

    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },

    grey: {
      600: '#475569',   // color.status.cancelled (slate-600)
    },
  },

  typography: {
    fontFamily: "'Public Sans', system-ui, -apple-system, sans-serif",
    h1: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
    },
    h2: {
      fontSize: '1.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h3: {
      fontSize: '1.25rem',
      fontWeight: 700,
      letterSpacing: '-0.015em',
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.625rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
    },
  },

  spacing: 8,

  shape: {
    borderRadius: 12,  // rounded-xl, usato come default
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: `
        :root {
          --geo-color-primary: #ec5b13;
          --geo-color-primary-dark: #c94a0a;
          --geo-color-primary-light: #f07a3a;
          --geo-color-bg: #f8f6f6;
          --geo-color-surface: #ffffff;
          --geo-color-border: #e2e8f0;
          --geo-color-text-primary: #0f172a;
          --geo-color-text-secondary: #64748b;
          --geo-color-text-disabled: #94a3b8;
          --geo-color-status-running: #3b82f6;
          --geo-color-status-queued: #f59e0b;
          --geo-color-status-done: #16a34a;
          --geo-color-status-error: #dc2626;
          --geo-color-status-cancelled: #475569;
          --geo-color-sentiment-positive: #16a34a;
          --geo-color-sentiment-neutral: #64748b;
          --geo-color-sentiment-negative: #dc2626;
          --geo-color-score-high: #16a34a;
          --geo-color-score-mid: #f59e0b;
          --geo-color-score-low: #dc2626;
          --geo-font-primary: 'Public Sans', system-ui, sans-serif;
          --geo-font-mono: 'JetBrains Mono', monospace;
          --geo-radius-xs: 4px;
          --geo-radius-sm: 8px;
          --geo-radius-md: 12px;
          --geo-radius-lg: 16px;
          --geo-radius-full: 9999px;
          --geo-shadow-card: 0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05);
          --geo-shadow-panel: 0 4px 12px rgba(0,0,0,0.08);
          --geo-shadow-dialog: 0 20px 60px rgba(0,0,0,0.14);
          --geo-motion-fast: 150ms;
          --geo-motion-base: 250ms;
          --geo-motion-ease-std: cubic-bezier(0.4, 0, 0.2, 1);
        }

        * { box-sizing: border-box; }

        body {
          font-family: 'Public Sans', system-ui, sans-serif;
          background-color: var(--geo-color-bg);
          color: var(--geo-color-text-primary);
        }
      `,
    },

    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 700,
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
        containedPrimary: {
          boxShadow: '0 4px 14px rgba(236,91,19,0.25)',
          '&:hover': {
            boxShadow: '0 6px 20px rgba(236,91,19,0.35)',
          },
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 700,
          height: '24px',
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: '#f1f5f9',
            '& fieldset': { border: 'none' },
            '&:hover fieldset': { border: 'none' },
            '&.Mui-focused fieldset': {
              border: '2px solid #ec5b13',
            },
          },
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            color: '#64748b',
            fontSize: '0.6875rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          },
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.875rem',
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          boxShadow: '0 20px 60px rgba(0,0,0,0.14)',
          borderRadius: '16px',
        },
      },
    },
  },
})

// ─── Semantic color constants ──────────────────────────────────
export const geoColors = {
  status: {
    running: '#3b82f6',
    queued: '#f59e0b',
    done: '#16a34a',
    error: '#dc2626',
    cancelled: '#475569',
  },
  sentiment: {
    positive: '#16a34a',
    neutral: '#64748b',
    negative: '#dc2626',
  },
  score: {
    high: '#16a34a',
    mid: '#f59e0b',
    low: '#dc2626',
  },
} as const

export function getScoreColor(score: number): string {
  if (score >= 70) return geoColors.score.high
  if (score >= 30) return geoColors.score.mid
  return geoColors.score.low
}

export default geoTheme
