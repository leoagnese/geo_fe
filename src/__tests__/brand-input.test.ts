import { looksLikeUrl, brandFieldHelp } from '@/lib/brandInput'

describe('looksLikeUrl', () => {
  it.each(['gewiss.com', 'gewiss.com/it/it/', 'https://www.gewiss.com', 'www.gewiss.com', 'mit.gov.it'])(
    '%s looks like a URL',
    (v) => expect(looksLikeUrl(v)).toBe(true),
  )

  it.each(['Gewiss', 'Turismo Torino', 'ABB S.p.A.', 'S.p.A', 'Dr. Smith', 'Coca-Cola', ''])(
    '%s does not',
    (v) => expect(looksLikeUrl(v)).toBe(false),
  )
})

describe('brandFieldHelp', () => {
  it('explains the field and does not warn for a plain name', () => {
    const help = brandFieldHelp('Gewiss')
    expect(help.warn).toBe(false)
    expect(help.text).toMatch(/come compare nelle risposte/i)
  })

  it('warns when the value looks like a URL', () => {
    const help = brandFieldHelp('gewiss.com/it/it/')
    expect(help.warn).toBe(true)
    expect(help.text).toMatch(/URL/)
  })
})
