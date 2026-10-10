import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notifyClaimActive, notifyVercelConnected } from '../worker/notify.ts'

type Call = { url: string; body: { embeds: { title: string; fields: { name: string; value: string }[] }[] } }

function stubFetch(status = 204) {
  const calls: Call[] = []
  const orig = globalThis.fetch
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: JSON.parse(String(init.body)) })
    return new Response(null, { status })
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = orig } }
}

const env = { BASE_DOMAIN: 'tongkrongan.tech', DISCORD_WEBHOOK_URL: 'https://discord.test/hook' } as never

test('tanpa DISCORD_WEBHOOK_URL tidak ada request keluar', async () => {
  const s = stubFetch()
  await notifyClaimActive({ BASE_DOMAIN: 'tongkrongan.tech' } as never, 'budi', 'vercel')
  s.restore()
  assert.equal(s.calls.length, 0)
})

test('klaim aktif mengirim domain penuh dan email tersamarkan', async () => {
  const s = stubFetch()
  await notifyClaimActive(env, 'budi', 'vercel', 'budi.santoso@mail.com')
  s.restore()
  const f = s.calls[0].body.embeds[0].fields
  assert.equal(f.find((x) => x.name === 'Domain')?.value, 'budi.tongkrongan.tech')
  assert.equal(f.find((x) => x.name === 'Akun')?.value, 'bu***@mail.com')
})

test('koneksi Vercel tidak membocorkan email utuh', async () => {
  const s = stubFetch()
  await notifyVercelConnected(env, 'rahasia@mail.com')
  s.restore()
  assert.ok(!JSON.stringify(s.calls[0].body).includes('rahasia@'))
})

test('Discord galat 500 atau jaringan putus tidak melempar', async () => {
  const s = stubFetch(500)
  await notifyClaimActive(env, 'budi', 'vercel')
  s.restore()
  const orig = globalThis.fetch
  globalThis.fetch = (async () => { throw new Error('offline') }) as typeof fetch
  await notifyClaimActive(env, 'budi', 'vercel')
  globalThis.fetch = orig
})
