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

// Parsing IPv6 yang ketat: kembalikan 8 grup hextet, atau null bila string tidak valid.
// Menerima bentuk ringkas "::", bentuk panjang, dan IPv4 di ekor (::ffff:1.2.3.4).
function parseV6(raw: string): number[] | null {
  const v = raw.trim().toLowerCase()
  if (!v || v.includes('%') || v.includes('/')) return null
  let src = v
  const tail4 = /^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(v)
  if (tail4) {
    const oct = tail4[2].split('.').map(Number)
    if (oct.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null
    src = `${tail4[1]}${((oct[0] << 8) | oct[1]).toString(16)}:${((oct[2] << 8) | oct[3]).toString(16)}`
  }
  const parts = src.split('::')
  if (parts.length > 2) return null
  const head = parts[0] === '' ? [] : parts[0].split(':')
  const tail = parts.length === 2 ? (parts[1] === '' ? [] : parts[1].split(':')) : []
  if (![...head, ...tail].every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null
  if (parts.length === 1 && head.length !== 8) return null
  if (parts.length === 2 && head.length + tail.length > 7) return null
  return [...head, ...Array(8 - head.length - tail.length).fill('0'), ...tail].map((g) => parseInt(g, 16))
}

// Bentuk kanonik RFC 5952: huruf kecil, tanpa nol depan, dan "::" untuk deret nol terpanjang (min. 2 grup).
// Dipakai agar nilai yang disimpan bisa dibandingkan langsung dengan jawaban DoH (#72).
export function canonicalV6(raw: string): string | null {
  const g = parseV6(raw)
  if (!g) return null
  let bestStart = -1, bestLen = 0
  for (let i = 0; i < 8;) {
    if (g[i] !== 0) { i++; continue }
    let j = i
    while (j < 8 && g[j] === 0) j++
    if (j - i >= 2 && j - i > bestLen) { bestStart = i; bestLen = j - i }
    i = j
  }
  const hx = (n: number) => n.toString(16)
  if (bestLen === 0) return g.map(hx).join(':')
  return `${g.slice(0, bestStart).map(hx).join(':')}::${g.slice(bestStart + bestLen).map(hx).join(':')}`
}

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

// Rentang IPv6 yang tidak boleh dipakai: unspecified, loopback, IPv4-compatible/mapped, ULA (fc00::/7),
// link-local (fe80::/10), multicast (ff00::/8), dokumentasi (2001:db8::/32), NAT64 (64:ff9b::/96), 6to4 (2002::/16).
// Dibandingkan setelah kanonikalisasi supaya bentuk panjang seperti "0000::1" tidak lolos.
function blockedV6(v: string): boolean {
  const g = parseV6(v)
  if (!g) return true // tidak valid: tolak, jangan sampai lolos ke penyedia DNS
  if (g.every((x) => x === 0)) return true // ::
  if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 && g[4] === 0 && (g[5] === 0 || g[5] === 0xffff)) return true // ::/96 dan ::ffff:0:0/96
  if ((g[0] & 0xfe00) === 0xfc00) return true // fc00::/7
  if ((g[0] & 0xffc0) === 0xfe80) return true // fe80::/10
  if ((g[0] & 0xff00) === 0xff00) return true // ff00::/8
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true // 2001:db8::/32
  if (g[0] === 0x0064 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 && g[4] === 0 && g[5] === 0) return true // 64:ff9b::/96
  if (g[0] === 0x2002) return true // 2002::/16
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
    const canonical = canonicalV6(v)
    if (!canonical) return 'ipv6'
    if (blockedV6(canonical)) return 'ip_private'
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
