import { test } from 'node:test'
import assert from 'node:assert/strict'
import { reportIpHash, sha256 } from '../worker/lib.ts'

test('hash IP laporan memakai HMAC dengan rahasia server, bukan sha256 polos (#78)', async () => {
  const env = { REPORT_HASH_KEY: 'rahasia-uji', BASE_DOMAIN: 'example.test' } as never
  const a = await reportIpHash(env, '203.0.113.7')
  assert.match(a, /^[0-9a-f]{16}$/)
  assert.equal(a, await reportIpHash(env, '203.0.113.7'), 'stabil untuk IP yang sama')
  assert.notEqual(a, await reportIpHash(env, '203.0.113.8'), 'beda IP, beda hash')
  assert.notEqual(a, (await sha256('203.0.113.7' + 'example.test')).slice(0, 16), 'tidak sama dengan sha256(ip+domain) yang mudah dibalik')
})

test('fallback: pakai ADMIN_TOKEN bila REPORT_HASH_KEY kosong, dan sha256 lama bila keduanya kosong (#78)', async () => {
  const withAdmin = { ADMIN_TOKEN: 'token-admin', BASE_DOMAIN: 'example.test' } as never
  const a = await reportIpHash(withAdmin, '203.0.113.7')
  assert.match(a, /^[0-9a-f]{16}$/)
  assert.equal(a, await reportIpHash({ REPORT_HASH_KEY: 'token-admin', BASE_DOMAIN: 'example.test' } as never, '203.0.113.7'), 'HMAC(ADMIN_TOKEN) sama dengan HMAC(REPORT_HASH_KEY) bila nilainya sama')

  const noKey = { BASE_DOMAIN: 'example.test' } as never
  assert.equal(await reportIpHash(noKey, '203.0.113.7'), (await sha256('203.0.113.7example.test')).slice(0, 16), 'lokal/dev tanpa rahasia memakai jalur lama')
})
