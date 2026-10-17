import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const worker = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')

test('CSP tidak lagi mengizinkan skrip inline (#79)', () => {
  const csp = worker.match(/'content-security-policy': "([^"]+)"/)?.[1]
  assert.ok(csp, 'CSP harus ada di worker')
  const scriptSrc = csp.match(/script-src ([^;]+)/)?.[1] ?? ''
  assert.ok(!scriptSrc.includes("'unsafe-inline'"), 'script-src tidak boleh unsafe-inline')
  assert.match(scriptSrc, /'self'/)
  assert.match(scriptSrc, /https:\/\/challenges\.cloudflare\.com/, 'Turnstile tetap boleh')
})

test('bootstrap tema pindah ke /theme.js, bukan skrip inline (#79)', () => {
  const inline = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter(([, attrs]) => !/\bsrc=/.test(attrs) && !/type="application\/ld\+json"/.test(attrs))
  assert.equal(inline.length, 0, 'tidak boleh ada skrip yang dieksekusi inline di index.html')
  assert.match(html, /<script src="\/theme\.js"><\/script>/, 'theme.js harus dimuat tanpa defer agar tidak berkedip')
  // JSON-LD tetap boleh inline: itu data, bukan skrip yang dieksekusi.
  assert.match(html, /application\/ld\+json/)
})

test('daftar tema di theme.js sinkron dengan src/lib/prefs.tsx (#79)', () => {
  const theme = readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8')
  const prefs = readFileSync(new URL('../src/lib/prefs.tsx', import.meta.url), 'utf8')
  const prefsList = prefs.match(/export const THEMES = \[([^\]]+)\]/)?.[1]
  assert.ok(prefsList, 'THEMES harus ada di prefs.tsx')
  const jsList = theme.match(/var THEMES = \[([^\]]+)\]/)?.[1]
  assert.ok(jsList, 'THEMES harus ada di theme.js')
  const parse = (s: string) => [...s.matchAll(/'([a-z]+)'/g)].map((m) => m[1])
  assert.deepEqual(parse(jsList), parse(prefsList))
})
