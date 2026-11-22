// Appels aux fonctions Supabase du mode admin. Le code est vérifié par la base, jamais écrit dans la page.
import type { AjoutAlbum } from './ecouteLogic'
import type { Modification } from './adminLogic'
import { supabase } from './supabase'

// Les appels protégés, derrière une interface : les bancs y mettent un bouchon (aucune écriture en base).
export interface Api {
  ajouterAlbum(a: AjoutAlbum): Promise<number>
  modifierAlbum(id: number, m: Modification): Promise<void>
  supprimerAlbum(id: number): Promise<void>
  recalculerAnnee(annee: number): Promise<number>
}

async function appeler<T>(nom: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(nom, args)
  if (error) throw new Error(error.message)
  return data as T
}

export const verifierCode = (code: string) => appeler<boolean>('verifier_code', { p_code: code })

export function apiReelle(code: string): Api {
  return {
    ajouterAlbum: (a) =>
      appeler<number>('ajouter_album', {
        p_code: code,
        p_annee: a.annee,
        p_artiste: a.artiste,
        p_album: a.album,
        p_deezer_album_id: a.deezer_album_id,
        p_coeurs: a.coeurs,
        p_morceaux: a.morceaux,
        p_score: a.score,
        p_note: a.note,
        p_date_ecoute: a.date_ecoute,
        p_a_verifier: a.a_verifier,
      }),
    modifierAlbum: async (id, m) => {
      await appeler<unknown>('modifier_album', {
        p_code: code,
        p_id: id,
        p_annee: m.annee,
        p_artiste: m.artiste,
        p_album: m.album,
        p_coeurs: m.coeurs,
        p_morceaux: m.morceaux,
        p_score: m.score,
        p_note: m.note,
        p_date_ecoute: m.date_ecoute,
      })
    },
    supprimerAlbum: async (id) => {
      await appeler<unknown>('supprimer_album', { p_code: code, p_id: id })
    },
    recalculerAnnee: async (annee) => Number(await appeler<number>('recalculer_annee', { p_code: code, p_annee: annee })),
  }
}

// Code retenu dans le navigateur (localStorage) : à saisir une fois par appareil.
const CLE_CODE = 'bo_code_admin'
export function codeRetenu(): string | null {
  try {
    return localStorage.getItem(CLE_CODE)
  } catch {
    return null
  }
}
export function retenirCode(code: string) {
  try {
    localStorage.setItem(CLE_CODE, code)
  } catch {
    /* stockage indisponible */
  }
}
export function oublierCode() {
  try {
    localStorage.removeItem(CLE_CODE)
  } catch {
    /* stockage indisponible */
  }
}
