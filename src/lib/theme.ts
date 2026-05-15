/**
 * MUI v6 theme built from Geo-SmartAudit design tokens.
 *
 * Token source: L1_design/design-tokens.md
 * All values reference their semantic token names in comments.
 * No hardcoded raw values should appear outside this file — all other
 * modules reference theme palette / typography / spacing keys.
 *
 * @spec L1_design/design-tokens.md
 */
import { createTheme } from '@mui/material/styles'

// ──────────────────────────────────────────────────────────────
// Color tokens (color.*)
// ──────────────────────────────────────────────────────────────
// color.brand.primary         → #1565C0
// color.brand.primary.dark    → #0D47A1
// color.brand.primary.light   → #1E88E5
// color.brand.accent          → #00ACC1
// color.neutral.bg            → #F5F7FA
// color.neutral.surface       → #FFFFFF
// color.neutral.border        → #E0E4EB
// color.neutral.text.primary  → #1A1F36
// color.neutral.text.secondary→ #6B7A99
// color.neutral.text.disabled → #ADB5C8
// color.status.running        → #1565C0
// color.status.queued         → #F57C00
// color.status.done           → #2E7D32
// color.status.error          → #C62828
// color.status.cancelled      → #546E7A
// color.sentiment.positive    → #388E3C
// color.sentiment.neutral     → #757575
// color.sentiment.negative    → #D32F2F
// color.score.high            → #2E7D32
// color.score.mid             → #F57C00
// color.score.low             → #C62828

