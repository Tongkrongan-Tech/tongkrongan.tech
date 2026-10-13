import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
const route = (name: string) => {
  const i = src.indexOf(`'${name}'`)
  assert.ok(i > 0, `rute ${name} tidak ada`)
  return src.slice(i, i + 1400)
}

test('ganti sandi: wajib login, sandi lama dicek, sesi lain dicabut', () => {
  const r = route('POST /api/account/password')
  assert.match(r, /requireUser/)
  assert.match(r, /checkPassword/)
  assert.match(r, /DELETE FROM sessions WHERE user_id = \? AND token_hash != \?/)
})

test('hapus akun: wajib login, konfirmasi sandi atau email, semua subdomain dilepas', () => {
  const r = route('POST /api/account/delete')
  assert.match(r, /requireUser/)
  assert.match(r, /checkPassword/)
  assert.match(r, /'confirm'/)
  assert.match(r, /releaseSub/)
  assert.match(r, /DELETE FROM users WHERE id = \?/)
})
