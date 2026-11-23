import { useEffect, useMemo, useState } from 'react'
import type { Api } from './adminApi'
import { formaterMois, formaterNombre } from './calculLogic'
import { lireEcoute, lireFichesAlbums, type FicheAlbum } from './deezer'
import { albumsAffiches, anneeEnCours, apercu, dejaEnBase, indexerBase, libelleChangement, libelleMasques, libelleMiseAJour, ligneAEnregistrer, MESSAGE_LECTURE, messageMeilleur, partagerAlbums, preparerEnregistrement, regrouperParAlbum, selectionConservee, type AlbumEcoute } from './ecouteLogic'
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

// Lecture complète de Deezer ; les fiches déjà connues sont gardées, seules les nouvelles sont lues.
async function lireTout(surEtape: (t: string) => void, connues: Map<number, FicheAlbum>): Promise<Lecture> {
  const pl = await lireEcoute(surEtape)
  const albums = regrouperParAlbum(pl.titres, pl.coeurs)
  const manquantes = albums.map((a) => a.albumId).filter((id) => !connues.has(id))
  surEtape(`Fiches des ${manquantes.length} albums…`)
  const neuves = await lireFichesAlbums(manquantes, (f, t) => surEtape(`Fiches des albums : ${f} sur ${t}…`))
  const fiches = new Map(connues)
  for (const [id, f] of neuves) fiches.set(id, f)
  return { titresLus: pl.lus, titresAvecAlbum: pl.titres.length, coeursLus: pl.coeursLus, albums, fiches }
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
  const [enregistres, setEnregistres] = useState<Set<number>>(new Set())
  const [montrerMasques, setMontrerMasques] = useState(false)
  const [actualisation, setActualisation] = useState(false)
  const [majA, setMajA] = useState<string | null>(null)
  const [erreurActu, setErreurActu] = useState<string | null>(null)
  const [erreurEnr, setErreurEnr] = useState<string | null>(null)
  const [changements, setChangements] = useState<string[]>([])

  useEffect(() => {
    let actif = true
    setErreur(null)
    setLecture(null)
    ;(async () => {
      try {
        const l = await lireTout((t) => actif && setEtape(t), new Map())
        if (!actif) return
        setLecture(l)
        setMajA(libelleMiseAJour(new Date()))
      } catch (e) {
        if (actif) setErreur(traduireErreur(e))
      }
    })()
    return () => {
      actif = false
    }
  }, [essai])

  const index = useMemo(() => indexerBase(legers), [legers])

  const edition = (a: AlbumEcoute): Edition => editions[a.albumId] ?? { titre: a.titre, annee: String(anneeEnCours()) }
  const anneeNum = (e: Edition): number | null => (/^\d{4}$/.test(e.annee.trim()) ? Number(e.annee) : null)
  const nbTracks = (a: AlbumEcoute) => lecture?.fiches.get(a.albumId)?.nbTracks ?? null

  const partage = useMemo(() => (lecture ? partagerAlbums(lecture.albums, index, enregistres) : { atraiter: [], masques: [] }), [lecture, index, enregistres])
  const affiches = useMemo(() => (lecture ? albumsAffiches(lecture.albums, partage, montrerMasques) : []), [lecture, partage, montrerMasques])

  const aEnregistrer = useMemo(() => {
    if (!lecture) return []
    return affiches.filter((a) => selection.has(a.albumId))
  }, [lecture, selection, affiches])

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

  async function actualiser() {
    if (!lecture || actualisation || occupe) return
    setActualisation(true)
    setErreurActu(null)
    try {
      const l = await lireTout(() => undefined, lecture.fiches)
      setLecture(l)
      setSelection((s) => selectionConservee(s, l.albums))
      setMajA(libelleMiseAJour(new Date()))
    } catch (e) {
      setErreurActu(traduireErreur(e))
    }
    setActualisation(false)
  }

  async function enregistrer() {
    if (!lecture) return
    setOccupe(true)
    setMessages([])
    setBilan(null)
    setChangements([])
    setErreurEnr(null)
    // Les cœurs sont relus sur Deezer juste avant d'écrire : jamais de valeur périmée.
    const prep = await preparerEnregistrement(aEnregistrer, () => lireEcoute())
    if (!prep.ok) {
      setEchecs([])
      setErreurEnr(prep.message)
      setOccupe(false)
      return
    }
    setChangements(prep.changements.map(libelleChangement))
    const nouveauxEchecs: Echec[] = prep.absents.map((a) => ({ albumId: a.albumId, nom: `${a.artiste} - ${a.titre}`, message: 'Album absent de la playlist relue.' }))
    const reussis: number[] = []
    const annees = new Set<number>()
    for (const a of prep.albums) {
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
    setEnregistres((s) => new Set([...s, ...reussis]))
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
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" data-testid="actualiser" className="min-h-11 rounded-xl bg-vert-sombre px-5 font-titre font-semibold text-fond disabled:opacity-50" disabled={actualisation || occupe} onClick={actualiser}>Actualiser</button>
        <span className="text-sm font-semibold" role="status" data-testid="maj">{actualisation ? MESSAGE_LECTURE : (majA ?? '')}</span>
      </div>
      {erreurActu && <p className="mb-3 rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert" data-testid="erreur-lecture">{erreurActu}</p>}
      <p className="mb-3 text-sm" data-testid="lecture">
        <span data-testid="nb-titres">{lecture.titresLus}</span> titres lus dans la playlist, <span data-testid="nb-coeurs">{lecture.coeursLus}</span> cœurs lus, {lecture.albums.length} albums.
      </p>
      <p className="mb-1 text-lg font-titre font-semibold" data-testid="a-traiter">{partage.atraiter.length} album{partage.atraiter.length > 1 ? 's' : ''} à traiter</p>
      <p className="mb-3 flex flex-wrap items-center gap-3 text-sm">
        <span data-testid="nb-masques">{libelleMasques(partage.masques.length)}</span>
        {partage.masques.length > 0 && (
          <button type="button" className="min-h-11 rounded-xl border border-sage px-4 font-semibold" aria-pressed={montrerMasques} onClick={() => setMontrerMasques((v) => !v)}>{montrerMasques ? 'Masquer' : 'Afficher'}</button>
        )}
      </p>
      {lecture.titresAvecAlbum < lecture.titresLus && <p className="mb-3 text-sm text-ambre">{lecture.titresLus - lecture.titresAvecAlbum} titres sans album ignorés.</p>}
      <ul className="space-y-3">
        {affiches.map((a) => {
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
          {erreurEnr && <p className="font-semibold text-bordeaux" role="alert" data-testid="erreur-enregistrement">{erreurEnr}</p>}
          {bilan && <p className="font-semibold" role="status" data-testid="bilan">{bilan}</p>}
          {changements.map((c) => <p key={c} className="text-sm font-semibold" role="status" data-testid="changement">{c}</p>)}
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
