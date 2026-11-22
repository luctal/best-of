// Lectures publiques de la base (clé publique, lignes supprimées masquées par la base). Impur : réseau.
import { supabase } from './supabase'
import type { Album, AlbumLeger } from './types'

const TAILLE_PAGE = 1000

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function versAlbum(r: Record<string, unknown>): Album {
  return {
    id: Number(r.id),
    annee: Number(r.annee),
    artiste: String(r.artiste ?? ''),
    album: (r.album as string | null) ?? null,
    deezer_album_id: num(r.deezer_album_id),
    coeurs: num(r.coeurs),
    morceaux: num(r.morceaux),
    score: num(r.score),
    note: num(r.note),
    date_ecoute: (r.date_ecoute as string | null) ?? null,
    rang_historique: num(r.rang_historique),
    format_source: String(r.format_source ?? ''),
    donnees_brutes: (r.donnees_brutes as Record<string, unknown> | null) ?? null,
    a_verifier: Boolean(r.a_verifier),
  }
}

async function lirePages(colonnes: string, filtre?: (q: ReturnType<typeof base>) => ReturnType<typeof base>): Promise<Record<string, unknown>[]> {
  const sortie: Record<string, unknown>[] = []
  for (let debut = 0; ; debut += TAILLE_PAGE) {
    let q = base(colonnes)
    if (filtre) q = filtre(q)
    const { data, error } = await q.order('id').range(debut, debut + TAILLE_PAGE - 1)
    if (error) throw new Error(error.message)
    sortie.push(...(data as unknown as Record<string, unknown>[]))
    if (data.length < TAILLE_PAGE) return sortie
  }
}
const base = (colonnes: string) => supabase.from('albums').select(colonnes)

export async function chargerLegers(): Promise<AlbumLeger[]> {
  const l = await lirePages('id,annee,artiste,album,deezer_album_id,format_source')
  return l.map((r) => ({ id: Number(r.id), annee: Number(r.annee), artiste: String(r.artiste ?? ''), album: (r.album as string | null) ?? null, deezer_album_id: num(r.deezer_album_id), format_source: String(r.format_source ?? '') }))
}

export async function chargerAnnee(annee: number): Promise<Album[]> {
  return (await lirePages('*', (q) => q.eq('annee', annee))).map(versAlbum)
}

export async function chargerTous(): Promise<Album[]> {
  return (await lirePages('*')).map(versAlbum)
}

export async function chargerMeilleurs(): Promise<Record<number, number>> {
  const { data, error } = await supabase.from('annees').select('annee,meilleur_score')
  if (error) throw new Error(error.message)
  const m: Record<number, number> = {}
  for (const r of data) {
    const v = num(r.meilleur_score)
    if (v !== null) m[Number(r.annee)] = v
  }
  return m
}
