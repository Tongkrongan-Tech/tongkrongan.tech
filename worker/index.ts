import { checkName, NAME_RE, suggestCandidates } from '../src/lib/names'
import { PLATFORMS, validateValue, type RecordType } from '../src/lib/dns'
import { HttpError, PBKDF2_ITERATIONS, cookie, clientIp, hashPassword, json, parsePasswordHash, randomHex, rateClear, rateLimit, ratePeek, readCookie, safeEqual, sendEmail, sha256, verifyTurnstile, type Env } from './lib'
import { createRecord, deleteRecord, hostOf, txtHost, updateRecord, verifyRecord } from './dns'
import { runCron } from './cron'
import { discordVerifiedEmail } from './oauth'
import { notifyClaimActive, notifyVercelConnected } from './notify'
import { addDomain, dropConnection, exchangeCode, getConnection, getProjectDomain, listProjects, recommendedCname, removeProjectDomain, saveConnection, makeState, checkState, vercelEnabled, verifyProjectDomain } from './vercel'

const SESSION_DAYS = 14
const MAX_BODY = 65536
const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/
const REASONS = ['phishing', 'malware', 'spam', 'illegal', 'impersonation', 'other']
const TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'TXT']

// Header keamanan untuk semua respons. CSP mengizinkan skrip inline (bootstrap tema di index.html) dan Cloudflare Turnstile.
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'geolocation=(), camera=(), microphone=(), payment=()',
  'content-security-policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com",
}

// RFC 9116. Perbarui Expires sebelum kedaluwarsa.
const SECURITY_TXT = [
  'Contact: mailto:halo@tongkrongan.tech',
  'Expires: 2027-10-11T00:00:00.000Z',
  'Preferred-Languages: id, en',
  'Canonical: https://tongkrongan.tech/.well-known/security.txt',
  'Policy: https://github.com/xyyxzxx/tongkrongan.tech/blob/main/SECURITY.md',
  '',
].join('\n')

type OAuthProvider = 'github' | 'google' | 'discord'
type User = { id: string; email: string; provider: string }
type SubRow = { name: string; user_id: string; platform: string; type: RecordType; value: string; status: string; fail_reason: string | null; vercel_project?: string | null; cf_record_id: string | null; txt_label: string | null; txt_value: string | null; txt_record_id: string | null; last_check_at: number; created_at: number; activated_at: number | null }

const quota = (env: Env) => Number(env.QUOTA) || 3
// Verifikasi email aktif hanya bila diminta DAN email benar-benar bisa dikirim (RESEND_API_KEY + EMAIL_FROM).
const requireVerify = (env: Env) => env.REQUIRE_EMAIL_VERIFY === '1' && !!env.RESEND_API_KEY && !!env.EMAIL_FROM
const reservedExtra = (env: Env) => [env.BASE_DOMAIN.split('.')[0]]

// Nama cookie sesi: pakai prefix __Host- di HTTPS (wajib Secure + Path=/ + tanpa Domain), dan nama biasa di lokal (HTTP).
const sessionName = (req: Request) => new URL(req.url).protocol === 'https:' ? '__Host-tt_session' : 'tt_session'
const readSession = (req: Request) => readCookie(req, '__Host-tt_session') ?? readCookie(req, 'tt_session')

async function readBody<T>(req: Request): Promise<T> {
  const text = await req.text()
  if (text.length > MAX_BODY) throw new HttpError(413, 'bad_input')
  try { return JSON.parse(text) as T } catch { throw new HttpError(400, 'bad_json') }
}

async function currentUser(req: Request, env: Env): Promise<User | null> {
  const t = readSession(req)
  if (!t) return null
  const row = await env.DB.prepare(
    'SELECT u.id, u.email, u.provider FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.blocked = 0',
  ).bind(await sha256(t), Date.now()).first<User>()
  return row ?? null
}
async function requireUser(req: Request, env: Env) {
  const u = await currentUser(req, env)
  if (!u) throw new HttpError(401, 'unauthorized')
  return u
}

// Buat sesi baru. Rotasi: hapus sesi lama dari cookie yang sedang dipakai agar tidak ada session fixation.
async function startSession(req: Request, env: Env, userId: string) {
  const old = readSession(req)
  if (old) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(old)).run()
  const token = randomHex(32)
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, Date.now() + SESSION_DAYS * 864e5).run()
  return cookie(req, sessionName(req), token, SESSION_DAYS * 86400)
}

function clearSessionCookies(req: Request, data: unknown): Response {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  headers.append('set-cookie', cookie(req, 'tt_session', '', 0))
  headers.append('set-cookie', cookie(req, '__Host-tt_session', '', 0))
  return new Response(JSON.stringify(data), { status: 200, headers })
}

function csrfGuard(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) throw new HttpError(403, 'bad_origin')
  if (!origin && req.headers.get('authorization') === null && !(req.headers.get('content-type') ?? '').includes('json')) throw new HttpError(403, 'bad_origin')
}

