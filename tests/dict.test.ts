import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/* Kunci riwayat (h.*) dipakai dua sisi: backend menulisnya ke tabel history,
   frontend memanggil t(h.key) di dasbor. Bila satu kunci tidak ada di dict.ts,
   pengguna melihat nama kunci mentah seperti "h.needsReview" (issue #33).
   Tes ini menutup kebocoran itu untuk kunci berikutnya. */

const dictUrl = new URL('../src/lib/dict.ts', import.meta.url)
const workerDir = fileURLToPath(new URL('../worker', import.meta.url))
const srcDir = fileURLToPath(new URL('../src', import.meta.url))

function dictKeys(): Map<string, string[]> {
  const text = readFileSync(dictUrl, 'utf8')
  const out = new Map<string, string[]>()
  for (const line of text.split('\n')) {
    const m = line.match(/^\s{2}'([^']+)':\s*\[(.*)\]\s*,?\s*$/)
    if (!m) continue
    const parts: string[] = []
    let cur = ''
    let quoted = false
    for (const ch of m[2]) {
      if (ch === "'") { quoted = !quoted; cur += ch; continue }
      if (ch === ',' && !quoted) { parts.push(cur.trim()); cur = ''; continue }
      cur += ch
    }
    parts.push(cur.trim())
    out.set(m[1], parts)
  }
  return out
}

function tsFiles(dir: string): string[] {
  return (readdirSync(dir, { recursive: true }) as string[])
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => path.join(dir, f))
}

test('setiap kunci riwayat yang dipakai ada di dict', () => {
  const keys = dictKeys()
  assert.ok(keys.size > 100, 'pembacaan dict gagal, kunci terbaca: ' + keys.size)

  const used = new Set<string>()
  for (const file of [...tsFiles(workerDir), ...tsFiles(srcDir)]) {
    if (file.endsWith(path.join('lib', 'dict.ts'))) continue
    for (const m of readFileSync(file, 'utf8').matchAll(/'(h\.[a-zA-Z]+)'/g)) used.add(m[1])
  }

  assert.ok(used.size > 0, 'tidak menemukan kunci riwayat di kode, pola pencarian mungkin usang')
  const missing = [...used].filter((k) => !keys.has(k)).sort()
  assert.deepEqual(missing, [], 'kunci riwayat tanpa terjemahan: ' + missing.join(', '))
})

test('kunci riwayat punya teks ID dan EN yang tidak kosong', () => {
  const bad: string[] = []
  for (const [key, parts] of dictKeys()) {
    if (!key.startsWith('h.')) continue
    const filled = parts.filter((p) => p !== "''" && p !== '')
    if (filled.length !== 2) bad.push(`${key} (${parts.length} bagian)`)
  }
  assert.deepEqual(bad, [], 'kunci riwayat tanpa dua bahasa: ' + bad.join(', '))
})

test('setiap kunci t(...) literal dan name.err.* ada di dict (#45)', () => {
  const keys = dictKeys()
  const used = new Set<string>()
  for (const file of tsFiles(srcDir)) {
    if (file.endsWith(path.join('lib', 'dict.ts'))) continue
    for (const m of readFileSync(file, 'utf8').matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1])
  }
  const names = readFileSync(new URL('../src/lib/names.ts', import.meta.url), 'utf8')
  const reasons = names.match(/reason: ([^}]+) }/)![1].match(/'([a-z]+)'/g)!.map((s) => `name.err.${s.slice(1, -1)}`)
  const missing = [...used, ...reasons].filter((k) => !keys.has(k)).sort()
  assert.deepEqual(missing, [], 'kunci tanpa terjemahan: ' + missing.join(', '))
})

test('semua kunci dict punya teks ID dan EN yang tidak kosong', () => {
  const bad = [...dictKeys()].filter(([, p]) => p.filter((x) => x !== "''" && x !== '').length !== 2).map(([k]) => k)
  assert.deepEqual(bad, [], 'kunci tanpa dua bahasa: ' + bad.join(', '))
})
