import { describe, expect, it } from 'vitest'
import { anneesDisponibles, basculerTri, colonnesPourAnnee, ligneRouge, texteCellule, trier, triParDefaut } from './anneeLogic'
import type { Album } from './types'

let n = 0
const alb = (p: Partial<Album>): Album => ({ id: ++n, annee: 2026, artiste: 'A', album: 'B', deezer_album_id: null, coeurs: 1, morceaux: 1, score: 1, note: 5, date_ecoute: '2026-08-01', rang_historique: null, format_source: '2023-2026', donnees_brutes: {}, a_verifier: false, ...p })
const cles = (a: number) => colonnesPourAnnee(a).map((c) => c.cle)

describe('colonnes par format', () => {
  it('2006-2007 : rang, artiste', () => {
    expect(cles(2006)).toEqual(['rang', 'artiste'])
    expect(cles(2007)).toEqual(['rang', 'artiste'])
  })
  it('2008-2009 : plus les deux nombres', () => {
    expect(cles(2008)).toEqual(['rang', 'artiste', 'adores', 'pas_mal'])
    expect(cles(2009)).toEqual(['rang', 'artiste', 'adores', 'pas_mal'])
  })
  it('2010-2020 : artiste, album, note, mois', () => {
    expect(cles(2010)).toEqual(['artiste', 'album', 'note', 'mois'])
    expect(cles(2020)).toEqual(['artiste', 'album', 'note', 'mois'])
  })
  it('2021 : artiste, album, cœurs, mois', () => {
    expect(cles(2021)).toEqual(['artiste', 'album', 'coeurs', 'mois'])
  })
  it('2022 et après : cœurs, morceaux, note', () => {
    expect(cles(2022)).toEqual(['artiste', 'album', 'coeurs', 'morceaux', 'note', 'mois'])
    expect(cles(2026)).toEqual(cles(2022))
  })
})

describe('tri', () => {
  it('défaut : note décroissante, rang croissant pour 2006-2009', () => {
    expect(triParDefaut(2026)).toEqual({ cle: 'note', sens: 'desc' })
    expect(triParDefaut(2008)).toEqual({ cle: 'rang', sens: 'asc' })
  })
  it('note décroissante, absentes en dernier', () => {
    const l = [alb({ note: 5 }), alb({ note: null }), alb({ note: 19.9 })]
    expect(trier(l, { cle: 'note', sens: 'desc' }).map((a) => a.note)).toEqual([19.9, 5, null])
    expect(trier(l, { cle: 'note', sens: 'asc' }).map((a) => a.note)).toEqual([5, 19.9, null])
  })
  it('rang croissant', () => {
    const l = [alb({ rang_historique: 3 }), alb({ rang_historique: 1 }), alb({ rang_historique: 2 })]
    expect(trier(l, { cle: 'rang', sens: 'asc' }).map((a) => a.rang_historique)).toEqual([1, 2, 3])
  })
  it('texte : ordre français insensible à la casse et aux accents', () => {
    const l = [alb({ artiste: 'zèbre' }), alb({ artiste: 'Étienne' }), alb({ artiste: 'abel' })]
    expect(trier(l, { cle: 'artiste', sens: 'asc' }).map((a) => a.artiste)).toEqual(['abel', 'Étienne', 'zèbre'])
  })
  it('clic : même colonne inverse, nouvelle colonne nombre décroissante, texte croissant', () => {
    expect(basculerTri({ cle: 'note', sens: 'desc' }, 'note')).toEqual({ cle: 'note', sens: 'asc' })
    expect(basculerTri({ cle: 'note', sens: 'desc' }, 'coeurs')).toEqual({ cle: 'coeurs', sens: 'desc' })
    expect(basculerTri({ cle: 'note', sens: 'desc' }, 'artiste')).toEqual({ cle: 'artiste', sens: 'asc' })
  })
})

describe('cellules', () => {
  it('note à 2 décimales virgule, mois en français, nombres bruts 2008-2009', () => {
    const a = alb({ note: 15.653, donnees_brutes: { titres_adores: 4, titres_pas_mal: 6 } })
    expect(texteCellule(a, 'note')).toBe('15,65')
    expect(texteCellule(a, 'mois')).toBe('août 2026')
    expect(texteCellule(a, 'adores')).toBe('4')
    expect(texteCellule(a, 'pas_mal')).toBe('6')
    expect(texteCellule(alb({ note: null, album: null }), 'album')).toBe('')
  })
})

describe('ligne rouge', () => {
  it('note > 10', () => {
    expect(ligneRouge({ note: 15.65 })).toBe(true)
    expect(ligneRouge({ note: 6.72 })).toBe(false)
    expect(ligneRouge({ note: null })).toBe(false)
  })
})

describe('années', () => {
  it('toutes, la plus récente d\'abord, sans doublon', () => {
    expect(anneesDisponibles([2006, 2026, 2006, 2010])).toEqual([2026, 2010, 2006])
  })
})