// Kirim kode OTP 6 digit ke email. Jeda 60 detik antar kiriman per akun.
async function issueOtp(env: Env, user: { id: string; email: string }) {
  const last = await env.DB.prepare('SELECT created_at FROM email_otps WHERE user_id = ?').bind(user.id).first<{ created_at: number }>()
  if (last && Date.now() - last.created_at < 60_000) return
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0')
  await env.DB.prepare('INSERT OR REPLACE INTO email_otps (user_id, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, 0, ?)')
    .bind(user.id, await sha256(code), Date.now() + 600_000, Date.now()).run()
  await sendEmail(env, user.email, `Kode verifikasi Tongkrongan.tech: ${code}`, `<p>Kode verifikasi kamu:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Berlaku 10 menit. Abaikan email ini bila bukan kamu yang mendaftar.</p>`)
}

async function historyAdd(env: Env, name: string, key: string, detail?: string) {
  await env.DB.prepare('INSERT INTO history (name, key, detail, at) VALUES (?, ?, ?, ?)').bind(name, key, detail ?? null, Date.now()).run()
}

async function presentSub(env: Env, s: SubRow) {
  const [h, c] = await Promise.all([
    env.DB.prepare('SELECT key, detail, at FROM history WHERE name = ? ORDER BY at DESC, id DESC LIMIT 30').bind(s.name).all<{ key: string; detail: string | null; at: number }>(),
    env.DB.prepare('SELECT ok FROM checks WHERE name = ? ORDER BY at DESC, id DESC LIMIT 14').bind(s.name).all<{ ok: number }>(),
  ])
  return {
    name: s.name, platform: s.platform, type: s.type, value: s.value, status: s.status, failReason: s.fail_reason ?? undefined,
    txtLabel: s.txt_label ?? undefined, txtValue: s.txt_value ?? undefined, createdAt: s.created_at, owned: !!s.activated_at,
    history: h.results.map((x) => ({ at: x.at, key: x.key, detail: x.detail ?? undefined })),
    checks: c.results.map((x) => !!x.ok).reverse(),
  }
}

async function ownedSub(env: Env, user: User, name: string) {
  const s = await env.DB.prepare('SELECT * FROM subdomains WHERE name = ? AND user_id = ?').bind(name, user.id).first<SubRow>()
  if (!s) throw new HttpError(404, 'not_found')
  return s
}

function validateRecordInput(env: Env, b: { name?: string; platform?: string; type?: string; value?: string; txtLabel?: string; txtValue?: string }) {
  const name = String(b.name ?? '').toLowerCase().trim()
  const platform = PLATFORMS.find((p) => p.id === b.platform)
  const type = b.type as RecordType
  const value = String(b.value ?? '').trim()
  if (!platform || !TYPES.includes(type) || !platform.types.includes(type)) throw new HttpError(400, 'bad_input')
  // TXT tidak boleh menjadi tipe utama: verifikasi TXT hanya membuktikan DNS milik kita, bukan kendali atas tujuan.
  if (type === 'TXT') throw new HttpError(400, 'bad_input')
  const err = validateValue(type, value, name, env.BASE_DOMAIN)
  if (err) throw new HttpError(422, 'invalid_value', { reason: err })
  const txtLabel = String(b.txtLabel ?? '').trim().toLowerCase().replace(/\.$/, '')
  const txtValue = String(b.txtValue ?? '').trim()
  if (txtLabel || txtValue) {
    // TXT tambahan hanya boleh di bawah nama subdomain sendiri: _label.nama.<domain>
    if (!/^_[a-z0-9-]{1,40}$/.test(txtLabel) || !txtValue || txtValue.length > 255) throw new HttpError(422, 'invalid_txt')
    // TXT `_vercel` ada di domain induk, jadi nilainya wajib mengikat ke subdomain pemilik sendiri.
    if (txtLabel === '_vercel' && !new RegExp(`^vc-domain-verify=${(name + '.' + env.BASE_DOMAIN).replace(/\./g, '\\.')},[a-z0-9]{8,64}$`, 'i').test(txtValue)) throw new HttpError(422, 'invalid_txt')
  }
  return { name, platform: platform.id, type, value, txtLabel: txtLabel || null, txtValue: txtValue || null }
}

/* ---------- handlers ---------- */

