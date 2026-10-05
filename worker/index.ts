import { checkName, NAME_RE, suggestCandidates } from '../src/lib/names'
import { PLATFORMS, validateValue, type RecordType } from '../src/lib/dns'
import { HttpError, cookie, clientIp, hashPassword, json, randomHex, rateLimit, readCookie, safeEqual, sendEmail, sha256, verifyTurnstile, type Env } from './lib'
import { createRecord, deleteRecord, hostOf, txtHost, updateRecord, verifyRecord } from './dns'
import { runCron } from './cron'

const SESSION_DAYS = 30
const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/
const REASONS = ['phishing', 'malware', 'spam', 'illegal', 'impersonation', 'other']
const TYPES: RecordType[] = ['A', 'AAAA', 'CNAME', 'TXT']

type User = { id: string; email: string; provider: string }
type SubRow = { name: string; user_id: string; platform: string; type: RecordType; value: string; status: string; fail_reason: string | null; verify_token: string; cf_record_id: string | null; txt_label: string | null; txt_value: string | null; txt_record_id: string | null; last_check_at: number; created_at: number; activated_at: number | null }

const quota = (env: Env) => Number(env.QUOTA) || 3
const requireVerify = (env: Env) => env.REQUIRE_EMAIL_VERIFY === '1' && !!env.RESEND_API_KEY
const reservedExtra = (env: Env) => [env.BASE_DOMAIN.split('.')[0]]

async function readBody<T>(req: Request): Promise<T> {
  try { return (await req.json()) as T } catch { throw new HttpError(400, 'bad_json') }
}

async function currentUser(req: Request, env: Env): Promise<User | null> {
  const t = readCookie(req, 'tt_session')
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

async function startSession(req: Request, env: Env, userId: string) {
  const token = randomHex(32)
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(await sha256(token), userId, Date.now() + SESSION_DAYS * 864e5).run()
  return cookie(req, 'tt_session', token, SESSION_DAYS * 86400)
}

function csrfGuard(req: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) throw new HttpError(403, 'bad_origin')
  if (!origin && req.headers.get('authorization') === null && !(req.headers.get('content-type') ?? '').includes('json')) throw new HttpError(403, 'bad_origin')
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
  const err = validateValue(type, value, name, env.BASE_DOMAIN)
  if (err) throw new HttpError(422, 'invalid_value', { reason: err })
  const txtLabel = String(b.txtLabel ?? '').trim().toLowerCase().replace(/\.$/, '')
  const txtValue = String(b.txtValue ?? '').trim()
  if (txtLabel || txtValue) {
    // TXT tambahan hanya boleh di bawah nama subdomain sendiri: _label.nama.<domain>
    if (!/^_[a-z0-9-]{1,40}$/.test(txtLabel) || !txtValue || txtValue.length > 255) throw new HttpError(422, 'invalid_txt')
  }
  return { name, platform: platform.id, type, value, txtLabel: txtLabel || null, txtValue: txtValue || null }
}

/* ---------- handlers ---------- */

