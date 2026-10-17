import { test } from 'node:test'
import assert from 'node:assert/strict'
import { csrfGuard, HttpError } from '../worker/lib.ts'

const post = (headers: Record<string, string> = {}) => new Request('https://app.test/api/x', { method: 'POST', headers })
const rejects = (fn: () => void) => {
  try { fn() } catch (e) { return e instanceof HttpError && e.status === 403 && e.code === 'bad_origin' }
  return false
}

test('Origin: null dijawab 403 bad_origin, bukan 500 (#73)', () => {
  assert.equal(rejects(() => csrfGuard(post({ origin: 'null' }))), true)
})

test('origin lintas situs, kosong, atau tak terbaca ditolak 403 (#73)', () => {
  for (const origin of ['https://evil.test', 'null', '', 'file:///etc/passwd', '::::', 'http://app.test.evil.test']) {
    assert.equal(rejects(() => csrfGuard(post({ origin }))), true, origin)
  }
})

test('permintaan sah tetap lolos (#73)', () => {
  assert.doesNotThrow(() => csrfGuard(post({ origin: 'https://app.test' })))
  assert.doesNotThrow(() => csrfGuard(post({ origin: 'https://app.test:443' })))
  assert.doesNotThrow(() => csrfGuard(post({ 'content-type': 'application/json' })))
  assert.doesNotThrow(() => csrfGuard(new Request('https://app.test/api/x')))
  assert.doesNotThrow(() => csrfGuard(new Request('https://app.test/api/x', { method: 'GET' })))
})

test('tanpa Origin, permintaan non-JSON tanpa Authorization tetap ditolak (#73)', () => {
  assert.equal(rejects(() => csrfGuard(post({ 'content-type': 'text/plain' }))), true)
  assert.doesNotThrow(() => csrfGuard(post({ 'content-type': 'text/plain', authorization: 'Bearer x' })))
})
