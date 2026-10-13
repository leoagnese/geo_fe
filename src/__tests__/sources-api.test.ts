import {
  getRunSources, getRunProcessedItems, getDomainSuggestions, confirmDomainMerge, rejectDomainMerge,
  getCampaignSources, getCampaignDashboardData,
} from '@/lib/api-client'

describe('sources api', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) })
    global.fetch = fetchMock as unknown as typeof fetch
  })
  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[0]
    return { url: url as string, init: (init ?? {}) as RequestInit }
  }
  const RUN = '2026-10-13T09%3A29%3A45.588Z-gewiss.com-it-it' // arrives already encoded from useParams

  it('GETs sources for a language without re-encoding the run id', async () => {
    await getRunSources('tok', 'acme', RUN, 'it')
    expect(lastCall().url.endsWith(`/domains/acme/runs/${RUN}/results/sources?lang=it`)).toBe(true)
    expect((lastCall().init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })
  it('GETs processed items and domain suggestions', async () => {
    await getRunProcessedItems('tok', 'acme', RUN)
    expect(lastCall().url.endsWith(`/results/processed-items`)).toBe(true)
    fetchMock.mockClear()
    await getDomainSuggestions('tok', 'acme', RUN)
    expect(lastCall().url.endsWith(`/results/domain-suggestions`)).toBe(true)
  })
  it('POSTs a confirmed merge and a declined pair', async () => {
    await confirmDomainMerge('tok', 'acme', { canonical: 'airbnb.com', variants: ['airbnb.it'] })
    expect(lastCall().url.endsWith('/domains/acme/domain-registry')).toBe(true)
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ canonical: 'airbnb.com', variants: ['airbnb.it'] })
    fetchMock.mockClear()
    await rejectDomainMerge('tok', 'acme', 'airbnb.com', 'airbnb.it')
    expect(lastCall().url.endsWith('/domains/acme/domain-registry/rejections')).toBe(true)
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ a: 'airbnb.com', b: 'airbnb.it' })
  })
  it('GETs campaign sources and dashboard data', async () => {
    await getCampaignSources('tok', 'acme', 'c1', 'all')
    expect(lastCall().url.endsWith('/domains/acme/campaigns/c1/sources?lang=all')).toBe(true)
    fetchMock.mockClear()
    await getCampaignDashboardData('tok', 'acme', 'c1')
    expect(lastCall().url.endsWith('/domains/acme/campaigns/c1/dashboard-data')).toBe(true)
  })
})
