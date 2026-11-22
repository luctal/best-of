import { describe, expect, it } from 'vitest'
import { enParallele } from './parallele'

describe('enParallele', () => {
  it('garde l\'ordre et respecte la limite', async () => {
    let actifs = 0
    let max = 0
    const r = await enParallele([1, 2, 3, 4, 5, 6], 2, async (x) => {
      actifs++
      max = Math.max(max, actifs)
      await new Promise((ok) => setTimeout(ok, 5))
      actifs--
      return x * 10
    })
    expect(r).toEqual([10, 20, 30, 40, 50, 60])
    expect(max).toBeLessThanOrEqual(2)
  })
  it('liste vide', async () => {
    expect(await enParallele([], 4, async (x) => x)).toEqual([])
  })
})
