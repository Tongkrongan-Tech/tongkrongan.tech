import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { d1, testDb } from './helpers/d1.ts'

function oauthEnv(db: ReturnType<typeof testDb>, verifyOn = false) {
  return {
    DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', QUOTA: '3', DISCORD_CLIENT_ID: 'id', DISCORD_CLIENT_SECRET: 'rahasia',
    ...(verifyOn ? { REQUIRE_EMAIL_VERIFY: '1', RESEND_API_KEY: 'kunci', EMAIL_FROM: 'Tongkrongan <noreply@example.test>' } : {}),
  } as never
}

function discordCallback(state: string) {
  return new Request(`https://example.test/api/auth/discord/callback?state=${state}&code=code-uji`, { headers: { cookie: `tt_oauth=${state}` } })
}

function mockDiscord(t: import('node:test').TestContext, email: string) {
  t.mock.method(globalThis, 'fetch', async (input: string | URL) => {
    const url = String(input)
    if (url.startsWith('https://discord.com/api/oauth2/token')) return Response.json({ access_token: 'tok-uji' })
    if (url.startsWith('https://discord.com/api/users/@me')) return Response.json({ email, verified: true })
    throw new Error(`fetch tak terduga: ${url}`)
  })
}

test('login OAuth ke akun sandi belum terverifikasi mencabut sandi dan sesi penyerang (#68)', async (t) => {
  const db = testDb()
  try {
    // Skenario pre-hijacking: penyerang mendaftar dengan email korban + sandinya, akun belum terverifikasi.
    db.prepare("INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, blocked, created_at) VALUES ('u-korban', 'korban@mail.com', '100000$' || ?, 'aabb', 'email', 0, 0, ?)")
      .run('e'.repeat(64), Date.now())
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('sesi-penyerang', 'u-korban', ?)").run(Date.now() + 86_400_000)
    mockDiscord(t, 'korban@mail.com')

    const res = await handleFetch(discordCallback('state-uji'), oauthEnv(db))
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), 'https://example.test/dashboard')

    const u = db.prepare("SELECT verified, pw_hash, pw_salt FROM users WHERE id = 'u-korban'").get() as { verified: number; pw_hash: string | null; pw_salt: string | null }
    assert.equal(u.verified, 1, 'kepemilikan email dibuktikan OAuth, akun ditandai terverifikasi')
    assert.equal(u.pw_hash, null, 'sandi penyerang dihapus')
    assert.equal(u.pw_salt, null)
    assert.equal((db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'u-korban' AND token_hash = 'sesi-penyerang'").get() as { n: number }).n, 0, 'sesi lama dicabut')
    assert.ok(res.headers.get('set-cookie')?.includes('__Host-tt_session='), 'korban mendapat sesi baru')
  } finally { db.close() }
})

test('login OAuth ke akun terverifikasi tidak menghapus sandi yang sah (#68)', async (t) => {
  const db = testDb()
  try {
    db.prepare("INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, blocked, created_at) VALUES ('u-sah', 'sah@mail.com', '100000$' || ?, 'aabb', 'email', 1, 0, ?)")
      .run('d'.repeat(64), Date.now())
    mockDiscord(t, 'sah@mail.com')
    const res = await handleFetch(discordCallback('state-uji'), oauthEnv(db, true))
    assert.equal(res.status, 302)
    const u = db.prepare("SELECT verified, pw_hash FROM users WHERE id = 'u-sah'").get() as { verified: number; pw_hash: string | null }
    assert.equal(u.pw_hash, '100000$' + 'd'.repeat(64), 'pemilik yang sudah membuktikan emailnya tidak kehilangan sandi')
  } finally { db.close() }
})

test('saat verifikasi email dimatikan, sandi akun yang belum pernah terbukti juga dicabut (#68)', async (t) => {
  const db = testDb()
  try {
    // Di konfigurasi ini pendaftaran langsung verified=1, tetapi kepemilikan email belum pernah dibuktikan.
    db.prepare("INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, blocked, created_at) VALUES ('u-dev', 'dev@mail.com', '100000$' || ?, 'aabb', 'email', 1, 0, ?)")
      .run('c'.repeat(64), Date.now())
    mockDiscord(t, 'dev@mail.com')
    const res = await handleFetch(discordCallback('state-uji'), oauthEnv(db, false))
    assert.equal(res.status, 302)
    const u = db.prepare("SELECT pw_hash FROM users WHERE id = 'u-dev'").get() as { pw_hash: string | null }
    assert.equal(u.pw_hash, null, 'tanpa verifikasi email, akun bersandi tidak boleh mempertahankan sandi saat OAuth masuk')
  } finally { db.close() }
})
