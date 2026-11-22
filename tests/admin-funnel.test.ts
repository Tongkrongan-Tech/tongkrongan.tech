import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handleFetch } from '../worker/index.ts'
import { d1, testDb } from './helpers/d1.ts'

test('funnel admin diagregasi di SQL dan tetap menghitung langkah, success rate, serta median', async () => {
  const db = testDb()
  try {
    const now = Date.now()
    const start = now - 100_000
    const events: [string, string, number][] = [
      ['a', 'wizard_start', start],
      ['a', 'verify_ok', start + 60_000],
      ['b', 'wizard_start', start],
      ['b', 'verify_ok', start + 180_000],
      ['c', 'wizard_start', start],
      ['c', 'verify_fail', start + 9_000],
      ['d', 'wizard_start', start],
    ]
    for (const [sid, ev, at] of events) db.prepare('INSERT INTO funnel_events (sid, ev, at) VALUES (?, ?, ?)').run(sid, ev, at)
    db.prepare('INSERT INTO csat (name, sub_created, score, at) VALUES (?, ?, ?, ?)').run('satu', start, 5, now)

    const env = { DB: d1(db), BASE_DOMAIN: 'example.test', DNS_MODE: 'mock', ADMIN_TOKEN: 'admin' } as never
    const res = await handleFetch(new Request('https://example.test/api/admin/funnel', {
      headers: { authorization: 'Bearer admin' },
    }), env)
    assert.equal(res.status, 200)
    const body = await res.json() as {
      days: number
      sessions: number
      steps: Record<string, number>
      successRate: number | null
      medianSeconds: number | null
      csat: { responses: number; average: number | null }
    }
    assert.equal(body.days, 30)
    assert.equal(body.sessions, 4)
    assert.equal(body.steps.wizard_start, 4)
    assert.equal(body.steps.verify_ok, 2)
    assert.equal(body.steps.verify_fail, 1)
    assert.equal(body.successRate, 0.5)
    assert.equal(body.medianSeconds, 120)
    assert.deepEqual(body.csat, { responses: 1, average: 5 })
  } finally {
    db.close()
  }
})
