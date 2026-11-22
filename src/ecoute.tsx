import { useEffect, useMemo, useState } from 'react'
import type { Api } from './adminApi'
import { formaterMois, formaterNombre } from './calculLogic'
import { lireCoeurs, lireFichesAlbums, lirePlaylistTitres, PLAYLIST_ECOUTE, PROFIL_COEURS, type FicheAlbum } from './deezer'
import { apercu, dejaEnBase, indexerBase, ligneAEnregistrer, messageMeilleur, regrouperParAlbum, type AlbumEcoute } from './ecouteLogic'
import { traduireErreur } from './erreursLogic'
import type { AlbumLeger } from './types'

interface Props {
  legers: AlbumLeger[]
  meilleurs: Record<number, number>
  api: Api
  surChange: () => void
}

interface Lecture {
  titresLus: number
  titresAvecAlbum: number
  coeursLus: number
  albums: AlbumEcoute[]
  fiches: Map<number, FicheAlbum>
}

interface Edition {
  titre: string
  annee: string
}

interface Echec {
  albumId: number
  nom: string
  message: string
}

const champ = 'min-h-11 w-full rounded-lg border border-sage bg-fond px-3 text-base'

export function Ecoute({ legers, meilleurs, api, surChange }: Props) {
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [etape, setEtape] = useState('Lecture de la playlist…')
  const [erreur, setErreur] = useState<string | null>(null)
  const [selection, setSelection] = useState<Set<number>>(new Set())
  const [editions, setEditions] = useState<Record<number, Edition>>({})
  const [occupe, setOccupe] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [echecs, setEchecs] = useState<Echec[]>([])
  const [bilan, setBilan] = useState<string | null>(null)
  const [essai, setEssai] = useState(0)

  useEffect(() => {
    let actif = true
    setErreur(null)
    setLecture(null)
    ;(async () => {
      try {
        setEtape('Lecture de la playlist…')
        const pl = await lirePlaylistTitres(PLAYLIST_ECOUTE, (n) => actif && setEtape(`Lecture de la playlist : ${n} titres…`))
        setEtape('Lecture des cœurs…')
        const coeurs = await lireCoeurs(PROFIL_COEURS, (n) => actif && setEtape(`Lecture des cœurs : ${n}…`))
        const albums = regrouperParAlbum(pl.titres, coeurs.ids)
        setEtape(`Années des ${albums.length} albums…`)
        const fiches = await lireFichesAlbums(albums.map((a) => a.albumId), (f, t) => actif && setEtape(`Années des albums : ${f} sur ${t}…`))
        if (!actif) return
        setLecture({ titresLus: pl.lus, titresAvecAlbum: pl.titres.length, coeursLus: coeurs.ids.size, albums, fiches })
      } catch (e) {
        if (actif) setErreur(traduireErreur(e))
      }
    })()
    return () => {
      actif = false
    }
  }, [essai])

  const index = useMemo(() => indexerBase(legers), [legers])

  const edition = (a: AlbumEcoute): Edition => editions[a.albumId] ?? { titre: a.titre, annee: lecture?.fiches.get(a.albumId)?.annee?.toString() ?? '' }
  const anneeNum = (e: Edition): number | null => (/^\d{4}$/.test(e.annee.trim()) ? Number(e.annee) : null)
  const nbTracks = (a: AlbumEcoute) => lecture?.fiches.get(a.albumId)?.nbTracks ?? null

  const aEnregistrer = useMemo(() => {
    if (!lecture) return []
    return lecture.albums.filter((a) => selection.has(a.albumId))
  }, [lecture, selection])

  if (erreur) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert">{erreur}</p>
        <button type="button" className="min-h-11 rounded-xl bg-vert-sombre px-5 font-titre font-semibold text-fond" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>
      </div>
    )
  }
  if (lecture === null) return <p data-testid="etape">{etape}</p>

  const bascule = (id: number) =>
    setSelection((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  async function enregistrer() {
    if (!lecture) return
    setOccupe(true)
    setMessages([])
    setBilan(null)
    const nouveauxEchecs: Echec[] = []
    const reussis: number[] = []
    const annees = new Set<number>()
    for (const a of aEnregistrer) {
      const ed = edition(a)
      const ligne = ligneAEnregistrer(a, { titre: ed.titre, annee: anneeNum(ed) }, meilleurs[anneeNum(ed) ?? 0] ?? null, nbTracks(a))
      if (!ligne) {
        nouveauxEchecs.push({ albumId: a.albumId, nom: `${a.artiste} - ${ed.titre}`, message: 'Titre ou année manquant.' })
        continue
      }
      try {
        await api.ajouterAlbum(ligne)
        reussis.push(a.albumId)
        annees.add(ligne.annee)
      } catch (e) {
        nouveauxEchecs.push({ albumId: a.albumId, nom: `${a.artiste} - ${ed.titre}`, message: traduireErreur(e) })
      }
    }
    const msgs: string[] = []
    for (const annee of annees) {
      try {
        const apres = await api.recalculerAnnee(annee)
        const m = messageMeilleur(annee, meilleurs[annee] ?? null, apres)
        if (m) msgs.push(m)
      } catch (e) {
        nouveauxEchecs.push({ albumId: 0, nom: `Recalcul ${annee}`, message: traduireErreur(e) })
      }
    }
    setMessages(msgs)
    setEchecs(nouveauxEchecs)
    setSelection((s) => {
      const n = new Set(s)
      for (const id of reussis) n.delete(id)
      return n
    })
    setBilan(`${reussis.length} enregistré${reussis.length > 1 ? 's' : ''}${nouveauxEchecs.length ? `, ${nouveauxEchecs.length} échec${nouveauxEchecs.length > 1 ? 's' : ''}` : ''}.`)
    setOccupe(false)
    if (reussis.length) surChange()
  }

  return (
    <section className="pb-28">
      <p className="mb-3 text-sm" data-testid="lecture">
        <span data-testid="nb-titres">{lecture.titresLus}</span> titres lus dans la playlist, <span data-testid="nb-coeurs">{lecture.coeursLus}</span> cœurs lus, {lecture.albums.length} albums.
      </p>
      {lecture.titresAvecAlbum < lecture.titresLus && <p className="mb-3 text-sm text-ambre">{lecture.titresLus - lecture.titresAvecAlbum} titres sans album ignorés.</p>}
      <ul className="space-y-3">
        {lecture.albums.map((a) => {
          const deja = dejaEnBase(a, index)
          const ed = edition(a)
          const an = anneeNum(ed)
          const ap = apercu(a, an === null ? null : (meilleurs[an] ?? null), nbTracks(a))
          return (
            <li key={a.albumId} data-album={a.albumId} data-deja={deja ?? 'non'} className={`rounded-xl border p-3 ${deja ? 'border-gris bg-gris/30 text-vert-sombre/60' : 'border-sage bg-fond'}`}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 h-6 w-6 shrink-0" checked={selection.has(a.albumId)} onChange={() => bascule(a.albumId)} aria-label={`Choisir ${a.artiste} - ${a.titre}`} />
                <span className="min-w-0 break-words">
                  <span className="font-titre font-semibold">{a.artiste}</span> — {a.titre}
                  {deja && <span className="ml-2 text-sm font-semibold" data-testid="deja">{deja === 'id' ? 'déjà en base' : 'déjà en base (même nom)'}</span>}
                </span>
              </label>
              <p className="mt-1 text-sm" data-testid="apercu">
                {ap.coeurs} cœurs · {ap.morceaux} morceaux · score {formaterNombre(ap.score, 2)} · note {formaterNombre(ap.note, 2)} · {formaterMois(ap.mois) || 'mois inconnu'}
                {ap.ecart && <span className="ml-2 text-ambre">écart : {nbTracks(a)} titres sur Deezer</span>}
              </p>
              {selection.has(a.albumId) && (
                <div className="mt-2 grid grid-cols-[1fr_6rem] gap-3">
                  <label className="text-sm font-semibold">Titre de l'album
                    <input className={champ} value={ed.titre} onChange={(e) => setEditions({ ...editions, [a.albumId]: { ...ed, titre: e.target.value } })} />
                  </label>
                  <label className="text-sm font-semibold">Année
                    <input className={champ} inputMode="numeric" value={ed.annee} onChange={(e) => setEditions({ ...editions, [a.albumId]: { ...ed, annee: e.target.value } })} />
                  </label>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <div className="fixed inset-x-0 bottom-0 border-t border-sage bg-fond p-3">
        <div className="mx-auto max-w-5xl space-y-2">
          {bilan && <p className="font-semibold" role="status" data-testid="bilan">{bilan}</p>}
          {messages.map((m) => <p key={m} className="font-semibold text-moss" role="status">{m}</p>)}
          {bilan && <p className="text-sm">Tu peux maintenant retirer ces albums de la playlist Deezer.</p>}
          {echecs.map((e, i) => <p key={`${e.albumId}-${i}`} className="text-sm text-bordeaux" role="alert">Échec : {e.nom} : {e.message}</p>)}
          <button type="button" className="min-h-11 w-full rounded-xl bg-vert-sombre px-5 font-titre font-semibold text-fond disabled:opacity-50 sm:w-auto" disabled={occupe || aEnregistrer.length === 0} onClick={enregistrer}>
            {echecs.length > 0 && !occupe ? `Réessayer (${aEnregistrer.length})` : `Enregistrer la sélection (${aEnregistrer.length})`}
          </button>
        </div>
      </div>
    </section>
  )
}
