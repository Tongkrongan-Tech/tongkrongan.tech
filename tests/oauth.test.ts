import { test } from 'node:test'
import assert from 'node:assert/strict'
import { discordVerifiedEmail } from '../worker/oauth.ts'

test('email Discord yang terverifikasi dipakai apa adanya', () => {
  assert.equal(discordVerifiedEmail({ email: 'budi@mail.com', verified: true }), 'budi@mail.com')
  assert.equal(discordVerifiedEmail({ email: '  budi@mail.com ', verified: true }), 'budi@mail.com')
})

test('email Discord yang belum terverifikasi ditolak (cegah ambil alih akun)', () => {
  assert.equal(discordVerifiedEmail({ email: 'korban@mail.com', verified: false }), null)
  assert.equal(discordVerifiedEmail({ email: 'korban@mail.com' }), null)
})

test('data Discord tanpa email atau kosong ditolak', () => {
  assert.equal(discordVerifiedEmail({ email: null, verified: true }), null)
  assert.equal(discordVerifiedEmail({ email: '   ', verified: true }), null)
  assert.equal(discordVerifiedEmail({ verified: true }), null)
  assert.equal(discordVerifiedEmail(null), null)
  assert.equal(discordVerifiedEmail(undefined), null)
})
