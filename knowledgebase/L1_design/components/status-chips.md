# Status Chips

> Variants: queued, running, done, error, cancelled
> Used by: SC-012 (run list), SC-021 (run detail header), SC-041 (admin run monitor)
> Implements: US-006, US-009, US-011, US-024

Run status is a first-class visual concept. Status chips are the primary indicator of run state
across all screens that list or detail runs. Each variant maps to a semantic color token.

## Quick reference

| Variant | Background | Text | Token (bg) | Token (text) | Animation |
|---------|------------|------|------------|--------------|-----------|
| `queued` | amber/10 | amber/dark | `color.status.queued` | `color.status.queued` | none |
| `running` | blue/10 | blue | `color.status.running` | `color.status.running` | pulse on indicator dot |
| `done` | green/10 | green/dark | `color.status.done` | `color.status.done` | none |
| `error` | red/10 | red/dark | `color.status.error` | `color.status.error` | none |
| `cancelled` | grey/10 | grey | `color.status.cancelled` | `color.status.cancelled` | none |

Background is a 10% opacity tint of the status color. Text is the full status color.
Chip border: 1px solid at 30% opacity of status color.

## Common properties (all variants)

| Property | Value | Token |
|----------|-------|-------|
| Radius | `9999px` (pill) | `radius.full` |
| Font | `0.75rem / 600` | `text.scale.caption` |
| Padding | `2px 8px` | `spacing.1` horizontal |
| Height | `24px` | — |
| MUI base | `Chip` size="small" | — |

## `running` variant — animation

The `running` chip includes a small pulsing dot (8px circle) to the left of the label.
The dot uses `motion.animation.pulse` (1.4s ease-in-out infinite).
This is the only animated element in the entire status chip family.

## Usage rules

- Always use the semantic label in Italian matching the run status:
  - `queued` → "In coda"
  - `running` → "In esecuzione"
  - `done` → "Completata"
  - `error` → "Errore"
  - `cancelled` → "Annullata"
- Never display raw status strings (`running`, `done`) to the user.
- Status chip is always read-only — no onClick behavior unless in the admin filter row.
- Figma component: _(pending — Figma file not yet created)_
