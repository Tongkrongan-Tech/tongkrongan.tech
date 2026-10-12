import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/* Daftar publik untuk ticker beranda tidak boleh membocorkan pemilik atau nama yang tidak layak. */
const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
const start = src.indexOf("'GET /api/public/subdomains'")
const fn = src.slice(start, src.indexOf("'GET /api/auth/me'"))

test('endpoint publik hanya mengambil nama aktif dari pemilik yang tidak diblokir', () => {
  assert.ok(start > 0)
  assert.match(fn, /s\.status = 'active'/)
  assert.match(fn, /u\.blocked = 0/)
})

test('endpoint publik tidak memilih email atau id pemilik', () => {
  const sql = fn.match(/SELECT ([^"]*) FROM subdomains/)![1]
  assert.equal(sql.trim(), 's.name')
  assert.ok(!/email|user_id|u\.id/.test(sql))
})

test('endpoint publik dibatasi jumlahnya, dibatasi laju, dan menyaring nama merek', () => {
  assert.match(fn, /slice\(0, 30\)/)
  assert.match(fn, /rateLimit\(/)
  assert.match(fn, /classifyName\(n\)\.review/)
})
