import { describe, expect, it } from 'vitest'
import type { AlbumEcoute } from './ecouteLogic'
import { albumsAffiches, libelleMasques, partagerAlbums, anneeEnCours, apercu, dejaEnBase, indexerBase, ligneAEnregistrer, messageMeilleur, normaliserNom, regrouperParAlbum, titreDepuisDeezer, type TitreDeezer } from './ecouteLogic'

const t = (id: number, albumId: number, albumTitre: string, artiste: string, timeAdd: number): TitreDeezer => ({ id, albumId, albumTitre, artiste, timeAdd })
const J = 86400

describe('titreDepuisDeezer', () => {
  it('garde id, album, artiste, time_add', () => {
    expect(titreDepuisDeezer({ id: 1, time_add: 5, artist: { name: 'A' }, album: { id: 9, title: 'T' } })).toEqual({ id: 1, artiste: 'A', albumId: 9, albumTitre: 'T', timeAdd: 5 })
  })
  it('refuse un titre sans album ou sans id', () => {
    expect(titreDepuisDeezer({ id: 1, album: {} })).toBeNull()
    expect(titreDepuisDeezer({ album: { id: 2 } })).toBeNull()
    expect(titreDepuisDeezer(null)).toBeNull()
  })
})

describe('regrouperParAlbum', () => {
  const titres = [t(1, 10, 'Zeta', 'X', 3 * J), t(2, 20, 'Alpha', 'Y', 1 * J), t(3, 10, 'Zeta', 'X', 4 * J), t(4, 20, 'Alpha', 'Y', 2 * J), t(5, 20, 'Alpha', 'Y', 9 * J)]
  it('un groupe par album.id, avec morceaux et cœurs', () => {
    const r = regrouperParAlbum(titres, new Set([2, 3, 5]))
    expect(r.map((a) => [a.albumId, a.morceaux, a.coeurs])).toEqual([[20, 3, 2], [10, 2, 1]])
  })
  it('du plus ancien ajout au plus récent', () => {
    const r = regrouperParAlbum(titres, new Set())
    expect(r.map((a) => a.albumId)).toEqual([20, 10])
    expect(r[0].premierAjout).toBeLessThan(r[1].premierAjout)
  })
  it('deux albums de même titre restent séparés (jamais par le titre)', () => {
    const r = regrouperParAlbum([t(1, 1, 'Live', 'A', J), t(2, 2, 'Live', 'A', 2 * J)], new Set())
    expect(r).toHaveLength(2)
  })
  it('mois d\'écoute = mois du plus ancien ajout', () => {
    const r = regrouperParAlbum([t(1, 1, 'X', 'A', Date.UTC(2026, 8, 3) / 1000), t(2, 1, 'X', 'A', Date.UTC(2026, 7, 22) / 1000)], new Set())
    expect(r[0].moisEcoute).toBe('2026-08-01')
  })
})

describe('normaliserNom', () => {
  it('casse, accents, ponctuation, parenthèses', () => {
    expect(normaliserNom('Weezer (Gold Album)')).toBe('weezer')
    expect(normaliserNom('  Étienne  Daho! ')).toBe('etienne daho')
    expect(normaliserNom('Carrie & Lowell [Deluxe]')).toBe('carrie and lowell')
  })
})

describe('dejaEnBase', () => {
  const index = indexerBase([
    { artiste: 'Weezer', album: 'Weezer (Gold Album)', deezer_album_id: null },
    { artiste: 'Autre', album: 'Sans id', deezer_album_id: 777 },
  ])
  it('par nom normalisé, mention entre parenthèses ignorée', () => {
    expect(dejaEnBase({ albumId: 989348601, artiste: 'WEEZER', titre: 'Weezer' }, index)).toBe('nom')
  })
  it('par identifiant', () => {
    expect(dejaEnBase({ albumId: 777, artiste: 'Quelqu\'un', titre: 'Autre titre' }, index)).toBe('id')
  })
  it('nouvel album et même titre d\'un autre artiste', () => {
    expect(dejaEnBase({ albumId: 1, artiste: 'Alabama Shakes', titre: 'Boys & Girls' }, index)).toBeNull()
    expect(dejaEnBase({ albumId: 2, artiste: 'Quelqu\'un', titre: 'Weezer' }, index)).toBeNull()
  })
  it('base sans titre : jamais de correspondance vide', () => {
    const vide = indexerBase([{ artiste: 'A', album: null, deezer_album_id: null }])
    expect(dejaEnBase({ albumId: 3, artiste: 'A', titre: '' }, vide)).toBeNull()
  })
})

