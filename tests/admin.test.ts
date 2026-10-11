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

/* Rute baru issue #40: unblock, restore, dan antrean reviews. */
function adminFn(): string {
  const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
  return src.slice(src.indexOf('async function admin('), src.indexOf('/* ---------- OAuth'))
}

function routeSlice(fn: string, route: string): string {
  const at = fn.indexOf(`url.pathname === '${route}'`)
  if (at < 0) return ''
  const end = fn.indexOf('url.pathname ===', at + route.length + 30)
  return fn.slice(at, end < 0 ? undefined : end)
}

test('rute admin baru berada sesudah pemeriksaan token', () => {
  const fn = adminFn()
  const guard = fn.indexOf("throw new HttpError(401, 'unauthorized')")
  assert.ok(guard > 0)
  for (const route of ['/api/admin/unblock', '/api/admin/restore', '/api/admin/reviews']) {
    const at = fn.indexOf(`url.pathname === '${route}'`)
    assert.ok(at > guard, `${route} harus berada sesudah pemeriksaan ADMIN_TOKEN`)
    assert.ok(routeSlice(fn, route).length > 0, `${route} tidak ditemukan`)
  }
})

test('restore membuat ulang record DNS dan mencatat riwayat yang punya teks', () => {
  const slice = routeSlice(adminFn(), '/api/admin/restore')
  assert.ok(slice.includes('createRecord(env, hostOf(env, s.name)'), 'record utama harus dibuat ulang')
  assert.ok(slice.includes('txtHost(env, s.txt_label, s.name)'), 'record TXT harus dibuat ulang bila ada')
  assert.ok(slice.includes("status = 'pending'"), 'status kembali pending agar diverifikasi ulang')
  assert.ok(!slice.includes('deleteRecord'), 'restore tidak boleh menghapus record')
  assert.ok(slice.includes('s.activated_at ? s.created_at : Date.now()'),
    'jendela verifikasi 24 jam harus dimulai ulang untuk yang belum pernah aktif, kalau tidak Cron langsung melepasnya lagi')
  const key = slice.match(/historyAdd\(env, s\.name, '(h\.[a-zA-Z]+)'/)?.[1]
  assert.ok(key, 'restore harus menulis riwayat')
  const dict = readFileSync(new URL('../src/lib/dict.ts', import.meta.url), 'utf8')
  assert.ok(dict.includes(`'${key}'`), `kunci riwayat ${key} harus ada di dict`)
})

test('unblock mengembalikan blokir tanpa menghapus data pengguna', () => {
  const slice = routeSlice(adminFn(), '/api/admin/unblock')
  assert.ok(slice.includes('blocked = 0'), 'status blocked harus dikembalikan ke 0')
  assert.ok(!slice.includes('DELETE FROM users'), 'unblock tidak boleh menghapus baris pengguna')
})

test('antrean tinjauan menyaring penanda h.needsReview dan menyertakan pemilik', () => {
  const slice = routeSlice(adminFn(), '/api/admin/reviews')
  assert.ok(slice.includes('h.needsReview'), 'antrean harus membaca penanda dari history')
  assert.ok(slice.includes('owner_email'), 'pemilik perlu terlihat agar laporan bisa dinilai')
  assert.ok(slice.includes('EXISTS'), 'harus memakai EXISTS, bukan seluruh riwayat')
})
