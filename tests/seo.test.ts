import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const html = read('index.html')
const meta = (key: string) => html.match(new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`))?.[1]

test('og:image mutlak, ada di public/, dan ringan', () => {
  const img = meta('og:image')!
  assert.match(img, /^https:\/\/tongkrongan\.tech\/[\w.-]+\.jpg$/)
  const file = new URL(`../public/${img.split('/').pop()}`, import.meta.url)
  assert.ok(statSync(file).size < 300_000, 'banner harus di bawah 300 KB agar WhatsApp/Facebook mau memakainya')
  assert.equal(meta('og:image:width'), '1200')
  assert.equal(meta('og:image:height'), '630')
  assert.equal(meta('twitter:image'), img)
  assert.equal(meta('twitter:card'), 'summary_large_image')
})

test('judul dan deskripsi tidak melewati batas tampil mesin pencari', () => {
  const title = html.match(/<title>([^<]*)<\/title>/)![1]
  assert.ok(title.length <= 65, `judul ${title.length} karakter`)
  assert.ok(meta('description')!.length <= 160, 'deskripsi maksimal 160 karakter')
  assert.equal(meta('og:title'), title)
})

test('canonical, robots.txt, dan sitemap konsisten', () => {
  assert.match(html, /<link rel="canonical" href="https:\/\/tongkrongan\.tech\/"/)
  assert.match(read('public/robots.txt'), /Sitemap: https:\/\/tongkrongan\.tech\/sitemap\.xml/)
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://tongkrongan.tech', '') || '/')
  const seo = read('src/lib/seo.ts')
  const indexable = seo.match(/INDEXABLE = \[([^\]]*)\]/)![1].match(/'[^']+'/g)!.map((s) => s.slice(1, -1))
  assert.deepEqual(locs.sort(), indexable.sort())
})

test('JSON-LD valid', () => {
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1])
  assert.ok(ld['@graph'].some((n: { '@type': string }) => n['@type'] === 'WebSite'))
})
