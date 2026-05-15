# KPI Cards

> Variants: score-hero, metric-chip, sentiment-bar
> Used by: SC-030 (Results overview)
> Implements: US-013; AC-020, AC-021

KPI cards are the centrepiece of the results view. They communicate the AI Visibility Score and
its component metrics at a glance. Three sub-variants serve different data densities.

## Quick reference

| Variant | Purpose | Key token |
|---------|---------|-----------|
| `score-hero` | Large AI Visibility Score display | `text.scale.kpi`, `color.score.*` |
| `metric-chip` | Single metric (avg rank, link rate, mentions) | `text.scale.h2`, `text.scale.body2` |
| `sentiment-bar` | Three-segment horizontal bar | `color.sentiment.*` |

## `score-hero`

Displays the AI Visibility Score [0–100] as a prominent numeral with color coding.

| Property | Value | Token |
|----------|-------|-------|
| Score numeral font | `2.5rem / 700` | `text.scale.kpi` |
| Score color — high (≥70) | `color.score.high` | `--geo-color-score-high` |
| Score color — mid (30–69) | `color.score.mid` | `--geo-color-score-mid` |
| Score color — low (<30) | `color.score.low` | `--geo-color-score-low` |
| Card radius | `12px` | `radius.lg` |
| Card shadow | `shadow.card` | `--geo-shadow-card` |
| Card background | `color.neutral.surface` | `--geo-color-neutral-surface` |
| Subtitle label | "AI Visibility Score" | `text.scale.overline` |

Zero-data state: score numeral shows "0" in `color.score.low`, subtitle shows "N/D" for
avg rank. Matches AC-021.

OQ-DESIGN-009: circular gauge (MUI CircularProgress as decorative ring behind the numeral)
vs plain large numeral. Gauge adds visual weight and communicates "out of 100" implicitly.
Raise for designer decision.

## `metric-chip`

Small card for a single secondary metric beneath the score hero.

| Property | Value | Token |
|----------|-------|-------|
| Metric value font | `1.5rem / 600` | `text.scale.h2` |
| Metric label font | `0.75rem / 400` | `text.scale.caption` |
| Card radius | `8px` | `radius.md` |
| Card background | `color.neutral.surface` | `--geo-color-neutral-surface` |
| Border | `1px solid color.neutral.border` | `--geo-color-neutral-border` |

Three instances on SC-030: avg rank ("#3.2"), link rate ("42%"), total mentions ("128").

## `sentiment-bar`

Horizontal three-segment bar showing positive / neutral / negative sentiment percentages.

| Segment | Color token |
|---------|-------------|
| Positive | `color.sentiment.positive` |
| Neutral | `color.sentiment.neutral` |
| Negative | `color.sentiment.negative` |

Each segment width = its percentage of total responses. Minimum visual width: 8px (so a 0%
segment is still visible as a thin line, not invisible). Percentage labels float above each
segment if segment width > 32px, else shown in tooltip.

Zero-data state: all three segments at 0% → bar shows a uniform grey placeholder.

Figma component: _(pending — Figma file not yet created)_
