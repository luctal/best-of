export interface Album {
  id: number
  annee: number
  artiste: string
  album: string | null
  deezer_album_id: number | null
  coeurs: number | null
  morceaux: number | null
  score: number | null
  note: number | null
  date_ecoute: string | null // AAAA-MM-01
  rang_historique: number | null
  format_source: string
  donnees_brutes: Record<string, unknown> | null
  a_verifier: boolean
}

export type AlbumLeger = Pick<Album, 'id' | 'annee' | 'artiste' | 'album' | 'deezer_album_id' | 'format_source'>
