import ExcelJS from 'exceljs'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { classeur } from './exporter'
import type { Album } from './types'

const bordeaux = /--color-bordeaux:\s*#([0-9A-Fa-f]{6})/.exec(readFileSync(new URL('./tokens.css', import.meta.url), 'utf8'))![1].toUpperCase()
let n = 0
const alb = (p: Partial<Album>): Album => ({ id: ++n, annee: 2026, artiste: 'A', album: 'B', deezer_album_id: null, coeurs: 1, morceaux: 1, score: 1, note: 5, date_ecoute: '2026-08-01', rang_historique: null, format_source: '2023-2026', donnees_brutes: {}, a_verifier: false, ...p })

describe('classeur Excel relu par exceljs', () => {
  it('onglets, nombres, dates, rouge', async () => {
    const buf = await classeur([alb({ artiste: 'Weezer', album: 'Weezer (Gold Album)', coeurs: 8, morceaux: 10, note: 15.65 }), alb({ artiste: 'Phoebe', note: 6.72 }), alb({ annee: 2006, artiste: 'Beirut', album: null, note: null, rang_historique: 1, format_source: '2006' })], `FF${bordeaux}`)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    expect(wb.worksheets.map((w) => w.name)).toEqual(['2006', '2026'])
    const ws = wb.getWorksheet('2026')!
    expect(ws.rowCount).toBe(3)
    expect(ws.getRow(1).values).toEqual([undefined, 'Artiste', 'Album', 'Cœurs', 'Morceaux', 'Note', 'Mois'])
    const w = ws.getRow(2)
    expect(w.getCell(1).value).toBe('Weezer')
    expect(w.getCell(3).value).toBe(8)
    expect(w.getCell(5).value).toBe(15.65)
    expect(w.getCell(6).value).toBeInstanceOf(Date)
    expect(w.getCell(1).font?.color?.argb).toBe(`FF${bordeaux}`)
    expect(ws.getRow(3).getCell(1).font?.color?.argb).toBeUndefined()
    expect(wb.getWorksheet('2006')!.getRow(2).getCell(1).value).toBe(1)
  })
})
