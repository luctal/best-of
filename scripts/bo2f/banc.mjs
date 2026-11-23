// Banc navigateur BO2f : 390 et 1100 px. Lecture réelle de Deezer ; les cœurs sont modifiés au vol (interception) pour simuler « cœur mis après l'ouverture ».
// Enregistrement par bouchon (window.__appels) : aucune écriture en base. Aucun code admin.
// Variables : PW_DIR, CHROME_BIN. Le serveur vite doit tourner sur le port 5199.
import { createRequire } from 'node:module'
const { chromium } = createRequire(process.env.PW_DIR + '/')('playwright-core')
const PL = '10292262522', PROFIL = '2365945224'
const tout = async (url) => { const o = []; for (let u = url; u; ) { const r = await (await fetch(u)).json(); o.push(...r.data); u = r.next } return o }
const pl = await tout(`https://api.deezer.com/playlist/${PL}/tracks?limit=100`)
const aimes = new Set((await tout(`https://api.deezer.com/user/${PROFIL}/tracks?limit=1000`)).map((c) => c.id))
// candidats : album avec un titre non aimé, du plus récent au plus ancien
const parAlbum = new Map()
for (const t of pl) if (t.album?.id) parAlbum.set(t.album.id, [...(parAlbum.get(t.album.id) ?? []), t.id])
const candidats = [...parAlbum].filter(([, ids]) => ids.some((i) => !aimes.has(i))).reverse().map(([al, ids]) => ({ al, extra: ids.find((i) => !aimes.has(i)) }))
const b = await chromium.launch({ executablePath: process.env.CHROME_BIN })
const res = []
const noter = (test, attendu, mesure, ok) => res.push(`| ${test} | ${attendu} | ${mesure} | ${ok ? 'OK' : 'KO'} |`)
const T = 240000
const num = (s) => Number((s || '').match(/\d+/)?.[0])

