// BO2f : un cœur porte-t-il sur une autre version (autre identifiant Deezer) d'un titre présent dans la playlist ? Lecture seule, rien corrigé.
// Usage : node scripts/bo2f/mesure_versions.mjs "Jonathan Bree" "Dynamite Shakers"
const PL = '10292262522', PROFIL = '2365945224'
const norm = (s) => String(s ?? '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
async function tout(url) {
  const out = []
  for (let u = url; u; ) {
    const r = await (await fetch(u)).json()
    if (r.error) throw new Error(JSON.stringify(r.error))
    out.push(...r.data)
    u = r.next
  }
  return out
}
const pl = await tout(`https://api.deezer.com/playlist/${PL}/tracks?limit=100`)
const coeurs = await tout(`https://api.deezer.com/user/${PROFIL}/tracks?limit=1000`)
const ids = new Set(coeurs.map((c) => c.id))
console.log(`playlist ${pl.length} titres, ${coeurs.length} cœurs`)
for (const nom of process.argv.slice(2)) {
  const titres = pl.filter((t) => norm(t.artist?.name).includes(norm(nom)))
  const albums = [...new Set(titres.map((t) => t.album.id))]
  for (const al of albums) {
    const ts = titres.filter((t) => t.album.id === al)
    const enPlaylist = ts.filter((t) => ids.has(t.id)).length
    console.log(`\n${nom} / ${ts[0].album.title} (album ${al}) : ${ts.length} titres en playlist, ${enPlaylist} cœurs comptés par identifiant`)
    // cœurs hors playlist de même artiste : même titre normalisé (autre version) ou même album
    const cles = new Map(ts.map((t) => [norm(t.title), t.id]))
    const ids_pl = new Set(ts.map((t) => t.id))
    for (const c of coeurs) {
      if (ids_pl.has(c.id)) continue
      const memeArtiste = norm(c.artist?.name).includes(norm(nom))
      const memeTitre = cles.has(norm(c.title))
      if (memeArtiste && (memeTitre || c.album?.id === al)) console.log(`  AUTRE VERSION : coeur ${c.id} « ${c.title} » album ${c.album?.id} « ${c.album?.title} » ; playlist ${cles.get(norm(c.title)) ?? '-'}`)
    }
    // titres de la playlist en double (même titre, ids différents)
    const vus = new Map()
    for (const t of ts) vus.set(norm(t.title), [...(vus.get(norm(t.title)) ?? []), t.id])
    for (const [k, v] of vus) if (v.length > 1) console.log(`  DOUBLON playlist : « ${k} » ${v.join(', ')}`)
  }
}
// mesure globale : cœurs dont le titre+artiste est en playlist sous un autre identifiant
const parCle = new Map(pl.map((t) => [`${norm(t.artist?.name)}|${norm(t.title)}`, t]))
const plIds = new Set(pl.map((t) => t.id))
const autres = coeurs.filter((c) => !plIds.has(c.id) && parCle.has(`${norm(c.artist?.name)}|${norm(c.title)}`))
console.log(`\nGlobal : ${autres.length} cœurs sur une autre version d'un titre de la playlist`)
for (const c of autres.slice(0, 5)) console.log(`  ex. ${c.artist.name} « ${c.title} » coeur ${c.id} (album ${c.album?.id}) / playlist ${parCle.get(`${norm(c.artist?.name)}|${norm(c.title)}`).id} (album ${parCle.get(`${norm(c.artist?.name)}|${norm(c.title)}`).album.id})`)
