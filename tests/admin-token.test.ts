import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { d1, testDb } from './helpers/d1.ts'

function adminEnv(db: ReturnType<typeof testDb>) {
  return { DB: d1(db), ADMIN_TOKEN: 'rahasia-panjang', BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', QUOTA: '3' } as never
}

test('token admin punya pembatas laju dan kuncian setelah 20 kegagalan (#78)', async (t) => {
  const db = testDb()
  try {
    const env = adminEnv(db)
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('fetch tak terduga') })
    const attempt = async (token: string, ip = '203.0.113.9') => (await handleFetch(new Request('https://example.test/api/admin/reports', { headers: { authorization: `Bearer ${token}`, 'cf-connecting-ip': ip } }), env)).status
    for (let i = 1; i <= 20; i++) assert.equal(await attempt('salah'), 401, `percobaan ke-${i}`)
    assert.equal(await attempt('salah'), 429, 'setelah 20 kegagalan, token salah dibalas 429')
    assert.equal(await attempt('rahasia-panjang'), 429, 'kuncian menahan semua percobaan dari IP itu, termasuk token benar')
    assert.equal(await attempt('salah', '198.51.100.7'), 401, 'IP lain tidak terkena kuncian')
    assert.equal(await attempt('rahasia-panjang', '198.51.100.7'), 200, 'token benar dari IP bersih tetap bekerja')
  } finally { db.close() }
})

test('pergantian token admin tetap di bawah pembatas laju umum (#78)', async (t) => {
  const db = testDb()
  try {
    const env = adminEnv(db)
    t.mock.method(globalThis, 'fetch', async () => { throw new Error('fetch tak terduga') })
    for (let i = 0; i < 120; i++) {
      const res = await handleFetch(new Request('https://example.test/api/admin/reports', { headers: { authorization: 'Bearer rahasia-panjang', 'cf-connecting-ip': '203.0.113.50' } }), env)
      assert.equal(res.status, 200)
    }
    const res = await handleFetch(new Request('https://example.test/api/admin/reports', { headers: { authorization: 'Bearer rahasia-panjang', 'cf-connecting-ip': '203.0.113.50' } }), env)
    assert.equal(res.status, 429, 'batas 120 permintaan / 15 menit per IP')
  } finally { db.close() }
})
