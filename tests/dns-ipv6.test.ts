import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canonicalV6, validateValue } from '../src/lib/dns.ts'
import { verifyRecord } from '../worker/dns.ts'

test('bentuk panjang IPv6 dikanonikkan agar cocok dengan jawaban DoH (#71, #72)', () => {
  assert.equal(canonicalV6('2001:0db8:0:0:0:0:0:10'), '2001:db8::10')
  assert.equal(canonicalV6('0000::1'), '::1')
  assert.equal(canonicalV6('0:0:0:0:0:0:0:1'), '::1')
  assert.equal(canonicalV6('2001:DB8::10'), '2001:db8::10')
  assert.equal(canonicalV6('::ffff:192.0.2.128'), '::ffff:c000:280')
  assert.equal(canonicalV6('1:2:3:4:5:6:7:8'), '1:2:3:4:5:6:7:8')
  assert.equal(canonicalV6('2001:db8:0:1:1:1:1:1'), '2001:db8:0:1:1:1:1:1')
  assert.equal(canonicalV6(' 2001:db8::10 '), '2001:db8::10')
})

test('string IPv6 tidak valid ditolak sebagai ipv6, bukan diteruskan ke penyedia DNS (#71)', () => {
  for (const bad of ['::::', ':::', '1::2::3', 'gggg::1', '1:2:3:4:5:6:7', '1:2:3:4:5:6:7:8:9', '2001:db8::1::2', '99999::1', 'fe80::1%eth0', '2001:db8::1/64', '::1.2.3.4.5', '1.2.3.999']) {
    assert.equal(canonicalV6(bad), null, `kanonik: ${bad}`)
    assert.equal(validateValue('AAAA', bad, 'site', 'example.test'), 'ipv6', `validasi: ${bad}`)
  }
})

test('rentang IPv6 terlarang diblokir dalam bentuk apa pun (#71)', () => {
  const blocked = [
    '0:0:0:0:0:0:0:1', '0000::1', '::', // loopback dan unspecified
    'fc00::1', 'fd12:3456::1', // ULA fc00::/7
    'fe80::1', 'febf::1', // link-local fe80::/10
    'ff02::1', 'ff00::1', // multicast ff00::/8
    '2001:db8::1', '2001:0db8:0:0:0:0:0:10', // dokumentasi 2001:db8::/32
    '64:ff9b::1', '64:ff9b::808:808', // NAT64 64:ff9b::/96
    '2002::1', '2002:c000:0201::1', // 6to4 2002::/16 menyematkan IPv4
    '::ffff:127.0.0.1', '::ffff:192.168.1.1', // IPv4-mapped
    '::10.0.0.1', // IPv4-compatible ::/96
  ]
  for (const v of blocked) assert.equal(validateValue('AAAA', v, 'site', 'example.test'), 'ip_private', v)
  assert.equal(validateValue('AAAA', '2001:4860:4860::8888', 'site', 'example.test'), null)
  assert.equal(validateValue('AAAA', '2606:4700:4700::1111', 'site', 'example.test'), null)
  assert.equal(validateValue('AAAA', '2001:db9::1', 'site', 'example.test'), null, 'tetangga blok dokumentasi tetap boleh')
})

test('verifikasi AAAA mencocokkan bentuk kanonik, bukan string mentah (#72)', async (t) => {
  const env = { DNS_MODE: 'live', BASE_DOMAIN: 'example.test' } as never
  t.mock.method(globalThis, 'fetch', async (input: string | URL) => {
    const url = String(input)
    if (url.startsWith('https://cloudflare-dns.com/')) return Response.json({ Answer: [{ type: 28, data: '2001:db8::10' }] })
    return new Response('a'.repeat(64), { status: 200 })
  })
  const sub = { name: 'site', type: 'AAAA' as const, value: '2001:0db8:0:0:0:0:0:10', ownership_token: 'a'.repeat(64) }
  assert.deepEqual(await verifyRecord(env, sub), { ok: true })
})
