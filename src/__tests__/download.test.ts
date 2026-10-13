import { downloadBlob } from '@/lib/download'

describe('downloadBlob', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    URL.createObjectURL = jest.fn(() => 'blob:x')
    URL.revokeObjectURL = jest.fn()
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  })
  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('clicks a link with the file name', () => {
    const click = HTMLAnchorElement.prototype.click as jest.Mock
    downloadBlob(new Blob(['x']), 'out.xlsx')
    expect(click).toHaveBeenCalledTimes(1)
  })

  it('keeps the object URL alive until the browser has started the download', () => {
    downloadBlob(new Blob(['x']), 'out.xlsx')
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    jest.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x')
  })
})
