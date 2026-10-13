/**
 * Competitive-landscape scatter: every brand is its own series so the legend
 * and tooltip can name it. Top 10 competitors get a palette colour, the rest
 * share a grey; the target keeps the brand orange.
 */
import {
  BRAND_PALETTE,
  OTHERS_COLOR,
  TARGET_COLOR,
  assignBrandColors,
  buildScatterSeries,
} from '@/lib/brandScatter'
import type { BrandRankRow, TargetBrandRow } from '@/lib/api-client'

const comp = (brand: string, score: number, rank: number | null = 3, citations = 0, mentionsOnly = 1): BrandRankRow => ({
  rank: 1, brand, aiVisibilityScore: score, totalMentions: citations + mentionsOnly, citations, mentionsOnly, avgRankPosition: rank,
  linkRate: 0, sentimentPositive: 0, sentimentNeutral: 0, sentimentNegative: 0,
})

// 12 competitors, scores 120 → 10 (so B01 is the most visible)
const competitors = Array.from({ length: 12 }, (_, i) => comp(`B${String(i + 1).padStart(2, '0')}`, 120 - i * 10))

describe('assignBrandColors', () => {
  it('has 10 distinct palette colours, none of them the target orange', () => {
    expect(BRAND_PALETTE).toHaveLength(10)
    expect(new Set(BRAND_PALETTE).size).toBe(10)
    expect(BRAND_PALETTE).not.toContain(TARGET_COLOR)
  })

  it('gives the 10 most visible competitors a palette colour, in visibility order', () => {
    const colors = assignBrandColors(competitors)
    expect(colors['B01']).toBe(BRAND_PALETTE[0])
    expect(colors['B10']).toBe(BRAND_PALETTE[9])
  })

  it('gives every other competitor the shared grey', () => {
    const colors = assignBrandColors(competitors)
    expect(colors['B11']).toBe(OTHERS_COLOR)
    expect(colors['B12']).toBe(OTHERS_COLOR)
  })

  it('is independent of input order (ties broken by name)', () => {
    const shuffled = [...competitors].reverse()
    expect(assignBrandColors(shuffled)).toEqual(assignBrandColors(competitors))
    const tie = [comp('Zeta', 50), comp('Alfa', 50)]
    expect(assignBrandColors(tie)['Alfa']).toBe(BRAND_PALETTE[0])
  })
})

describe('buildScatterSeries', () => {
  const target = {
    brand: 'Gewiss', avgRankPosition: 2, aiVisibilityScore: 90, citations: 5, mentionsOnly: 2,
  } as TargetBrandRow
  const colors = assignBrandColors(competitors)

  it('returns one series per brand, labelled with the brand name', () => {
    const { series } = buildScatterSeries(target, competitors, colors)
    expect(series).toHaveLength(13)
    expect(series.map((s) => s.label)).toContain('B05')
    expect(series.find((s) => s.label === 'Gewiss')).toMatchObject({ color: TARGET_COLOR, markerSize: 14 })
  })

  it('keeps colours stable when the brand filter removes competitors', () => {
    const filtered = competitors.filter((c) => ['B03', 'B11'].includes(c.brand))
    const { series } = buildScatterSeries(target, filtered, colors)
    expect(series.find((s) => s.label === 'B03')!.color).toBe(BRAND_PALETTE[2])
    expect(series.find((s) => s.label === 'B11')!.color).toBe(OTHERS_COLOR)
  })

  it('skips brands without an average rank position', () => {
    const { series } = buildScatterSeries(target, [comp('NoRank', 10, null), comp('Ok', 20)], assignBrandColors([comp('Ok', 20)]))
    expect(series.map((s) => s.label)).toEqual(['Gewiss', 'Ok'])
  })

  it('builds a legend: target, each coloured competitor shown, and one grey "Altri competitor" entry', () => {
    const { legend } = buildScatterSeries(target, competitors, colors)
    expect(legend[0]).toEqual({ label: 'Gewiss', color: TARGET_COLOR })
    expect(legend.filter((l) => l.color === OTHERS_COLOR)).toEqual([{ label: 'Altri competitor (2)', color: OTHERS_COLOR }])
    expect(legend).toHaveLength(1 + 10 + 1)
  })

  it('omits the "Altri competitor" legend entry when there are none', () => {
    const { legend } = buildScatterSeries(target, competitors.slice(0, 3), colors)
    expect(legend.map((l) => l.label)).toEqual(['Gewiss', 'B01', 'B02', 'B03'])
  })

  it('tooltip text reports rank, visibility, citations and mentions', () => {
    const { series } = buildScatterSeries(target, [comp('B01', 120, 4.5, 7, 3)], assignBrandColors([comp('B01', 120)]))
    const fmt = series.find((s) => s.label === 'B01')!.valueFormatter
    expect(fmt({ x: 4.5, y: 120 })).toBe('Rank medio 4.5 · Visibility 120 · 7 citazioni · 3 menzioni')
    expect(series.find((s) => s.label === 'Gewiss')!.valueFormatter({ x: 2, y: 90 }))
      .toBe('Rank medio 2.0 · Visibility 90 · 5 citazioni · 2 menzioni')
  })
})
