// Event funnel wizard klaim. Satu daftar untuk frontend (src/lib/track.ts) dan worker.
export const FUNNEL_EVENTS = ['wizard_start', 'wizard_platform', 'wizard_record', 'verify_ok', 'verify_fail'] as const
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number]

// Median detik dari daftar durasi. Nilai negatif dan bukan angka dibuang.
export function medianSeconds(values: number[]): number | null {
  const secs = values.filter((v) => Number.isFinite(v) && v >= 0).sort((x, y) => x - y)
  const mid = secs.length >> 1
  return secs.length ? (secs.length % 2 ? secs[mid] : Math.round((secs[mid - 1] + secs[mid]) / 2)) : null
}

// Ringkas funnel dari baris event: jumlah sesi per langkah, tingkat keberhasilan, dan median detik dari mulai sampai aktif.
export function summarizeFunnel(rows: { sid: string; ev: string; at: number }[]) {
  const first = new Map<string, Map<string, number>>()
  for (const r of rows) {
    const m = first.get(r.sid) ?? first.set(r.sid, new Map()).get(r.sid)!
    if (!m.has(r.ev) || r.at < m.get(r.ev)!) m.set(r.ev, r.at)
  }
  const steps = Object.fromEntries(FUNNEL_EVENTS.map((e) => [e, 0])) as Record<FunnelEvent, number>
  const secs: number[] = []
  for (const m of first.values()) {
    for (const e of FUNNEL_EVENTS) if (m.has(e)) steps[e]++
    const a = m.get('wizard_start'), b = m.get('verify_ok')
    if (a !== undefined && b !== undefined && b >= a) secs.push(Math.round((b - a) / 1000))
  }
  return { sessions: first.size, steps, successRate: steps.wizard_start ? steps.verify_ok / steps.wizard_start : null, medianSeconds: medianSeconds(secs) }
}
