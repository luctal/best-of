// Écran « Écoute » : regroupement des titres de la playlist par album.id, filtre « déjà en base », lignes à enregistrer.
// Sans React, sans DOM, sans réseau.
import { ecartNbTracks, meilleurScore, moisEcoute, note, score } from './calculLogic.ts'
import type { AlbumLeger } from './types'

export interface TitreDeezer {
  id: number
  titre: string
  artiste: string
  albumId: number
  albumTitre: string
  timeAdd: number
}

export interface PisteBrute {
  id?: number
  title?: string
  time_add?: number
  artist?: { name?: string }
  album?: { id?: number; title?: string }
}

// Titre de playlist Deezer -> titre exploitable ; null s'il n'a pas d'identifiant ou pas d'album.
export function titreDepuisDeezer(p: PisteBrute | null | undefined): TitreDeezer | null {
  if (!p || typeof p.id !== 'number' || typeof p.album?.id !== 'number') return null
  return { id: p.id, titre: p.title ?? '', artiste: p.artist?.name ?? '', albumId: p.album.id, albumTitre: p.album.title ?? '', timeAdd: typeof p.time_add === 'number' ? p.time_add : 0 }
}

export interface AlbumEcoute {
  albumId: number
  artiste: string
  titre: string
  morceaux: number // titres de l'album présents dans la playlist
  coeurs: number
  autreVersion: number // parmi les cœurs, ceux posés sur une autre version du titre (autre identifiant Deezer)
  moisEcoute: string | null // AAAA-MM-01
  premierAjout: number
  dernierAjout: number
}

// Un cœur lu sur le profil Deezer.
export interface CoeurDeezer {
  id: number
  titre: string
  artiste: string
}

export interface CoeurBrut {
  id?: number
  title?: string
  artist?: { name?: string }
}

// Cœur Deezer brut -> cœur exploitable ; null s'il n'a pas d'identifiant.
export function coeurDepuisDeezer(p: CoeurBrut | null | undefined): CoeurDeezer | null {
  if (!p || typeof p.id !== 'number') return null
  return { id: p.id, titre: p.title ?? '', artiste: p.artist?.name ?? '' }
}

// Titres de la playlist comptés comme aimés : « id » = leur identifiant est dans les cœurs ; « version » = un cœur porte
// sur un titre de même artiste et de même titre normalisés (autre version). Un titre compte une seule fois, quel que
// soit le nombre de cœurs qui lui correspondent.
export type Aimes = ReadonlyMap<number, 'id' | 'version'>

export function titresAimes(titres: readonly TitreDeezer[], coeurs: readonly CoeurDeezer[]): Aimes {
  const ids = new Set(coeurs.map((c) => c.id))
  const cles = new Set<string>()
  for (const c of coeurs) {
    const titre = normaliserNom(c.titre)
    if (titre !== '') cles.add(`${normaliserNom(c.artiste)}|${titre}`)
  }
  const sortie = new Map<number, 'id' | 'version'>()
  for (const t of titres) {
    if (ids.has(t.id)) sortie.set(t.id, 'id')
    else {
      const titre = normaliserNom(t.titre)
      if (titre !== '' && cles.has(`${normaliserNom(t.artiste)}|${titre}`)) sortie.set(t.id, 'version')
    }
  }
  return sortie
}

// Regroupe par album.id (jamais par titre), du plus ancien ajout au plus récent.
export function regrouperParAlbum(titres: readonly TitreDeezer[], aimes: Aimes): AlbumEcoute[] {
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
      autreVersion: g.filter((t) => aimes.get(t.id) === 'version').length,
      moisEcoute: moisEcoute(temps),
      premierAjout: temps.length ? Math.min(...temps) : 0,
      dernierAjout: temps.length ? Math.max(...temps) : 0,
    })
  }
  return sortie.sort((a, b) => a.premierAjout - b.premierAjout || a.albumId - b.albumId)
}

