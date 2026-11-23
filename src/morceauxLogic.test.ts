import { describe, expect, it } from 'vitest'
import { cellule, choisirCandidat, estEdition, inclusion, ligneCsv, remarqueCoherence, type Candidat } from './morceauxLogic'

const c = (id: number, titre: string, artiste: string, nbTracks: number | null, recordType = 'album', releaseDate = '2022-05-01'): Candidat => ({ id, titre, artiste, nbTracks, recordType, releaseDate })

describe('choisirCandidat', () => {
  it('un seul candidat exact (casse, accents, parenthèses ignorés) = sur', () => {
    const r = choisirCandidat('Étienne Daho', 'Blitz', [c(1, 'BLITZ (Remastered)', 'Etienne Daho', 12), c(2, 'Autre', 'Etienne Daho', 9)])
    expect(r).toMatchObject({ confiance: 'sur', candidat: { id: 1 } })
  })
  it('plusieurs exacts = choix ; record_type album d\'abord', () => {
    const r = choisirCandidat('A', 'T', [c(1, 'T', 'A', 4, 'ep'), c(2, 'T', 'A', 12, 'album')])
    expect(r).toMatchObject({ confiance: 'choix', candidat: { id: 2 } })
  })
  it('puis le plus petit nb_tracks hors édition deluxe / expanded / bonus', () => {
    const r = choisirCandidat('A', 'T', [c(1, 'T', 'A', 8, 'album'), c(2, 'T', 'A', 14, 'album'), c(3, 'T', 'A', 11, 'album')])
    expect(r.candidat?.id).toBe(1)
    const d = choisirCandidat('A', 'T', [c(1, 'T [Deluxe]', 'A', 8), c(2, 'T', 'A', 14), c(3, 'T (Expanded Edition)', 'A', 6), c(4, 'T (Bonus Tracks)', 'A', 5)])
    expect(d.candidat?.id).toBe(2)
  })
  it('puis la sortie la plus ancienne', () => {
    const r = choisirCandidat('A', 'T', [c(1, 'T', 'A', 10, 'album', '2023-01-01'), c(2, 'T', 'A', 10, 'album', '2022-02-01')])
    expect(r.candidat?.id).toBe(2)
  })
  it('titre ou artiste voisin (inclusion) = approche', () => {
    expect(choisirCandidat('Dawn Richard and Spencer Zahn', 'Pigments', [c(1, 'Pigments', 'Dawn Richard', 11)])).toMatchObject({ confiance: 'approche', candidat: { id: 1 } })
    expect(choisirCandidat('Sam Cohen', 'Slow Fawn', [c(1, 'Slow Fawn Music No. 1', 'Sam Cohen', 9)]).confiance).toBe('approche')
  })
  it('artiste différent ou titre sans rapport = introuvable', () => {
    expect(choisirCandidat('A', 'T', [c(1, 'T', 'B', 10)]).confiance).toBe('introuvable')
    expect(choisirCandidat('A', 'T', [c(1, 'Z', 'A', 10)]).confiance).toBe('introuvable')
    expect(choisirCandidat('A', 'T', [])).toEqual({ confiance: 'introuvable', candidat: null })
  })
  it('un exact l\'emporte sur un voisin', () => {
    expect(choisirCandidat('A', 'T', [c(1, 'T Live', 'A', 3), c(2, 'T', 'A', 12)])).toMatchObject({ confiance: 'sur', candidat: { id: 2 } })
  })
})

describe('outils', () => {
  it('estEdition', () => {
    expect(estEdition('X (Deluxe Edition)')).toBe(true)
    expect(estEdition('Expanded')).toBe(true)
    expect(estEdition('Bonus Tracks')).toBe(true)
    expect(estEdition('Deluxeville')).toBe(false)
  })
  it('inclusion par mots entiers, jamais vide', () => {
    expect(inclusion('slow fawn music no 1', 'slow fawn')).toBe(true)
    expect(inclusion('dream', 'the dream')).toBe(true)
    expect(inclusion('art', 'smart')).toBe(false)
    expect(inclusion('', 'x')).toBe(false)
  })
  it('remarqueCoherence : cœurs > nb_tracks', () => {
    expect(remarqueCoherence(12, 10)).toBe('coeurs 12 > nb_tracks 10')
    expect(remarqueCoherence(10, 10)).toBe('')
    expect(remarqueCoherence(5, null)).toBe('')
  })
  it('CSV : séparateur ;, guillemets doublés', () => {
    expect(cellule('a;b')).toBe('"a;b"')
    expect(cellule('"X"')).toBe('"""X"""')
    expect(ligneCsv([1, 'a', null])).toBe('1;a;')
  })
})
