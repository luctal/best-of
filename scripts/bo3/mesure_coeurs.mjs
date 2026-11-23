// BO3 A : cœurs comptés avant (identifiant seul) et après (identifiant ou même artiste + même titre normalisés), par album de la playlist. Lecture seule.
const PL = '10292262522', PROFIL = '2365945224'
const norm = (s) => String(s ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim()
async function tout(url) { const o = []; for (let u = url; u; ) { const r = await (await fetch(u)).json(); if (r.error) throw new Error(JSON.stringify(r.error)); o.push(...r.data); u = r.next } return o }
const pl = await tout(`https://api.deezer.com/playlist/${PL}/tracks?limit=100`)
const coeurs = await tout(`https://api.deezer.com/user/${PROFIL}/tracks?limit=1000`)
const ids = new Set(coeurs.map((c) => c.id))
const cles = new Set(coeurs.filter((c) => norm(c.title)).map((c) => `${norm(c.artist?.name)}|${norm(c.title)}`))
const albums = new Map()
for (const t of pl) {
  if (!t.album?.id) continue
  const a = albums.get(t.album.id) ?? { nom: `${t.artist?.name} - ${t.album.title}`, avant: 0, apres: 0, n: 0 }
  a.n++
  const parId = ids.has(t.id)
  if (parId) a.avant++
  if (parId || (norm(t.title) && cles.has(`${norm(t.artist?.name)}|${norm(t.title)}`))) a.apres++
  albums.set(t.album.id, a)
}
console.log(`playlist ${pl.length} titres, ${coeurs.length} cœurs, ${albums.size} albums`)
const chg = [...albums].filter(([, a]) => a.avant !== a.apres)
console.log(`albums dont le compte change : ${chg.length}`)
for (const [id, a] of chg) console.log(`${id} ${a.nom} : ${a.avant} -> ${a.apres} (${a.n} morceaux)`)
const L = albums.get(960787671)
console.log(`Laura Cahen 960787671 : avant ${L?.avant}, après ${L?.apres}`)
