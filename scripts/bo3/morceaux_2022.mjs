// BO3 B : nombre de morceaux des albums 2022 sans morceaux, à partir de Deezer. Lecture seule (base : clé publique ; Deezer : sans clé).
// Aucune écriture en base. Relançable. Sortie : scripts/bo3/morceaux_2022.csv (séparateur ;, UTF-8).
// Usage : node scripts/bo3/morceaux_2022.mjs [fichier.csv]   (défaut : morceaux_2022.csv à côté du script ; Node 22 : import direct du .ts)
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { choisirCandidat, ENTETE_CSV, ligneCsv, remarqueCoherence } from '../../src/morceauxLogic.ts'

const BASE = 'https://vjvqyiaoipwxxnnrzmxt.supabase.co/rest/v1/albums'
const CLE_PUBLIQUE = 'sb_publishable_xJjf7GbfAQpFQKXYf4szQA_xVyoJ8G4'
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms))

async function deezer(chemin) {
  for (let essai = 0; essai < 6; essai++) {
    await pause(120)
    const r = await (await fetch(`https://api.deezer.com${chemin}`)).json()
    if (r.error?.code === 4) { await pause(2000); continue }
    return r
  }
  throw new Error('quota Deezer')
}

const lignes = await (await fetch(`${BASE}?annee=eq.2022&morceaux=is.null&select=id,artiste,album,coeurs&order=id&limit=1000`, { headers: { apikey: CLE_PUBLIQUE, Authorization: `Bearer ${CLE_PUBLIQUE}` } })).json()
if (!Array.isArray(lignes)) throw new Error('lecture de la base : ' + JSON.stringify(lignes))
console.error(`${lignes.length} albums à traiter`)

const fiches = new Map()
async function fiche(id) {
  if (!fiches.has(id)) fiches.set(id, await deezer(`/album/${id}`))
  return fiches.get(id)
}

async function candidatsPour(requete) {
  const r = await deezer(`/search/album?q=${encodeURIComponent(requete)}&limit=50`)
  return (r.data ?? []).map((a) => ({ id: a.id, titre: a.title ?? '', artiste: a.artist?.name ?? '', nbTracks: typeof a.nb_tracks === 'number' ? a.nb_tracks : null, recordType: a.record_type ?? '', releaseDate: '' }))
}

const sortie = [ligneCsv(ENTETE_CSV)]
for (const l of lignes) {
  let cands = await candidatsPour(`${l.artiste} ${l.album}`)
  let choix = choisirCandidat(l.artiste, l.album ?? '', cands)
  if (choix.confiance === 'introuvable') {
    cands = [...cands, ...(await candidatsPour(l.album ?? ''))]
    choix = choisirCandidat(l.artiste, l.album ?? '', cands)
  }
  // dates de sortie et nb_tracks exacts : fiche de chaque candidat retenu (exact ou proche), puis nouveau choix
  if (choix.confiance !== 'introuvable') {
    const retenus = []
    for (const c of cands) if (choisirCandidat(l.artiste, l.album ?? '', [c]).confiance !== 'introuvable') {
      const f = await fiche(c.id)
      retenus.push({ ...c, nbTracks: typeof f.nb_tracks === 'number' ? f.nb_tracks : c.nbTracks, recordType: f.record_type ?? c.recordType, releaseDate: f.release_date ?? '' })
    }
    choix = choisirCandidat(l.artiste, l.album ?? '', retenus)
  }
  const c = choix.candidat
  const rem = []
  if (c) { const r = remarqueCoherence(l.coeurs, c.nbTracks); if (r) rem.push(r) }
  else rem.push('aucun album Deezer de même artiste et de même titre ou voisin')
  sortie.push(ligneCsv([l.id, l.artiste, l.album, l.coeurs, c?.id, c?.titre, c?.artiste, c?.nbTracks, c?.recordType, choix.confiance, rem.join(' ; ')]))
  console.error(`${l.id} ${choix.confiance}`)
}
writeFileSync(process.argv[2] ? resolve(process.argv[2]) : new URL('./morceaux_2022.csv', import.meta.url), sortie.join('\n') + '\n', 'utf8')
console.error(`écrit : ${sortie.length - 1} lignes`)
