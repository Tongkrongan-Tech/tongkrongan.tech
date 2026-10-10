export type RecordType = 'CNAME' | 'A' | 'AAAA' | 'TXT'
export type PlatformId = 'cloudflare' | 'railway' | 'vercel' | 'vps' | 'hosting'

export interface Platform {
  id: PlatformId
  name: string
  types: RecordType[]
  defaultType: RecordType
  placeholder: Partial<Record<RecordType, string>>
  needsTxt: boolean
  docs: string
  color: string // warna identitas kartu, dipakai sebagai latar kecil di kartu
}

// Nilai di sini hanya contoh/placeholder. Wajib diverifikasi ke dokumentasi resmi sebelum rilis (PRD, bagian Integrasi).
export const PLATFORMS: Platform[] = [
  { id: 'cloudflare', name: 'Cloudflare', types: ['CNAME', 'A', 'AAAA'], defaultType: 'CNAME', placeholder: { CNAME: 'proyekmu.pages.dev', A: '203.0.113.10', AAAA: '2001:db8::10' }, needsTxt: false, docs: 'https://developers.cloudflare.com/pages/configuration/custom-domains/', color: '#ff9d3d' },
  { id: 'railway', name: 'Railway', types: ['CNAME', 'TXT'], defaultType: 'CNAME', placeholder: { CNAME: 'xxxx.up.railway.app', TXT: 'railway-verify=xxxxxxxx' }, needsTxt: true, docs: 'https://docs.railway.com/guides/public-networking', color: '#b79cff' },
  { id: 'vercel', name: 'Vercel', types: ['CNAME', 'A', 'TXT'], defaultType: 'CNAME', placeholder: { CNAME: 'cname.vercel-dns.com', A: '203.0.113.20', TXT: 'vc-domain-verify=xxxx' }, needsTxt: true, docs: 'https://vercel.com/docs/domains/working-with-domains/add-a-domain', color: '#9fe3c2' },
  { id: 'vps', name: 'VPS', types: ['A', 'AAAA'], defaultType: 'A', placeholder: { A: '203.0.113.30', AAAA: '2001:db8::30' }, needsTxt: false, docs: 'https://caddyserver.com/docs/automatic-https', color: '#ffd25e' },
  { id: 'hosting', name: 'Hosting lain', types: ['A', 'CNAME'], defaultType: 'A', placeholder: { A: '203.0.113.40', CNAME: 'server.hostingku.example' }, needsTxt: false, docs: '', color: '#f4a6c0' },
]

export const platformById = (id: PlatformId) => PLATFORMS.find((p) => p.id === id)!

const HOST_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const V4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const V6_RE = /^(([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4})$/i

export type ValueError = 'empty' | 'ip' | 'ip_private' | 'ipv6' | 'host' | 'host_self' | null

export function validateValue(type: RecordType, raw: string, name: string, domain: string): ValueError {
  const v = raw.trim()
  if (!v) return 'empty'
  if (type === 'A') {
    if (!V4_RE.test(v)) return 'ip'
    const [a, b] = v.split('.').map(Number)
    if (a === 10 || a === 127 || a === 0 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) return 'ip_private'
    return null
  }
  if (type === 'AAAA') return V6_RE.test(v) && v.includes(':') ? null : 'ipv6'
  if (type === 'CNAME') {
    const h = v.replace(/\.$/, '').toLowerCase()
    if (/^https?:\/\//.test(h) || !HOST_RE.test(h)) return 'host'
    if (h === domain || h.endsWith(`.${domain}`) || h === `${name}.${domain}`) return 'host_self'
    return null
  }
  return null // TXT bebas
}
