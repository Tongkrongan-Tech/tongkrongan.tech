// Daftar nama terlarang dan logika pencocokannya. Satu sumber kebenaran, dipakai frontend dan worker.
//
// Sumber daftar (subset awal; perbarui berkala):
// - The Big Username Blacklist (marteinn/The-Big-Username-Blacklist, lisensi MIT)
// - is-a.dev register, util/reserved.json (is-a-dev/register)
// - RFC 2142 (nama mailbox standar) dan nama infrastruktur umum
// - Umpatan Indonesia dan Inggris (mengacu pola abaron/bad-words)
// - Tranco top domain, bank dan e-wallet Indonesia, layanan besar (merek)
// - Tokoh publik diisi manual (reserved-people) dan ditambah lewat laporan atau PR
//
// Aturan pencocokan:
// - Selalu normalisasi dulu: huruf kecil, leet diganti (0 jadi o, 1 jadi i, dan seterusnya), buang selain a-z0-9.
// - Nama vital, merek, dan tokoh dicocokkan PERSIS (hindari masalah Scunthorpe).
// - Kata kasar dicocokkan sebagai substring, hanya untuk kata yang panjang dan jelas.
// - Nama yang menyerupai merek atau tokoh tetapi tidak persis ditandai review, bukan ditolak otomatis.

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i' }

// Normalisasi untuk pencocokan: huruf kecil, ganti leet, buang tanda hubung dan simbol lain.
export function normalizeName(raw: string): string {
  const lower = raw.trim().toLowerCase()
  let out = ''
  for (const ch of lower) out += LEET[ch] ?? ch
  return out.replace(/[^a-z0-9]/g, '')
}

// Nama vital dan sistem (RFC 2142,infrastruktur, nama halaman umum). Cocok persis.
export const RESERVED_NAMES: string[] = [
  // RFC 2142 dan mailbox standar
  'postmaster', 'abuse', 'security', 'webmaster', 'hostmaster', 'info', 'marketing', 'sales', 'support', 'noc', 'usenet', 'news', 'uucp',
  // infrastruktur dan sistem
  'www', 'mail', 'email', 'smtp', 'imap', 'pop', 'pop3', 'mailer', 'mailerdaemon', 'ns', 'ns1', 'ns2', 'ns3', 'dns', 'dnssec', 'mx', 'mx1', 'mx2',
  'cdn', 'static', 'assets', 'img', 'images', 'media', 'files', 'ftp', 'sftp', 'ssh', 'vpn', 'proxy', 'gateway', 'router', 'server', 'node',
  'api', 'apis', 'api1', 'api2', 'app', 'apps', 'mobile', 'm', 'admin', 'administrator', 'root', 'system', 'sys', 'daemon', 'service', 'services',
  'localhost', 'internal', 'intranet', 'extranet', 'private', 'local', 'lan', 'test', 'testing', 'staging', 'stage', 'dev', 'development', 'prod', 'production',
  'demo', 'sandbox', 'beta', 'alpha', 'preview', 'uat', 'ci', 'cd', 'jenkins', 'git', 'gitlab', 'github', 'gitea', 'docker', 'registry', 'k8s', 'kubernetes',
  'db', 'database', 'sql', 'mysql', 'postgres', 'redis', 'cache', 'queue', 'mq', 'redis1', 'monitor', 'monitoring', 'grafana', 'metrics', 'logs', 'log',
  'backup', 'backups', 'archive', 'files1', 'store', 'storage', 's3', 'bucket', 'minio',
  'web', 'web1', 'web2', 'webmail', 'cpanel', 'whm', 'plesk', 'panel', 'dashboard', 'portal', 'console', 'control', 'manage', 'manager', 'management',
  'login', 'logout', 'signin', 'signup', 'register', 'account', 'accounts', 'auth', 'oauth', 'sso', 'id', 'identity', 'profile', 'user', 'users', 'me', 'my',
  'billing', 'invoice', 'payment', 'pay', 'payments', 'checkout', 'order', 'orders', 'cart', 'shop', 'store1',
  'help', 'support1', 'faq', 'docs', 'doc', 'documentation', 'wiki', 'kb', 'guide', 'status', 'health', 'uptime', 'home', 'index', 'main', 'default',
  'blog', 'news1', 'events', 'forum', 'community', 'chat', 'discord', 'telegram', 'slack', 'meet', 'conference', 'cdn1', 'media1',
  'tongkrongan', 'is-a', 'isa', 'register1',
  // keamanan dan abuse
  'dmarc', 'dkim', 'spf', 'caa', 'autodiscover', 'autoconfig', 'mta-sts', 'tls', 'wpad', 'localhost1',
]