// Titre du titre : « dont n sur une autre version » quand des cœurs viennent d'une autre version.
export function libelleAutreVersion(n: number): string {
  return n > 0 ? `dont ${n} sur une autre version` : ''
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

export interface Partage {
  atraiter: AlbumEcoute[]
  masques: AlbumEcoute[]
}

// Sépare les albums à traiter des albums déjà en base (même deezer_album_id ou même nom) ; les albums
// enregistrés pendant la session disparaissent tout de suite, qu'ils soient masqués ou affichés.
export function partagerAlbums(albums: readonly AlbumEcoute[], index: BaseIndex, enregistres: ReadonlySet<number>): Partage {
  const atraiter: AlbumEcoute[] = []
  const masques: AlbumEcoute[] = []
  for (const a of albums) {
    if (enregistres.has(a.albumId)) continue
    if (dejaEnBase(a, index)) masques.push(a)
    else atraiter.push(a)
  }
  return { atraiter, masques }
}

// Liste affichée : les albums à traiter, plus les masqués (grisés) si l'utilisateur les réaffiche, dans l'ordre d'origine.
export function albumsAffiches(albums: readonly AlbumEcoute[], partage: Partage, montrerMasques: boolean): AlbumEcoute[] {
  if (!montrerMasques) return partage.atraiter
  const gardes = new Set([...partage.atraiter, ...partage.masques].map((a) => a.albumId))
  return albums.filter((a) => gardes.has(a.albumId))
}

export function libelleMasques(n: number): string {
  return `${n} album${n > 1 ? 's' : ''} déjà en base masqué${n > 1 ? 's' : ''}`
}

// Année proposée : l'année en cours (heure de Paris) au moment de l'enregistrement, modifiable. Jamais la date de sortie.
export function anneeEnCours(maintenant: Date = new Date()): number {
  return Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric' }).format(maintenant))
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

// ---- BO2f : cœurs relus avant enregistrement ----

// Ce que rend une lecture complète de Deezer (playlist + cœurs).
export interface LectureDeezer {
  lus: number // titres lus dans la playlist
  titres: TitreDeezer[] // titres avec album
  coeurs: readonly CoeurDeezer[]
}

export type Lecteur = () => Promise<LectureDeezer>

export interface ChangementCoeurs {
  albumId: number
  artiste: string
  avant: number
  apres: number
}

// Albums dont le nombre de cœurs diffère entre l'état affiché et l'état relu.
export function changementsCoeurs(avant: readonly AlbumEcoute[], apres: readonly AlbumEcoute[]): ChangementCoeurs[] {
  const anciens = new Map(avant.map((a) => [a.albumId, a]))
  const sortie: ChangementCoeurs[] = []
  for (const n of apres) {
    const o = anciens.get(n.albumId)
    if (o && o.coeurs !== n.coeurs) sortie.push({ albumId: n.albumId, artiste: n.artiste, avant: o.coeurs, apres: n.coeurs })
  }
  return sortie
}

export function libelleChangement(c: ChangementCoeurs): string {
  return `${c.artiste} : ${c.avant} → ${c.apres} cœur${c.apres > 1 ? 's' : ''}`
}

// Cases cochées conservées : seulement les albums encore présents dans la lecture.
export function selectionConservee(selection: ReadonlySet<number>, albums: readonly AlbumEcoute[]): Set<number> {
  const presents = new Set(albums.map((a) => a.albumId))
  return new Set([...selection].filter((id) => presents.has(id)))
}

export const MESSAGE_LECTURE = 'Lecture de Deezer en cours…'
export const MESSAGE_DEEZER_INJOIGNABLE = 'Connexion à Deezer impossible, réessaie.'

// « Mis à jour à HH:MM », heure de Paris.
export function libelleMiseAJour(quand: Date): string {
  const h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(quand)
  return `Mis à jour à ${h}`
}

export type Preparation =
  | { ok: true; albums: AlbumEcoute[]; absents: AlbumEcoute[]; changements: ChangementCoeurs[] }
  | { ok: false; message: string }

// Relit Deezer, recalcule les albums cochés. Si Deezer ne répond pas : échec, rien à enregistrer.
// Les albums cochés absents de la playlist relue sont rendus à part (jamais enregistrés avec une valeur périmée).
export async function preparerEnregistrement(coches: readonly AlbumEcoute[], lecteur: Lecteur): Promise<Preparation> {
  let lecture: LectureDeezer
  try {
    lecture = await lecteur()
  } catch {
    return { ok: false, message: MESSAGE_DEEZER_INJOIGNABLE }
  }
  const frais = new Map(regrouperParAlbum(lecture.titres, titresAimes(lecture.titres, lecture.coeurs)).map((a) => [a.albumId, a]))
  const albums: AlbumEcoute[] = []
  const absents: AlbumEcoute[] = []
  for (const a of coches) {
    const n = frais.get(a.albumId)
    if (n) albums.push(n)
    else absents.push(a)
  }
  return { ok: true, albums, absents, changements: changementsCoeurs(coches.filter((a) => frais.has(a.albumId)), albums) }
}
