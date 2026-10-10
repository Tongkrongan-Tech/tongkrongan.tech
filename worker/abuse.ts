// Pemindaian konten untuk mendeteksi situs judi online, penipuan, dan konten terlarang.
// Heuristik kata kunci (Indonesia dan Inggris). Ini lapis tambahan, bukan pengganti Safe Browsing.

const TERMS: RegExp[] = [
  /\b(jud[iu]|judol|judi\s*online|situs\s*jud[iu]|bandar\s*(judi|togel|cash))\b/i,
  /\b(slot|slot\s*gacor|slot88|gacor|maxwin|rtp|scatter|pragmatic|pgsoft|habanero|joker123)\b/i,
  /\b(togel|toto|sgp|hk\s*pools|hongkong\s*pools|pasang\s*angka|angka\s*jitu|4d|2d|3d)\b/i,
  /\b(kasino|casino|baccarat|roulette|blackjack|poker|jackpot|tangkas|domino\s*qq|bandar\s*qq)\b/i,
  /\b(taruhan|betting|sportsbook|sbobet|w88|maxbet|taruhan\s*bola|mix\s*parlay|parlay)\b/i,
  /\b(deposit|withdraw|wd|bonus\s*(new\s*member|100|100%|deposit|harian|rollingan|referral))\b/i,
  /\b(porn|bokep|porno|xxx|video\s*mesum|telanjang|ngentot|colmek|viral\s*18|18\+)\b/i,
  /\b(scam|penipuan|phishing|carding|jual\s*akun|jasa\s*hack|pinjol\s*ilegal|investasi\s*bodong)\b/i,
  /\b(obat\s*perangsang|viagra|narkoba|sabu|ganja|jual\s*senjata)\b/i,
]

// Kembalikan daftar kata kunci yang cocok. Ambang keputusan (mis. 2 kecocokan) ditentukan pemanggil.
export function scanAbuse(html: string): string[] {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').slice(0, 200000)
  const hits: string[] = []
  for (const re of TERMS) { const m = text.match(re); if (m) hits.push(m[0].toLowerCase().replace(/\s+/g, ' ').trim()) }
  return [...new Set(hits)]
}

// Ambil isi halaman dengan batas ukuran. Kosong bila gagal.
export async function fetchPageText(url: string, maxBytes = 200000): Promise<string> {
  const c = new AbortController()
  const timer = setTimeout(() => c.abort(), 8000)
  try {
    const r = await fetch(url, { signal: c.signal, redirect: 'follow', headers: { 'user-agent': 'tongkrongan-abuse-check/1.0' } })
    if (!r.ok || !r.body) return ''
    const reader = r.body.getReader()
    const chunks: Uint8Array[] = []
    let total = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) { chunks.push(value); total += value.length; if (total >= maxBytes) { await reader.cancel(); break } }
    }
    const merged = new Uint8Array(total)
    let off = 0
    for (const ch of chunks) { merged.set(ch, off); off += ch.length }
    return new TextDecoder().decode(merged.slice(0, maxBytes))
  } catch { return '' } finally { clearTimeout(timer) }
}
