// Banc de l'écran Écoute SANS le code admin : lecture réelle (base, Deezer), enregistrement par bouchon (window.__appels).
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import '../../src/index.css'
import type { Api } from '../../src/adminApi'
import { chargerLegers, chargerMeilleurs } from '../../src/donnees'
import { Ecoute } from '../../src/ecoute'
import type { AlbumLeger } from '../../src/types'

declare global {
  interface Window {
    __appels: { nom: string; args: unknown }[]
  }
}
window.__appels = []

const bouchon: Api = {
  ajouterAlbum: async (a) => {
    window.__appels.push({ nom: 'ajouter_album', args: a })
    return 1
  },
  modifierAlbum: async (id, m) => {
    window.__appels.push({ nom: 'modifier_album', args: { id, ...m } })
  },
  supprimerAlbum: async (id) => {
    window.__appels.push({ nom: 'supprimer_album', args: { id } })
  },
  recalculerAnnee: async (annee) => {
    window.__appels.push({ nom: 'recalculer_annee', args: { annee } })
    return 99 // valeur factice : le bouchon ne touche pas la base
  },
}

function Banc() {
  const [legers, setLegers] = useState<AlbumLeger[] | null>(null)
  const [meilleurs, setMeilleurs] = useState<Record<number, number>>({})
  useEffect(() => {
    Promise.all([chargerLegers(), chargerMeilleurs()]).then(([l, m]) => {
      setLegers(l)
      setMeilleurs(m)
    })
  }, [])
  if (legers === null) return <p>Chargement…</p>
  return (
    <main className="mx-auto max-w-5xl p-3 sm:p-6">
      <h1 className="mb-4 font-titre text-2xl font-extrabold">Best of (banc Écoute)</h1>
      <Ecoute legers={legers} meilleurs={meilleurs} api={bouchon} surChange={() => undefined} />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Banc />)
