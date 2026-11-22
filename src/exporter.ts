// Export Excel (exceljs : gère la couleur de police dans le navigateur). Impur côté téléchargement seulement.
import { ongletsExport } from './exportLogic'
import type { Album } from './types'

// Couleur de police des lignes rouges : le token bordeaux de la page (tokens.css reste la seule source), au format ARGB.
export function rougeDepuisPage(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue('--color-bordeaux').trim()
  const m = /^#([0-9A-Fa-f]{6})$/.exec(v)
  if (!m) throw new Error('token bordeaux absent')
  return `FF${m[1].toUpperCase()}`
}

const LARGEURS: Record<string, number> = { rang: 8, artiste: 30, album: 38, adores: 10, pas_mal: 10, coeurs: 9, morceaux: 11, note: 9, mois: 14 }

export async function classeur(albums: readonly Album[], rouge: string): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs') // chargé à la demande : le classeur pèse plus que le reste de la page
  const wb = new ExcelJS.Workbook()
  for (const o of ongletsExport(albums)) {
    const ws = wb.addWorksheet(o.nom)
    ws.columns = o.colonnes.map((c) => ({ header: c.titre, key: c.cle, width: LARGEURS[c.cle] ?? 12 }))
    ws.getRow(1).font = { bold: true }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    for (const l of o.lignes) {
      const row = ws.addRow(l.valeurs)
      o.colonnes.forEach((c, i) => {
        const cell = row.getCell(i + 1)
        if (c.cle === 'mois') cell.numFmt = 'mmm yyyy'
        if (c.cle === 'note') cell.numFmt = '0.00'
      })
      if (l.rouge) row.font = { color: { argb: rouge } }
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer
}

export function telecharger(contenu: ArrayBuffer, nom: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
