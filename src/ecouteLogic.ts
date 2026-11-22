// Écran « Écoute » : regroupement des titres de la playlist par album.id, filtre « déjà en base », lignes à enregistrer.
// Sans React, sans DOM, sans réseau.
import { ecartNbTracks, meilleurScore, moisEcoute, note, score } from './calculLogic'
import type { AlbumLeger } from './types'

export interface TitreDeezer {
  id: number
  artiste: string
  albumId: number
  albumTitre: string
  timeAdd: number
}

export interface PisteBrute {
  id?: number
  time_add?: number
  artist?: { name?: string }
  album?: { id?: number; title?: string }
}

// Titre de playlist Deezer -> titre exploitable ; null s'il n'a pas d'identifiant ou pas d'album.
export function titreDepuisDeezer(p: PisteBrute | null | undefined): TitreDeezer | null {
  if (!p || typeof p.id !== 'number' || typeof p.album?.id !== 'number') return null
  return { id: p.id, artiste: p.artist?.name ?? '', albumId: p.album.id, albumTitre: p.album.title ?? '', timeAdd: typeof p.time_add === 'number' ? p.time_add : 0 }
}

export interface AlbumEcoute {
  albumId: number
  artiste: string
  titre: string
  morceaux: number // titres de l'album présents dans la playlist
  coeurs: number
  moisEcoute: string | null // AAAA-MM-01
  premierAjout: number
  dernierAjout: number
}

// Regroupe par album.id (jamais par titre), du plus ancien ajout au plus récent.
export function regrouperParAlbum(titres: readonly TitreDeezer[], aimes: ReadonlySet<number>): AlbumEcoute[] {
  const groupes = new Map<number, TitreDeezer[]>()
  for (const t of titres) {
    const g = groupes.get(t.albumId)
    if (g) g.push(t)
    else groupes.set(t.albumId, [t])
  }
  const sortie: AlbumEcoute[] = []
  for (const [albumId, g] of groupes) {
    const temps = g.map((t) => t.timeAdd).filter((x) => x > 0)
    const par = new Map<string, number>()
    for (const t of g) par.set(t.artiste, (par.get(t.artiste) ?? 0) + 1)
    const artiste = [...par.entries()].sort((a, b) => b[1] - a[1])[0][0]
    sortie.push({
      albumId,
      artiste,
      titre: g[0].albumTitre,
      morceaux: g.length,
      coeurs: g.filter((t) => aimes.has(t.id)).length,
      moisEcoute: moisEcoute(temps),
      premierAjout: temps.length ? Math.min(...temps) : 0,
      dernierAjout: temps.length ? Math.max(...temps) : 0,
    })
  }
  return sortie.sort((a, b) => a.premierAjout - b.premierAjout || a.albumId - b.albumId)
}

// Nom comparable : casse, accents, ponctuation et mentions entre parenthèses ou crochets ignorés.
export function normaliserNom(s: string | null | undefined): string {
  return String(s ?? '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export type DejaEnBase = 'id' | 'nom' | null

export interface BaseIndex {
  ids: Set<number>
  noms: Set<string>
}

const cleNom = (artiste: string | null | undefined, titre: string | null | undefined) => `${normaliserNom(artiste)}|${normaliserNom(titre)}`

export function indexerBase(base: readonly Pick<AlbumLeger, 'artiste' | 'album' | 'deezer_album_id'>[]): BaseIndex {
  const ids = new Set<number>()
  const noms = new Set<string>()
  for (const a of base) {
    if (a.deezer_album_id !== null) ids.add(a.deezer_album_id)
    if (normaliserNom(a.album) !== '') noms.add(cleNom(a.artiste, a.album))
  }
  return { ids, noms }
}

// « id » : le deezer_album_id est en base ; « nom » : artiste et titre normalisés correspondent à une ligne.
export function dejaEnBase(a: Pick<AlbumEcoute, 'albumId' | 'artiste' | 'titre'>, index: BaseIndex): DejaEnBase {
  if (index.ids.has(a.albumId)) return 'id'
  if (normaliserNom(a.titre) !== '' && index.noms.has(cleNom(a.artiste, a.titre))) return 'nom'
  return null
}

export interface Edition {
  titre: string
  annee: number | null
}

export interface Apercu {
  coeurs: number
  morceaux: number
  score: number | null
  note: number | null
  mois: string | null
  meilleur: number | null // meilleur score de l'année utilisé pour la note
  ecart: boolean // morceaux ≠ nb_tracks Deezer
}

// Meilleur de l'année effectif : celui de la base, relevé si l'album le dépasse.
export function apercu(a: AlbumEcoute, meilleurBase: number | null, nbTracks: number | null): Apercu {
  const s = score(a.coeurs, a.morceaux)
  const meilleur = s === null ? meilleurBase : Math.max(meilleurBase ?? 0, meilleurScore(s))
  return { coeurs: a.coeurs, morceaux: a.morceaux, score: s, note: note(s, meilleur), mois: a.moisEcoute, meilleur, ecart: ecartNbTracks(a.morceaux, nbTracks) }
}

export interface AjoutAlbum {
  annee: number
  artiste: string
  album: string
  deezer_album_id: number
  coeurs: number
  morceaux: number
  score: number
  note: number | null
  date_ecoute: string | null
  a_verifier: boolean
}

// Valeurs envoyées à ajouter_album ; null si l'année ou le titre manque.
export function ligneAEnregistrer(a: AlbumEcoute, ed: Edition, meilleurBase: number | null, nbTracks: number | null): AjoutAlbum | null {
  const titre = ed.titre.trim()
  if (titre === '' || ed.annee === null || !Number.isInteger(ed.annee) || ed.annee < 1900 || ed.annee > 2100) return null
  const ap = apercu(a, meilleurBase, nbTracks)
  if (ap.score === null) return null
  return {
    annee: ed.annee,
    artiste: a.artiste,
    album: titre,
    deezer_album_id: a.albumId,
    coeurs: a.coeurs,
    morceaux: a.morceaux,
    score: ap.score,
    note: ap.note,
    date_ecoute: a.moisEcoute,
    a_verifier: ap.ecart,
  }
}

// Message de recalcul : seulement si le meilleur score de l'année change.
export function messageMeilleur(annee: number, avant: number | null, apres: number): string | null {
  if (avant !== null && Math.abs(avant - apres) < 1e-9) return null
  return `Nouveau meilleur score ${annee} : ${apres.toFixed(2).replace('.', ',')}, notes de l'année recalculées`
}
