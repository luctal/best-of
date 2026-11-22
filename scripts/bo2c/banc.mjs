// Banc navigateur BO2c : 390 et 1100 px. Lecture réelle (base, Deezer) ; aucun code admin ; enregistrement par bouchon.
// Variables : PW_DIR (dossier contenant node_modules/playwright-core), CHROME_BIN, SORTIE (dossier hors dépôt).
import { createRequire } from 'node:module'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright-core')
const ExcelJS = (await import('exceljs')).default
const SORTIE = process.env.SORTIE
mkdirSync(SORTIE, { recursive: true })
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN })
const BASE = 'http://localhost:5199/best-of/'
const res = []
const noter = (test, attendu, mesure, ok) => res.push(`| ${test} | ${attendu} | ${mesure} | ${ok ? 'OK' : 'KO'} |`)
const T = 240000

async function ergonomie(p, etiquette) {
  const h = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  noter(`${etiquette} : pas de défilement horizontal`, 'scrollWidth <= clientWidth', `${h.sw} / ${h.cw}`, h.sw <= h.cw)
  const petits = await p.evaluate(() =>
    [...document.querySelectorAll('button, select, input:not([type=checkbox]), label:has(input[type=checkbox])')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => ({ t: (e.textContent || e.id || e.tagName).trim().slice(0, 25), h: Math.round(e.getBoundingClientRect().height) }))
      .filter((x) => x.h < 44),
  )
  noter(`${etiquette} : boutons et champs >= 44 px`, 'aucun plus petit', petits.length ? JSON.stringify(petits.slice(0, 4)) : 'aucun', petits.length === 0)
}

