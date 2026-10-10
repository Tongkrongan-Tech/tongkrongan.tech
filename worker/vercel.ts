import type { Env } from './lib'

const API = 'https://api.vercel.com'

export const vercelEnabled = (env: Env) => !!(env.VERCEL_CLIENT_ID && env.VERCEL_CLIENT_SECRET && env.VERCEL_INTEGRATION_SLUG && env.VERCEL_TOKEN_KEY)
export const vercelRedirectUri = (env: Env) => `https://${env.BASE_DOMAIN}/api/vercel/callback`

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
const unhex = (s: string) => new Uint8Array(s.match(/.{2}/g)!.map((h) => parseInt(h, 16)))
const aesKey = (env: Env) => crypto.subtle.importKey('raw', unhex(env.VERCEL_TOKEN_KEY!), 'AES-GCM', false, ['encrypt', 'decrypt'])

async function encrypt(env: Env, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(env), new TextEncoder().encode(text)))
  return `${hex(iv)}.${hex(ct)}`
}
async function decrypt(env: Env, blob: string) {
  const [iv, ct] = blob.split('.')
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unhex(iv) }, await aesKey(env), unhex(ct)))
}

export type VercelConn = { token: string; teamId: string | null }

export async function saveConnection(env: Env, userId: string, token: string, teamId: string | null) {
  await env.DB.prepare('INSERT OR REPLACE INTO vercel_connections (user_id, token_enc, team_id, created_at) VALUES (?, ?, ?, ?)')
    .bind(userId, await encrypt(env, token), teamId, Date.now()).run()
}
export async function getConnection(env: Env, userId: string): Promise<VercelConn | null> {
  const r = await env.DB.prepare('SELECT token_enc, team_id FROM vercel_connections WHERE user_id = ?').bind(userId).first<{ token_enc: string; team_id: string | null }>()
  if (!r) return null
  try { return { token: await decrypt(env, r.token_enc), teamId: r.team_id } } catch { return null }
}
export const dropConnection = (env: Env, userId: string) => env.DB.prepare('DELETE FROM vercel_connections WHERE user_id = ?').bind(userId).run()

export async function exchangeCode(env: Env, code: string) {
  const r = await fetch(`${API}/v2/oauth/access_token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.VERCEL_CLIENT_ID!, client_secret: env.VERCEL_CLIENT_SECRET!, code, redirect_uri: vercelRedirectUri(env) }),
  })
  if (!r.ok) return null
  const d = (await r.json()) as { access_token?: string; team_id?: string | null }
  return d.access_token ? { token: d.access_token, teamId: d.team_id ?? null } : null
}

export async function vfetch(conn: VercelConn, path: string, init: RequestInit = {}) {
  const u = new URL(API + path)
  if (conn.teamId) u.searchParams.set('teamId', conn.teamId)
  const r = await fetch(u, { ...init, headers: { authorization: `Bearer ${conn.token}`, ...(init.body ? { 'content-type': 'application/json' } : {}) } })
  const data = (await r.json().catch(() => ({}))) as Record<string, any>
  return { status: r.status, data }
}

export const listProjects = async (conn: VercelConn) => {
  const r = await vfetch(conn, '/v9/projects?limit=100')
  return r.status === 200 ? ((r.data.projects ?? []) as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name })) : null
}
export const addDomain = (conn: VercelConn, project: string, domain: string) =>
  vfetch(conn, `/v10/projects/${encodeURIComponent(project)}/domains`, { method: 'POST', body: JSON.stringify({ name: domain }) })
export const getProjectDomain = (conn: VercelConn, project: string, domain: string) =>
  vfetch(conn, `/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}`)
export const verifyProjectDomain = (conn: VercelConn, project: string, domain: string) =>
  vfetch(conn, `/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}/verify`, { method: 'POST' })
export const removeProjectDomain = (conn: VercelConn, project: string, domain: string) =>
  vfetch(conn, `/v9/projects/${encodeURIComponent(project)}/domains/${encodeURIComponent(domain)}`, { method: 'DELETE' })
export async function recommendedCname(conn: VercelConn, project: string, domain: string) {
  const r = await vfetch(conn, `/v6/domains/${encodeURIComponent(domain)}/config?projectIdOrName=${encodeURIComponent(project)}`)
  const list = (r.data.recommendedCNAME ?? []) as { rank: number; value: string }[]
  return list.sort((a, b) => a.rank - b.rank)[0]?.value?.replace(/\.$/, '') ?? 'cname.vercel-dns.com'
}
