import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { sha256 } from '../worker/lib.ts'
import { d1, testDb } from './helpers/d1.ts'

const TOKEN = 'a'.repeat(64)

test('daftar subdomain memakai query batch, bukan N+1', async () => {
  const db = testDb()
  try {
    const now = Date.now()
    db.prepare("INSERT INTO users (id, email, provider, verified, created_at) VALUES ('u1', 'u@mail.test', 'email', 1, ?)").run(now)
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(await sha256(TOKEN), 'u1', now + 86_400_000)
    db.prepare("INSERT INTO subdomains (name, user_id, platform, type, value, status, created_at, ownership_token) VALUES ('satu', 'u1', 'vps', 'A', '1.1.1.1', 'active', ?, 'x')").run(now - 3_000)
    db.prepare("INSERT INTO subdomains (name, user_id, platform, type, value, status, created_at, ownership_token) VALUES ('dua', 'u1', 'vps', 'A', '1.0.0.1', 'pending', ?, 'y')").run(now - 2_000)
    db.prepare("INSERT INTO history (name, key, detail, at) VALUES ('satu', 'h.created', NULL, ?), ('satu', 'h.edited', 'A 1.1.1.1', ?), ('dua', 'h.created', NULL, ?)")
      .run(now - 2_000, now - 1_000, now - 500)
    const addHistory = db.prepare("INSERT INTO history (name, key, detail, at) VALUES ('satu', 'h.extra', ?, ?)")
    for (let i = 0; i < 35; i++) addHistory.run(String(i), now - 10_000 + i)
    db.prepare("INSERT INTO checks (name, ok, at) VALUES ('satu', 1, ?), ('satu', 0, ?), ('dua', 1, ?)")
      .run(now - 2_000, now - 1_000, now)
    db.prepare("INSERT INTO csat (name, sub_created, score, at) VALUES ('satu', ?, 5, ?)").run(now - 3_000, now)

    const base = d1(db)
    let prepared = 0
    const env = {
      DB: {
        prepare(sql: string) { prepared++; return base.prepare(sql) },
        batch(stmts: Parameters<typeof base.batch>[0]) { return base.batch(stmts) },
      },
      BASE_DOMAIN: 'example.test',
      DNS_MODE: 'mock',
      QUOTA: '3',
    } as never

    const res = await handleFetch(new Request('https://example.test/api/subdomains', { headers: { cookie: `__Host-tt_session=${TOKEN}` } }), env)
    assert.equal(res.status, 200)
    const body = await res.json() as {
      quota: number
      subdomains: { name: string; rated: boolean; checks: boolean[]; history: { key: string; detail?: string }[] }[]
    }
    assert.equal(body.quota, 3)
    assert.equal(body.subdomains.length, 2)

    const satu = body.subdomains.find((s) => s.name === 'satu')!
    const dua = body.subdomains.find((s) => s.name === 'dua')!
    assert.equal(satu.rated, true)
    assert.equal(dua.rated, false, 'csat milik subdomain lain tidak boleh ikut terbaca')
    assert.deepEqual(satu.checks, [true, false], 'urutan check tetap dari lama ke baru')
    assert.equal(satu.history[0].key, 'h.edited')
    assert.equal(satu.history[0].detail, 'A 1.1.1.1')
    assert.equal(satu.history.length, 30, 'riwayat tetap dibatasi 30 per subdomain')
    assert.equal(prepared, 5, 'user, daftar, dan tiga query batch')
  } finally {
    db.close()
  }
})