const api: Record<string, (req: Request, env: Env, url: URL, m: string[]) => Promise<Response>> = {
  'GET /api/config': async (_r, env) => json({
    baseDomain: env.BASE_DOMAIN, quota: quota(env),
    oauth: { github: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET), google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) },
    turnstileSiteKey: env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY ? env.TURNSTILE_SITEKEY : null,
    emailVerify: requireVerify(env), mock: env.DNS_MODE !== 'live',
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
    if (!EMAIL_RE.test(email)) throw new HttpError(422, 'email')
    if (pw.length < 8 || pw.length > 128) throw new HttpError(422, 'password')
    const exists = await env.DB.prepare('SELECT 1 FROM users WHERE email = ?').bind(email).first()
    if (exists) throw new HttpError(409, 'exists')
    const id = randomHex(12), salt = randomHex(16), vtoken = randomHex(24)
    const verified = requireVerify(env) ? 0 : 1
    await env.DB.prepare('INSERT INTO users (id, email, pw_hash, pw_salt, provider, verified, verify_token, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(id, email, await hashPassword(pw, salt), salt, 'email', verified, vtoken, Date.now()).run()
    if (!verified) {
      const link = `${new URL(req.url).origin}/api/auth/verify?token=${vtoken}`
      await sendEmail(env, email, 'Verifikasi email Tongkrongan.tech', `<p>Klik untuk memverifikasi email kamu:</p><p><a href="${link}">${link}</a></p>`)
      return json({ needVerify: true })
    }
    return json({ ok: true }, 200, { 'set-cookie': await startSession(req, env, id) })
  },

  'POST /api/auth/login': async (req, env) => {
    const b = await readBody<{ email?: string; password?: string; turnstile?: string }>(req)
    const email = String(b.email ?? '').trim().toLowerCase()
    const ip = clientIp(req)
    if (!(await rateLimit(env, `login:${ip}:${email}`, 10, 900))) throw new HttpError(429, 'rate_limited')
    if (!(await verifyTurnstile(env, b.turnstile, ip))) throw new HttpError(400, 'captcha')
    const u = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first<{ id: string; pw_hash: string | null; pw_salt: string | null; verified: number; blocked: number }>()
    const attempt = await hashPassword(String(b.password ?? ''), u?.pw_salt ?? '00'.repeat(16))
    if (!u || !u.pw_hash || !safeEqual(attempt, u.pw_hash)) throw new HttpError(401, 'invalid_credentials')
    if (u.blocked) throw new HttpError(403, 'blocked')
    if (!u.verified && requireVerify(env)) throw new HttpError(403, 'unverified')
    return json({ ok: true }, 200, { 'set-cookie': await startSession(req, env, u.id) })
  },

  'POST /api/auth/logout': async (req, env) => {
    const t = readCookie(req, 'tt_session')
    if (t) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(t)).run()
    return json({ ok: true }, 200, { 'set-cookie': cookie(req, 'tt_session', '', 0) })
  },

  'GET /api/auth/verify': async (_req, env, url) => {
    const t = url.searchParams.get('token') ?? ''
    const r = t ? await env.DB.prepare('UPDATE users SET verified = 1, verify_token = NULL WHERE verify_token = ?').bind(t).run() : null
    return Response.redirect(`${url.origin}/login?verified=${r?.meta.changes ? 1 : 0}`, 302)
  },

  'GET /api/subdomains': async (req, env) => {
    const u = await requireUser(req, env)
    const rows = await env.DB.prepare('SELECT * FROM subdomains WHERE user_id = ? ORDER BY created_at').bind(u.id).all<SubRow>()
    return json({ subdomains: await Promise.all(rows.results.map((r) => presentSub(env, r))), quota: quota(env) })
  },

  'POST /api/subdomains': async (req, env) => {
    const u = await requireUser(req, env)
    const b = validateRecordInput(env, await readBody(req))
    if (!(await rateLimit(env, `dns:${u.id}`, 20, 3600))) throw new HttpError(429, 'rate_limited')
    const base = checkName(b.name)
    if (base.kind !== 'ok' || reservedExtra(env).includes(b.name)) throw new HttpError(422, 'invalid_name', { reason: (base as { reason?: string }).reason ?? 'reserved' })
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM subdomains WHERE user_id = ?').bind(u.id).first<{ n: number }>()
    if ((count?.n ?? 0) >= quota(env)) throw new HttpError(403, 'quota')
    const token = randomHex(16)
    try {
      await env.DB.prepare('INSERT INTO subdomains (name, user_id, platform, type, value, status, verify_token, txt_label, txt_value, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(b.name, u.id, b.platform, b.type, b.value, 'pending', token, b.txtLabel, b.txtValue, Date.now()).run()
    } catch { throw new HttpError(409, 'taken') }
    try {
      const rid = await createRecord(env, hostOf(env, b.name), b.type, b.value)
      await env.DB.prepare('UPDATE subdomains SET cf_record_id = ? WHERE name = ?').bind(rid, b.name).run()
      if (b.txtLabel && b.txtValue) {
        const tid = await createRecord(env, txtHost(env, b.txtLabel, b.name), 'TXT', b.txtValue)
        await env.DB.prepare('UPDATE subdomains SET txt_record_id = ? WHERE name = ?').bind(tid, b.name).run()
      }
    } catch (e) {
      const row = await env.DB.prepare('SELECT cf_record_id FROM subdomains WHERE name = ?').bind(b.name).first<{ cf_record_id: string | null }>()
      await deleteRecord(env, row?.cf_record_id ?? null).catch(() => {})
      await env.DB.prepare('DELETE FROM subdomains WHERE name = ?').bind(b.name).run()
      throw new HttpError(502, 'dns_provider', { detail: String(e).slice(0, 200) })
    }
    await historyAdd(env, b.name, 'h.created')
    return json({ subdomain: await presentSub(env, (await ownedSub(env, u, b.name))) }, 201)
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
    } catch (e) { throw new HttpError(502, 'dns_provider', { detail: String(e).slice(0, 200) }) }
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
    const r = await verifyRecord(env, s)
    if (r.ok) {
      await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL, activated_at = COALESCE(activated_at, ?) WHERE name = ?").bind(Date.now(), s.name).run()
      await env.DB.prepare('INSERT INTO checks (name, ok, at) VALUES (?, 1, ?)').bind(s.name, Date.now()).run()
      await historyAdd(env, s.name, 'h.active')
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
    try { await deleteRecord(env, s.cf_record_id); await deleteRecord(env, s.txt_record_id) } catch (e) { throw new HttpError(502, 'dns_provider', { detail: String(e).slice(0, 200) }) }
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
    const id = randomHex(3).toUpperCase()
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
  throw new HttpError(404, 'not_found')
}

/* ---------- OAuth ---------- */
async function oauthStart(req: Request, env: Env, url: URL, provider: 'github' | 'google') {
  const id = provider === 'github' ? env.GITHUB_CLIENT_ID : env.GOOGLE_CLIENT_ID
  const sec = provider === 'github' ? env.GITHUB_CLIENT_SECRET : env.GOOGLE_CLIENT_SECRET
  if (!id || !sec) throw new HttpError(404, 'not_configured')
  const state = randomHex(16)
  const redirect = `${url.origin}/api/auth/${provider}/callback`
  const dest = provider === 'github'
    ? `https://github.com/login/oauth/authorize?client_id=${id}&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent('user:email')}&state=${state}`
    : `https://accounts.google.com/o/oauth2/v2/auth?client_id=${id}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent('openid email')}&state=${state}`
  return new Response(null, { status: 302, headers: { location: dest, 'set-cookie': cookie(req, 'tt_oauth', state, 600) } })
}

async function oauthCallback(req: Request, env: Env, url: URL, provider: 'github' | 'google') {
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
    } else {
      const tr = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, code, redirect_uri: redirect, grant_type: 'authorization_code' }) })
      const { access_token } = (await tr.json()) as { access_token?: string }
      if (!access_token) return fail('token')
      const ur = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${access_token}` } })
      const info = (await ur.json()) as { email?: string; email_verified?: boolean }
      email = info.email_verified ? info.email ?? null : null
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

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req)
    try {
      csrfGuard(req)
      const oauth = url.pathname.match(/^\/api\/auth\/(github|google)\/(start|callback)$/)
      if (oauth && req.method === 'GET') return oauth[2] === 'start' ? await oauthStart(req, env, url, oauth[1] as 'github') : await oauthCallback(req, env, url, oauth[1] as 'github')
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
  },
  async scheduled(_c: ScheduledController, env: Env) { await runCron(env) },
}
