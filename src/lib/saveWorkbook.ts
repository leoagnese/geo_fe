import writeXlsxFile from 'write-excel-file/browser'
import { downloadBlob } from '@/lib/download'

export type SheetData = { name: string; rows: (string | number | null)[][] }

/** Write the sheets as an .xlsx file and download it. The only place that uses write-excel-file. */
export async function saveWorkbook(sheets: SheetData[], fileName: string): Promise<void> {
  // An empty row has no cells to write: use a single empty cell so the sheet keeps its layout.
  const blob = await writeXlsxFile(sheets.map((s) => ({ sheet: s.name, data: s.rows.map((r) => (r.length ? r : [null])) }))).toBlob()
  downloadBlob(blob, fileName)
}
