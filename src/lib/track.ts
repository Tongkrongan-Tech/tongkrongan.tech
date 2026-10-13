import { api } from './api'
import type { FunnelEvent } from './funnel'

// Event minimal tanpa data pribadi: hanya nama langkah dan id acak per tab (sessionStorage). Menghormati Do Not Track.
function sid(): string | null {
  try {
    let s = sessionStorage.getItem('tt.sid')
    if (!s) { s = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); sessionStorage.setItem('tt.sid', s) }
    return s
  } catch { return null }
}

export function track(ev: FunnelEvent) {
  if (navigator.doNotTrack === '1') return
  const s = sid()
  if (s) void api('/events', { body: { ev, sid: s } }).catch(() => {})
}