// Merek dan institusi (bank dan e-wallet Indonesia, layanan besar). Cocok persis.
export const BRAND_NAMES: string[] = [
  // bank Indonesia
  'bca', 'bri', 'bni', 'mandiri', 'cimb', 'cimbniaga', 'permata', 'danamon', 'btn', 'bsi', 'bjb', 'bi', 'ojk', 'lps',
  'jago', 'bankjago', 'seabank', 'blu', 'jenius', 'digibank', 'maybank', 'panin', 'ocbc', 'uob', 'mega', 'bukopin', 'dbs',
  // e-wallet dan dompet digital
  'gopay', 'ovo', 'dana', 'shopeepay', 'linkaja', 'qris', 'paypal', 'visa', 'mastercard', 'jcb', 'flazz', 'emoney', 'e-money',
  // pemerintah dan lembaga
  'polri', 'kemendikbud', 'kemenkeu', 'kominfo', 'komdigi', 'pemerintah', 'pemkot', 'pemprov', 'kpu', 'bssn', 'bkn', 'djp', 'pajak', 'imigrasi', 'bps',
  'kemenkumham', 'kemenkes', 'kemdikbud', 'peruri', 'telkom', 'indihome', 'pln', 'pertamina', 'bpjs', 'bpjskesehatan', 'jne', 'pos', 'posindonesia',
  // layanan besar dan gawai
  'google', 'facebook', 'instagram', 'whatsapp', 'youtube', 'tiktok', 'twitter', 'x', 'github', 'gitlab', 'microsoft', 'apple', 'amazon', 'netflix',
  'telegram', 'discord', 'spotify', 'linkedin', 'reddit', 'pinterest', 'snapchat', 'twitch', 'dropbox', 'adobe', 'oracle', 'ibm', 'intel', 'nvidia', 'samsung',
  'gojek', 'grab', 'tokopedia', 'shopee', 'lazada', 'bukalapak', 'blibli', 'bibbi', 'traveloka', 'tiket', 'tiketcom', 'halodoc', 'tokopaedi', 'ruangguru', 'zenius',
  'cloudflare', 'vercel', 'netlify', 'railway', 'digitalocean', 'linode', 'heroku', 'aws', 'azure', 'gcp',
]

// Tokoh publik: diisi manual (pejabat, selebritas, influencer, nama yang sering dicatut untuk penipuan).
// Tambah lewat laporan atau PR. Cocok persis.
export const PEOPLE_NAMES: string[] = [
  // contoh awal, tambahkan sesuai kebutuhan
  'admin1',
]

// Kata kasar dan pelecehan dalam bahasa Indonesia dan Inggris. Cocok substring, hanya kata panjang dan jelas.
export const PROFANITY: string[] = [
  // Indonesia
  'anjing', 'anjeng', 'anjir', 'bangsat', 'bajingan', 'babi', 'kunyuk', 'kontol', 'memek', 'ngentot', 'ngewe', 'entot',
  'pepek', 'pantek', 'pukimak', 'kimak', 'jancok', 'cok', 'tai', 'tahi', 'sialan', 'goblok', 'goblog', 'idiot', 'tolol', 'dungu',
  'brengsek', 'keparat', 'bedebah', 'setan', 'laknat', 'sompret', 'bejat', 'bispak', 'pelacur', 'lonte', 'jablay', 'sundal',
  'perek', 'silit', 'titit', 'titid', 'pler', 'tempik', 'meki', 'peler', 'konthol', 'memex',
  // Inggris
  'fuck', 'fuk', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'pussy', 'cunt', 'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut',
]
const PROFANITY_MIN = 4

const normReserved = new Set(RESERVED_NAMES.map(normalizeName))
const normBrand = new Set(BRAND_NAMES.map(normalizeName))
const normPeople = new Set(PEOPLE_NAMES.map(normalizeName))

export type BlockReason = 'reserved' | 'brand' | 'people' | 'profanity'
export type ReserveVerdict = { block: BlockReason | null; review: boolean }

// Klasifikasi satu nama. block diisi bila harus ditolak; review true bila lolos blocklist tetapi menyerupai merek atau tokoh.
export function classifyName(raw: string): ReserveVerdict {
  const n = normalizeName(raw)
  if (!n) return { block: null, review: false }
  if (normReserved.has(n)) return { block: 'reserved', review: false }
  if (normBrand.has(n)) return { block: 'brand', review: false }
  if (normPeople.has(n)) return { block: 'people', review: false }
  for (const w of PROFANITY) if (w.length >= PROFANITY_MIN && n.includes(w)) return { block: 'profanity', review: false }
  // Fuzzy: menyerupai merek atau tokoh tetapi tidak persis, tandai untuk review manusia.
  const review = [...normBrand, ...normPeople].some((b) => b.length >= 5 && similar(n, b))
  return { block: null, review }
}

// Mirip bila jarak edit kecil. Dipakai untuk menandai, bukan menolak.
export function similar(a: string, b: string): boolean {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 2) return false
  return levenshtein(a, b) <= 1
}

export function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return prev[n]
}
