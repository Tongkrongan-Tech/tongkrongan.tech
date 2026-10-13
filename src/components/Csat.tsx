import { useState } from 'react'
import { api } from '../lib/api'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'

const skipKey = (name: string) => `tt.csat.${name}`
const skipped = (name: string) => { try { return localStorage.getItem(skipKey(name)) === '1' } catch { return false } }

/* Satu pertanyaan skala 1 sampai 5, bisa dilewati. Jawaban hanya berisi skor untuk subdomain ini, tanpa data pribadi. */
export function Csat({ name }: { name: string }) {
  const { t, te } = usePrefs()
  const { refresh } = useStore()
  const [hide, setHide] = useState(() => skipped(name))
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  if (hide) return null
  if (done) return <p role="status" className="mt-4 text-sm font-bold" style={{ color: 'var(--ok)' }}>{t('csat.thanks')}</p>

  async function send(score: number) {
    setErr('')
    try { await api('/csat', { body: { name, score } }); setDone(true); void refresh() } catch (e) { setErr(te(e)) }
  }
  function skip() { try { localStorage.setItem(skipKey(name), '1') } catch { /* abaikan */ } setHide(true) }

  return (
    <fieldset className="mt-4 rounded-lg border p-4" style={{ borderColor: 'var(--line-2)' }}>
      <legend className="px-1 text-sm font-extrabold">{t('csat.q')}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{t('csat.low')}</span>
        {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className="btn btn-sm !w-10 !px-0" aria-label={t('csat.score', { n })} onClick={() => void send(n)}>{n}</button>)}
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{t('csat.high')}</span>
        <button type="button" className="btn btn-sm btn-ghost ml-auto" onClick={skip}>{t('csat.skip')}</button>
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-bold" style={{ color: 'var(--bad)' }}>{err}</p>}
    </fieldset>
  )
}
