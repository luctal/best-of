// Contenu de l'export Excel : un onglet par année, colonnes comme à l'écran. Sans bibliothèque, sans DOM.
import { colonnesPourAnnee, trier, triParDefaut, valeurCellule, ligneRouge, type Colonne } from './anneeLogic'
import type { Album } from './types'

export type CelluleExport = string | number | Date | null

export interface LigneExport {
  valeurs: CelluleExport[]
  rouge: boolean
}

export interface OngletExport {
  nom: string
  colonnes: Colonne[]
  lignes: LigneExport[]
}

// AAAA-MM-01 -> Date (UTC, minuit) : une vraie date Excel, pas un texte.
export function moisEnDate(iso: string | null): Date | null {
  const m = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso ?? '')
  return m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)) : null
}

export function ongletsExport(albums: readonly Album[]): OngletExport[] {
  const parAnnee = new Map<number, Album[]>()
  for (const a of albums) parAnnee.set(a.annee, [...(parAnnee.get(a.annee) ?? []), a])
  return [...parAnnee.keys()]
    .sort((a, b) => a - b)
    .map((annee) => {
      const colonnes = colonnesPourAnnee(annee)
      const lignes = trier(parAnnee.get(annee)!, triParDefaut(annee)).map((a) => ({
        rouge: ligneRouge(a),
        valeurs: colonnes.map((c): CelluleExport => (c.cle === 'mois' ? moisEnDate(a.date_ecoute) : valeurCellule(a, c.cle))),
      }))
      return { nom: String(annee), colonnes, lignes }
    })
}
