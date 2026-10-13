/** Save a Blob as a file in the browser. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadText(content: string, fileName: string, type = 'application/json'): void {
  downloadBlob(new Blob([content], { type }), fileName)
}
