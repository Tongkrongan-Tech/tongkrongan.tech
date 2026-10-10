import { test } from 'node:test'
import assert from 'node:assert/strict'
import { genericTxtInvalid } from '../src/lib/txt.ts'

test('TXT kosong dan tidak disentuh dianggap benar (opsional)', () => {
  assert.equal(genericTxtInvalid('_railway-verify', '', false), false)
})

test('nilai terisi dengan nama bawaan yang valid diterima', () => {
  assert.equal(genericTxtInvalid('_railway-verify', 'railway-verify=abc123', false), false)
  assert.equal(genericTxtInvalid('  _Railway-Verify ', ' railway-verify=abc ', true), false)
})

test('nama harus diawali garis bawah dan hanya huruf kecil, angka, tanda hubung', () => {
  assert.equal(genericTxtInvalid('railway-verify', 'x', true), true)
  assert.equal(genericTxtInvalid('_rail way', 'x', true), true)
  assert.equal(genericTxtInvalid('_a.b', 'x', true), true)
  assert.equal(genericTxtInvalid('_' + 'a'.repeat(41), 'x', true), true)
  assert.equal(genericTxtInvalid('_' + 'a'.repeat(40), 'x', true), false)
})

test('nama diubah tetapi nilai kosong dianggap salah; nilai tanpa nama juga', () => {
  assert.equal(genericTxtInvalid('_railway-verify', '', true), true)
  assert.equal(genericTxtInvalid('', 'railway-verify=abc', true), true)
})

test('nilai lebih dari 255 karakter ditolak', () => {
  assert.equal(genericTxtInvalid('_railway-verify', 'x'.repeat(255), false), false)
  assert.equal(genericTxtInvalid('_railway-verify', 'x'.repeat(256), false), true)
})
