// Écran « Année » : colonnes selon le format, tri, ligne rouge. Sans React, sans DOM, sans réseau.
import { estRouge, formaterMois, formaterNombre } from './calculLogic'
import type { Album } from './types'

export type CleColonne = 'rang' | 'artiste' | 'album' | 'adores' | 'pas_mal' | 'coeurs' | 'morceaux' | 'note' | 'mois'

export interface Colonne {
  cle: CleColonne
  titre: string
  nombre: boolean
}

const C: Record<CleColonne, Colonne> = {
  rang: { cle: 'rang', titre: 'Rang', nombre: true },
  artiste: { cle: 'artiste', titre: 'Artiste', nombre: false },
  album: { cle: 'album', titre: 'Album', nombre: false },
  adores: { cle: 'adores', titre: 'Adorés', nombre: true },
  pas_mal: { cle: 'pas_mal', titre: 'Pas mal', nombre: true },
  coeurs: { cle: 'coeurs', titre: 'Cœurs', nombre: true },
  morceaux: { cle: 'morceaux', titre: 'Morceaux', nombre: true },
  note: { cle: 'note', titre: 'Note', nombre: true },
  mois: { cle: 'mois', titre: 'Mois', nombre: false },
}

// Colonnes par année, qui suit le format de l'onglet d'origine (2006-2007 rang ; 2008-2009 deux nombres ; 2010-2020 note ; 2021 cœurs ; 2022 et après complet).
export function colonnesPourAnnee(annee: number): Colonne[] {
  const cles: CleColonne[] =
    annee <= 2007 ? ['rang', 'artiste']
    : annee <= 2009 ? ['rang', 'artiste', 'adores', 'pas_mal']
    : annee <= 2020 ? ['artiste', 'album', 'note', 'mois']
    : annee === 2021 ? ['artiste', 'album', 'coeurs', 'mois']
    : ['artiste', 'album', 'coeurs', 'morceaux', 'note', 'mois']
  return cles.map((c) => C[c])
}

// Années sans note : tri par rang_historique.
export const anneeSansNote = (annee: number): boolean => annee <= 2009

export type Valeur = string | number | null

function nombreBrut(a: Album, cle: string): number | null {
  const v = a.donnees_brutes?.[cle]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

// Valeur brute d'une cellule (pour le tri et l'export). Mois : texte AAAA-MM-01.
export function valeurCellule(a: Album, cle: CleColonne): Valeur {
  switch (cle) {
    case 'rang': return a.rang_historique
    case 'artiste': return a.artiste
    case 'album': return a.album
    case 'adores': return nombreBrut(a, 'titres_adores')
    case 'pas_mal': return nombreBrut(a, 'titres_pas_mal')
    case 'coeurs': return a.coeurs
    case 'morceaux': return a.morceaux
    case 'note': return a.note
    case 'mois': return a.date_ecoute
  }
}

// Texte affiché d'une cellule.
export function texteCellule(a: Album, cle: CleColonne): string {
  const v = valeurCellule(a, cle)
  if (v === null) return ''
  if (cle === 'note') return formaterNombre(v as number, 2)
  if (cle === 'mois') return formaterMois(v as string)
  return String(v)
}

export interface Tri {
  cle: CleColonne
  sens: 'asc' | 'desc'
}

export function triParDefaut(annee: number): Tri {
  return anneeSansNote(annee) ? { cle: 'rang', sens: 'asc' } : { cle: 'note', sens: 'desc' }
}

// Clic sur un en-tête : même colonne = inverse le sens ; autre colonne = ordre naturel (texte croissant, nombre décroissant).
export function basculerTri(actuel: Tri, cle: CleColonne): Tri {
  if (actuel.cle === cle) return { cle, sens: actuel.sens === 'asc' ? 'desc' : 'asc' }
  return { cle, sens: C[cle].nombre && cle !== 'rang' ? 'desc' : 'asc' }
}

// Valeurs absentes toujours en dernier, quel que soit le sens.
export function trier(albums: readonly Album[], tri: Tri): Album[] {
  const f = tri.sens === 'asc' ? 1 : -1
  return [...albums].sort((x, y) => {
    const a = valeurCellule(x, tri.cle)
    const b = valeurCellule(y, tri.cle)
    if (a === null && b === null) return x.id - y.id
    if (a === null) return 1
    if (b === null) return -1
    const c = typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' })
    return c !== 0 ? c * f : x.id - y.id
  })
}

export const ligneRouge = (a: Pick<Album, 'note'>): boolean => estRouge(a.note)

export const anneesDisponibles = (annees: readonly number[]): number[] => [...new Set(annees)].sort((a, b) => b - a)
