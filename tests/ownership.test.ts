import { test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyRecord } from '../worker/dns.ts'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'

test('verifikasi membutuhkan token tepat, bukan HTTP sukses atau redirect', async (t) => {
  const token = 'a'.repeat(64)
  const env = { DNS_MODE: 'live', BASE_DOMAIN: 'example.test' } as never
  const sub = { name: 'site', type: 'CNAME' as const, value: 'target.example', ownership_token: token }
  let status = 200, body = 'generic wildcard website', dns = 'target.example.'
  t.mock.method(globalThis, 'fetch', async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Answer: [{ type: 5, data: dns }] })
    assert.equal(new URL(url).pathname, '/.well-known/tongkrongan-verification.txt')
    assert.equal(init?.redirect, 'manual')
    assert.ok(!url.includes(token))
    return new Response(body, { status })
  })
  assert.deepEqual(await verifyRecord(env, sub), { ok: false, reason: 'ownership' })
  body = token + '\n'
  assert.deepEqual(await verifyRecord(env, sub), { ok: true })
  for (const invalid of ['b'.repeat(64), `<html>${token}</html>`, ' '.repeat(300) + token]) {
    body = invalid
    assert.deepEqual(await verifyRecord(env, sub), { ok: false, reason: 'ownership' })
  }
  body = token
  status = 302
  assert.deepEqual(await verifyRecord(env, sub), { ok: false, reason: 'ownership' })
  status = 200
  assert.deepEqual(await verifyRecord(env, { ...sub, ownership_token: null }), { ok: false, reason: 'ownership' })
  dns = 'different.example.'
  assert.deepEqual(await verifyRecord(env, sub), { ok: false, reason: 'dns' })
})

test('hasil verifikasi lama tidak mengaktifkan record yang diedit, diklaim ulang, atau ditangguhkan', () => {
  const db = new DatabaseSync(':memory:')
  try {
    db.exec('CREATE TABLE subdomains (name TEXT, ownership_token TEXT, status TEXT, fail_reason TEXT, activated_at INTEGER, fail_streak INTEGER, pending_since INTEGER)')
    db.exec("INSERT INTO subdomains VALUES ('site', 'new-token', 'pending', NULL, NULL, 0, NULL)")
    for (const file of ['index.ts', 'cron.ts']) {
      const source = readFileSync(new URL(`../worker/${file}`, import.meta.url), 'utf8')
      const sql = source.match(/"(UPDATE subdomains SET status = 'active', fail_reason = NULL, activated_at = COALESCE\(activated_at, \?\)[^"]+)"/)?.[1]
      assert.ok(sql, `${file}: SQL aktivasi tidak ditemukan`)
      const update = db.prepare(sql)
      db.exec("UPDATE subdomains SET status = 'pending'")
      assert.equal(update.run(1, 'site', 'old-token').changes, 0, `${file}: hasil lama ditolak`)
      assert.equal(update.run(1, 'site', 'new-token').changes, 1, `${file}: token terkini diterima`)
      db.exec("UPDATE subdomains SET status = 'suspended'")
      assert.equal(update.run(1, 'site', 'new-token').changes, 0, `${file}: penangguhan tidak dibatalkan`)
    }
  } finally { db.close() }
})
