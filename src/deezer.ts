// Appels Deezer en JSONP (api.deezer.com n'envoie pas d'en-têtes CORS). Impur : DOM et réseau. Lecture seule.
import { enParallele } from './parallele'
import { coeurDepuisDeezer, titreDepuisDeezer, type CoeurBrut, type CoeurDeezer, type LectureDeezer, type PisteBrute, type TitreDeezer } from './ecouteLogic'

export const PLAYLIST_ECOUTE = '10292262522'
export const PROFIL_COEURS = '2365945224'

let compteurCb = 0

function jsonp<T>(url: string, delaiMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const nom = `bestofCb${compteurCb++}`
    const w = window as unknown as Record<string, unknown>
    const script = document.createElement('script')
    const fin = () => {
      clearTimeout(minuteur)
      delete w[nom]
      script.remove()
    }
    const minuteur = setTimeout(() => {
      fin()
      reject(new Error('timeout'))
    }, delaiMs)
    w[nom] = (d: T) => {
      fin()
      resolve(d)
    }
    script.onerror = () => {
      fin()
      reject(new Error('script error'))
    }
    script.src = `${url}${url.includes('?') ? '&' : '?'}output=jsonp&callback=${nom}`
    document.head.appendChild(script)
  })
}

interface Reponse<T> {
  data?: T[]
  next?: string
  total?: number
  error?: { code?: number; message?: string }
}

const PAUSE_QUOTA_MS = 1500

// Un appel ; le quota de Deezer (code 4) est attendu puis réessayé. Une autre erreur Deezer est levée.
async function appeler<T>(url: string, delaiMs = 30000): Promise<T & { error?: { code?: number; message?: string } }> {
  for (let essai = 0; essai < 5; essai++) {
    const r = await jsonp<T & { error?: { code?: number; message?: string } }>(url, delaiMs)
    if (r.error?.code === 4) {
      await new Promise((ok) => setTimeout(ok, PAUSE_QUOTA_MS))
      continue
    }
    return r
  }
  throw new Error('timeout')
}

async function pages<T>(url0: string, surPage?: (n: number) => void): Promise<{ elements: T[]; total: number | null }> {
  const elements: T[] = []
  let total: number | null = null
  let url: string | undefined = url0
  for (let page = 0; url && page < 100; page++) {
    const r: Reponse<T> = await appeler<Reponse<T>>(url)
    if (r.error || !Array.isArray(r.data)) throw new Error(r.error?.message ?? 'Deezer a refusé la lecture.')
    elements.push(...r.data)
    if (typeof r.total === 'number') total = r.total
    surPage?.(elements.length)
    url = r.next
  }
  return { elements, total }
}

// Toute la playlist : nombre de titres lus et titres avec album.
export async function lirePlaylistTitres(id: string, surPage?: (n: number) => void): Promise<{ lus: number; titres: TitreDeezer[] }> {
  const { elements } = await pages<PisteBrute>(`https://api.deezer.com/playlist/${id}/tracks?limit=100`, surPage)
  const titres: TitreDeezer[] = []
  for (const brute of elements) {
    const t = titreDepuisDeezer(brute)
    if (t) titres.push(t)
  }
  return { lus: elements.length, titres }
}

// Tous les cœurs du profil public (identifiant, titre et artiste de chaque titre aimé).
export async function lireCoeurs(profil: string, surPage?: (n: number) => void): Promise<{ coeurs: CoeurDeezer[]; total: number | null }> {
  const { elements, total } = await pages<CoeurBrut>(`https://api.deezer.com/user/${profil}/tracks?limit=1000`, surPage)
  const vus = new Set<number>()
  const coeurs: CoeurDeezer[] = []
  for (const e of elements) {
    const c = coeurDepuisDeezer(e)
    if (c && !vus.has(c.id)) {
      vus.add(c.id)
      coeurs.push(c)
    }
  }
  return { coeurs, total }
}

// Lecture complète : playlist puis cœurs (jamais en cache : chaque appel relit Deezer).
export async function lireEcoute(surEtape?: (texte: string) => void): Promise<LectureDeezer & { coeursLus: number }> {
  surEtape?.('Lecture de la playlist…')
  const pl = await lirePlaylistTitres(PLAYLIST_ECOUTE, (n) => surEtape?.(`Lecture de la playlist : ${n} titres…`))
  surEtape?.('Lecture des cœurs…')
  const c = await lireCoeurs(PROFIL_COEURS, (n) => surEtape?.(`Lecture des cœurs : ${n}…`))
  return { lus: pl.lus, titres: pl.titres, coeurs: c.coeurs, coeursLus: c.coeurs.length }
}

// Seul nb_tracks est lu : il sert à signaler un écart avec la playlist (l'année ne vient jamais de Deezer).
export interface FicheAlbum {
  nbTracks: number | null
}

async function ficheAlbum(albumId: number): Promise<FicheAlbum> {
  try {
    const r = await appeler<{ nb_tracks?: number }>(`https://api.deezer.com/album/${albumId}`, 8000)
    if (r.error) return { nbTracks: null }
    return { nbTracks: typeof r.nb_tracks === 'number' ? r.nb_tracks : null }
  } catch {
    return { nbTracks: null }
  }
}

// Au plus 4 appels à la fois.
export async function lireFichesAlbums(ids: readonly number[], surAvance?: (fait: number, total: number) => void): Promise<Map<number, FicheAlbum>> {
  let fait = 0
  const fiches = await enParallele(ids, 4, async (id) => {
    const f = await ficheAlbum(id)
    surAvance?.(++fait, ids.length)
    return f
  })
  return new Map(ids.map((id, i) => [id, fiches[i]]))
}
