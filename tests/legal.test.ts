import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LEGAL, LEGAL_UPDATED } from '../src/lib/legal.ts'

for (const id of ['terms', 'privacy'] as const) {
  test(`${id}: versi ID dan EN setara (jumlah bagian dan butir sama)`, () => {
    const a = LEGAL[id].id, b = LEGAL[id].en
    assert.equal(a.blocks.length, b.blocks.length)
    a.blocks.forEach((x, i) => {
      assert.equal(x.p?.length ?? 0, b.blocks[i].p?.length ?? 0, `p bagian ${i + 1}`)
      assert.equal(x.ul?.length ?? 0, b.blocks[i].ul?.length ?? 0, `ul bagian ${i + 1}`)
    })
  })

  test(`${id}: tiap bagian punya judul dan isi, tanpa teks kosong`, () => {
    for (const lang of ['id', 'en'] as const) {
      const d = LEGAL[id][lang]
      assert.ok(d.title && d.intro)
      for (const b of d.blocks) {
        assert.ok(b.h.trim(), 'judul bagian kosong')
        const items = [...(b.p ?? []), ...(b.ul ?? [])]
        assert.ok(items.length > 0, `bagian "${b.h}" tidak punya isi`)
        assert.ok(items.every((x) => x.trim().length > 3), `butir kosong di "${b.h}"`)
      }
    }
  })
}

test('janji 30 hari sebelum perubahan besar tertulis di kedua dokumen', () => {
  for (const id of ['terms', 'privacy'] as const) {
    for (const lang of ['id', 'en'] as const) {
      const text = JSON.stringify(LEGAL[id][lang])
      assert.match(text, /30 (hari|days)/, `${id}/${lang}`)
    }
  }
})

test('tanggal pembaruan berformat ISO', () => {
  assert.match(LEGAL_UPDATED, /^\d{4}-\d{2}-\d{2}$/)
})
