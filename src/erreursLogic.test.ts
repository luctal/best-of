import { describe, expect, it } from 'vitest'
import { MSG_CODE_INCORRECT, MSG_DEEZER, MSG_RESEAU, traduireErreur } from './erreursLogic'

describe('traduireErreur', () => {
  it('code invalide de la base', () => {
    expect(traduireErreur(new Error('code invalide'))).toBe(MSG_CODE_INCORRECT)
  })
  it('réseau et Deezer', () => {
    expect(traduireErreur(new TypeError('Failed to fetch'))).toBe(MSG_RESEAU)
    expect(traduireErreur(new Error('timeout'))).toBe(MSG_DEEZER)
    expect(traduireErreur(new Error('script error'))).toBe(MSG_DEEZER)
  })
  it('texte inconnu gardé, vide traduit', () => {
    expect(traduireErreur(new Error('autre chose'))).toBe('autre chose')
    expect(traduireErreur(undefined)).toBe(MSG_RESEAU)
  })
})
