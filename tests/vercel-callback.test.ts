import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { sha256 } from '../worker/lib.ts'
import { makeState } from '../worker/vercel.ts'
import { d1, testDb } from './helpers/d1.ts'

const TOKEN = 'f'.repeat(64)

async function setup(db: ReturnType<typeof testDb>, t: import('node:test').TestContext) {
  db.prepare("INSERT INTO users (id, email, provider, verified, created_at) VALUES ('u1', 'u@mail.test', 'email', 1, ?)").run(Date.now())
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(await sha256(TOKEN), 'u1', Date.now() + 86_400_000)
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    const url = String(input)
    if (url.startsWith('https://api.vercel.com/v2/oauth/access_token')) return Response.json({ access_token: 'tok-vercel', team_id: null })
    throw new Error(`fetch tak terduga: ${url}`)
  })
}

async function callbackLocation(db: ReturnType<typeof testDb>, next: string | null) {
  const env = { DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', VERCEL_CLIENT_ID: 'id', VERCEL_CLIENT_SECRET: 'sec', VERCEL_INTEGRATION_SLUG: 'tongkrongan', VERCEL_TOKEN_KEY: 'b'.repeat(64) } as never
  const state = await makeState(env, 'u1')
  const q = new URLSearchParams({ code: 'c', state, ...(next ? { next } : {}) })
  const req = new Request(`https://example.test/api/vercel/callback?${q}`, { headers: { cookie: `__Host-tt_session=${TOKEN}` } })
  const res = await handleFetch(req, env)
  assert.equal(res.status, 302)
  return res.headers.get('location')
}

test('callback Vercel hanya menerima tujuan di domain vercel.com (#75)', async (t) => {
  const db = testDb()
  try {
    await setup(db, t)
    assert.equal(await callbackLocation(db, 'https://foo.vercel.app/setup'), '/claim?vercel=1', 'subdomain vercel.app dikuasai siapa pun, tolak')
    assert.equal(await callbackLocation(db, 'https://evil.test/'), '/claim?vercel=1')
    assert.equal(await callbackLocation(db, 'https://evil-vercel.com/'), '/claim?vercel=1', 'akhiran vercel.com saja tidak cukup')
    assert.equal(await callbackLocation(db, 'http://vercel.com/x'), '/claim?vercel=1', 'harus https')
    assert.equal(await callbackLocation(db, 'https://vercel.com/integrations/tongkrongan'), 'https://vercel.com/integrations/tongkrongan')
    assert.equal(await callbackLocation(db, 'https://app.vercel.com/dashboard'), 'https://app.vercel.com/dashboard')
    assert.equal(await callbackLocation(db, null), '/claim?vercel=1', 'tanpa next jatuh ke halaman claim')
  } finally { db.close() }
})
