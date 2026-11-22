// Au plus `limite` appels à la fois, résultats dans l'ordre des éléments.
export async function enParallele<T, R>(items: readonly T[], limite: number, f: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const sortie: R[] = new Array(items.length)
  let prochain = 0
  const ouvrier = async () => {
    while (prochain < items.length) {
      const i = prochain++
      sortie[i] = await f(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limite, items.length)) }, ouvrier))
  return sortie
}
