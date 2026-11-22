// Traduction des erreurs en messages français. Aucun code machine brut affiché, repli sur le code.
export const MSG_CODE_INCORRECT = 'Code incorrect.'
export const MSG_RESEAU = 'Connexion impossible, réessaie.'
export const MSG_DEEZER = 'Deezer ne répond pas, réessaie dans un instant.'

const MOTIFS_RESEAU = ['failed to fetch', 'networkerror', 'load failed', 'network request failed', 'fetch failed']
const MOTIFS_DEEZER = ['timeout', 'script error']

export function texteErreur(e: unknown): string {
  if (typeof e === 'string') return e
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return ''
}

export function traduireErreur(e: unknown): string {
  const brut = texteErreur(e).trim()
  const bas = brut.toLowerCase()
  if (bas.includes('code invalide')) return MSG_CODE_INCORRECT
  if (MOTIFS_DEEZER.some((m) => bas.includes(m))) return MSG_DEEZER
  if (MOTIFS_RESEAU.some((m) => bas.includes(m))) return MSG_RESEAU
  return brut === '' ? MSG_RESEAU : brut
}
