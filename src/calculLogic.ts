// Règles de calcul du best of (Luc). Fonctions pures : aucun réseau, aucun DOM.
export const EXPOSANT = 0.8

// score = cœurs / morceaux^0,8
export function score(coeurs: number, morceaux: number): number | null {
  if (!Number.isFinite(coeurs) || !Number.isFinite(morceaux) || !(morceaux > 0) || coeurs < 0) return null
  return coeurs / Math.pow(morceaux, EXPOSANT)
}

// note = score × 20 / meilleur score de l'année
export function note(scoreAlbum: number | null, meilleur: number | null): number | null {
  if (scoreAlbum === null || meilleur === null || !(meilleur > 0)) return null
  return (scoreAlbum * 20) / meilleur
}

// Centième SUPÉRIEUR du plus haut score (1,5849 -> 1,59 ; 1,6154 -> 1,62 ; 1,59 -> 1,59).
export function meilleurScore(scoreMax: number): number {
  return Number((Math.ceil(scoreMax * 100 - 1e-9) / 100).toFixed(2))
}

// Mois (heure de Paris) de la plus ancienne time_add (secondes Unix), au 1er du mois : AAAA-MM-01.
export function moisEcoute(timesAdd: readonly number[]): string | null {
  const t = timesAdd.filter((x) => Number.isFinite(x) && x > 0)
  if (t.length === 0) return null
  const parties = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).formatToParts(new Date(Math.min(...t) * 1000))
  const an = parties.find((p) => p.type === 'year')?.value
  const mois = parties.find((p) => p.type === 'month')?.value
  return an && mois ? `${an}-${mois}-01` : null
}

// Écart entre le nombre de titres en playlist et nb_tracks de Deezer.
export function ecartNbTracks(morceaux: number, nbTracks: number | null | undefined): boolean {
  return nbTracks !== null && nbTracks !== undefined && nbTracks > 0 && nbTracks !== morceaux
}

export function formaterNombre(x: number | null | undefined, decimales: number): string {
  return x === null || x === undefined || !Number.isFinite(x) ? '' : x.toFixed(decimales).replace('.', ',')
}

const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

// 2026-08-01 -> « août 2026 »
export function formaterMois(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso ?? '')
  if (!m) return ''
  const nom = MOIS_COURTS[Number(m[2]) - 1]
  return nom ? `${nom} ${m[1]}` : ''
}

// Seuil de la ligne rouge.
export const SEUIL_ROUGE = 10
export const estRouge = (n: number | null | undefined): boolean => typeof n === 'number' && n > SEUIL_ROUGE
