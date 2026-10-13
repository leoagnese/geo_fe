import {
  getBrandSuggestions,
  confirmBrandMerge,
  rejectBrandMerge,
  deleteBrandMerge,
  deleteBrandMergeVariant,
} from '@/lib/api-client'

describe('brand registry api', () => {
  const fetchMock = jest.fn()
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls[0]
    return { url: url as string, init: init as RequestInit }
  }

  it('GETs suggestions for a run', async () => {
    await getBrandSuggestions('tok', 'acme', 'run 1')
    expect(lastCall().url.endsWith('/domains/acme/runs/run%201/results/brand-suggestions')).toBe(true)
    expect(lastCall().init.method).toBeUndefined()
    expect((lastCall().init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  it('POSTs a confirmed merge', async () => {
    await confirmBrandMerge('tok', 'acme', { canonical: 'Schneider', variants: ['Schneider Electric'] })
    expect(lastCall().url.endsWith('/domains/acme/brand-registry')).toBe(true)
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ canonical: 'Schneider', variants: ['Schneider Electric'] })
  })

  it('POSTs a rejection with both names', async () => {
    await rejectBrandMerge('tok', 'acme', 'CEI', 'CEI 64-8')
    expect(lastCall().url.endsWith('/domains/acme/brand-registry/rejections')).toBe(true)
    expect(JSON.parse(lastCall().init.body as string)).toEqual({ a: 'CEI', b: 'CEI 64-8' })
  })

  it('DELETEs a merge, encoding the name', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    await deleteBrandMerge('tok', 'acme', 'Gewiss Group')
    expect(lastCall().url.endsWith('/domains/acme/brand-registry/Gewiss%20Group')).toBe(true)
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('DELETEs one variant, encoding both names', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 204 })
    await deleteBrandMergeVariant('tok', 'acme', 'Gewiss', 'IDP / GEWISS')
    expect(lastCall().url.endsWith('/domains/acme/brand-registry/Gewiss/variants/IDP%20%2F%20GEWISS')).toBe(true)
  })
})
