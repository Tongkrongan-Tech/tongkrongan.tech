import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ADMIN_REASONS } from '../src/lib/admin.ts'

test('alasan di UI admin sama dengan REASONS di backend', () => {
  const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
  const backend = src.match(/const REASONS = \[([^\]]*)\]/)![1].match(/'([^']+)'/g)!.map((s) => s.slice(1, -1))
  assert.deepEqual(Object.keys(ADMIN_REASONS).sort(), backend.sort())
})

test('endpoint info subdomain admin dilindungi oleh pemeriksaan token yang sama', () => {
  const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
  const fn = src.slice(src.indexOf('async function admin('), src.indexOf('/* ---------- OAuth'))
  const guard = fn.indexOf("throw new HttpError(401, 'unauthorized')")
  const route = fn.search(/admin\\\/subdomains/) // di sumber ditulis \/api\/admin\/subdomains\/ (regex)
  assert.ok(guard > 0 && route > guard, 'rute info harus berada sesudah pemeriksaan ADMIN_TOKEN')
})

test('halaman admin tidak ditautkan di navigasi dan tidak masuk sitemap', () => {
  const layout = readFileSync(new URL('../src/components/Layout.tsx', import.meta.url), 'utf8')
  const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  assert.ok(!/to="\/admin"/.test(layout))
  assert.ok(!sitemap.includes('/admin'))
})
