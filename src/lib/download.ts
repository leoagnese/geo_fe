/** Save a Blob as a file in the browser. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  // Revoking right after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(content: string, fileName: string, type = 'application/json'): void {
  downloadBlob(new Blob([content], { type }), fileName)
}
