import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { runCron } from '../worker/cron.ts'
import { saveConnection } from '../worker/vercel.ts'
import { d1, testDb } from './helpers/d1.ts'

const DAY = 86_400_000
const TOKEN = 'a'.repeat(64)

type Sub = Record<string, unknown> & { name: string }

function seedSub(db: DatabaseSync, s: Sub) {
  const row = {
    user_id: 'u1', platform: 'vps', type: 'CNAME', value: 'target.example', status: 'pending', fail_reason: null,
    cf_record_id: null, txt_label: null, txt_value: null, txt_record_id: null, last_check_at: 0,
    created_at: Date.now(), activated_at: null, pending_since: Date.now(), fail_streak: 0, name_checked_at: null,
    ownership_token: TOKEN, vercel_project: null, ...s,
  }
  db.prepare(`INSERT INTO subdomains (name, user_id, platform, type, value, status, fail_reason, cf_record_id, txt_label, txt_value, txt_record_id, last_check_at, created_at, activated_at, pending_since, fail_streak, name_checked_at, ownership_token, vercel_project)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    row.name, row.user_id, row.platform, row.type, row.value, row.status, row.fail_reason, row.cf_record_id,
    row.txt_label, row.txt_value, row.txt_record_id, row.last_check_at, row.created_at, row.activated_at,
    row.pending_since, row.fail_streak, row.name_checked_at, row.ownership_token, row.vercel_project,
  )
}

function seedUser(db: DatabaseSync, id: string, opts: { verified?: number; created_at?: number } = {}) {
  db.prepare('INSERT INTO users (id, email, provider, verified, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, `${id}@mail.test`, 'email', opts.verified ?? 1, opts.created_at ?? Date.now())
}

type MockCfg = {
  dns?: Record<string, string[]>
  hosts?: Record<string, { status?: number; body?: string }>
  safe?: string[]
  vercelCalls?: string[]
}

function mockFetch(t: import('node:test').TestContext, cfg: MockCfg) {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input))
    if (url.hostname === 'cloudflare-dns.com') {
      const name = url.searchParams.get('name')!
      const answers = (cfg.dns?.[name] ?? []).map((data) => ({ type: 5, data }))
      return Response.json(answers.length ? { Answer: answers } : {})
    }
    if (url.hostname === 'api.cloudflare.com') return Response.json({ success: true, result: { id: 'x' } })
    if (url.hostname === 'safebrowsing.googleapis.com') {
      const body = JSON.parse(String(init?.body ?? '{}')) as { threatInfo?: { threatEntries?: { url: string }[] } }
      const matches = (body.threatInfo?.threatEntries ?? [])
        .filter((e) => cfg.safe?.includes(new URL(e.url).hostname))
        .map((e) => ({ threat: { url: e.url } }))
      return Response.json(matches.length ? { matches } : {})
    }
    if (url.hostname === 'api.vercel.com') { cfg.vercelCalls?.push(url.pathname); return Response.json({}) }
    const h = cfg.hosts?.[url.hostname]
    if (h) {
      const status = h.status ?? 200
      if (url.pathname.startsWith('/.well-known/')) return new Response(h.body && status < 400 ? h.body : '', { status })
      return new Response(h.body ?? '', { status, headers: { 'content-type': 'text/html' } })
    }
    throw new Error(`fetch tak terduga: ${url.href}`)
  })
}

function cronEnv(db: DatabaseSync) {
  return { DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'live', QUOTA: '3', CF_API_TOKEN: 'tok', CF_ZONE_ID: 'zona', VERCEL_TOKEN_KEY: 'b'.repeat(64) } as never
}

const historyKeys = (db: DatabaseSync, name: string) =>
  (db.prepare('SELECT key FROM history WHERE name = ?').all(name) as { key: string }[]).map((r) => r.key)

test('health check: 3 kegagalan berturut menandai down, 5 kegagalan membekukan DNS, sehat memulihkan (#77)', async (t) => {
  const db = testDb()
  const now = Date.now()
  try {
    seedUser(db, 'u1')
    seedSub(db, { name: 'sehat', status: 'active', cf_record_id: 'r-sehat', activated_at: now - DAY })
    seedSub(db, { name: 'goyang', status: 'active', fail_streak: 2, cf_record_id: 'r-goyang', activated_at: now - DAY })
    seedSub(db, { name: 'beku', status: 'failed', fail_reason: 'down', fail_streak: 4, cf_record_id: 'r-beku', activated_at: now - DAY })
    seedSub(db, { name: 'pulih', status: 'failed', fail_reason: 'down', fail_streak: 3, cf_record_id: 'r-pulih', activated_at: now - DAY })
    mockFetch(t, {
      hosts: {
        'sehat.example.test': { status: 200 },
        'goyang.example.test': { status: 500 },
        'beku.example.test': { status: 503 },
        'pulih.example.test': { status: 200 },
      },
    })
    await runCron(cronEnv(db))

    const sehat = db.prepare("SELECT status, fail_streak FROM subdomains WHERE name = 'sehat'").get() as { status: string; fail_streak: number }
    assert.equal(sehat.status, 'active')
    assert.equal(sehat.fail_streak, 0)

    const goyang = db.prepare("SELECT status, fail_reason, fail_streak FROM subdomains WHERE name = 'goyang'").get() as { status: string; fail_reason: string; fail_streak: number }
    assert.equal(goyang.status, 'failed', '3 kegagalan berturut-turut bikin status down')
    assert.equal(goyang.fail_reason, 'down')
    assert.equal(goyang.fail_streak, 3)
    assert.ok(historyKeys(db, 'goyang').includes('h.failed'))

    const beku = db.prepare("SELECT status, fail_reason, fail_streak, cf_record_id FROM subdomains WHERE name = 'beku'").get() as { status: string; fail_reason: string; fail_streak: number; cf_record_id: string | null }
    assert.equal(beku.status, 'failed')
    assert.equal(beku.fail_reason, 'takeover', '5 kegagalan berturut-turut membekukan DNS')
    assert.equal(beku.cf_record_id, null)
    assert.equal(beku.fail_streak, 0)

    const pulih = db.prepare("SELECT status, fail_reason, fail_streak FROM subdomains WHERE name = 'pulih'").get() as { status: string; fail_reason: string | null; fail_streak: number }
    assert.equal(pulih.status, 'active', 'situs yang kembali sehat pulih otomatis')
    assert.equal(pulih.fail_reason, null)
    assert.equal(pulih.fail_streak, 0)
    assert.ok(historyKeys(db, 'pulih').includes('h.active'))
  } finally { db.close() }
})

test('subdomain hasil edit diverifikasi ulang lewat pending_since, dan dibekukan bila tak pernah diverifikasi (#70)', async (t) => {
  const db = testDb()
  const now = Date.now()
  try {
    seedUser(db, 'u1')
    seedSub(db, { name: 'selesai', status: 'pending', activated_at: now - 10 * DAY, pending_since: now - 3600_000, cf_record_id: 'r-selesai' })
    seedSub(db, { name: 'telantar', status: 'pending', activated_at: now - 10 * DAY, pending_since: now - 2 * DAY, cf_record_id: 'r-telantar' })
    seedSub(db, { name: 'basah', status: 'pending', activated_at: null, pending_since: now - 2 * DAY, cf_record_id: 'r-basah' })
    db.prepare("INSERT INTO checks (name, ok, at) VALUES ('basah', 1, ?)").run(now)
    db.prepare("INSERT INTO csat (name, sub_created, score, at) VALUES ('basah', ?, 5, ?)").run(now - 2 * DAY, now)
    db.prepare("INSERT INTO history (name, key, detail, at) VALUES ('basah', 'h.created', NULL, ?)").run(now - 2 * DAY)
    mockFetch(t, { dns: { 'selesai.example.test': ['target.example.'] }, hosts: { 'selesai.example.test': { body: TOKEN } } })
    await runCron(cronEnv(db))

    const selesai = db.prepare("SELECT status, activated_at, fail_reason FROM subdomains WHERE name = 'selesai'").get() as { status: string; activated_at: number; fail_reason: string | null }
    assert.equal(selesai.status, 'active', 'edit yang diverifikasi ulang kembali aktif')
    assert.equal(selesai.activated_at, now - 10 * DAY, 'activated_at pertama tidak berubah')
    assert.ok(historyKeys(db, 'selesai').includes('h.active'))

    const telantar = db.prepare("SELECT status, fail_reason, cf_record_id FROM subdomains WHERE name = 'telantar'").get() as { status: string; fail_reason: string; cf_record_id: string | null }
    assert.equal(telantar.status, 'failed', 'edit tanpa verifikasi dalam 24 jam dibekukan')
    assert.equal(telantar.fail_reason, 'unverified')
    assert.equal(telantar.cf_record_id, null)

    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM subdomains WHERE name = 'basah'").get().n, 0, 'klaim yang tak pernah aktif dan kedaluwarsa dilepas')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM checks WHERE name = 'basah'").get().n, 0, 'pembersihan membersihkan checks')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM csat WHERE name = 'basah'").get().n, 0, 'pembersihan membersihkan csat')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM history WHERE name = 'basah'").get().n, 0)
  } finally { db.close() }
})

test('pembersihan tahap 1 juga melepas domain Vercel pengguna (#77)', async (t) => {
  const db = testDb()
  const now = Date.now()
  try {
    seedUser(db, 'u-v')
    const env = cronEnv(db)
    await saveConnection(env, 'u-v', 'tok-vercel', null)
    seedSub(db, { name: 'stale-v', user_id: 'u-v', platform: 'vercel', vercel_project: 'proj', status: 'pending', activated_at: null, pending_since: now - 2 * DAY, cf_record_id: 'r-v', txt_record_id: 'r-v-txt' })
    db.prepare("INSERT INTO checks (name, ok, at) VALUES ('stale-v', 1, ?)").run(now)
    db.prepare("INSERT INTO history (name, key, detail, at) VALUES ('stale-v', 'h.created', NULL, ?)").run(now - 2 * DAY)
    const vercelCalls: string[] = []
    mockFetch(t, { vercelCalls })
    await runCron(env)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM subdomains WHERE name = 'stale-v'").get().n, 0)
    assert.ok(vercelCalls.some((p) => p.includes('/v9/projects/proj/domains/stale-v.example.test')), 'domain di proyek Vercel pengguna ikut dilepas')
  } finally { db.close() }
})

test('Safe Browsing dan pindai konten juga menjangkau status pending/failed (#69)', async (t) => {
  const db = testDb()
  const now = Date.now()
  try {
    seedUser(db, 'u1')
    seedSub(db, { name: 'phish', status: 'pending', cf_record_id: 'r-phish' })
    seedSub(db, { name: 'judol', status: 'pending', cf_record_id: 'r-judol' })
    mockFetch(t, {
      hosts: { 'judol.example.test': { body: '<html>judi online slot gacor maxwin bonus new member</html>' } },
      safe: ['phish.example.test'],
    })
    const env = { ...(cronEnv(db) as object), SAFE_BROWSING_KEY: 'kunci' } as never
    await runCron(env)
    const phish = db.prepare("SELECT status, cf_record_id FROM subdomains WHERE name = 'phish'").get() as { status: string; cf_record_id: string | null }
    assert.equal(phish.status, 'suspended')
    assert.equal(phish.cf_record_id, null)
    const judol = db.prepare("SELECT status, cf_record_id FROM subdomains WHERE name = 'judol'").get() as { status: string; cf_record_id: string | null }
    assert.equal(judol.status, 'suspended', 'konten judi di subdomain yang belum aktif tetap ditangguhkan')
    assert.equal(judol.cf_record_id, null)
  } finally { db.close() }
})

test('antrean review nama memakai penanda per-baris, bukan LIMIT tanpa urutan (#76)', async (t) => {
  const db = testDb()
  try {
    seedUser(db, 'u1')
    seedSub(db, { name: 'googl', status: 'active', activated_at: Date.now() - DAY })
    seedSub(db, { name: 'biasaoke', status: 'active', activated_at: Date.now() - DAY })
    seedSub(db, { name: 'sudahdiperiksa', status: 'active', activated_at: Date.now() - DAY, name_checked_at: 1 })
    mockFetch(t, { hosts: { 'googl.example.test': { status: 200 }, 'biasaoke.example.test': { status: 200 }, 'sudahdiperiksa.example.test': { status: 200 } } })
    await runCron(cronEnv(db))

    assert.ok(historyKeys(db, 'googl').includes('h.needsReview'), 'nama yang menyerupai merek ditandai')
    assert.equal(db.prepare("SELECT name_checked_at FROM subdomains WHERE name = 'googl'").get().name_checked_at !== null, true)
    assert.ok(!historyKeys(db, 'biasaoke').includes('h.needsReview'))
    assert.equal(db.prepare("SELECT name_checked_at FROM subdomains WHERE name = 'biasaoke'").get().name_checked_at !== null, true, 'yang sudah diperiksa ikut ditandai agar tidak mengulang antrean')
    assert.equal(db.prepare("SELECT name_checked_at FROM subdomains WHERE name = 'sudahdiperiksa'").get().name_checked_at, 1, 'yang sudah pernah diperiksa tidak disentuh lagi')
  } finally { db.close() }
})

test('akun yang tak pernah diverifikasi kedaluwarsa dan dibersihkan (#68)', async (t) => {
  const db = testDb()
  const now = Date.now()
  try {
    seedUser(db, 'unv-lama', { verified: 0, created_at: now - 8 * DAY })
    seedUser(db, 'unv-baru', { verified: 0, created_at: now - 3600_000 })
    seedUser(db, 'terverifikasi', { verified: 1, created_at: now - 30 * DAY })
    db.prepare("INSERT INTO email_otps (user_id, code_hash, expires_at, attempts, created_at) VALUES ('unv-lama', 'x', ?, 0, ?)").run(now - DAY, now - DAY)
    db.prepare("INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ('t', 'unv-lama', ?)").run(now + DAY)
    db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ('s', 'unv-lama', ?)").run(now + DAY)
    mockFetch(t, {})
    await runCron(cronEnv(db))
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'unv-lama'").get().n, 0, 'akun belum terverifikasi >7 hari dihapus')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'unv-baru'").get().n, 1, 'yang baru mendaftar tetap ada')
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE id = 'terverifikasi'").get().n, 1)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM email_otps WHERE user_id = 'unv-lama'").get().n, 0)
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE user_id = 'unv-lama'").get().n, 0)
  } finally { db.close() }
})