const geoTheme = createTheme({
  // ─── Palette ─────────────────────────────────────────────────
  palette: {
    mode: 'light', // dark mode is NOT in scope for MVP

    primary: {
      main: '#1565C0',    // color.brand.primary
      dark: '#0D47A1',    // color.brand.primary.dark
      light: '#1E88E5',   // color.brand.primary.light
      contrastText: '#FFFFFF',
    },

    info: {
      main: '#00ACC1',    // color.brand.accent
      dark: '#1565C0',    // color.status.running (re-used as info.dark)
    },

    warning: {
      main: '#F57C00',    // color.status.queued
    },

    success: {
      main: '#2E7D32',    // color.status.done
    },

    error: {
      main: '#C62828',    // color.status.error
    },

    background: {
      default: '#F5F7FA', // color.neutral.bg
      paper: '#FFFFFF',   // color.neutral.surface
    },

    divider: '#E0E4EB',   // color.neutral.border

    text: {
      primary: '#1A1F36',   // color.neutral.text.primary
      secondary: '#6B7A99', // color.neutral.text.secondary
      disabled: '#ADB5C8',  // color.neutral.text.disabled
    },

    grey: {
      600: '#546E7A',       // color.status.cancelled
    },
  },

  // ─── Typography ───────────────────────────────────────────────
  // text.font.primary  → 'Inter', sans-serif
  // text.font.mono     → 'JetBrains Mono', monospace
  typography: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif", // text.font.primary
    h1: {
      fontSize: '2rem',      // text.scale.h1
      fontWeight: 700,
    },
    h2: {
      fontSize: '1.5rem',    // text.scale.h2
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.25rem',   // text.scale.h3
      fontWeight: 600,
    },
    body1: {
      fontSize: '1rem',      // text.scale.body1
      fontWeight: 400,
    },
    body2: {
      fontSize: '0.875rem',  // text.scale.body2
      fontWeight: 400,
    },
    caption: {
      fontSize: '0.75rem',   // text.scale.caption
      fontWeight: 400,
    },
    overline: {
      fontSize: '0.625rem',  // text.scale.overline
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },

  // ─── Spacing (8px grid) ──────────────────────────────────────
  // spacing(1) = 8px  → spacing.1
  // spacing(2) = 16px → spacing.2
  // ...etc
  spacing: 8,

  // ─── Shape (radius tokens) ───────────────────────────────────
  // radius.md = 8px used as MUI default
  shape: {
    borderRadius: 8, // radius.md
  },

  // ─── Component overrides ──────────────────────────────────────
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400&display=swap');

        :root {
          --geo-color-brand-primary: #1565C0;
          --geo-color-brand-primary-dark: #0D47A1;
          --geo-color-brand-primary-light: #1E88E5;
          --geo-color-brand-accent: #00ACC1;
          --geo-color-neutral-bg: #F5F7FA;
          --geo-color-neutral-surface: #FFFFFF;
          --geo-color-neutral-border: #E0E4EB;
          --geo-color-neutral-text-primary: #1A1F36;
          --geo-color-neutral-text-secondary: #6B7A99;
          --geo-color-neutral-text-disabled: #ADB5C8;
          --geo-color-status-running: #1565C0;
          --geo-color-status-queued: #F57C00;
          --geo-color-status-done: #2E7D32;
          --geo-color-status-error: #C62828;
          --geo-color-status-cancelled: #546E7A;
          --geo-color-sentiment-positive: #388E3C;
          --geo-color-sentiment-neutral: #757575;
          --geo-color-sentiment-negative: #D32F2F;
          --geo-color-score-high: #2E7D32;
          --geo-color-score-mid: #F57C00;
          --geo-color-score-low: #C62828;
          --geo-font-primary: 'Inter', system-ui, sans-serif;
          --geo-font-mono: 'JetBrains Mono', monospace;
          --geo-text-kpi-size: 2.5rem;
          --geo-text-mono-sm: 0.8125rem;
          --geo-sp-1: 8px;
          --geo-sp-2: 16px;
          --geo-sp-3: 24px;
          --geo-sp-4: 32px;
          --geo-sp-5: 40px;
          --geo-sp-6: 48px;
          --geo-sp-8: 64px;
          --geo-sp-10: 80px;
          --geo-sp-page-x: 32px;
          --geo-sp-page-y: 32px;
          --geo-radius-xs: 4px;
          --geo-radius-sm: 6px;
          --geo-radius-md: 8px;
          --geo-radius-lg: 12px;
          --geo-radius-full: 9999px;
          --geo-shadow-card: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
          --geo-shadow-panel: 0 4px 12px rgba(0,0,0,0.10);
          --geo-shadow-dialog: 0 20px 60px rgba(0,0,0,0.16);
          --geo-motion-fast: 150ms;
          --geo-motion-base: 250ms;
          --geo-motion-slow: 400ms;
          --geo-motion-ease-std: cubic-bezier(0.4, 0, 0.2, 1);
          --geo-motion-ease-in: cubic-bezier(0.0, 0, 0.2, 1);
          --geo-motion-ease-out: cubic-bezier(0.4, 0, 1, 1);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        * {
          box-sizing: border-box;
        }

        body {
          background-color: var(--geo-color-neutral-bg);
          color: var(--geo-color-neutral-text-primary);
        }
      `,
    },

    MuiCard: {
      styleOverrides: {
        root: {
          // shadow.card
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
          borderRadius: '8px', // radius.md
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '6px',       // radius.sm
          textTransform: 'none',
          fontWeight: 600,
          transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)', // motion.fast + motion.ease-std
        },
      },
    },

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px', // radius.full
          fontSize: '0.75rem',    // text.scale.caption
          fontWeight: 600,
          height: '24px',
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          // shadow.dialog
          boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
          borderRadius: '8px', // radius.md
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          // shadow.panel
          boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
          width: 480, // Drawer pattern per layouts.md
        },
      },
    },
  },
})

// ─── Custom semantic color constants (for use in component logic) ──────────
// These are referenced in TS code; CSS custom properties used in stylesheets.
export const geoColors = {
  status: {
    running: '#1565C0',   // color.status.running
    queued: '#F57C00',    // color.status.queued
    done: '#2E7D32',      // color.status.done
    error: '#C62828',     // color.status.error
    cancelled: '#546E7A', // color.status.cancelled
  },
  sentiment: {
    positive: '#388E3C',  // color.sentiment.positive
    neutral: '#757575',   // color.sentiment.neutral
    negative: '#D32F2F',  // color.sentiment.negative
  },
  score: {
    high: '#2E7D32',      // color.score.high (score >= 70)
    mid: '#F57C00',       // color.score.mid  (score 30-69)
    low: '#C62828',       // color.score.low  (score < 30)
  },
} as const

/** Returns the score color token based on the three-band system from design-tokens.md */
export function getScoreColor(score: number): string {
  if (score >= 70) return geoColors.score.high
  if (score >= 30) return geoColors.score.mid
  return geoColors.score.low
}

export default geoTheme
