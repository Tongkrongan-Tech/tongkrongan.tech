import { test } from 'node:test'
import assert from 'node:assert/strict'
import { healthCheck } from '../worker/dns.ts'

const env = { DNS_MODE: 'live', BASE_DOMAIN: 'example.test' } as never

type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response>
const mock = (t: import('node:test').TestContext, handler: Handler) =>
  t.mock.method(globalThis, 'fetch', async (input: string | URL, init?: RequestInit) => handler(new URL(String(input)), init))

test('405 pada HEAD diulang dengan GET, bukan dianggap sehat begitu saja (#77)', async (t) => {
  const calls: string[] = []
  mock(t, (_url, init) => {
    calls.push(init?.method ?? 'GET')
    return init?.method === 'HEAD' ? new Response(null, { status: 405 }) : new Response('ok', { status: 200 })
  })
  assert.equal(await healthCheck(env, 'site'), true)
  assert.deepEqual(calls, ['HEAD', 'GET'])
})

test('status 4xx dan 5xx tidak dianggap sehat; 3xx sehat (#77)', async (t) => {
  mock(t, () => new Response(null, { status: 403 }))
  assert.equal(await healthCheck(env, 'site'), false, '403 bukan situs yang menyajikan halaman')
}) 

test('status 500 tidak dianggap sehat (#77)', async (t) => {
  mock(t, () => new Response(null, { status: 500 }))
  assert.equal(await healthCheck(env, 'site'), false)
})

test('redirect 3xx sehat (#77)', async (t) => {
  mock(t, () => new Response(null, { status: 301 }))
  assert.equal(await healthCheck(env, 'site'), true)
})

test('galat jaringan di https jatuh ke http (#77)', async (t) => {
  mock(t, (url) => {
    if (url.protocol === 'https:') throw new Error('TLS putus')
    return new Response(null, { status: 200 })
  })
  assert.equal(await healthCheck(env, 'site'), true)
})

test('semua skema gagal berarti tidak sehat (#77)', async (t) => {
  mock(t, () => { throw new Error('tidak ada jawaban') })
  assert.equal(await healthCheck(env, 'site'), false)
})

test('mode mock selalu sehat tanpa jaringan (#77)', async (t) => {
  mock(t, () => { throw new Error('tak boleh dihubungi') })
  assert.equal(await healthCheck({ DNS_MODE: 'mock', BASE_DOMAIN: 'example.test' } as never, 'site'), true)
})
