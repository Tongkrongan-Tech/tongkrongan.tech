// Uji adapter deSEC tanpa jaringan: fetch diganti server deSEC tiruan di memori.
// Jalankan: npm test
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { desecCreate, desecDelete, desecUpdate, fmt, subnameOf } from '../worker/desec.ts'

const env = { BASE_DOMAIN: 'uji.example', DESEC_TOKEN: 'tok' }
type RRset = { subname: string; type: string; ttl: number; records: string[] }
let store: Map<string, RRset>
let calls: { method: string; url: string; auth: string | null; body?: unknown }[]
let throttleOnce = false
const key = (s: string, t: string) => `${s}|${t}`

beforeEach(() => {
  store = new Map(); calls = []; throttleOnce = false
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input), method = init.method ?? 'GET'
    const body = init.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ method, url, auth: new Headers(init.headers).get('authorization'), body })
    if (throttleOnce) { throttleOnce = false; return new Response('{}', { status: 429, headers: { 'retry-after': '0' } }) }
    const base = 'https://desec.io/api/v1/domains/uji.example/rrsets/'
    if (method === 'GET' && url.startsWith(base)) {
      const [sub, type] = url.slice(base.length).split('/')
      const r = store.get(key(sub === '@' ? '' : sub, type))
      return r ? Response.json(r) : new Response('{}', { status: 404 })
    }
    if (method === 'PATCH' && url === base) {
      for (const r of body as RRset[]) { if (r.records.length) store.set(key(r.subname, r.type), r); else store.delete(key(r.subname, r.type)) }
      return Response.json(body)
    }
    return new Response('{}', { status: 500 })
  }) as typeof fetch
})

test('subnameOf memotong domain induk dan menolak host di luar zona', () => {
  assert.equal(subnameOf(env, 'nama.uji.example'), 'nama')
  assert.equal(subnameOf(env, '_x.nama.uji.example.'), '_x.nama')
  assert.equal(subnameOf(env, 'uji.example'), '')
  assert.throws(() => subnameOf(env, 'nama.lain.test'))
})

test('format isi: TXT dikutip dan di-escape, CNAME berakhir titik dan huruf kecil', () => {
  assert.equal(fmt('TXT', 'vc-domain-verify=a.b,123'), '"vc-domain-verify=a.b,123"')
  assert.equal(fmt('TXT', 'a"b\\c'), '"a\\"b\\\\c"')
  assert.equal(fmt('CNAME', 'Cname.Vercel-DNS.com'), 'cname.vercel-dns.com.')
  assert.equal(fmt('CNAME', 'x.example.'), 'x.example.')
  assert.equal(fmt('A', '203.0.113.10'), '203.0.113.10')
})

test('create CNAME: tulis RRset, kirim token, kembalikan id yang bisa dihapus', async () => {
  const id = await desecCreate(env, 'nama.uji.example', 'CNAME', 'cname.vercel-dns.com')
  assert.deepEqual(store.get('nama|CNAME')?.records, ['cname.vercel-dns.com.'])
  assert.ok(calls.every((c) => c.auth === 'Token tok'))
  assert.deepEqual(JSON.parse(id), { s: 'nama', t: 'CNAME', v: 'cname.vercel-dns.com' })
})

test('banyak TXT di _vercel digabung, tidak saling menimpa', async () => {
  const a = await desecCreate(env, '_vercel.uji.example', 'TXT', 'vc-domain-verify=a.uji.example,aaaaaaaa')
  const b = await desecCreate(env, '_vercel.uji.example', 'TXT', 'vc-domain-verify=b.uji.example,bbbbbbbb')
  assert.deepEqual(store.get('_vercel|TXT')?.records.sort(), ['"vc-domain-verify=a.uji.example,aaaaaaaa"', '"vc-domain-verify=b.uji.example,bbbbbbbb"'])
  await desecDelete(env, a)
  assert.deepEqual(store.get('_vercel|TXT')?.records, ['"vc-domain-verify=b.uji.example,bbbbbbbb"'])
  await desecDelete(env, b)
  assert.equal(store.has('_vercel|TXT'), false, 'RRset kosong harus dihapus')
})

test('create yang sama dua kali tidak menggandakan nilai', async () => {
  await desecCreate(env, 'a.uji.example', 'TXT', 'x')
  await desecCreate(env, 'a.uji.example', 'TXT', 'x')
  assert.equal(store.get('a|TXT')?.records.length, 1)
})

test('CNAME diganti, bukan ditambah (satu nilai saja)', async () => {
  await desecCreate(env, 'a.uji.example', 'CNAME', 'satu.example')
  await desecCreate(env, 'a.uji.example', 'CNAME', 'dua.example')
  assert.deepEqual(store.get('a|CNAME')?.records, ['dua.example.'])
})

test('update memindahkan nilai lama ke baru dan menjaga nilai lain di RRset yang sama', async () => {
  const keep = await desecCreate(env, '_vercel.uji.example', 'TXT', 'milik-lain')
  const id = await desecCreate(env, '_vercel.uji.example', 'TXT', 'lama')
  const next = await desecUpdate(env, id, '_vercel.uji.example', 'TXT', 'baru')
  assert.deepEqual(store.get('_vercel|TXT')?.records.sort(), ['"baru"', '"milik-lain"'])
  assert.deepEqual(JSON.parse(next).v, 'baru')
  assert.ok(keep)
})

test('update tanpa id sama dengan create', async () => {
  await desecUpdate(env, null, 'n.uji.example', 'A', '203.0.113.9')
  assert.deepEqual(store.get('n|A')?.records, ['203.0.113.9'])
})

test('delete record yang sudah tidak ada tidak error (idempoten)', async () => {
  const id = await desecCreate(env, 'n.uji.example', 'A', '203.0.113.9')
  await desecDelete(env, id)
  await desecDelete(env, id)
  assert.equal(store.has('n|A'), false)
})

test('batas laju 429 diulang lalu berhasil', async () => {
  throttleOnce = true
  await desecCreate(env, 'n.uji.example', 'A', '203.0.113.9')
  assert.deepEqual(store.get('n|A')?.records, ['203.0.113.9'])
})
