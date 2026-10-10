// Uji daftar nama terlarang dan normalisasi. Jalankan: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyName, normalizeName, similar } from '../src/lib/reserved.ts'

test('normalisasi mengganti leet dan membuang tanda hubung', () => {
  assert.equal(normalizeName('B4bi'), 'babi')
  assert.equal(normalizeName('A-n-j-i-n-g'), 'anjing')
  assert.equal(normalizeName('g00gle'), 'google')
  assert.equal(normalizeName('  My-Domain  '), 'mydomain')
})

test('nama vital dan sistem ditolak persis', () => {
  assert.equal(classifyName('www').block, 'reserved')
  assert.equal(classifyName('ABUSE').block, 'reserved')
  assert.equal(classifyName('ns1').block, 'reserved')
  assert.equal(classifyName('postmaster').block, 'reserved')
})

test('merek ditolak persis, bukan substring', () => {
  assert.equal(classifyName('bca').block, 'brand')
  assert.equal(classifyName('dana').block, 'brand')
  assert.equal(classifyName('mydana').block, null)
  assert.equal(classifyName('classic').block, null)
})

test('kata kasar ditolak, termasuk versi leet dan substring panjang', () => {
  assert.equal(classifyName('anjing').block, 'profanity')
  assert.equal(classifyName('b4bi').block, 'profanity')
  assert.equal(classifyName('anjinggoreng').block, 'profanity')
})

test('nama mirip merek ditandai review, tidak ditolak', () => {
  const v = classifyName('gooogle')
  assert.equal(v.block, null)
  assert.equal(v.review, true)
})

test('jarak kemiripan', () => {
  assert.equal(similar('google', 'gooogle'), true)
  assert.equal(similar('bca', 'bca'), true)
  assert.equal(similar('apple', 'banana'), false)
})