describe('apercu et ligneAEnregistrer', () => {
  const a = { albumId: 5, artiste: 'Weezer', titre: 'Weezer', morceaux: 10, coeurs: 8, moisEcoute: '2026-08-01', premierAjout: 1, dernierAjout: 1 }
  it('Weezer : score 1,268, note 15,65 avec le meilleur de la base', () => {
    const ap = apercu(a, 1.62, 10)
    expect(ap.score).toBeCloseTo(1.2679, 4)
    expect(ap.note).toBeCloseTo(15.653, 2)
    expect(ap.ecart).toBe(false)
  })
  it('un album au-dessus du meilleur le relève : note plafonnée à 20', () => {
    const ap = apercu({ ...a, coeurs: 11, morceaux: 11 }, 1.5, 11)
    expect(ap.meilleur).toBe(1.62)
    expect(ap.note).toBeCloseTo(19.943, 2)
  })
  it('écart avec nb_tracks signalé', () => {
    expect(apercu(a, 1.62, 12).ecart).toBe(true)
  })
  it('ligne à enregistrer : titre corrigé, année choisie, a_verifier si écart', () => {
    const l = ligneAEnregistrer(a, { titre: ' Weezer (Gold Album) ', annee: 2026 }, 1.62, 12)
    expect(l).toMatchObject({ annee: 2026, album: 'Weezer (Gold Album)', deezer_album_id: 5, coeurs: 8, morceaux: 10, date_ecoute: '2026-08-01', a_verifier: true })
  })
  it('refus sans année ou sans titre', () => {
    expect(ligneAEnregistrer(a, { titre: 'X', annee: null }, 1.62, null)).toBeNull()
    expect(ligneAEnregistrer(a, { titre: ' ', annee: 2026 }, 1.62, null)).toBeNull()
  })
})

describe('messageMeilleur', () => {
  it('message si le meilleur change ou si l\'année est nouvelle', () => {
    expect(messageMeilleur(2026, 1.62, 1.65)).toBe("Nouveau meilleur score 2026 : 1,65, notes de l'année recalculées")
    expect(messageMeilleur(2027, null, 1.5)).toContain('2027 : 1,50')
  })
  it('rien si inchangé', () => {
    expect(messageMeilleur(2026, 1.62, 1.62)).toBeNull()
  })
})

describe('anneeEnCours', () => {
  it('année en cours à Paris, jamais une date de sortie', () => {
    expect(anneeEnCours(new Date(Date.UTC(2026, 10, 22, 12)))).toBe(2026)
    expect(anneeEnCours(new Date(Date.UTC(2027, 5, 1, 12)))).toBe(2027)
  })
  it('bascule du 31 décembre : 23h30 UTC = 1er janvier à Paris', () => {
    expect(anneeEnCours(new Date(Date.UTC(2026, 11, 31, 23, 30)))).toBe(2027)
  })
})

describe('masquage des albums déjà en base', () => {
  const index = indexerBase([
    { artiste: 'Weezer', album: 'Weezer (Gold Album)', deezer_album_id: null },
    { artiste: 'Autre', album: 'Sans id', deezer_album_id: 777 },
  ])
  const alb = (albumId: number, artiste: string, titre: string): AlbumEcoute => ({ albumId, artiste, titre, morceaux: 1, coeurs: 0, moisEcoute: null, premierAjout: albumId, dernierAjout: albumId })
  const albums = [alb(989348601, 'Weezer', 'Weezer'), alb(777, 'X', 'Y'), alb(1, 'Alabama Shakes', 'Nouveau'), alb(2, 'Erykah Badu', 'Autre')]
  it('masque par nom et par identifiant, compte les albums à traiter', () => {
    const p = partagerAlbums(albums, index, new Set())
    expect(p.atraiter.map((a) => a.albumId)).toEqual([1, 2])
    expect(p.masques.map((a) => a.albumId)).toEqual([989348601, 777])
  })
  it('un album enregistré disparaît, masqué ou non', () => {
    const p = partagerAlbums(albums, index, new Set([1, 777]))
    expect(p.atraiter.map((a) => a.albumId)).toEqual([2])
    expect(p.masques.map((a) => a.albumId)).toEqual([989348601])
    expect(albumsAffiches(albums, p, true).map((a) => a.albumId)).toEqual([989348601, 2])
  })
  it('masqués cachés par défaut, réaffichés dans l\'ordre d\'origine', () => {
    const p = partagerAlbums(albums, index, new Set())
    expect(albumsAffiches(albums, p, false).map((a) => a.albumId)).toEqual([1, 2])
    expect(albumsAffiches(albums, p, true).map((a) => a.albumId)).toEqual([989348601, 777, 1, 2])
  })
  it('libellé', () => {
    expect(libelleMasques(0)).toBe('0 album déjà en base masqué')
    expect(libelleMasques(1)).toBe('1 album déjà en base masqué')
    expect(libelleMasques(12)).toBe('12 albums déjà en base masqués')
  })
})
