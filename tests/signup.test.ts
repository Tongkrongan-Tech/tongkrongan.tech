import { test } from 'node:test'
import assert from 'node:assert/strict'
import { api } from '../worker/index.ts'
import { d1, testDb } from './helpers/d1.ts'

const signup = api['POST /api/auth/signup']
const login = api['POST /api/auth/login']

const env = (db: ReturnType<typeof testDb>) => ({ DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', QUOTA: '3' } as never)
const req = (path: string, body: unknown) => new Request(`https://example.test${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify(body) })

test('email terdaftar dan email baru tidak bisa dibedakan saat verifikasi email mati (#74)', async () => {
  const db = testDb()
  try {
    db.prepare("INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, created_at) VALUES ('u-lama', 'lama@x.test', '100000$' || ?, 'aabb', 'email', 1, ?)")
      .run('f'.repeat(64), Date.now())
    const e = env(db)
    const aRes = await signup(req('/api/auth/signup', { email: 'lama@x.test', password: 'password-lama' }), e, new URL('https://example.test/api/auth/signup'), [])
    const bRes = await signup(req('/api/auth/signup', { email: 'baru@x.test', password: 'password-baru' }), e, new URL('https://example.test/api/auth/signup'), [])

    assert.equal(aRes.status, 200)
    assert.equal(bRes.status, 200)
    assert.deepEqual(await aRes.clone().json(), await bRes.clone().json(), 'badan jawaban harus sama')
    assert.equal(aRes.headers.get('set-cookie'), null, 'email terdaftar tidak boleh memberi sesi')
    assert.equal(bRes.headers.get('set-cookie'), null, 'email baru juga tidak boleh langsung memberi sesi')
    // Akun baru tetap terbuat dan bisa masuk lewat /login.
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM users WHERE email = 'baru@x.test'").get() as { n: number }).n, 1)
    const loginRes = await login(req('/api/auth/login', { email: 'baru@x.test', password: 'password-baru' }), e, new URL('https://example.test/api/auth/login'), [])
    assert.equal(loginRes.status, 200)
    assert.ok(loginRes.headers.get('set-cookie')?.includes('tt_session='), 'login setelah daftar harus memberi sesi')
  } finally { db.close() }
})

test('kuota dan validasi signup tetap berlaku (#74)', async () => {
  const db = testDb()
  try {
    const e = env(db)
    const bad = await signup(req('/api/auth/signup', { email: 'bukan-email', password: 'password123' }), e, new URL('https://example.test/api/auth/signup'), []).catch((x) => x)
    assert.equal(bad.status, 422)
  } finally { db.close() }
})
