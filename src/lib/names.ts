// Aturan nama F3: 3-32 karakter, huruf kecil, angka, tanda hubung.
export const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/

const RESERVED = [
  'www', 'mail', 'admin', 'api', 'root', 'ftp', 'ns1', 'ns2', 'smtp', 'imap', 'pop', 'support',
  'abuse', 'postmaster', 'webmaster', 'help', 'status', 'dashboard', 'app', 'blog', 'docs',
  'login', 'cdn', 'static', 'tongkrongan', 'security', 'billing', 'dns',
]
// Nama yang menyerupai merek atau lembaga resmi (contoh awal, daftar nyata dikelola admin, F12).
const BRAND = ['google', 'facebook', 'instagram', 'tokopedia', 'gojek', 'bca', 'bri', 'mandiri', 'polri', 'kemendikbud', 'pemerintah', 'paypal']

export type NameState =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: 'short' | 'long' | 'chars' | 'edge' | 'reserved' | 'brand' }
  | { kind: 'taken'; mine?: boolean }
  | { kind: 'ok' }

export function checkName(raw: string, taken: string[] = [], mine: string[] = []): NameState {
  const n = raw.trim().toLowerCase()
  if (!n) return { kind: 'empty' }
  if (n.length < 3) return { kind: 'invalid', reason: 'short' }
  if (n.length > 32) return { kind: 'invalid', reason: 'long' }
  if (!/^[a-z0-9-]+$/.test(n)) return { kind: 'invalid', reason: 'chars' }
  if (n.startsWith('-') || n.endsWith('-')) return { kind: 'invalid', reason: 'edge' }
  if (RESERVED.includes(n)) return { kind: 'invalid', reason: 'reserved' }
  if (BRAND.some((b) => n === b || n.includes(b))) return { kind: 'invalid', reason: 'brand' }
  if (mine.includes(n)) return { kind: 'taken', mine: true }
  if (taken.includes(n)) return { kind: 'taken' }
  return { kind: 'ok' }
}

// Nama dasar untuk saran alternatif; ketersediaan tiap kandidat dicek ke server.
export function suggestCandidates(raw: string): string[] {
  const base = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 24) || 'proyekku'
  return [`${base}-dev`, `${base}-web`, `my-${base}`, `${base}-id`, `${base}2`, `${base}-hq`].filter((c) => checkName(c).kind === 'ok')
}
