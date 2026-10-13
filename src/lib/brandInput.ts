/** [scheme://][www.]host.tld[/path] — TLD of 2+ letters, no spaces. */
const URL_RE = /^(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:[/?#].*)?$/i

export function looksLikeUrl(value: string): boolean {
  const v = value.trim()
  return v.length > 0 && !/\s/.test(v) && URL_RE.test(v)
}

export function brandFieldHelp(value: string): { text: string; warn: boolean } {
  if (looksLikeUrl(value)) {
    return {
      text: 'Sembra un URL: inserisci il nome del brand come compare nelle risposte (es. "Gewiss"). L\'URL va nel dominio target.',
      warn: true,
    }
  }
  return { text: 'Il nome come compare nelle risposte, non l\'URL.', warn: false }
}
