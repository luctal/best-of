import { describe, expect, it } from 'vitest'
import { moisEnDate, ongletsExport } from './exportLogic'
import type { Album } from './types'

let n = 0
const alb = (p: Partial<Album>): Album => ({ id: ++n, annee: 2026, artiste: 'A', album: 'B', deezer_album_id: null, coeurs: 1, morceaux: 1, score: 1, note: 5, date_ecoute: '2026-08-01', rang_historique: null, format_source: '2023-2026', donnees_brutes: {}, a_verifier: false, ...p })

describe('ongletsExport', () => {
  const onglets = ongletsExport([
    alb({ artiste: 'Weezer', note: 15.65 }),
    alb({ artiste: 'Coral', note: 19.94 }),
    alb({ artiste: 'Phoebe', note: 6.72 }),
    alb({ annee: 2006, artiste: 'Beirut', album: null, note: null, coeurs: null, morceaux: null, date_ecoute: null, rang_historique: 1, format_source: '2006' }),
  ])
  it('un onglet par année, ordre croissant', () => {
    expect(onglets.map((o) => o.nom)).toEqual(['2006', '2026'])
  })
  it('lignes triées comme à l\'écran, rouge si note > 10', () => {
    const o = onglets[1]
    expect(o.lignes.map((l) => l.valeurs[0])).toEqual(['Coral', 'Weezer', 'Phoebe'])
    expect(o.lignes.map((l) => l.rouge)).toEqual([true, true, false])
  })
  it('nombres en vraies valeurs, mois en vraie date', () => {
    const l = onglets[1].lignes[0]
    const note = l.valeurs[onglets[1].colonnes.findIndex((c) => c.cle === 'note')]
    const mois = l.valeurs[onglets[1].colonnes.findIndex((c) => c.cle === 'mois')]
    expect(typeof note).toBe('number')
    expect(mois).toBeInstanceOf(Date)
  })
  it('colonnes de 2006 : rang, artiste', () => {
    expect(onglets[0].colonnes.map((c) => c.cle)).toEqual(['rang', 'artiste'])
    expect(onglets[0].lignes[0].valeurs).toEqual([1, 'Beirut'])
  })
  it('moisEnDate', () => {
    expect(moisEnDate('2026-08-01')?.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(moisEnDate(null)).toBeNull()
  })
})
