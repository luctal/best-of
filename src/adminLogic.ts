// Mode admin de l'écran Année : validation de la saisie, valeurs envoyées à modifier_album. Sans React, sans réseau.
import { meilleurScore, note, score } from './calculLogic'
import type { Album } from './types'

export interface Saisie {
  titre: string
  artiste: string
  annee: string
  coeurs: string
  morceaux: string
  mois: string // AAAA-MM ou vide
}

export function saisieDepuis(a: Album): Saisie {
  return {
    titre: a.album ?? '',
    artiste: a.artiste,
    annee: String(a.annee),
    coeurs: a.coeurs === null ? '' : String(a.coeurs),
    morceaux: a.morceaux === null ? '' : String(a.morceaux),
    mois: a.date_ecoute ? a.date_ecoute.slice(0, 7) : '',
  }
}

export interface Modification {
  annee: number
  artiste: string
  album: string
  coeurs: number | null
  morceaux: number | null
  score: number | null
  note: number | null
  date_ecoute: string | null
}

export type Validation = { ok: true; valeur: Modification } | { ok: false; message: string }

function entierOuVide(s: string): number | null | 'invalide' {
  const t = s.trim()
  if (t === '') return null
  return /^\d+$/.test(t) ? Number(t) : 'invalide'
}

// Formats dont le score et la note suivent la règle de calcul de l'appli.
export const recalculable = (format: string): boolean => format === 'appli' || format === '2023-2026'

// meilleurAnnee : meilleur score de l'année de destination (table annees), sert à la note des lignes recalculables.
export function valider(ligne: Album, s: Saisie, meilleurAnnee: number | null): Validation {
  const artiste = s.artiste.trim()
  if (artiste === '') return { ok: false, message: "L'artiste est obligatoire." }
  if (!/^\d{4}$/.test(s.annee.trim()) || Number(s.annee) < 1900 || Number(s.annee) > 2100) return { ok: false, message: "L'année doit avoir quatre chiffres." }
  const coeurs = entierOuVide(s.coeurs)
  const morceaux = entierOuVide(s.morceaux)
  if (coeurs === 'invalide' || morceaux === 'invalide') return { ok: false, message: 'Cœurs et morceaux doivent être des nombres entiers.' }
  if (morceaux === 0) return { ok: false, message: 'Le nombre de morceaux ne peut pas être zéro.' }
  if (s.mois.trim() !== '' && !/^\d{4}-(0[1-9]|1[0-2])$/.test(s.mois.trim())) return { ok: false, message: 'Le mois doit être de la forme AAAA-MM.' }
  let sc = ligne.score
  let nt = ligne.note
  if (recalculable(ligne.format_source) && coeurs !== null && morceaux !== null) {
    sc = score(coeurs, morceaux)
    const meilleur = sc === null ? meilleurAnnee : Math.max(meilleurAnnee ?? 0, meilleurScore(sc))
    nt = note(sc, meilleur)
  }
  return {
    ok: true,
    valeur: {
      annee: Number(s.annee),
      artiste,
      album: s.titre.trim(),
      coeurs,
      morceaux,
      score: sc,
      note: nt,
      date_ecoute: s.mois.trim() === '' ? null : `${s.mois.trim()}-01`,
    },
  }
}

// Années à recalculer après une modification ou une suppression (ancienne et nouvelle année pour une ligne recalculable).
export function anneesARecalculer(ligne: Album, nouvelleAnnee: number | null): number[] {
  if (!recalculable(ligne.format_source)) return []
  return [...new Set([ligne.annee, ...(nouvelleAnnee === null ? [] : [nouvelleAnnee])])]
}
