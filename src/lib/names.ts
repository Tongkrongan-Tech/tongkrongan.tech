// Aturan nama F3: 3-32 karakter, huruf kecil, angka, tanda hubung.
import { classifyName } from './reserved.ts'

export const NAME_RE = /^[a-z0-9](?:[a-z0-9-]{1,30})[a-z0-9]$/

export type NameState =
  | { kind: 'empty' }
  | { kind: 'invalid'; reason: 'short' | 'long' | 'chars' | 'edge' | 'reserved' | 'brand' | 'profanity' }
  | { kind: 'taken'; mine?: boolean }
  | { kind: 'ok'; review?: boolean }

export function checkName(raw: string, taken: string[] = [], mine: string[] = []): NameState {
  const n = raw.trim().toLowerCase()
  if (!n) return { kind: 'empty' }
  if (n.length < 3) return { kind: 'invalid', reason: 'short' }
  if (n.length > 32) return { kind: 'invalid', reason: 'long' }
  if (!/^[a-z0-9-]+$/.test(n)) return { kind: 'invalid', reason: 'chars' }
  if (n.startsWith('-') || n.endsWith('-')) return { kind: 'invalid', reason: 'edge' }
  // Daftar terlarang (vital, merek, tokoh, kata kasar) dengan normalisasi leet dan tanda hubung.
  const v = classifyName(n)
  if (v.block === 'brand' || v.block === 'people') return { kind: 'invalid', reason: 'brand' }
  if (v.block === 'profanity') return { kind: 'invalid', reason: 'profanity' }
  if (v.block) return { kind: 'invalid', reason: 'reserved' }
  if (mine.includes(n)) return { kind: 'taken', mine: true }
  if (taken.includes(n)) return { kind: 'taken' }
  return { kind: 'ok', review: v.review }
}

// Nama dasar untuk saran alternatif; ketersediaan tiap kandidat dicek ke server.
export function suggestCandidates(raw: string): string[] {
  const base = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '').slice(0, 24) || 'proyekku'
  return [`${base}-dev`, `${base}-web`, `my-${base}`, `${base}-id`, `${base}2`, `${base}-hq`].filter((c) => checkName(c).kind === 'ok')
}
