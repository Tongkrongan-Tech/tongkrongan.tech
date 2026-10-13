import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { summarizeFunnel } from '../src/lib/funnel.ts'

test('funnel: hitung sesi per langkah, tingkat keberhasilan, dan median waktu', () => {
  const rows = [
    { sid: 'a', ev: 'wizard_start', at: 0 }, { sid: 'a', ev: 'verify_ok', at: 60_000 },
    { sid: 'b', ev: 'wizard_start', at: 0 }, { sid: 'b', ev: 'verify_ok', at: 180_000 },
    { sid: 'c', ev: 'wizard_start', at: 0 }, { sid: 'c', ev: 'wizard_start', at: 5 }, { sid: 'c', ev: 'verify_fail', at: 9000 },
    { sid: 'd', ev: 'wizard_start', at: 0 },
  ]
  const f = summarizeFunnel(rows)
  assert.equal(f.sessions, 4)
  assert.equal(f.steps.wizard_start, 4)
  assert.equal(f.steps.verify_ok, 2)
  assert.equal(f.steps.verify_fail, 1)
  assert.equal(f.successRate, 0.5)
  assert.equal(f.medianSeconds, 120)
})

test('funnel kosong tidak membagi nol', () => {
  const f = summarizeFunnel([])
  assert.equal(f.successRate, null)
  assert.equal(f.medianSeconds, null)
})

test('endpoint funnel admin dan csat: admin sesudah token, csat wajib login dan hanya subdomain aktif', () => {
  const src = readFileSync(new URL('../worker/index.ts', import.meta.url), 'utf8')
  const admin = src.slice(src.indexOf('async function admin('))
  assert.ok(admin.indexOf("'/api/admin/funnel'") > admin.indexOf('ADMIN_TOKEN'))
  const csat = src.slice(src.indexOf("'POST /api/csat'"), src.indexOf("'POST /api/reports'"))
  assert.match(csat, /requireUser/)
  assert.match(csat, /status !== 'active'/)
  assert.match(csat, /ownedSub/)
})
