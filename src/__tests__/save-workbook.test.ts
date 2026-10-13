import { saveWorkbook } from '@/lib/saveWorkbook'
import { downloadBlob } from '@/lib/download'
import writeXlsxFile from 'write-excel-file/browser'

jest.mock('@/lib/download', () => ({ downloadBlob: jest.fn() }))
jest.mock('write-excel-file/browser', () => ({ __esModule: true, default: jest.fn() }))

describe('saveWorkbook', () => {
  it('writes every sheet (empty rows kept as one empty cell) and downloads the resulting blob', async () => {
    const blob = new Blob(['x'])
    ;(writeXlsxFile as unknown as jest.Mock).mockReturnValue({ toBlob: async () => blob })
    await saveWorkbook([{ name: 'summary', rows: [['a', 1], []] }], 'out.xlsx')
    expect(writeXlsxFile).toHaveBeenCalledWith([{ sheet: 'summary', data: [['a', 1], [null]] }])
    expect(downloadBlob).toHaveBeenCalledWith(blob, 'out.xlsx')
  })
})
