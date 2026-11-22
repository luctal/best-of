import { useCallback, useEffect, useState } from 'react'
import { apiReelle, oublierCode } from './adminApi'
import { anneesDisponibles } from './anneeLogic'
import { Annee } from './annee'
import { chargerLegers, chargerMeilleurs, chargerTous } from './donnees'
import { Ecoute } from './ecoute'
import { traduireErreur } from './erreursLogic'
import { classeur, rougeDepuisPage, telecharger } from './exporter'
import { Porte } from './porte'
import type { AlbumLeger } from './types'

type Vue = 'annee' | 'ecoute' | 'porte'

const bouton = 'min-h-11 rounded-xl px-4 font-titre font-semibold disabled:opacity-50'

export function App() {
  const [legers, setLegers] = useState<AlbumLeger[] | null>(null)
  const [meilleurs, setMeilleurs] = useState<Record<number, number>>({})
  const [erreur, setErreur] = useState<string | null>(null)
  const [annee, setAnnee] = useState<number | null>(null)
  const [vue, setVue] = useState<Vue>('annee')
  const [code, setCode] = useState<string | null>(null)
  const [export_, setExport] = useState<'repos' | 'encours'>('repos')

  const recharger = useCallback(() => {
    Promise.all([chargerLegers(), chargerMeilleurs()]).then(
      ([l, m]) => {
        setErreur(null)
        setLegers(l)
        setMeilleurs(m)
        setAnnee((a) => a ?? anneesDisponibles(l.map((x) => x.annee))[0] ?? null)
      },
      (e) => setErreur(traduireErreur(e)),
    )
  }, [])

  useEffect(recharger, [recharger])

  async function exporter() {
    setExport('encours')
    try {
      telecharger(await classeur(await chargerTous(), rougeDepuisPage()), 'best-of.xlsx')
    } catch (e) {
      setErreur(traduireErreur(e))
    } finally {
      setExport('repos')
    }
  }

  const annees = legers ? anneesDisponibles(legers.map((x) => x.annee)) : []
  const api = code === null ? null : apiReelle(code)

  return (
    <main className="mx-auto max-w-5xl p-3 sm:p-6">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-titre text-2xl font-extrabold sm:text-3xl">Best of</h1>
        {code !== null && (
          <>
            <button type="button" className={`${bouton} ${vue === 'annee' ? 'bg-vert-sombre text-fond' : 'bg-mist'}`} onClick={() => setVue('annee')}>Année</button>
            <button type="button" className={`${bouton} ${vue === 'ecoute' ? 'bg-vert-sombre text-fond' : 'bg-mist'}`} onClick={() => setVue('ecoute')}>Écoute</button>
          </>
        )}
        <button type="button" className={`${bouton} bg-mist`} onClick={exporter} disabled={export_ === 'encours' || legers === null}>{export_ === 'encours' ? 'Export…' : 'Exporter en Excel'}</button>
        {code === null ? (
          <button type="button" className={`${bouton} bg-mist`} onClick={() => setVue('porte')}>Admin</button>
        ) : (
          <button type="button" className={`${bouton} bg-mist`} onClick={() => { oublierCode(); setCode(null); setVue('annee') }}>Quitter l'admin</button>
        )}
      </header>
      {erreur && <p className="mb-3 rounded-lg bg-bordeaux/10 p-3 text-bordeaux" role="alert">{erreur}</p>}
      {vue === 'porte' && code === null && (
        <div className="max-w-sm">
          <Porte surCode={(c) => { setCode(c); setVue('annee') }} />
        </div>
      )}
      {!erreur && legers === null && vue !== 'porte' && <p>Chargement…</p>}
      {legers && annee !== null && vue === 'annee' && (
        <>
          <label className="mb-3 flex items-center gap-3 font-semibold" htmlFor="annee">
            Année
            <select id="annee" className="min-h-11 rounded-lg border border-sage bg-fond px-3 text-base" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <Annee annee={annee} meilleurs={meilleurs} api={api} surChange={recharger} />
        </>
      )}
      {legers && vue === 'ecoute' && api && <Ecoute legers={legers} meilleurs={meilleurs} api={api} surChange={recharger} />}
    </main>
  )
}
