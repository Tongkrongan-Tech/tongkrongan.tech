export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  BASE_DOMAIN: string
  QUOTA: string
  DNS_MODE: string // "live" memakai Cloudflare + DoH; "mock" hanya untuk pengembangan lokal
  CF_API_TOKEN?: string
  CF_ZONE_ID?: string
  ADMIN_TOKEN?: string
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
}

export class HttpError extends Error {
  constructor(public status: number, public code: string, public extra?: Record<string, unknown>) { super(code) }
}

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } })

const enc = new TextEncoder()
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, '0')).join('')
export const randomHex = (bytes = 16) => hex(crypto.getRandomValues(new Uint8Array(bytes)))
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)))

export async function hashPassword(pw: string, saltHex: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits'])
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)))
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256))
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

// Mengembalikan false bila batas terlampaui.
export async function rateLimit(env: Env, key: string, limit: number, windowSec: number): Promise<boolean> {
  const w = Math.floor(Date.now() / 1000 / windowSec)
  await env.DB.prepare('INSERT INTO rate_limits (k, w, n) VALUES (?, ?, 1) ON CONFLICT(k, w) DO UPDATE SET n = n + 1').bind(key, w).run()
  const row = await env.DB.prepare('SELECT n FROM rate_limits WHERE k = ? AND w = ?').bind(key, w).first<{ n: number }>()
  await env.DB.prepare('DELETE FROM rate_limits WHERE w < ?').bind(w - 2).run()
  return (row?.n ?? 0) <= limit
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
