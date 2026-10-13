/**
 * Colours and series for the "Panorama competitivo" scatter (results/ranking).
 *
 * Every brand is its own series, so the chart's tooltip and the legend can
 * name it. The 10 most visible competitors get a palette colour; the rest
 * share one grey and are told apart by tooltip. Colours are assigned from the
 * full competitor list, so filtering brands never repaints the survivors.
 */
import type { BrandRankRow, TargetBrandRow } from '@/lib/api-client'

export const TARGET_COLOR = '#ec5b13'
export const OTHERS_COLOR = '#94a3b8'

/**
 * Categorical order, validated light-mode with scripts/validate_palette.js
 * (adjacent pairs: CVD ΔE >= 9.1, normal vision ΔE >= 19.6). Orange is left
 * out on purpose: it is the target brand's colour. Distinctness beyond the
 * adjacent pairs is carried by the tooltip, not by colour alone.
 */
export const BRAND_PALETTE = [
  '#2a78d6', // blue
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#6250d6', // violet
  '#e34948', // red
  '#00a3c4', // cyan
  '#7a9a00', // olive
  '#a33ea1', // purple
] as const

/** brand → colour for every competitor: top 10 by visibility get a palette slot, the rest grey. */
export function assignBrandColors(competitors: BrandRankRow[]): Record<string, string> {
  const ranked = [...competitors].sort(
    (a, b) => b.aiVisibilityScore - a.aiVisibilityScore || a.brand.localeCompare(b.brand),
  )
  return Object.fromEntries(
    ranked.map((c, i) => [c.brand, i < BRAND_PALETTE.length ? BRAND_PALETTE[i] : OTHERS_COLOR]),
  )
}

export interface ScatterSeriesItem {
  label: string
  color: string
  markerSize: number
  data: { x: number; y: number; id: string }[]
  valueFormatter: (v: { x: number; y: number } | null) => string
}

function tooltipFormatter(row: { citations: number; mentionsOnly: number }) {
  return (v: { x: number; y: number } | null) =>
    v ? `Rank medio ${v.x.toFixed(1)} · Visibility ${v.y} · ${row.citations} citazioni · ${row.mentionsOnly} menzioni` : ''
}

export interface LegendItem {
  label: string
  color: string
}

export function buildScatterSeries(
  target: TargetBrandRow | undefined,
  competitors: BrandRankRow[],
  colors: Record<string, string>,
): { series: ScatterSeriesItem[]; legend: LegendItem[] } {
  const series: ScatterSeriesItem[] = []
  const legend: LegendItem[] = []

  if (target && target.avgRankPosition != null) {
    series.push({
      label: target.brand,
      color: TARGET_COLOR,
      markerSize: 14,
      data: [{ x: target.avgRankPosition, y: target.aiVisibilityScore, id: target.brand }],
      valueFormatter: tooltipFormatter(target),
    })
    legend.push({ label: target.brand, color: TARGET_COLOR })
  }

  const withRank = competitors.filter((c) => c.avgRankPosition != null)
  const coloured = withRank
    .filter((c) => (colors[c.brand] ?? OTHERS_COLOR) !== OTHERS_COLOR)
    .sort((a, b) => BRAND_PALETTE.indexOf(colors[a.brand] as never) - BRAND_PALETTE.indexOf(colors[b.brand] as never))
  const others = withRank.filter((c) => (colors[c.brand] ?? OTHERS_COLOR) === OTHERS_COLOR)

  for (const c of [...coloured, ...others]) {
    const color = colors[c.brand] ?? OTHERS_COLOR
    series.push({
      label: c.brand,
      color,
      markerSize: 8,
      data: [{ x: c.avgRankPosition!, y: c.aiVisibilityScore, id: c.brand }],
      valueFormatter: tooltipFormatter(c),
    })
    if (color !== OTHERS_COLOR) legend.push({ label: c.brand, color })
  }
  if (others.length > 0) legend.push({ label: `Altri competitor (${others.length})`, color: OTHERS_COLOR })

  return { series, legend }
}
