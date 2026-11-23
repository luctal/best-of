// Banc navigateur BO3 : 390 et 1100 px, Deezer réel, enregistrement par bouchon (window.__appels), aucun code admin.
// Contrôle : l'album Laura Cahen de la playlist (album 960787671) montre les cœurs de l'autre version et « dont n sur une autre version ».
// Variables : PW_DIR, CHROME_BIN. Le serveur vite doit tourner sur le port 5199.
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright-core')
const ALBUM = 960787671
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN })
const res = []
const noter = (test, attendu, mesure, ok) => res.push(`| ${test} | ${attendu} | ${mesure} | ${ok ? 'OK' : 'KO'} |`)
for (const [largeur, hauteur] of [[390, 800], [1100, 800]]) {
  const L = `${largeur} px`
  const ctx = await b.newContext({ viewport: { width: largeur, height: hauteur } })
  const q = await ctx.newPage()
  q.setDefaultTimeout(240000)
  await q.goto('http://localhost:5199/best-of/scripts/bo3/banc.html')
  await q.waitForSelector('[data-testid=nb-titres]')
  let li = q.locator(`li[data-album="${ALBUM}"]`)
  if (!(await li.count())) {
    await q.click('button:has-text("Afficher")')
    li = q.locator(`li[data-album="${ALBUM}"]`)
  }
  const texte = (await li.locator('[data-testid=apercu]').textContent()).replace(/\s+/g, ' ').trim()
  const mention = (await li.locator('[data-testid=autre-version]').allTextContents()).map((x) => x.trim())
  const m = texte.match(/^(\d+) cœurs/)
  noter(`${L} album Laura Cahen`, 'cœurs de l\'autre version comptés, mention « dont n sur une autre version »', `${texte}`, !!m && Number(m[1]) >= 5 && mention.length === 1 && /^\(dont \d+ sur une autre version\)$/.test(mention[0]))
  // les albums sans autre version n'affichent pas la mention
  const sans = await q.locator('li[data-album]:not(:has([data-testid=autre-version]))').count()
  const avec = await q.locator('li[data-album]:has([data-testid=autre-version])').count()
  noter(`${L} mention`, 'seulement sur les albums concernés', `${avec} avec, ${sans} sans`, avec >= 1 && sans > avec)
  const h = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  noter(`${L} pas de défilement horizontal`, 'scrollWidth <= clientWidth', `${h.sw} / ${h.cw}`, h.sw <= h.cw)
  // enregistrement par bouchon : la valeur envoyée porte les cœurs de l'autre version
  await li.locator('input[type=checkbox]').check()
  await q.click('button:has-text("Enregistrer la sélection (1)")')
  await q.waitForSelector('[data-testid=bilan]')
  const recu = await q.evaluate(() => window.__appels.find((a) => a.nom === 'ajouter_album')?.args ?? null)
  noter(`${L} enregistrement (bouchon)`, 'cœurs relus avec la règle autre version', `reçu coeurs=${recu?.coeurs}, album ${recu?.deezer_album_id}`, recu?.coeurs === Number(m?.[1]))
  await ctx.close()
}
await b.close()
console.log('| test | attendu | mesuré | verdict |\n|---|---|---|---|\n' + res.join('\n'))
process.exit(res.some((l) => l.endsWith('| KO |')) ? 1 : 0)