for (const [largeur, hauteur] of [[390, 800], [1100, 800]]) {
  const ctx = await b.newContext({ viewport: { width: largeur, height: hauteur }, acceptDownloads: true })
  const p = await ctx.newPage()
  p.setDefaultTimeout(T)
  const L = `${largeur} px`

  // Année 2026 (écran public)
  await p.goto(BASE)
  await p.waitForSelector('[data-testid=nombre-albums]')
  const n26 = await p.textContent('[data-testid=nombre-albums]')
  noter(`${L} Année 2026 : nombre d'albums`, '106 albums', n26.trim(), n26.trim() === '106 albums')
  const lignes = await p.$$eval('[data-testid=tableau-annee] tbody tr', (trs) => trs.map((tr) => ({ cells: [...tr.children].map((td) => td.textContent.trim()), rouge: tr.dataset.rouge, couleur: getComputedStyle(tr.children[1]).color })))
  noter(`${L} Année 2026 : première ligne`, 'The Coral, note 19,94', `${lignes[0].cells[0]} / ${lignes[0].cells[4]}`, lignes[0].cells[0].startsWith('The Coral') && lignes[0].cells[4] === '19,94')
  const w = lignes.find((l) => l.cells[1] === 'Weezer (Gold Album)')
  noter(`${L} Weezer (Gold Album)`, '8 / 10 / 15,65, rouge', w ? `${w.cells[2]} / ${w.cells[3]} / ${w.cells[4]}, rouge=${w.rouge}, couleur ${w.couleur}` : 'absent', !!w && w.cells[2] === '8' && w.cells[3] === '10' && w.cells[4] === '15,65' && w.rouge === 'oui')
  const ph = lignes.find((l) => l.cells[0].startsWith('Phoebe Bridgers'))
  noter(`${L} Phoebe Bridgers`, '6,72, pas en rouge', ph ? `${ph.cells[4]}, rouge=${ph.rouge}` : 'absent', !!ph && ph.cells[4] === '6,72' && ph.rouge === 'non')
  const rougesFaux = lignes.filter((l) => (l.rouge === 'oui') !== (Number(l.cells[4].replace(',', '.')) > 10))
  noter(`${L} Année 2026 : règle du rouge sur toutes les lignes`, 'rouge <=> note > 10', `${rougesFaux.length} écart`, rougesFaux.length === 0)
  const entetes = await p.$$eval('[data-testid=tableau-annee] thead th', (t) => t.map((x) => x.textContent.trim()))
  noter(`${L} Année 2026 : colonnes`, 'Artiste, Album, Cœurs, Morceaux, Note, Mois', entetes.join(', '), entetes.map((e) => e.replace(/ [▲▼]/, '')).join(', ') === 'Artiste, Album, Cœurs, Morceaux, Note, Mois')
  const avant = lignes[0].cells[0]
  await p.click('thead th:first-child button')
  const apres = await p.$eval('[data-testid=tableau-annee] tbody tr td', (td) => td.textContent.trim())
  noter(`${L} tri au clic (Artiste croissant)`, 'première ligne change', `${avant} -> ${apres}`, apres !== avant)
  await ergonomie(p, `${L} Année`)

  // Année 2006
  await p.selectOption('#annee', '2006')
  await p.waitForFunction(() => document.querySelector('[data-testid=nombre-albums]')?.textContent.trim() === '69 albums')
  const l06 = await p.$$eval('[data-testid=tableau-annee] tbody tr', (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent.trim())))
  const rangs = l06.map((r) => Number(r[0]))
  noter(`${L} Année 2006`, '69 albums, rang 1..69, Beirut premier', `${l06.length} albums, premier ${l06[0][0]}/${l06[0][1]}`, l06.length === 69 && l06[0][1].startsWith('Beirut') && rangs.every((r, i) => r === i + 1))
  await p.selectOption('#annee', '2008')
  await p.waitForFunction(() => document.querySelector('[data-testid=nombre-albums]')?.textContent.trim() === '118 albums')
  const e08 = await p.$$eval('[data-testid=tableau-annee] thead th', (t) => t.map((x) => x.textContent.trim().replace(/ [▲▼]/, '')))
  noter(`${L} Année 2008 : colonnes`, 'Rang, Artiste, Adorés, Pas mal', e08.join(', '), e08.join(', ') === 'Rang, Artiste, Adorés, Pas mal')

  // Export (une fois, à 1100 px)
  if (largeur === 1100) {
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Exporter en Excel')])
    const chemin = join(SORTIE, 'best-of.xlsx')
    await dl.saveAs(chemin)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(chemin)
    const ws = wb.getWorksheet('2026')
    noter('Export : onglets', '2006 à 2026 (21 onglets)', `${wb.worksheets.length} onglets, ${wb.worksheets[0].name} à ${wb.worksheets.at(-1).name}`, wb.worksheets.length === 21)
    noter('Export : onglet 2026', '106 lignes', `${ws.rowCount - 1} lignes`, ws.rowCount - 1 === 106)
    const trouve = (nom) => { for (let i = 2; i <= ws.rowCount; i++) if (String(ws.getRow(i).getCell(2).value) === nom) return ws.getRow(i) }
    const rw = trouve('Weezer (Gold Album)')
    noter('Export : Weezer en rouge vif', 'police FFFF0000, note 15,65 numérique', `${rw?.getCell(1).font?.color?.argb}, ${typeof rw?.getCell(5).value}, ${rw?.getCell(5).value?.toFixed?.(2)}`, rw?.getCell(1).font?.color?.argb === 'FFFF0000' && typeof rw.getCell(5).value === 'number' && rw.getCell(5).value.toFixed(2) === '15.65')
    const rc = ws.getRow(2)
    noter('Export : The Coral', '19,94 en tête', `${rc.getCell(1).value} / ${rc.getCell(5).value?.toFixed?.(2)}`, rc.getCell(1).value === 'The Coral' && rc.getCell(5).value.toFixed(2) === '19.94')
    const rp = [...Array(ws.rowCount).keys()].map((i) => ws.getRow(i + 1)).find((r) => String(r.getCell(1).value).startsWith('Phoebe Bridgers'))
    noter('Export : Phoebe Bridgers pas en rouge', 'police sans couleur', `${rp?.getCell(1).font?.color?.argb}`, !!rp && !rp.getCell(1).font?.color?.argb)
    noter('Export : mois en vraie date', 'Date', Object.prototype.toString.call(rc.getCell(6).value), rc.getCell(6).value instanceof Date)
  }

  // Écoute (lecture Deezer réelle, enregistrement par bouchon)
  const q = await ctx.newPage()
  q.setDefaultTimeout(T)
  await q.goto('http://localhost:5199/best-of/scripts/bo2c/banc.html')
  await q.waitForSelector('[data-testid=nb-titres]')
  const nt = Number(await q.textContent('[data-testid=nb-titres]'))
  const nc = Number(await q.textContent('[data-testid=nb-coeurs]'))
  noter(`${L} Écoute : titres lus`, '752', String(nt), nt === 752)
  noter(`${L} Écoute : cœurs lus`, 'environ 8 600', String(nc), nc > 8000 && nc < 9200)
  const wz = await q.$('li[data-album="989348601"]')
  const wzInfo = wz ? await wz.evaluate((li) => ({ deja: li.dataset.deja, texte: li.querySelector('[data-testid=deja]')?.textContent, coche: li.querySelector('input[type=checkbox]').checked, classe: li.className })) : null
  noter(`${L} Écoute : Weezer (989348601)`, 'déjà en base (même nom), grisé, non coché', wzInfo ? `${wzInfo.texte}, coché=${wzInfo.coche}, grisé=${wzInfo.classe.includes('bg-gris')}` : 'absent', !!wzInfo && wzInfo.texte === 'déjà en base (même nom)' && !wzInfo.coche && wzInfo.classe.includes('bg-gris'))
  for (const nom of ['Alabama Shakes', 'Erykah Badu']) {
    const li = await q.$$eval('li[data-album]', (ls, n) => ls.filter((l) => l.textContent.includes(n)).map((l) => ({ t: l.querySelector('label').textContent.trim(), a: l.querySelector('[data-testid=apercu]').textContent.trim(), d: l.dataset.deja })), nom)
    noter(`${L} Écoute : aperçu ${nom}`, 'présent (chiffres rendus, sans attendu)', li.length ? li.map((x) => `${x.t} | ${x.a} | ${x.d}`).join(' ; ') : 'absent', li.length > 0)
  }
  // Enregistrement par bouchon : un album non en base, coché.
  const cible = await q.$('li[data-deja=non] input[type=checkbox]')
  await cible.check()
  const anneeProposee = await q.inputValue('li[data-deja=non]:has(input:checked) input[inputmode=numeric]')
  noter(`${L} Écoute : année proposée`, `année en cours (${new Date().getFullYear()})`, anneeProposee, anneeProposee === String(new Date().getFullYear()))
  await q.waitForSelector('button:has-text("Enregistrer la sélection (1)")')
  await q.click('button:has-text("Enregistrer la sélection (1)")')
  await q.waitForSelector('[data-testid=bilan]')
  const bilan = await q.textContent('[data-testid=bilan]')
  const appels = await q.evaluate(() => window.__appels.map((a) => a.nom))
  const rappel = await q.locator('text=Tu peux maintenant retirer ces albums de la playlist Deezer.').count()
  noter(`${L} Écoute : enregistrement par bouchon`, 'ajouter_album puis recalculer_annee, bilan, rappel', `${appels.join(' + ')} ; ${bilan.trim()} ; rappel=${rappel}`, appels[0] === 'ajouter_album' && appels.includes('recalculer_annee') && /1 enregistré/.test(bilan) && rappel === 1)
  await ergonomie(q, `${L} Écoute`)
  await ctx.close()
}
await b.close()
console.log('| test | attendu | mesuré | verdict |\n|---|---|---|---|\n' + res.join('\n'))
process.exit(res.some((l) => l.endsWith('| KO |')) ? 1 : 0)