async function createSubdomain(env: Env, u: User, b: ReturnType<typeof validateRecordInput>) {
    if (!(await rateLimit(env, `dns:${u.id}`, 20, 3600))) throw new HttpError(429, 'rate_limited')
    const base = checkName(b.name)
    if (base.kind !== 'ok' || reservedExtra(env).includes(b.name)) throw new HttpError(422, 'invalid_name', { reason: (base as { reason?: string }).reason ?? 'reserved' })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM subdomains WHERE user_id = ?').bind(u.id).first<{ n: number }>()
    if ((count?.n ?? 0) >= quota(env)) throw new HttpError(403, 'quota')
    try {
      await env.DB.prepare('INSERT INTO subdomains (name, user_id, platform, type, value, status, txt_label, txt_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(b.name, u.id, b.platform, b.type, b.value, 'pending', b.txtLabel, b.txtValue, Date.now()).run()
    } catch { throw new HttpError(409, 'taken') }
    try {
      const rid = await createRecord(env, hostOf(env, b.name), b.type, b.value)
      await env.DB.prepare('UPDATE subdomains SET cf_record_id = ? WHERE name = ?').bind(rid, b.name).run()
      if (b.txtLabel && b.txtValue) {
        const tid = await createRecord(env, txtHost(env, b.txtLabel, b.name), 'TXT', b.txtValue)
        await env.DB.prepare('UPDATE subdomains SET txt_record_id = ? WHERE name = ?').bind(tid, b.name).run()
      }
    } catch (e) {
      console.error('createRecord gagal', b.name, e)
      const row = await env.DB.prepare('SELECT cf_record_id FROM subdomains WHERE name = ?').bind(b.name).first<{ cf_record_id: string | null }>()
      await deleteRecord(env, row?.cf_record_id ?? null).catch(() => {})
      await env.DB.prepare('DELETE FROM subdomains WHERE name = ?').bind(b.name).run()
      throw new HttpError(502, 'dns_provider')
    }
    await historyAdd(env, b.name, 'h.created')
  return ownedSub(env, u, b.name)
}

const api: Record<string, (req: Request, env: Env, url: URL, m: string[]) => Promise<Response>> = {
  'GET /api/config': async (_r, env) => json({
    baseDomain: env.BASE_DOMAIN, quota: quota(env),
    oauth: { github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET), google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), discord: !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET) },
    turnstileSiteKey: env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY ? env.TURNSTILE_SITEKEY : null,
    emailVerify: requireVerify(env), vercelConnect: vercelEnabled(env), mock: env.DNS_MODE !== 'live',
  }),

  'GET /api/check': async (req, env, url) => {
    if (!(await rateLimit(env, `chk:${clientIp(req)}`, 120, 60))) throw new HttpError(429, 'rate_limited')
    const name = (url.searchParams.get('name') ?? '').toLowerCase().trim()
    const base = checkName(name)
    if (base.kind !== 'ok' && base.kind !== 'empty') return json({ state: 'invalid', reason: (base as { reason: string }).reason, suggestions: [] })
    if (reservedExtra(env).includes(name)) return json({ state: 'invalid', reason: 'reserved', suggestions: [] })
    if (base.kind === 'empty') return json({ state: 'empty' })
    const user = await currentUser(req, env)
    const row = await env.DB.prepare('SELECT user_id FROM subdomains WHERE name = ?').bind(name).first<{ user_id: string }>()
    if (!row) return json({ state: 'ok' })
    const cands = suggestCandidates(name)
    let free = cands
    if (cands.length) {
      const taken = await env.DB.prepare(`SELECT name FROM subdomains WHERE name IN (${cands.map(() => '?').join(',')})`).bind(...cands).all<{ name: string }>()
      const t = new Set(taken.results.map((x) => x.name))
      free = cands.filter((c) => !t.has(c))
    }
    return json({ state: 'taken', mine: row.user_id === user?.id, suggestions: free.slice(0, 3) })
  },

  'GET /api/auth/me': async (req, env) => {
    const u = await currentUser(req, env)
    return json({ user: u ? { email: u.email, provider: u.provider } : null })
  },

  'POST /api/auth/signup': async (req, env) => {
    const ip = clientIp(req)
    const b = await readBody<{ email?: string; password?: string; turnstile?: string }>(req)
    if (!(await rateLimit(env, `signup:${ip}`, 5, 3600))) throw new HttpError(429, 'rate_limited')
    if (!(await verifyTurnstile(env, b.turnstile, ip))) throw new HttpError(400, 'captcha')
    const email = String(b.email ?? '').trim().toLowerCase()
    const pw = String(b.password ?? '')
    if (email.length > 254 || !EMAIL_RE.test(email)) throw new HttpError(422, 'email')
    if (pw.length < 8 || pw.length > 128) throw new HttpError(422, 'password')
    const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()
    if (exists) {
      // Jangan ungkap apakah email terdaftar (anti enumerasi). Jawab sama seperti pendaftaran baru, dan beri tahu pemilik akun.
      await sendEmail(env, email, 'Percobaan pendaftaran di Tongkrongan.tech', '<p>Ada yang mencoba mendaftar dengan email ini, tetapi akun sudah ada. Bila itu kamu, silakan masuk atau atur ulang kata sandi. Bila bukan, abaikan email ini.</p>').catch(() => {})
      return requireVerify(env) ? json({ needVerify: true }) : json({ ok: true })
    }
    const id = randomHex(12), salt = randomHex(16)
    const verified = requireVerify(env) ? 0 : 1
    await env.DB.prepare('INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(id, email, await hashPassword(pw, salt), salt, 'email', verified, Date.now()).run()
    if (!verified) {
      await issueOtp(env, { id, email })
      return json({ needVerify: true })
    }
    return json({ ok: true }, 200, { 'set-cookie': await startSession(req, env, id) })
  },

  'POST /api/auth/login': async (req, env) => {
    const b = await readBody<{ email?: string; password?: string; turnstile?: string }>(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    const ip = clientIp(req)
    if (!(await rateLimit(env, `login:${ip}:${email}`, 10, 900))) throw new HttpError(429, 'rate_limited')
    // Kuncian akun: setelah 10 kegagalan per email dalam 15 menit, login ditolak sementara (walau sandi benar).
    if (await ratePeek(env, `lock:${email}`, 900) >= 10) throw new HttpError(429, 'rate_limited')
    if (!(await verifyTurnstile(env, b.turnstile, ip))) throw new HttpError(400, 'captcha')
    const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{ id: string; pw_hash: string | null; pw_salt: string | null; verified: number; blocked: number }>()
    const stored = u?.pw_hash ? parsePasswordHash(u.pw_hash) : null
    const attempt = await hashPassword(String(b.password ?? ''), u?.pw_salt ?? '00'.repeat(16), Math.min(stored?.iterations ?? PBKDF2_ITERATIONS, PBKDF2_ITERATIONS))
    if (!u || !u.pw_hash || !stored || !safeEqual(attempt.slice(attempt.indexOf('$') + 1), stored.hash)) {
      await rateLimit(env, `lock:${email}`, 10, 900)
      throw new HttpError(401, 'invalid_credentials')
    }
    if (u.blocked) throw new HttpError(403, 'blocked')
    if (!u.verified && requireVerify(env)) { await issueOtp(env, { id: u.id, email }); throw new HttpError(403, 'unverified') }
    await rateClear(env, `lock:${email}`)
    // Naikkan iterasi hash lama ke standar terbaru saat login berhasil.
    if (stored.iterations < PBKDF2_ITERATIONS && u.pw_salt) {
      await env.DB.prepare('UPDATE users SET pw_hash = ? WHERE id = ?').bind(await hashPassword(String(b.password ?? ''), u.pw_salt), u.id).run()
    }
    return json({ ok: true }, 200, { 'set-cookie': await startSession(req, env, u.id) })
  },

  'POST /api/auth/verify-otp': async (req, env) => {
    const b = await readBody<{ email?: string; code?: string }>(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    const ip = clientIp(req)
    if (!(await rateLimit(env, `votp:${ip}`, 20, 3600))) throw new HttpError(429, 'rate_limited')
    const u = await env.DB.prepare('SELECT id, blocked FROM users WHERE email = ?').bind(email).first<{ id: string; blocked: number }>()
    const o = u ? await env.DB.prepare('SELECT code_hash, expires_at, attempts FROM email_otps WHERE user_id = ?').bind(u.id).first<{ code_hash: string; expires_at: number; attempts: number }>() : null
    if (!u || !o || o.expires_at < Date.now() || o.attempts >= 5) throw new HttpError(400, 'bad_code')
    if (!safeEqual(await sha256(String(b.code ?? '').trim()), o.code_hash)) {
      await env.DB.prepare('UPDATE email_otps SET attempts = attempts + 1 WHERE user_id = ?').bind(u.id).run()
      throw new HttpError(400, 'bad_code')
    }
    if (u.blocked) throw new HttpError(403, 'blocked')
    await env.DB.prepare('UPDATE users SET verified = 1 WHERE id = ?').bind(u.id).run()
    await env.DB.prepare('DELETE FROM email_otps WHERE user_id = ?').bind(u.id).run()
    await rateClear(env, `lock:${email}`)
    return json({ ok: true }, 200, { 'set-cookie': await startSession(req, env, u.id) })
  },

  'POST /api/auth/resend-otp': async (req, env) => {
    const b = await readBody<{ email?: string }>(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    if (!(await rateLimit(env, `rotp:${clientIp(req)}`, 10, 3600)) || !(await rateLimit(env, `rotp:${email}`, 5, 3600))) throw new HttpError(429, 'rate_limited')
    const u = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND verified = 0 AND blocked = 0').bind(email).first<{ id: string }>()
    if (u) await issueOtp(env, { id: u.id, email })
    return json({ ok: true }) // jawaban sama untuk email apa pun
  },

  'POST /api/auth/forgot': async (req, env) => {
    const b = await readBody<{ email?: string; turnstile?: string }>(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    const ip = clientIp(req)
    if (!(await rateLimit(env, `forgot:${ip}`, 5, 3600))) throw new HttpError(429, 'rate_limited')
    if (!(await verifyTurnstile(env, b.turnstile, ip))) throw new HttpError(400, 'captcha')
    if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new HttpError(503, 'email_off')
    const u = EMAIL_RE.test(email) ? await env.DB.prepare('SELECT id FROM users WHERE email = ? AND pw_hash IS NOT NULL AND blocked = 0').bind(email).first<{ id: string }>() : null
    if (u) {
      const token = randomHex(24)
      await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(u.id).run()
      await env.DB.prepare('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256(token), u.id, Date.now() + 3600_000).run()
      const link = `${new URL(req.url).origin}/reset?token=${token}`
      await sendEmail(env, email, 'Atur ulang kata sandi Tongkrongan.tech', `<p>Klik untuk mengatur ulang kata sandi kamu (berlaku 1 jam):</p><p><a href="${link}">${link}</a></p><p>Abaikan email ini bila bukan kamu yang meminta.</p>`)
    }
    return json({ ok: true }) // jawaban sama untuk email terdaftar maupun tidak
  },

  'POST /api/auth/reset': async (req, env) => {
    const b = await readBody<{ token?: string; password?: string }>(req)
    const ip = clientIp(req)
    if (!(await rateLimit(env, `reset:${ip}`, 10, 3600))) throw new HttpError(429, 'rate_limited')
    const pw = String(b.password ?? '')
    if (pw.length < 8 || pw.length > 128) throw new HttpError(422, 'password')
    const th = await sha256(String(b.token ?? ''))
    const r = await env.DB.prepare('SELECT user_id, expires_at FROM password_resets WHERE token_hash = ?').bind(th).first<{ user_id: string; expires_at: number }>()
    if (!r || r.expires_at < Date.now()) throw new HttpError(400, 'bad_token')
    const salt = randomHex(16)
    await env.DB.prepare('UPDATE users SET pw_hash = ?, pw_salt = ? WHERE id = ?').bind(await hashPassword(pw, salt), salt, r.user_id).run()
    await env.DB.prepare('DELETE FROM password_resets WHERE user_id = ?').bind(r.user_id).run()
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(r.user_id).run()
    return json({ ok: true })
  },

  'GET /api/vercel/start': async (req, env) => {
    const u = await requireUser(req, env)
    if (!vercelEnabled(env)) throw new HttpError(404, 'not_found')
    return new Response(null, { status: 302, headers: { location: `https://vercel.com/integrations/${env.VERCEL_INTEGRATION_SLUG}/new?state=${await makeState(env, u.id)}` } })
  },

  'GET /api/vercel/callback': async (req, env, url) => {
    const u = await requireUser(req, env)
    if (!vercelEnabled(env)) throw new HttpError(404, 'not_found')
    const code = url.searchParams.get('code') ?? ''
    const st = url.searchParams.get('state') ?? ''
    if (!code || !st || !(await checkState(env, u.id, st))) throw new HttpError(400, 'bad_state')
    const tok = await exchangeCode(env, code)
    if (!tok) throw new HttpError(400, 'vercel_error')
    await saveConnection(env, u.id, tok.token, tok.teamId)
    await notifyVercelConnected(env, u.email)
    const next = url.searchParams.get('next')
    let dest = '/claim?vercel=1'
    try {
      // Hanya izinkan host Vercel yang sah. endsWith('vercel.com') saja tidak aman (cocok untuk evil-vercel.com).
      if (next) {
        const target = new URL(next)
        const host = target.hostname.toLowerCase()
        if (target.protocol === 'https:' && (host === 'vercel.com' || host.endsWith('.vercel.com') || host.endsWith('.vercel.app'))) dest = next
      }
    } catch { /* abaikan */ }
    return new Response(null, { status: 302, headers: { location: dest } })
  },

  'GET /api/vercel/status': async (req, env) => {
    const u = await requireUser(req, env)
    return json({ connected: vercelEnabled(env) && !!(await getConnection(env, u.id)) })
  },

  'DELETE /api/vercel/connection': async (req, env) => {
    const u = await requireUser(req, env)
    await dropConnection(env, u.id)
    return json({ ok: true })
  },

  'GET /api/vercel/projects': async (req, env) => {
    const u = await requireUser(req, env)
    const conn = vercelEnabled(env) ? await getConnection(env, u.id) : null
    if (!conn) throw new HttpError(409, 'vercel_not_connected')
    const projects = await listProjects(conn)
    if (!projects) { await dropConnection(env, u.id); throw new HttpError(409, 'vercel_not_connected') }
    return json({ projects })
  },

  // Satu klik: tambahkan domain ke proyek Vercel pengguna, lalu buat DNS (CNAME + TXT bila diminta) sesuai jawaban Vercel.
  'POST /api/vercel/connect': async (req, env) => {
    const u = await requireUser(req, env)
    const conn = vercelEnabled(env) ? await getConnection(env, u.id) : null
    if (!conn) throw new HttpError(409, 'vercel_not_connected')
    const bd = await readBody<{ name?: string; project?: string }>(req)
    const name = String(bd.name ?? '').toLowerCase().trim()
    const project = String(bd.project ?? '').trim()
    if (!project || !/^[A-Za-z0-9_.-]{1,100}$/.test(project)) throw new HttpError(400, 'bad_input')
    // cek nama, kuota, dan ketersediaan lebih dulu agar domain Vercel tidak ditambahkan sia-sia
    const base = checkName(name)
    if (base.kind !== 'ok' || reservedExtra(env).includes(name)) throw new HttpError(422, 'invalid_name', { reason: (base as { reason?: string }).reason ?? 'reserved' })
    if (await env.DB.prepare('SELECT 1 FROM subdomains WHERE name = ?').bind(name).first()) throw new HttpError(409, 'taken')
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM subdomains WHERE user_id = ?').bind(u.id).first<{ n: number }>()
    if ((count?.n ?? 0) >= quota(env)) throw new HttpError(403, 'quota')

    const domain = `${name}.${env.BASE_DOMAIN}`
    let added = await addDomain(conn, project, domain)
    if (added.status === 400 || added.status === 409) { const ex = await getProjectDomain(conn, project, domain); if (ex.status === 200) added = ex }
    if (added.status !== 200) { console.error('addDomain gagal', name, added.status, added.data?.error?.message); throw new HttpError(502, 'vercel_error') }

    // TXT verifikasi hanya diterima bila untuk subdomain ini dan di _vercel domain induk
    const chal = ((added.data.verification ?? []) as { type: string; domain: string; value: string }[]).find((v) => v.type === 'TXT')
    const txtOk = chal && chal.domain === `_vercel.${env.BASE_DOMAIN}` && new RegExp(`^vc-domain-verify=${domain.replace(/\./g, '\\.')},[a-z0-9]{8,64}$`, 'i').test(chal.value)
    try {
      const cname = await recommendedCname(conn, project, domain)
      const b = validateRecordInput(env, { name, platform: 'vercel', type: 'CNAME', value: cname, txtLabel: txtOk ? '_vercel' : '', txtValue: txtOk ? chal!.value : '' })
      await createSubdomain(env, u, b)
    } catch (e) {
      await removeProjectDomain(conn, project, domain).catch(() => {})
      throw e
    }
    await env.DB.prepare('UPDATE subdomains SET vercel_project = ? WHERE name = ?').bind(project, name).run()
    if (txtOk) await verifyProjectDomain(conn, project, domain).catch(() => {})
    return json({ subdomain: await presentSub(env, await ownedSub(env, u, name)) }, 201)
  },

  'POST /api/auth/logout': async (req, env) => {
    const t = readSession(req)
    if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run()
    return clearSessionCookies(req, { ok: true })
  },

  'GET /api/subdomains': async (req, env) => {
    const u = await requireUser(req, env)
    const rows = await env.DB.prepare('SELECT * FROM subdomains WHERE user_id = ? ORDER BY created_at').bind(u.id).all<SubRow>()
    return json({ subdomains: await Promise.all(rows.results.map((r) => presentSub(env, r))), quota: quota(env) })
  },

  'POST /api/subdomains': async (req, env) => {
    const u = await requireUser(req, env)
    const b = validateRecordInput(env, await readBody(req))
    return json({ subdomain: await presentSub(env, await createSubdomain(env, u, b)) }, 201)
  },

  'PATCH /api/subdomains/:name': async (req, env, _u, m) => {
    const u = await requireUser(req, env)
    const s = await ownedSub(env, u, m[1])
    if (s.status === 'suspended') throw new HttpError(403, 'suspended')
    const bd = await readBody<{ platform?: string; type?: string; value?: string; txtLabel?: string; txtValue?: string }>(req)
    const b = validateRecordInput(env, { name: s.name, platform: bd.platform ?? s.platform, type: bd.type, value: bd.value, txtLabel: bd.txtLabel, txtValue: bd.txtValue })
    if (!(await rateLimit(env, `dns:${u.id}`, 20, 3600))) throw new HttpError(429, 'rate_limited')
    let rid: string | null, tid: string | null = null
    try {
      rid = await updateRecord(env, s.cf_record_id, hostOf(env, s.name), b.type, b.value)
      if (b.txtLabel && b.txtValue) {
        // label berubah = nama record berbeda, jadi hapus yang lama lalu buat baru
        if (s.txt_label !== b.txtLabel) { await deleteRecord(env, s.txt_record_id); tid = await createRecord(env, txtHost(env, b.txtLabel, s.name), 'TXT', b.txtValue) }
        else tid = await updateRecord(env, s.txt_record_id, txtHost(env, b.txtLabel, s.name), 'TXT', b.txtValue)
      } else await deleteRecord(env, s.txt_record_id)
    } catch (e) { console.error('updateRecord gagal', s.name, e); throw new HttpError(502, 'dns_provider') }
    await env.DB.prepare("UPDATE subdomains SET platform = ?, type = ?, value = ?, cf_record_id = ?, txt_label = ?, txt_value = ?, txt_record_id = ?, status = 'pending', fail_reason = NULL, last_check_at = 0 WHERE name = ?")
      .bind(b.platform, b.type, b.value, rid, b.txtLabel, b.txtValue, tid, s.name).run()
    await historyAdd(env, s.name, 'h.edited', `${b.type} ${b.value}`)
    return json({ subdomain: await presentSub(env, await ownedSub(env, u, s.name)) })
  },

  'POST /api/subdomains/:name/verify': async (req, env, _u, m) => {
    const u = await requireUser(req, env)
    const s = await ownedSub(env, u, m[1])
    if (s.status === 'suspended') throw new HttpError(403, 'suspended')
    if (Date.now() - s.last_check_at < 8000) throw new HttpError(429, 'too_fast')
    await env.DB.prepare('UPDATE subdomains SET last_check_at = ? WHERE name = ?').bind(Date.now(), s.name).run()
    if (s.platform === 'vercel' && s.vercel_project) {
      const conn = await getConnection(env, u.id).catch(() => null)
      if (conn) await verifyProjectDomain(conn, s.vercel_project, `${s.name}.${env.BASE_DOMAIN}`).catch(() => {})
    }
    const r = await verifyRecord(env, s)
    if (r.ok) {
      await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL, activated_at = COALESCE(activated_at, ?) WHERE name = ?").bind(Date.now(), s.name).run()
      await env.DB.prepare('INSERT INTO checks (name, ok, at) VALUES (?, 1, ?)').bind(s.name, Date.now()).run()
      await historyAdd(env, s.name, 'h.active')
      if (!s.activated_at) await notifyClaimActive(env, s.name, s.platform, u.email)
    } else {
      await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = ? WHERE name = ?").bind(r.reason, s.name).run()
      await historyAdd(env, s.name, 'h.failed', r.reason)
    }
    return json({ subdomain: await presentSub(env, await ownedSub(env, u, s.name)) })
  },

  'DELETE /api/subdomains/:name': async (req, env, _u, m) => {
    const u = await requireUser(req, env)
    const s = await ownedSub(env, u, m[1])
    if (s.status === 'suspended') throw new HttpError(403, 'suspended')
    try { await deleteRecord(env, s.cf_record_id); await deleteRecord(env, s.txt_record_id) } catch (e) { console.error('deleteRecord gagal', s.name, e); throw new HttpError(502, 'dns_provider') }
    if (s.platform === 'vercel' && s.vercel_project) {
      const conn = await getConnection(env, u.id).catch(() => null)
      if (conn) await removeProjectDomain(conn, s.vercel_project, `${s.name}.${env.BASE_DOMAIN}`).catch(() => {})
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM history WHERE name = ?').bind(s.name),
      env.DB.prepare('DELETE FROM checks WHERE name = ?').bind(s.name),
      env.DB.prepare('DELETE FROM subdomains WHERE name = ?').bind(s.name),
    ])
    return json({ ok: true })
  },

  'POST /api/reports': async (req, env) => {
    const ip = clientIp(req)
    const b = await readBody<{ name?: string; reason?: string; detail?: string; turnstile?: string }>(req)
    if (!(await rateLimit(env, `report:${ip}`, 5, 3600))) throw new HttpError(429, 'rate_limited')
    if (!(await verifyTurnstile(env, b.turnstile, ip))) throw new HttpError(400, 'captcha')
    const name = String(b.name ?? '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(new RegExp(`\\.${env.BASE_DOMAIN.replace(/\./g, '\\.')}$`), '')
    if (!NAME_RE.test(name)) throw new HttpError(422, 'name')
    if (!REASONS.includes(String(b.reason))) throw new HttpError(422, 'reason')
    const exists = await env.DB.prepare('SELECT 1 FROM subdomains WHERE name = ?').bind(name).first()
    if (!exists) throw new HttpError(404, 'not_found')
    const id = randomHex(8).toUpperCase()
    await env.DB.prepare('INSERT INTO reports (id, name, reason, detail, ip_hash, at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, name, b.reason, String(b.detail ?? '').slice(0, 600), (await sha256(ip + env.BASE_DOMAIN)).slice(0, 16), Date.now()).run()
    return json({ ok: true, id, name })
  },
}

/* ---------- admin (token rahasia, belum ada UI) ---------- */
async function admin(req: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/admin/')) return null
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!env.ADMIN_TOKEN || !safeEqual(await sha256(given), await sha256(env.ADMIN_TOKEN))) throw new HttpError(401, 'unauthorized')
  if (req.method === 'GET' && url.pathname === '/api/admin/reports') {
    const rows = await env.DB.prepare("SELECT * FROM reports WHERE status = 'open' ORDER BY at").all()
    return json({ reports: rows.results })
  }
  const resolve = url.pathname.match(/^\/api\/admin\/reports\/(\w+)\/resolve$/)
  if (req.method === 'POST' && resolve) {
    await env.DB.prepare("UPDATE reports SET status = 'resolved' WHERE id = ?").bind(resolve[1]).run()
    return json({ ok: true })
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/suspend') {
    const { name, reason } = await readBody<{ name: string; reason?: string }>(req)
    const s = await env.DB.prepare('SELECT * FROM subdomains WHERE name = ?').bind(name).first<SubRow>()
    if (!s) throw new HttpError(404, 'not_found')
    await deleteRecord(env, s.cf_record_id)
    await deleteRecord(env, s.txt_record_id)
    await env.DB.prepare("UPDATE subdomains SET status = 'suspended', fail_reason = 'suspended', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(name).run()
    await historyAdd(env, name, 'h.suspended', reason)
    return json({ ok: true })
  }
  if (req.method === 'POST' && url.pathname === '/api/admin/block') {
    const { email } = await readBody<{ email: string }>(req)
    const u = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(String(email).toLowerCase()).first<{ id: string }>()
    if (!u) throw new HttpError(404, 'not_found')
    await env.DB.batch([env.DB.prepare('UPDATE users SET blocked = 1 WHERE id = ?').bind(u.id), env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(u.id)])
    return json({ ok: true })
  }
  // Konteks untuk moderator: status subdomain dan pemiliknya, supaya laporan bisa dinilai dan pemilik bisa diblokir.
  const info = url.pathname.match(/^\/api\/admin\/subdomains\/([a-z0-9-]{1,63})$/)
  if (req.method === 'GET' && info) {
    const r = await env.DB.prepare('SELECT s.name, s.platform, s.type, s.value, s.status, s.created_at, s.activated_at, u.email AS owner_email, u.blocked AS owner_blocked FROM subdomains s JOIN users u ON u.id = s.user_id WHERE s.name = ?').bind(info[1]).first()
    if (!r) throw new HttpError(404, 'not_found')
    return json({ subdomain: r })
  }
  throw new HttpError(404, 'not_found')
}

/* ---------- OAuth ---------- */
const oauthCreds = (env: Env, p: OAuthProvider) => p === 'github' ? [env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET] : p === 'google' ? [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET] : [env.DISCORD_CLIENT_ID, env.DISCORD_CLIENT_SECRET]

async function oauthStart(req: Request, env: Env, url: URL, provider: OAuthProvider) {
  const [id, sec] = oauthCreds(env, provider)
  if (!id || !sec) throw new HttpError(404, 'not_configured')
  const state = randomHex(16)
  const redirect = encodeURIComponent(`${url.origin}/api/auth/${provider}/callback`)
  const dest = provider === 'github'
    ? `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${redirect}&scope=${encodeURIComponent('user:email')}&state=${state}`
    : provider === 'google'
      ? `https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=${redirect}&response_type=code&scope=${encodeURIComponent('openid email')}&state=${state}`
      : `https://discord.com/oauth2/authorize?client_id=${id}&redirect_uri=${redirect}&response_type=code&scope=${encodeURIComponent('identify email')}&state=${state}`
  return new Response(null, { status: 302, headers: { location: dest, 'set-cookie': cookie(req, 'tt_oauth', state, 600) } })
}

async function oauthCallback(req: Request, env: Env, url: URL, provider: OAuthProvider) {
  const state = url.searchParams.get('state'), code = url.searchParams.get('code')
  const fail = (why: string) => Response.redirect(`${url.origin}/login?error=${why}`, 302)
  if (!state || !code || state !== readCookie(req, 'tt_oauth')) return fail('state')
  const redirect = `${url.origin}/api/auth/${provider}/callback`
  let email: string | null = null
  try {
    if (provider === 'github') {
      const tr = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code, redirect_uri: redirect }) })
      const { access_token } = (await tr.json()) as { access_token?: string }
      if (!access_token) return fail('token')
      const er = await fetch('https://api.github.com/user/emails', { headers: { authorization: `Bearer ${access_token}`, 'user-agent': 'tongkrongan' } })
      const list = (await er.json()) as { email: string; primary: boolean; verified: boolean }[]
      email = list.find((e) => e.primary && e.verified)?.email ?? null
    } else if (provider === 'google') {
      const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, code, redirect_uri: redirect, grant_type: 'authorization_code' }) })
      const { access_token } = (await tr.json()) as { access_token?: string }
      if (!access_token) return fail('token')
      const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } })
      const info = (await ur.json()) as { email?: string; email_verified?: boolean }
      email = info.email_verified ? info.email ?? null : null
    } else {
      const tr = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID!, client_secret: env.DISCORD_CLIENT_SECRET!, code, redirect_uri: redirect, grant_type: 'authorization_code' }) })
      const { access_token } = (await tr.json()) as { access_token?: string }
      if (!access_token) return fail('token')
      const ur = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${access_token}`, 'user-agent': 'tongkrongan' } })
      email = discordVerifiedEmail((await ur.json()) as { email?: string | null; verified?: boolean })
    }
  } catch { return fail('provider') }
  if (!email) return fail('email')
  email = email.toLowerCase()
  let u = await env.DB.prepare('SELECT id, blocked FROM users WHERE email = ?').bind(email).first<{ id: string; blocked: number }>()
  if (!u) {
    const id = randomHex(12)
    await env.DB.prepare('INSERT INTO users (id, email, provider, verified, created_at) VALUES (?, ?, ?, 1, ?)').bind(id, email, provider, Date.now()).run()
    u = { id, blocked: 0 }
  }
  if (u.blocked) return fail('blocked')
  const headers = new Headers({ location: `${url.origin}/dashboard` })
  headers.append('set-cookie', await startSession(req, env, u.id))
  headers.append('set-cookie', cookie(req, 'tt_oauth', '', 0))
  return new Response(null, { status: 302, headers })
}

/* ---------- router ---------- */
function match(method: string, path: string) {
  for (const key of Object.keys(api)) {
    const [m, p] = key.split(' ')
    if (m !== method) continue
    const re = new RegExp('^' + p.replace(/:name/g, '([a-z0-9-]{3,32})') + '$')
    const r = path.match(re)
    if (r) return { handler: api[key], params: r }
  }
  return null
}

async function handleFetch(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url)
  if (url.pathname === '/.well-known/security.txt') {
    return new Response(SECURITY_TXT, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
  }
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
  try {
    csrfGuard(req)
    const oauth = url.pathname.match(/^\/api\/auth\/(github|google|discord)\/(start|callback)$/)
    if (oauth && req.method === 'GET') return oauth[2] === 'start' ? await oauthStart(req, env, url, oauth[1] as OAuthProvider) : await oauthCallback(req, env, url, oauth[1] as OAuthProvider)
    const adm = await admin(req, env, url)
    if (adm) return adm
    const hit = match(req.method, url.pathname)
    if (!hit) throw new HttpError(404, 'not_found')
    return await hit.handler(req, env, url, hit.params)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status)
    console.error(e)
    return json({ error: 'server' }, 500)
  }
}

// Tambah header keamanan ke semua respons, sambil memastikan set-cookie tidak hilang.
function harden(res: Response, req: Request): Response {
  const headers = new Headers()
  res.headers.forEach((v, k) => { if (k.toLowerCase() !== 'set-cookie') headers.set(k, v) })
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!headers.has(k)) headers.set(k, v)
  if (new URL(req.url).protocol === 'https:') headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains')
  const out = new Response(res.body, { status: res.status, statusText: res.statusText, headers })
  const setCookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  for (const c of setCookies) out.headers.append('set-cookie', c)
  return out
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return harden(await handleFetch(req, env), req)
  },
  async scheduled(_c: ScheduledController, env: Env) { await runCron(env) },
}
