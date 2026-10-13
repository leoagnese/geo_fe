import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { useSession } from 'next-auth/react'
import ResultsDownloadButton from '@/components/ResultsDownloadButton'
import { getRunReportBlob, getRunSources, getRunProcessedItems } from '@/lib/api-client'
import { downloadBlob } from '@/lib/download'
import { saveWorkbook } from '@/lib/saveWorkbook'
import { useDataMode } from '@/lib/useDataMode'

jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
jest.mock('@/lib/useDataMode', () => ({ useDataMode: jest.fn() }))
jest.mock('@/lib/download', () => ({ downloadBlob: jest.fn(), downloadText: jest.fn() }))
jest.mock('@/lib/saveWorkbook', () => ({ saveWorkbook: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/api-client', () => ({
  ...jest.requireActual('@/lib/api-client'),
  getRunReportBlob: jest.fn(), getRunSources: jest.fn(), getRunProcessedItems: jest.fn(),
}))

const emptySources = { data: { lang: 'all', target: 't.org', personas: [], topics: [], topDomains: { rows: [], totalMentions: 0, totalQueries: 0 }, matrix: { topics: [], rows: [], totals: { cells: [], total: { total: 0, target: 0, share: null } } }, examplePrompts: {} } }

describe('ResultsDownloadButton', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSession as jest.Mock).mockReturnValue({ data: { accessToken: 'tok' } })
  })

  it('downloads the raw report in raw mode', async () => {
    ;(useDataMode as jest.Mock).mockReturnValue({ mode: 'raw' })
    ;(getRunReportBlob as jest.Mock).mockResolvedValue(new Blob(['x']))
    render(<ResultsDownloadButton clientKey="acme" runId="r1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Scarica Excel raw' }))
    await waitFor(() => expect(getRunReportBlob).toHaveBeenCalledWith('tok', 'acme', 'r1', 'xlsx'))
    expect(downloadBlob).toHaveBeenCalled()
    expect(saveWorkbook).not.toHaveBeenCalled()
  })

  it('builds and saves the processed workbook in processed mode', async () => {
    ;(useDataMode as jest.Mock).mockReturnValue({ mode: 'processed' })
    ;(getRunSources as jest.Mock).mockResolvedValue(emptySources)
    ;(getRunProcessedItems as jest.Mock).mockResolvedValue({ data: [], meta: { total: 0 } })
    render(<ResultsDownloadButton clientKey="acme" runId="r1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Scarica Excel elaborato' }))
    await waitFor(() => expect(saveWorkbook).toHaveBeenCalledTimes(1))
    expect(getRunSources).toHaveBeenCalledTimes(4)
    expect((saveWorkbook as jest.Mock).mock.calls[0][1]).toBe('r1-elaborato.xlsx')
  })

  it('shows an error when the download fails', async () => {
    ;(useDataMode as jest.Mock).mockReturnValue({ mode: 'raw' })
    ;(getRunReportBlob as jest.Mock).mockRejectedValue(new Error('boom'))
    render(<ResultsDownloadButton clientKey="acme" runId="r1" />)
    await userEvent.click(screen.getByRole('button', { name: 'Scarica Excel raw' }))
    expect(await screen.findByText(/Download non riuscito/)).toBeInTheDocument()
  })
})
