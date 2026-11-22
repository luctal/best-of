import { describe, expect, it } from 'vitest'
import { anneesARecalculer, recalculable, saisieDepuis, valider } from './adminLogic'
import type { Album } from './types'

const ligne = (p: Partial<Album> = {}): Album => ({ id: 1, annee: 2026, artiste: 'Weezer', album: 'Weezer', deezer_album_id: 5, coeurs: 8, morceaux: 10, score: 1.2679, note: 15.65, date_ecoute: '2026-08-01', rang_historique: null, format_source: 'appli', donnees_brutes: {}, a_verifier: false, ...p })

describe('valider', () => {
  it('saisie de départ reprend la ligne', () => {
    expect(saisieDepuis(ligne())).toEqual({ titre: 'Weezer', artiste: 'Weezer', annee: '2026', coeurs: '8', morceaux: '10', mois: '2026-08' })
  })
  it('ligne appli : score et note recalculés', () => {
    const r = valider(ligne(), { ...saisieDepuis(ligne()), titre: 'Weezer (Gold Album)', coeurs: '9' }, 1.62)
    expect(r.ok && r.valeur.album).toBe('Weezer (Gold Album)')
    expect(r.ok && r.valeur.score).toBeCloseTo(9 / Math.pow(10, 0.8), 6)
    expect(r.ok && r.valeur.note).toBeCloseTo(((9 / Math.pow(10, 0.8)) * 20) / 1.62, 6)
    expect(r.ok && r.valeur.date_ecoute).toBe('2026-08-01')
  })
  it('ligne d\'un ancien format : score et note gardés', () => {
    const r = valider(ligne({ format_source: '2010-2020', note: 12.3, score: null }), { ...saisieDepuis(ligne()), coeurs: '1' }, null)
    expect(r.ok && r.valeur.note).toBe(12.3)
  })
  it('refus : artiste vide, année, nombres, morceaux zéro, mois', () => {
    const base = saisieDepuis(ligne())
    for (const s of [{ ...base, artiste: ' ' }, { ...base, annee: '26' }, { ...base, coeurs: 'x' }, { ...base, morceaux: '0' }, { ...base, mois: '2026-13' }]) {
      expect(valider(ligne(), s, 1.62).ok).toBe(false)
    }
  })
  it('mois vide : date vide', () => {
    const r = valider(ligne(), { ...saisieDepuis(ligne()), mois: '' }, 1.62)
    expect(r.ok && r.valeur.date_ecoute).toBeNull()
  })
})

describe('recalcul', () => {
  it('seulement appli et 2023-2026', () => {
    expect(recalculable('appli')).toBe(true)
    expect(recalculable('2023-2026')).toBe(true)
    expect(recalculable('2010-2020')).toBe(false)
    expect(recalculable('2022')).toBe(false)
  })
  it('années à recalculer : ancienne et nouvelle', () => {
    expect(anneesARecalculer(ligne({ annee: 2025 }), 2026)).toEqual([2025, 2026])
    expect(anneesARecalculer(ligne(), 2026)).toEqual([2026])
    expect(anneesARecalculer(ligne({ format_source: '2010-2020' }), 2026)).toEqual([])
  })
})
