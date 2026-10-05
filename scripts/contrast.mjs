// Cek kontras WCAG AA untuk pasangan warna teks/latar di setiap tema. Jalankan: node scripts/contrast.mjs
import { readFileSync } from 'node:fs'
const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
const blocks = [...css.matchAll(/(?::root,\s*)?\[data-theme="(\w+)"\]\s*\{([^}]*)\}/g)]
const pairs = [['ink', 'bg'], ['ink', 'surface'], ['ink', 'surface-2'], ['muted', 'bg'], ['muted', 'surface'], ['muted', 'surface-2'], ['accent-ink', 'accent'], ['accent-text', 'bg'], ['accent-text', 'surface'], ['hl-ink', 'hl'], ['ok', 'bg'], ['ok', 'surface'], ['warn', 'bg'], ['warn', 'surface'], ['bad', 'bg'], ['bad', 'surface'], ['inv-ink', 'inv-bg'], ['inv-accent', 'inv-bg']]
console.log("tema terbaca:", blocks.map((b) => b[1]).join(", "))
let fail = 0
for (const [, theme, body] of blocks) {
  const v = Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]))
  for (const [f, b] of pairs) {
    if (!v[f] || !v[b]) continue
    const r = ratio(v[f], v[b])
    if (r < 4.5) { fail++; console.log(`FAIL ${theme}: ${f} on ${b} = ${r.toFixed(2)}`) }
  }
}
console.log(fail ? `${fail} pasangan gagal` : 'Semua pasangan lulus AA 4.5:1')