for (const [largeur, hauteur] of [[390, 800], [1100, 800]]) {
  const L = `${largeur} px`
  const ctx = await b.newContext({ viewport: { width: largeur, height: hauteur } })
  const q = await ctx.newPage()
  q.setDefaultTimeout(T)
  let mode = 'reel' // reel | plus1 | coupe
  let extra = null
  await q.route(/api\.deezer\.com\/user\/.*\/tracks/, async (route) => {
    const url = route.request().url()
    if (mode === 'coupe') return route.abort()
    if (mode === 'reel' || url.includes('index=')) return route.continue()
    const cb = new URL(url).searchParams.get('callback')
    const r = await route.fetch({ url: url.replace(/[?&]output=jsonp/, '').replace(/[?&]callback=[^&]+/, '') })
    const j = await r.json()
    j.data.push({ id: extra })
    await route.fulfill({ contentType: 'application/javascript', body: `${cb}(${JSON.stringify(j)})` })
  })
  await q.goto('http://localhost:5199/best-of/scripts/bo2f/banc.html')
  await q.waitForSelector('[data-testid=nb-titres]')
  const nt0 = num(await q.textContent('[data-testid=nb-titres]'))
  const nc0 = num(await q.textContent('[data-testid=nb-coeurs]'))
  let cible = null
  for (const c of candidats) if (await q.locator(`li[data-album="${c.al}"][data-deja=non]`).count()) { cible = c; break }
  extra = cible.extra
  const li = q.locator(`li[data-album="${cible.al}"]`)
  const nom = (await li.locator('label').first().textContent()).trim()
  const coeurs0 = num(await li.locator('[data-testid=apercu]').textContent())
  noter(`${L} ouverture`, 'titres et cœurs lus', `${nt0} titres, ${nc0} cœurs ; cible « ${nom} » : ${coeurs0} cœurs`, nt0 > 0 && nc0 > 0)
  const maj0 = (await q.textContent('[data-testid=maj]')).trim()
  noter(`${L} « Mis à jour à » à l'ouverture`, 'Mis à jour à HH:MM', maj0, /^Mis à jour à \d\d:\d\d$/.test(maj0))
  const hBtn = await q.locator('[data-testid=actualiser]').evaluate((e) => Math.round(e.getBoundingClientRect().height))
  const pos = await q.locator('[data-testid=actualiser]').evaluate((e) => Math.round(e.getBoundingClientRect().top))
  noter(`${L} bouton Actualiser`, 'visible en haut, hauteur >= 44 px', `hauteur ${hBtn}, haut ${pos}`, hBtn >= 44 && pos < 200)
  await li.locator('input[type=checkbox]').check()

  // A. Actualiser avec un cœur de plus mis après l'ouverture
  mode = 'plus1'
  await q.click('[data-testid=actualiser]')
  const pendant = (await q.textContent('[data-testid=maj]')).trim()
  const inactif = await q.locator('[data-testid=actualiser]').isDisabled()
  noter(`${L} Actualiser : pendant la lecture`, 'Lecture de Deezer en cours…, bouton inactif', `${pendant}, inactif=${inactif}`, pendant === 'Lecture de Deezer en cours…' && inactif)
  await q.waitForFunction(() => /^Mis à jour à/.test(document.querySelector('[data-testid=maj]')?.textContent ?? ''))
  const maj1 = (await q.textContent('[data-testid=maj]')).trim()
  const nt1 = num(await q.textContent('[data-testid=nb-titres]'))
  const nc1 = num(await q.textContent('[data-testid=nb-coeurs]'))
  const coeurs1 = num(await li.locator('[data-testid=apercu]').textContent())
  const coche = await li.locator('input[type=checkbox]').isChecked()
  noter(`${L} Actualiser : après`, 'Mis à jour à HH:MM, nombre de titres et de cœurs affichés, +1 cœur sur la cible, case gardée', `${maj1} ; ${nt1} titres, ${nc1} cœurs ; cible ${coeurs0} -> ${coeurs1} ; coché=${coche}`, /^Mis à jour à \d\d:\d\d$/.test(maj1) && nt1 === nt0 && nc1 === nc0 + 1 && coeurs1 === coeurs0 + 1 && coche)

  // B. Enregistrer : un cœur de plus encore (relu) -> le bouchon reçoit la valeur relue
  mode = 'reel'
  await q.click('[data-testid=actualiser]')
  await q.waitForFunction(() => /^Mis à jour à/.test(document.querySelector('[data-testid=maj]')?.textContent ?? ''))
  const coeursBase = num(await li.locator('[data-testid=apercu]').textContent())
  mode = 'plus1'
  await q.click('button:has-text("Enregistrer la sélection (1)")')
  await q.waitForSelector('[data-testid=bilan]')
  const recu = await q.evaluate(() => window.__appels.find((a) => a.nom === 'ajouter_album')?.args ?? null)
  const chg = (await q.locator('[data-testid=changement]').allTextContents()).map((x) => x.trim())
  noter(`${L} Enregistrer : cœurs relus`, `bouchon reçoit ${coeursBase + 1} (affiché ${coeursBase}), bilan « … : ${coeursBase} → ${coeursBase + 1} cœur(s) »`, `reçu ${recu?.coeurs} ; ${chg.join(' | ')}`, recu?.coeurs === coeursBase + 1 && chg.some((x) => x.endsWith(`: ${coeursBase} → ${coeursBase + 1} cœur${coeursBase + 1 > 1 ? "s" : ""}`)))

  // C. Deezer ne répond pas : rien d'enregistré
  const autre = candidats.find((c) => c.al !== cible.al)
  const li2 = q.locator('li[data-deja=non]').first()
  await li2.locator('input[type=checkbox]').check()
  const avant = await q.evaluate(() => window.__appels.length)
  mode = 'coupe'
  await q.click('button:has-text("Enregistrer la sélection (1)")')
  await q.waitForSelector('[data-testid=erreur-enregistrement]')
  const msg = (await q.textContent('[data-testid=erreur-enregistrement]')).trim()
  const apres = await q.evaluate(() => window.__appels.length)
  noter(`${L} Enregistrer sans Deezer`, 'message, aucun appel au bouchon', `${msg} ; appels ${avant} -> ${apres}`, msg === 'Connexion à Deezer impossible, réessaie.' && apres === avant)

  const h = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }))
  noter(`${L} pas de défilement horizontal`, 'scrollWidth <= clientWidth', `${h.sw} / ${h.cw}`, h.sw <= h.cw)
  const petits = await q.evaluate(() => [...document.querySelectorAll('button, input:not([type=checkbox]), label:has(input[type=checkbox])')].filter((e) => e.getBoundingClientRect().width > 0).map((e) => ({ t: (e.textContent || e.tagName).trim().slice(0, 25), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44))
  noter(`${L} boutons et champs >= 44 px`, 'aucun plus petit', petits.length ? JSON.stringify(petits.slice(0, 4)) : 'aucun', petits.length === 0)
  await ctx.close()
}
await b.close()
console.log('| test | attendu | mesuré | verdict |\n|---|---|---|---|\n' + res.join('\n'))
process.exit(res.some((l) => l.endsWith('| KO |')) ? 1 : 0)
