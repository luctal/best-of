import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Les couleurs du manifeste et de index.html sont des copies des tokens : ce test garde les copies alignées.
const lire = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')
const tokens = lire('src/tokens.css')
const token = (nom: string) => new RegExp(`--color-${nom}:\\s*(#[0-9A-Fa-f]{6})`).exec(tokens)?.[1].toUpperCase()
const manifeste = JSON.parse(lire('public/manifest.webmanifest')) as {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  background_color: string
  theme_color: string
  icons: { src: string; sizes: string; type: string; purpose: string }[]
}

describe('manifeste de l’appli', () => {
  it('nom, portée et affichage', () => {
    expect(manifeste.name).toBe('Best of')
    expect(manifeste.short_name).toBe('Best of')
    expect(manifeste.start_url).toBe('/best-of/')
    expect(manifeste.scope).toBe('/best-of/')
    expect(manifeste.display).toBe('standalone')
  })
  it('couleurs égales aux tokens fond et vert-sombre', () => {
    expect(manifeste.background_color.toUpperCase()).toBe(token('fond'))
    expect(manifeste.theme_color.toUpperCase()).toBe(token('vert-sombre'))
  })
  it('theme-color de index.html égale au token vert-sombre', () => {
    const m = /<meta name="theme-color" content="(#[0-9A-Fa-f]{6})"/.exec(lire('index.html'))
    expect(m?.[1].toUpperCase()).toBe(token('vert-sombre'))
  })
  it('icônes : 192 et 512 « any », 512 « maskable », fichiers présents', () => {
    const par = (taille: string, but: string) => manifeste.icons.find((i) => i.sizes === taille && i.purpose === but)
    expect(par('192x192', 'any')).toBeDefined()
    expect(par('512x512', 'any')).toBeDefined()
    expect(par('512x512', 'maskable')).toBeDefined()
    for (const i of manifeste.icons) expect(existsSync(new URL(`../public/${i.src}`, import.meta.url))).toBe(true)
  })
  it('index.html relie manifeste, icône Apple et titre iOS', () => {
    const h = lire('index.html')
    expect(h).toContain('rel="manifest"')
    expect(h).toContain('rel="apple-touch-icon"')
    expect(h).toContain('apple-mobile-web-app-capable')
    expect(h).toContain('content="Best of"')
    expect(existsSync(new URL('../public/apple-touch-icon.png', import.meta.url))).toBe(true)
  })
})
