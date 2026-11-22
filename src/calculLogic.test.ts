import { describe, expect, it } from 'vitest'
import { ecartNbTracks, estRouge, formaterMois, formaterNombre, meilleurScore, moisEcoute, note, score } from './calculLogic'

describe('score', () => {
  it('cœurs / morceaux^0,8 (Weezer 8 sur 10 = 1,268)', () => {
    expect(score(8, 10)).toBeCloseTo(1.2679, 4)
    expect(score(11, 11)).toBeCloseTo(1.6154, 4)
  })
  it('équivalent (cœurs/morceaux) × morceaux^0,2', () => {
    expect(score(7, 13)).toBeCloseTo((7 / 13) * Math.pow(13, 0.2), 10)
  })
  it('invalide : morceaux nul, cœurs négatifs', () => {
    expect(score(3, 0)).toBeNull()
    expect(score(-1, 10)).toBeNull()
    expect(score(0, 10)).toBe(0)
  })
})

describe('note', () => {
  it('score × 20 / meilleur (Weezer 15,65, The Coral 19,94)', () => {
    expect(note(score(8, 10), 1.62)).toBeCloseTo(15.653, 2)
    expect(note(score(11, 11), 1.62)).toBeCloseTo(19.943, 2)
  })
  it('meilleur absent ou nul', () => {
    expect(note(1, null)).toBeNull()
    expect(note(1, 0)).toBeNull()
    expect(note(null, 1.62)).toBeNull()
  })
})

describe('meilleurScore au centième supérieur', () => {
  it('arrondit vers le haut', () => {
    expect(meilleurScore(1.5849)).toBe(1.59)
    expect(meilleurScore(1.6154)).toBe(1.62)
    expect(meilleurScore(1.601)).toBe(1.61)
  })
  it('une valeur déjà au centième reste', () => {
    expect(meilleurScore(1.59)).toBe(1.59)
    expect(meilleurScore(1.62)).toBe(1.62)
  })
})

describe('moisEcoute', () => {
  it('mois de la plus ancienne time_add, au 1er (heure de Paris)', () => {
    const aout = Date.UTC(2026, 7, 22, 10) / 1000
    const sept = Date.UTC(2026, 8, 3, 10) / 1000
    expect(moisEcoute([sept, aout])).toBe('2026-08-01')
  })
  it('bascule de minuit à Paris : 31 juillet 23h30 UTC = 1er août Paris', () => {
    expect(moisEcoute([Date.UTC(2026, 6, 31, 23, 30) / 1000])).toBe('2026-08-01')
  })
  it('vide ou invalide', () => {
    expect(moisEcoute([])).toBeNull()
    expect(moisEcoute([NaN, 0])).toBeNull()
  })
})

describe('divers', () => {
  it('écart nb_tracks', () => {
    expect(ecartNbTracks(10, 10)).toBe(false)
    expect(ecartNbTracks(8, 10)).toBe(true)
    expect(ecartNbTracks(8, null)).toBe(false)
  })
  it('formats', () => {
    expect(formaterNombre(15.653, 2)).toBe('15,65')
    expect(formaterNombre(null, 2)).toBe('')
    expect(formaterMois('2026-08-01')).toBe('août 2026')
    expect(formaterMois(null)).toBe('')
  })
  it('règle du rouge : strictement au-dessus de 10', () => {
    expect(estRouge(15.65)).toBe(true)
    expect(estRouge(10)).toBe(false)
    expect(estRouge(6.72)).toBe(false)
    expect(estRouge(null)).toBe(false)
  })
})
