// Adapter DNS deSEC (https://desec.io). deSEC memakai model RRset: semua nilai satu nama+tipe dikirim sebagai satu daftar.
// Karena itu "id record" di sini adalah JSON {s: subname, t: type, v: nilai}, bukan id angka seperti Cloudflare.
export type DesecEnv = { BASE_DOMAIN: string; DESEC_TOKEN?: string }
type RType = 'A' | 'AAAA' | 'CNAME' | 'TXT'

const API = 'https://desec.io/api/v1'
const TTL = 3600 // TTL minimum akun deSEC gratis

async function call(env: DesecEnv, path: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  for (let i = 0; ; i++) {
    const r = await fetch(API + path, { ...init, headers: { authorization: `Token ${env.DESEC_TOKEN}`, 'content-type': 'application/json', ...(init.headers ?? {}) } })
    if (r.status !== 429 || i >= tries - 1) return r
    await new Promise((res) => setTimeout(res, Math.min(Number(r.headers.get('retry-after')) || 1, 10) * 1000))
  }
}

export function subnameOf(env: DesecEnv, host: string) {
  const base = env.BASE_DOMAIN.toLowerCase()
  const h = host.toLowerCase().replace(/\.$/, '')
  if (h === base) return ''
  if (!h.endsWith(`.${base}`)) throw new Error(`host di luar zona: ${host}`)
  return h.slice(0, -(base.length + 1))
}

// Format isi record menurut deSEC: TXT diapit tanda kutip, CNAME berakhir titik.
export function fmt(type: RType, value: string) {
  if (type === 'TXT') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
  if (type === 'CNAME') return value.toLowerCase().replace(/\.?$/, '.')
  return value
}

async function getRecords(env: DesecEnv, subname: string, type: RType): Promise<string[]> {
  const r = await call(env, `/domains/${env.BASE_DOMAIN}/rrsets/${subname || '@'}/${type}/`)
  if (r.status === 404) return []
  if (!r.ok) throw new Error(`desec ${r.status}`)
  return ((await r.json()) as { records: string[] }).records
}

// Bulk PATCH membuat atau mengubah RRset; daftar kosong menghapusnya.
async function putRecords(env: DesecEnv, subname: string, type: RType, records: string[]) {
  const r = await call(env, `/domains/${env.BASE_DOMAIN}/rrsets/`, { method: 'PATCH', body: JSON.stringify([{ subname, type, ttl: TTL, records }]) })
  if (!r.ok) throw new Error(`desec ${r.status} ${(await r.text()).slice(0, 160)}`)
}

const encodeId = (s: string, t: RType, v: string) => JSON.stringify({ s, t, v })
const decodeId = (id: string) => JSON.parse(id) as { s: string; t: RType; v: string }

export async function desecCreate(env: DesecEnv, host: string, type: RType, value: string): Promise<string> {
  const s = subnameOf(env, host), rec = fmt(type, value)
  // Baca, tambah, tulis, lalu cek ulang: dua klaim bersamaan di nama yang sama (mis. _vercel) tidak boleh saling menimpa.
  for (let i = 0; i < 4; i++) {
    const cur = await getRecords(env, s, type)
    // CNAME hanya boleh satu nilai; tipe lain digabung dengan yang sudah ada
    await putRecords(env, s, type, type === 'CNAME' ? [rec] : [...new Set([...cur, rec])])
    if ((await getRecords(env, s, type)).includes(rec)) return encodeId(s, type, value)
  }
  throw new Error('desec: gagal menyimpan record (bentrok)')
}

export async function desecDelete(env: DesecEnv, id: string) {
  const { s, t, v } = decodeId(id)
  const rec = fmt(t, v)
  for (let i = 0; i < 4; i++) {
    const cur = await getRecords(env, s, t)
    if (!cur.includes(rec)) return // sudah tidak ada
    await putRecords(env, s, t, cur.filter((x) => x !== rec))
    if (!(await getRecords(env, s, t)).includes(rec)) return
  }
  throw new Error('desec: gagal menghapus record (bentrok)')
}

export async function desecUpdate(env: DesecEnv, id: string | null, host: string, type: RType, value: string): Promise<string> {
  if (id) await desecDelete(env, id)
  return desecCreate(env, host, type, value)
}
