export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  BASE_DOMAIN: string
  QUOTA: string
  DNS_MODE: string // "live" memakai Cloudflare + DoH; "mock" hanya untuk pengembangan lokal
  CF_API_TOKEN?: string
  CF_ZONE_ID?: string
  ADMIN_TOKEN?: string
  REPORT_HASH_KEY?: string
  SAFE_BROWSING_KEY?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  REQUIRE_EMAIL_VERIFY?: string
  TURNSTILE_SECRET?: string
  TURNSTILE_SITEKEY?: string
  DNS_PROVIDER?: string
  DESEC_TOKEN?: string
  VERCEL_CLIENT_ID?: string
  VERCEL_CLIENT_SECRET?: string
  VERCEL_INTEGRATION_SLUG?: string
  VERCEL_TOKEN_KEY?: string
  GITHUB_CLIENT_ID?: string
  GITHUB_CLIENT_SECRET?: string
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  DISCORD_CLIENT_ID?: string
  DISCORD_CLIENT_SECRET?: string
  DISCORD_WEBHOOK_URL?: string
}

export class HttpError extends Error {
  status: number
  code: string
  extra?: Record<string, unknown>
  constructor(status: number, code: string, extra?: Record<string, unknown>) {
    super(code)
    this.status = status
    this.code = code
    this.extra = extra
  }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })

const enc = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
export const randomHex = (bytes = 16) => hex(crypto.getRandomValues(new Uint8Array(bytes)))
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))

export async function hmacSha256(key: string, data: string) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(data)))
}

// Hash IP laporan: HMAC dengan rahasia server agar ruang IPv4 tidak bisa dihitung balik (#78).
// Fallback ADMIN_TOKEN, lalu jalur lama sha256(ip+BASE_DOMAIN) untuk lokal/dev tanpa rahasia.
export async function reportIpHash(env: Env, ip: string) {
  const key = env.REPORT_HASH_KEY || env.ADMIN_TOKEN
  return key ? (await hmacSha256(key, ip)).slice(0, 16) : (await sha256(ip + env.BASE_DOMAIN)).slice(0, 16)
}

// Tolak permintaan mutasi lintas situs. Dipindah ke lib agar bisa diuji langsung (#73).
export function csrfGuard(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  if (origin) {
    // Header `Origin: null` (iframe sandbox, file lokal) bukan URL yang valid; itu harus 403, bukan 500 (#73).
    let same = false
    try { same = new URL(origin).host === new URL(req.url).host } catch { same = false }
    if (!same) throw new HttpError(403, 'bad_origin')
  } else if (req.headers.get('authorization') === null && !(req.headers.get('content-type') ?? '').includes('json')) {
    throw new HttpError(403, 'bad_origin')
  }
}

// Iterasi PBKDF2-SHA256. Cloudflare Workers menolak lebih dari 100000 iterasi (NotSupportedError), jadi 100000 adalah batas maksimum.
export const PBKDF2_ITERATIONS = 100000

export async function hashPassword(pw: string, saltHex: string, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)))
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return `${iterations}$${hex(bits)}`
}
// Bentuk baru: "<iterasi>$<hex>". Hash lama (hanya hex) tetap didukung sebagai 100000 iterasi.
export function parsePasswordHash(stored: string): { iterations: number; hash: string } {
  const m = /^(\d+)\$([0-9a-f]+)$/.exec(stored)
  return m ? { iterations: Number(m[1]), hash: m[2] } : { iterations: 100000, hash: stored }
}
export const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export function cookie(req: Request, name: string, value: string, maxAge: number) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}
export const readCookie = (req: Request, name: string) =>
  req.headers.get('cookie')?.split(/;\s*/).map((c) => c.split('=')).find(([k]) => k === name)?.[1]

export const clientIp = (req: Request) => req.headers.get('cf-connecting-ip') ?? 'local'

// Mengembalikan false bila batas terlampaui. Pakai UPSERT + RETURNING agar hitungan dan keputusan atomik.
// Pembersihan TIDAK dilakukan di sini: nomor jendela `w` berbeda skala antar ukuran jendela (60 dtk vs 900 dtk),
// jadi DELETE global `WHERE w < ?` akan menghapus hitungan jendela lain dan membuka kuncian login (#67).
// Setiap baris membawa `expires_at`, dan Cron (setiap 15 menit) yang membersihkannya.
export async function rateLimit(env: Env, key: string, limit: number, windowSec: number): Promise<boolean> {
  const now = Date.now()
  const w = Math.floor(now / 1000 / windowSec)
  const row = await env.DB.prepare('INSERT INTO rate_limits (k, w, n, expires_at) VALUES (?, ?, 1, ?) ON CONFLICT(k, w) DO UPDATE SET n = n + 1 RETURNING n')
    .bind(key, w, now + windowSec * 3000).first<{ n: number }>()
  return (row?.n ?? 0) <= limit
}

// Baca hitungan tanpa menambah. Dipakai untuk cek kuncian tanpa ikut menambahnya.
export async function ratePeek(env: Env, key: string, windowSec: number): Promise<number> {
  const w = Math.floor(Date.now() / 1000 / windowSec)
  const row = await env.DB.prepare('SELECT n FROM rate_limits WHERE k = ? AND w = ?').bind(key, w).first<{ n: number }>()
  return row?.n ?? 0
}

// Hapus hitungan (mis. saat login berhasil, kuncian dibuka).
export async function rateClear(env: Env, key: string) {
  await env.DB.prepare('DELETE FROM rate_limits WHERE k = ?').bind(key).run()
}

export async function verifyTurnstile(env: Env, token: string | undefined, ip: string) {
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_SITEKEY) return true // aktif hanya bila secret DAN site key ada
  if (!token) return false
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip })
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const d = (await r.json()) as { success: boolean }
  return d.success
}

export async function sendEmail(env: Env, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) return false
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, html }),
  })
  return r.ok
}
