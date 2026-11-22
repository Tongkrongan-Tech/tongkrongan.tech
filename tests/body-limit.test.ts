import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { d1, testDb } from './helpers/d1.ts'

function makeEnv(db: ReturnType<typeof testDb>) {
  return { DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', QUOTA: '3' } as never
}

function signup(body: string, headers: Record<string, string> = {}) {
  return new Request('https://example.test/api/auth/signup', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  })
}

test('body JSON null dan array ditolak sebagai bad_json, bukan 500', async () => {
  const db = testDb()
  try {
    const env = makeEnv(db)
    for (const body of ['null', '[]']) {
      const res = await handleFetch(signup(body), env)
      assert.equal(res.status, 400, body)
      assert.equal((await res.json() as { error: string }).error, 'bad_json')
    }
  } finally {
    db.close()
  }
})

test('body melebihi 64 KiB ditolak sebelum diproses', async () => {
  const db = testDb()
  try {
    const env = makeEnv(db)
    const res = await handleFetch(signup(JSON.stringify({ email: 'x'.repeat(70_000) })), env)
    assert.equal(res.status, 413)
    assert.equal((await res.json() as { error: string }).error, 'bad_input')
  } finally {
    db.close()
  }
})

test('content-length yang terlalu besar ditolak tanpa membaca body', async () => {
  const db = testDb()
  try {
    const env = makeEnv(db)
    const res = await handleFetch(signup('{}', { 'content-length': String(70_000) }), env)
    assert.equal(res.status, 413)
  } finally {
    db.close()
  }
})
