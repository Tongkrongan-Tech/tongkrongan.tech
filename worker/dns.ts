import type { Env } from './lib'
import type { RecordType } from '../src/lib/dns'
import { desecCreate, desecDelete, desecUpdate } from './desec'

const CF = 'https://api.cloudflare.com/client/v4'
export const isMock = (env: Env) => env.DNS_MODE !== 'live'
export const hostOf = (env: Env, name: string) => `${name}.${env.BASE_DOMAIN}`

async function cf(env: Env, path: string, init?: RequestInit) {
  const r = await fetch(`${CF}/zones/${env.CF_ZONE_ID}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${env.CF_API_TOKEN}`, 'content-type': 'application/json', ...(init?.headers ?? {}) },
  })
  const d = (await r.json()) as { success: boolean; result: { id: string } | null; errors?: { message: string }[] }
  if (!d.success) throw new Error(d.errors?.map((e) => e.message).join('; ') || `cloudflare ${r.status}`)
  return d.result
}

const body = (host: string, type: RecordType, value: string) => ({
  type, name: host, content: type === 'CNAME' ? value.replace(/\.$/, '').toLowerCase() : value, ttl: 300, proxied: false,
  comment: 'managed by tongkrongan',
})

// Semua operasi memakai nama host lengkap, jadi record utama dan record TXT tambahan memakai kode yang sama.
export async function createRecord(env: Env, host: string, type: RecordType, value: string): Promise<string | null> {
  if (isMock(env)) return null
  if (env.DNS_PROVIDER === 'desec') return desecCreate(env, host, type, value)
  return (await cf(env, '/dns_records', { method: 'POST', body: JSON.stringify(body(host, type, value)) }))!.id
}
export async function updateRecord(env: Env, recordId: string | null, host: string, type: RecordType, value: string): Promise<string | null> {
  if (isMock(env)) return null
  if (!recordId) return createRecord(env, host, type, value)
  if (env.DNS_PROVIDER === 'desec') return desecUpdate(env, recordId, host, type, value)
  await cf(env, `/dns_records/${recordId}`, { method: 'PUT', body: JSON.stringify(body(host, type, value)) })
  return recordId
}
export async function deleteRecord(env: Env, recordId: string | null) {
  if (isMock(env) || !recordId) return
  if (env.DNS_PROVIDER === 'desec') return desecDelete(env, recordId)
  try { await cf(env, `/dns_records/${recordId}`, { method: 'DELETE' }) } catch (e) { if (!/not exist|81044/i.test(String(e))) throw e }
}
// `_vercel` memang harus di domain induk (syarat Vercel), selain itu TXT tambahan di bawah subdomain pengguna.
export const txtHost = (env: Env, label: string, name: string) => label === '_vercel' ? `_vercel.${env.BASE_DOMAIN}` : `${label}.${name}.${env.BASE_DOMAIN}`

export type VerifyFail = 'dns' | 'http' | 'platform'
export type VerifyOutcome = { ok: true } | { ok: false; reason: VerifyFail }

async function doh(name: string, type: string): Promise<string[]> {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: 'application/dns-json' } })
  const d = (await r.json()) as { Answer?: { type: number; data: string }[] }
  return (d.Answer ?? []).map((a) => a.data.replace(/\.$/, '').replace(/^"|"$/g, '').toLowerCase())
}

async function timedFetch(url: string, init: RequestInit = {}) {
  const c = new AbortController()
  const t = setTimeout(() => c.abort(), 8000)
  try { return await fetch(url, { ...init, signal: c.signal, redirect: init.redirect ?? 'follow' }) } finally { clearTimeout(t) }
}

// Verifikasi otomatis, tanpa berkas bukti:
// (1) DNS sudah menjawab sesuai record; (2) untuk tujuan situs, situs benar-benar tampil di alamat ini.
// Platform (Vercel, Cloudflare Pages, Railway) hanya menyajikan domain yang sudah ditambahkan pemilik proyek,
// jadi respons sukses itu sendiri menjadi bukti kendali atas tujuan.
// Hanya respons 2xx yang dianggap bukti. Redirect (3xx) tidak diikuti, jadi halaman placeholder yang mengalihkan ke tempat lain tidak lolos.
export async function verifyRecord(env: Env, s: { name: string; type: RecordType; value: string }): Promise<VerifyOutcome> {
  // Mode mock (hanya lokal): nilai yang mengandung "fail" memicu kegagalan agar jalur galat bisa diuji.
  if (isMock(env)) return s.value.includes('fail') ? { ok: false, reason: 'platform' } : { ok: true }
  const host = hostOf(env, s.name)
  const want = s.type === 'CNAME' ? s.value.replace(/\.$/, '').toLowerCase() : s.value.toLowerCase()
  const got = await doh(host, s.type).catch(() => [] as string[])
  const match = s.type === 'AAAA' ? got.some((g) => g.replace(/:0+/g, ':') === want.replace(/:0+/g, ':') || g === want) : got.includes(want)
  if (!match) return { ok: false, reason: 'dns' }
  if (s.type === 'TXT') return { ok: false, reason: 'dns' } // TXT tidak boleh jadi tipe utama; verifikasi lewat tipe lain
  let answered = false
  for (const scheme of ['https', 'http']) {
    try {
      const r = await timedFetch(`${scheme}://${host}/`, { redirect: 'manual' })
      answered = true
      if (r.status >= 200 && r.status < 300) return { ok: true }
    } catch { /* coba skema berikutnya */ }
  }
  return { ok: false, reason: answered ? 'platform' : 'http' }
}

export async function healthCheck(env: Env, name: string): Promise<boolean> {
  if (isMock(env)) return true
  for (const scheme of ['https', 'http']) {
    try { const r = await timedFetch(`${scheme}://${hostOf(env, name)}/`, { method: 'HEAD' }); return r.status < 500 } catch { /* lanjut */ }
  }
  return false
}

export async function flaggedBySafeBrowsing(env: Env, names: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (!env.SAFE_BROWSING_KEY || !names.length) return out
  for (let i = 0; i < names.length; i += 400) {
    const batch = names.slice(i, i + 400)
    const r = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${env.SAFE_BROWSING_KEY}`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'tongkrongan', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'], platformTypes: ['ANY_PLATFORM'], threatEntryTypes: ['URL'],
          threatEntries: batch.map((n) => ({ url: `https://${hostOf(env, n)}/` })),
        },
      }),
    })
    if (!r.ok) continue
    const d = (await r.json()) as { matches?: { threat: { url: string } }[] }
    for (const m of d.matches ?? []) out.add(new URL(m.threat.url).hostname.split('.')[0])
  }
  return out
}
