// BO3 B : choix du candidat Deezer pour un album de 2022 sans nombre de morceaux. Sans réseau, sans DOM.
// Importé aussi par scripts/bo3/morceaux_2022.mjs (Node, import avec extension .ts).
import { normaliserNom } from './ecouteLogic.ts'

export interface Candidat {
  id: number
  titre: string
  artiste: string
  nbTracks: number | null
  recordType: string
  releaseDate: string
}

export type Confiance = 'sur' | 'choix' | 'approche' | 'introuvable'

export interface Choix {
  confiance: Confiance
  candidat: Candidat | null
}

// Édition « deluxe / expanded / bonus » : un de ces mots dans le titre brut.
export function estEdition(titreBrut: string): boolean {
  return /\b(deluxe|expanded|bonus)\b/i.test(titreBrut)
}

// L'un contient l'autre, par mots entiers ; jamais pour une chaîne vide.
export function inclusion(a: string, b: string): boolean {
  if (a === '' || b === '') return false
  const x = ` ${a} `
  const y = ` ${b} `
  return x.includes(y) || y.includes(x)
}

type Lien = 'exact' | 'proche' | null

function lien(a: string, b: string): Lien {
  const x = normaliserNom(a)
  const y = normaliserNom(b)
  if (x !== '' && x === y) return 'exact'
  return inclusion(x, y) ? 'proche' : null
}

// Ordre de préférence entre candidats équivalents : record_type album, puis édition simple, puis le moins de morceaux,
// puis la sortie la plus ancienne.
export function comparerCandidats(a: Candidat, b: Candidat): number {
  const alb = Number(b.recordType === 'album') - Number(a.recordType === 'album')
  if (alb !== 0) return alb
  const ed = Number(estEdition(a.titre)) - Number(estEdition(b.titre))
  if (ed !== 0) return ed
  const nb = (a.nbTracks ?? Infinity) - (b.nbTracks ?? Infinity)
  if (nb !== 0 && !Number.isNaN(nb)) return nb
  return (a.releaseDate || '9999').localeCompare(b.releaseDate || '9999')
}

export function choisirCandidat(artiste: string, album: string, candidats: readonly Candidat[]): Choix {
  const exacts: Candidat[] = []
  const proches: Candidat[] = []
  for (const c of candidats) {
    const la = lien(artiste, c.artiste)
    const lt = lien(album, c.titre)
    if (la === 'exact' && lt === 'exact') exacts.push(c)
    else if (la !== null && lt !== null) proches.push(c)
  }
  if (exacts.length === 1) return { confiance: 'sur', candidat: exacts[0] }
  if (exacts.length > 1) return { confiance: 'choix', candidat: [...exacts].sort(comparerCandidats)[0] }
  if (proches.length > 0) return { confiance: 'approche', candidat: [...proches].sort(comparerCandidats)[0] }
  return { confiance: 'introuvable', candidat: null }
}

// Remarque de cohérence : plus de cœurs que de morceaux.
export function remarqueCoherence(coeurs: number | null, nbTracks: number | null): string {
  return coeurs !== null && nbTracks !== null && coeurs > nbTracks ? `coeurs ${coeurs} > nb_tracks ${nbTracks}` : ''
}

export const ENTETE_CSV = ['id', 'artiste', 'album', 'coeurs', 'deezer_album_id', 'titre_deezer', 'artiste_deezer', 'nb_tracks', 'record_type', 'confiance', 'remarque']

// Une cellule CSV (séparateur « ; ») : guillemets si besoin, jamais de saut de ligne.
export function cellule(v: string | number | null | undefined): string {
  const t = String(v ?? '').replace(/[\r\n]+/g, ' ')
  return /[;"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

export function ligneCsv(valeurs: readonly (string | number | null | undefined)[]): string {
  return valeurs.map(cellule).join(';')
}
