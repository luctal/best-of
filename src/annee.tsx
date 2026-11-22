import { useCallback, useEffect, useMemo, useState } from 'react'
import { anneesARecalculer, saisieDepuis, valider, type Saisie } from './adminLogic'
import type { Api } from './adminApi'
import { basculerTri, colonnesPourAnnee, ligneRouge, texteCellule, trier, triParDefaut, type Tri } from './anneeLogic'
import { chargerAnnee } from './donnees'
import { traduireErreur } from './erreursLogic'
import type { Album } from './types'

interface Props {
  annee: number
  meilleurs: Record<number, number>
  api: Api | null // présent seulement en mode admin
  surChange: () => void // recharge la liste légère et les meilleurs scores
}

const champ = 'min-h-11 w-full rounded-lg border border-sage bg-fond px-3 text-base'
const bouton = 'min-h-11 rounded-xl px-5 font-titre font-semibold disabled:opacity-50'

export function Annee({ annee, meilleurs, api, surChange }: Props) {
  const [albums, setAlbums] = useState<Album[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [tri, setTri] = useState<Tri>(() => triParDefaut(annee))
  const [edition, setEdition] = useState<Album | null>(null)

  const charger = useCallback(() => {
    chargerAnnee(annee).then(
      (l) => {
        setErreur(null)
        setAlbums(l)
      },
      (e) => setErreur(traduireErreur(e)),
    )
  }, [annee])

  useEffect(() => {
    setAlbums(null)
    setTri(triParDefaut(annee))
    charger()
  }, [annee, charger])

  const colonnes = useMemo(() => colonnesPourAnnee(annee), [annee])
  const lignes = useMemo(() => (albums ? trier(albums, tri) : []), [albums, tri])

  if (erreur) return <p className="rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert">{erreur}</p>
  if (albums === null) return <p>Chargement…</p>

  return (
    <section>
      <p className="mb-2 text-sm" data-testid="nombre-albums">{albums.length} albums</p>
      <table className="w-full table-fixed border-collapse text-sm sm:text-base" data-testid="tableau-annee">
        <thead>
          <tr className="text-left">
            {colonnes.map((c) => (
              <th key={c.cle} className={`border-b border-sage p-0 ${c.cle === 'rang' ? 'w-12' : ''} ${c.nombre && c.cle !== 'rang' ? 'w-[4.25rem] sm:w-24' : ''} ${c.cle === 'mois' ? 'w-[4.75rem] sm:w-28' : ''}`} aria-sort={tri.cle === c.cle ? (tri.sens === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" className="min-h-11 w-full px-1 text-left font-titre font-semibold sm:px-2" onClick={() => setTri((t) => basculerTri(t, c.cle))}>
                  {c.titre}{tri.cle === c.cle ? (tri.sens === 'asc' ? ' ▲' : ' ▼') : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((a) => {
            const rouge = ligneRouge(a)
            return (
              <tr
                key={a.id}
                data-rouge={rouge ? 'oui' : 'non'}
                className={`border-b border-mist ${rouge ? 'bg-rose/40 font-semibold text-bordeaux' : ''} ${api ? 'cursor-pointer hover:bg-fond-2' : ''}`}
                {...(api ? { role: 'button', tabIndex: 0, onClick: () => setEdition(a), onKeyDown: (e: React.KeyboardEvent) => e.key === 'Enter' && setEdition(a) } : {})}
              >
                {colonnes.map((c, i) => (
                  <td key={c.cle} className={`break-words px-1 py-2 align-top sm:px-2 ${c.nombre ? 'tabular-nums' : ''}`}>
                    {texteCellule(a, c.cle)}
                    {i === 0 && a.a_verifier && <span className="ml-1 text-xs font-normal text-ambre" data-testid="a-verifier">à vérifier</span>}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {api && edition && (
        <Edition
          ligne={edition}
          meilleurs={meilleurs}
          api={api}
          surFin={(change) => {
            setEdition(null)
            if (change) {
              charger()
              surChange()
            }
          }}
        />
      )}
    </section>
  )
}

interface PropsEdition {
  ligne: Album
  meilleurs: Record<number, number>
  api: Api
  surFin: (change: boolean) => void
}

function Edition({ ligne, meilleurs, api, surFin }: PropsEdition) {
  const [s, setS] = useState<Saisie>(() => saisieDepuis(ligne))
  const [message, setMessage] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [confirmer, setConfirmer] = useState(false)

  const maj = (k: keyof Saisie) => (e: React.ChangeEvent<HTMLInputElement>) => setS({ ...s, [k]: e.target.value })

  async function recalculer(annees: number[]) {
    for (const a of annees) await api.recalculerAnnee(a)
  }

  async function enregistrer() {
    const v = valider(ligne, s, meilleurs[Number(s.annee)] ?? null)
    if (!v.ok) return setMessage(v.message)
    setOccupe(true)
    setMessage(null)
    try {
      await api.modifierAlbum(ligne.id, v.valeur)
      await recalculer(anneesARecalculer(ligne, v.valeur.annee))
      surFin(true)
    } catch (e) {
      setMessage(traduireErreur(e))
      setOccupe(false)
    }
  }

  async function supprimer() {
    setOccupe(true)
    setMessage(null)
    try {
      await api.supprimerAlbum(ligne.id)
      await recalculer(anneesARecalculer(ligne, null))
      surFin(true)
    } catch (e) {
      setMessage(traduireErreur(e))
      setOccupe(false)
    }
  }

  const etiquette = 'block text-sm font-semibold'
  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-vert-sombre/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Modifier la ligne">
      <div className="max-h-full w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-fond p-4 sm:rounded-2xl">
        <h2 className="font-titre text-xl font-extrabold">Modifier la ligne</h2>
        {message && <p className="rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert">{message}</p>}
        <label className={etiquette}>Titre<input className={champ} value={s.titre} onChange={maj('titre')} /></label>
        <label className={etiquette}>Artiste<input className={champ} value={s.artiste} onChange={maj('artiste')} /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className={etiquette}>Année<input className={champ} inputMode="numeric" value={s.annee} onChange={maj('annee')} /></label>
          <label className={etiquette}>Mois<input className={champ} type="month" value={s.mois} onChange={maj('mois')} /></label>
          <label className={etiquette}>Cœurs<input className={champ} inputMode="numeric" value={s.coeurs} onChange={maj('coeurs')} /></label>
          <label className={etiquette}>Morceaux<input className={champ} inputMode="numeric" value={s.morceaux} onChange={maj('morceaux')} /></label>
        </div>
        {confirmer ? (
          <div className="space-y-2 rounded-lg bg-bordeaux/10 p-3">
            <p className="font-semibold">Supprimer cette ligne ?</p>
            <div className="flex gap-3">
              <button type="button" className={`${bouton} bg-bordeaux text-fond`} onClick={supprimer} disabled={occupe}>Confirmer la suppression</button>
              <button type="button" className={`${bouton} bg-mist`} onClick={() => setConfirmer(false)} disabled={occupe}>Annuler</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button type="button" className={`${bouton} bg-vert-sombre text-fond`} onClick={enregistrer} disabled={occupe}>Enregistrer</button>
            <button type="button" className={`${bouton} bg-mist`} onClick={() => surFin(false)} disabled={occupe}>Annuler</button>
            <button type="button" className={`${bouton} ml-auto bg-rose text-bordeaux`} onClick={() => setConfirmer(true)} disabled={occupe}>Supprimer</button>
          </div>
        )}
      </div>
    </div>
  )
}
