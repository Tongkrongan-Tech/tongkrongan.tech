export type RecordType = 'CNAME' | 'A' | 'AAAA' | 'TXT'
export type PlatformId = 'cloudflare' | 'railway' | 'vercel' | 'github' | 'vps' | 'hosting'

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
// TXT tidak pernah menjadi tipe utama (cegah klaim tanpa bukti kendali). TXT hanya dipakai sebagai record verifikasi tambahan.
export const PLATFORMS: Platform[] = [
  { id: 'cloudflare', name: 'Cloudflare', types: ['CNAME', 'A', 'AAAA'], defaultType: 'CNAME', placeholder: { CNAME: 'proyekmu.pages.dev', A: '203.0.113.10', AAAA: '2001:db8::10' }, needsTxt: false, docs: 'https://developers.cloudflare.com/pages/configuration/custom-domains/', color: '#ff9d3d' },
  { id: 'railway', name: 'Railway', types: ['CNAME'], defaultType: 'CNAME', placeholder: { CNAME: 'xxxx.up.railway.app' }, needsTxt: true, docs: 'https://docs.railway.com/guides/public-networking', color: '#b79cff' },
  { id: 'vercel', name: 'Vercel', types: ['CNAME', 'A'], defaultType: 'CNAME', placeholder: { CNAME: 'cname.vercel-dns.com', A: '203.0.113.20' }, needsTxt: false, docs: 'https://vercel.com/docs/domains/working-with-domains/add-a-domain', color: '#9fe3c2' },
  { id: 'github', name: 'GitHub Pages', types: ['CNAME'], defaultType: 'CNAME', placeholder: { CNAME: 'username.github.io' }, needsTxt: false, docs: 'https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site', color: '#d0d7de' },
  { id: 'vps', name: 'VPS', types: ['A', 'AAAA'], defaultType: 'A', placeholder: { A: '203.0.113.30', AAAA: '2001:db8::30' }, needsTxt: false, docs: 'https://caddyserver.com/docs/automatic-https', color: '#ffd25e' },
  { id: 'hosting', name: 'Hosting lain', types: ['A', 'CNAME'], defaultType: 'A', placeholder: { A: '203.0.113.40', CNAME: 'server.hostingku.example' }, needsTxt: false, docs: '', color: '#f4a6c0' },
]

export const platformById = (id: PlatformId) => PLATFORMS.find((p) => p.id === id)!

const HOST_RE = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i
const V4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/
const V6_RE = /^(([0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4})$/i

// Rentang IPv4 yang tidak boleh dipakai sebagai tujuan: privat, loopback, link-local, CGNAT, reserved, multicast, dokumentasi.
function blockedV4(a: number, b: number): boolean {
  if (a === 0 || a === 10 || a === 127) return true
  if (a >= 224) return true // 224.0.0.0/4 multicast, 240.0.0.0/4 reserved, 255.255.255.255
  if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local (termasuk metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 192 && b === 0) return true // 192.0.0.0/24 dan 192.0.2.0/24
  if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15
  if (a === 198 && b === 51) return true // 198.51.100.0/24
  if (a === 203 && b === 0) return true // 203.0.113.0/24
  return false
}

// Rentang IPv6 yang tidak boleh dipakai: unspecified, loopback, ULA (fc00::/7), link-local (fe80::/10), dan alamat IPv4 mapped.
function blockedV6(v: string): boolean {
  const s = v.toLowerCase()
  if (s === '::' || s === '::1') return true
  if (s.startsWith('fc') || s.startsWith('fd')) return true
  if (/^fe[89ab]/.test(s)) return true
  if (s.startsWith('::ffff:')) return true
  return false
}

export type ValueError = 'empty' | 'ip' | 'ip_private' | 'ipv6' | 'host' | 'host_self' | null

export function validateValue(type: RecordType, raw: string, name: string, domain: string): ValueError {
  const v = raw.trim()
  if (!v) return 'empty'
  if (type === 'A') {
    if (!V4_RE.test(v)) return 'ip'
    const [a, b] = v.split('.').map(Number)
    if (blockedV4(a, b)) return 'ip_private'
    return null
  }
  if (type === 'AAAA') {
    if (!(V6_RE.test(v) && v.includes(':'))) return 'ipv6'
    if (blockedV6(v)) return 'ip_private'
    return null
  }
  if (type === 'CNAME') {
    const h = v.replace(/\.$/, '').toLowerCase()
    if (/^https?:\/\//.test(h) || !HOST_RE.test(h)) return 'host'
    if (h === domain || h.endsWith(`.${domain}`) || h === `${name}.${domain}`) return 'host_self'
    return null
  }
  return null // TXT bebas
}
