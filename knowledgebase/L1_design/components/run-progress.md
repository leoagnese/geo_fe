# Run Progress

> Variants: counter-block, progress-bar, debug-log-panel
> Used by: SC-021 (run detail / monitor)
> Implements: US-009, US-018; AC-016, AC-017, AC-028

The run progress component group covers all live-monitoring UI elements on SC-021.
These elements update via polling every 10 seconds while the run is in `running` state.

## Quick reference

| Variant | Purpose | Update mechanism |
|---------|---------|-----------------|
| `counter-block` | Planned / Done / Error query counts | Polling (10s, AC-016) |
| `progress-bar` | Visual % of doneQueries / plannedQueries | Derived from counter-block data |
| `debug-log-panel` | Timestamped log entries (debugMode only) | Polling (10s, same interval, AC-028) |

## `counter-block`

Three blocks rendered side-by-side (or stacked on mobile). Each block shows a label and a
large count.

| Block | Label (IT) | Color |
|-------|-----------|-------|
| Planned | "Pianificate" | `color.neutral.text.secondary` |
| Done | "Completate" | `color.status.done` |
| Error | "Errori" | `color.status.error` |

| Property | Value | Token |
|----------|-------|-------|
| Count font | `1.5rem / 700` | `text.scale.h2` |
| Label font | `0.75rem / 400` | `text.scale.caption` |
| Last-updated caption | below the group | `text.scale.caption` + `color.neutral.text.disabled` |

Stale data state: if polling has failed for >30s (OQ-DESIGN-006), show a "Aggiornamento
sospeso" warning chip above the counter group. Last-known values remain visible.

## `progress-bar`

Fills from 0% to 100% as doneQueries approaches plannedQueries.

| Property | Value | Token |
|----------|-------|-------|
| Track color | `color.neutral.border` | `--geo-color-neutral-border` |
| Fill color | `color.status.running` → `color.status.done` on completion | status tokens |
| Height | `8px` | — |
| Radius | `9999px` | `radius.full` |
| Percentage label | right of bar, `text.scale.caption` | |
| MUI base | `LinearProgress` with custom color | — |

Transition: fill color animates from `color.status.running` (blue) to `color.status.done`
(green) when the status transitions. Transition duration: `motion.duration.slow` (400ms).

## `debug-log-panel`

Collapsible panel. Default: collapsed. Visible and expandable only when `debugMode=true`
on the run. Hidden entirely when `debugMode=false`.

| Property | Value | Token |
|----------|-------|-------|
| Font family | `'JetBrains Mono', monospace` | `text.font.mono` |
| Font size | `0.8125rem` | `text.scale.mono.sm` |
| Background | `color.neutral.bg` | `--geo-color-neutral-bg` |
| Max height | `320px` | — |
| Overflow | `auto` (scrollable) | — |
| Auto-scroll | to bottom on new entry | — |
| Timestamp format | `HH:mm:ss.SSS` | — |
| Entry separator | `color.neutral.border` | `--geo-color-neutral-border` |

Each log entry: `[HH:mm:ss.SSS] <message>` on a single line. Long messages wrap.
Error-level log entries use `color.status.error` for the timestamp prefix.

OQ-DESIGN-010: should the debug log panel be a drawer overlay or an inline panel?
Inline keeps context visible; drawer gives more space for long logs.

Figma component: _(pending — Figma file not yet created)_
