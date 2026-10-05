import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api, ApiError } from '../lib/api'
import { usePrefs } from '../lib/prefs'
import { Spinner } from '../components/ui'
import { Turnstile } from '../components/Turnstile'

const REASONS = ['phishing', 'malware', 'spam', 'illegal', 'impersonation', 'other'] as const

export function Report() {
  const { t, te, domain, config } = usePrefs()
  const [name, setName] = useState('')
  const [reason, setReason] = useState<string>('')
  const [detail, setDetail] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const onToken = useCallback((x: string) => setCaptcha(x), [])
  useEffect(() => { document.title = `${t('nav.report')} | Tongkrongan.tech` }, [t])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const n = name.trim().toLowerCase().replace(new RegExp(`\\.${domain.replace(/\./g, '\\.')}$`), '').replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    const next: Record<string, string> = {}
    if (!/^[a-z0-9-]{3,32}$/.test(n)) next.name = t('report.err.name')
    if (!reason) next.reason = t('report.err.reason')
    setErr(next)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api('/reports', { body: { name: n, reason, detail: detail.trim(), turnstile: captcha } })
      setSent(n)
    } catch (ex) {
      setErr({ form: ex instanceof ApiError && ex.code === 'not_found' ? t('report.err.notfound') : te(ex) })
    }
    setBusy(false)
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card p-10" style={{ boxShadow: 'var(--shadow)' }}>
          <h1 className="text-3xl font-extrabold">{t('report.sent.h')}</h1>
          <p className="mt-3" style={{ color: 'var(--muted)' }}>{t('report.sent.d', { name: sent })}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><button type="button" className="btn" onClick={() => { setSent(null); setName(''); setReason(''); setDetail('') }}>{t('report.another')}</button><Link to="/" className="btn btn-primary">{t('report.home')}</Link></div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 sm:py-16 md:grid-cols-[0.9fr_1.1fr]">
      <div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{t('report.h1')}</h1>
        <p className="mt-4" style={{ color: 'var(--muted)' }}>{t('report.sub')}</p>
        <p className="mt-6 text-sm font-semibold">{t('report.target')}</p>
      </div>
      <form onSubmit={submit} noValidate className="card grid gap-5 p-6" style={{ boxShadow: 'var(--shadow)' }}>
        <div>
          <label htmlFor="rn" className="label">{t('report.name')}</label>
          <input id="rn" className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={`nama.${domain}`} aria-invalid={!!err.name} aria-describedby="rn-e" autoComplete="off" />
          <p id="rn-e" aria-live="polite" className="mt-1 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{err.name}</p>
        </div>
        <fieldset className="m-0 border-0 p-0">
          <legend className="label">{t('report.reason')}</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-describedby="rr-e">
            {REASONS.map((r) => (<button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className="btn !min-h-11 !text-sm" style={{ background: reason === r ? 'var(--accent)' : 'var(--surface)', color: reason === r ? 'var(--accent-ink)' : 'var(--ink)' }}>{t(`report.r.${r}`)}</button>))}
          </div>
          <p id="rr-e" aria-live="polite" className="mt-1 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{err.reason}</p>
        </fieldset>
        <div>
          <label htmlFor="rd" className="label">{t('report.detail')}</label>
          <textarea id="rd" rows={4} className="field !py-3" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={600} />
          <p className="hint mt-1">{detail.length}/600</p>
        </div>
        {config?.turnstileSiteKey && <Turnstile siteKey={config.turnstileSiteKey} onToken={onToken} />}
        <p role="alert" className="min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{err.form}</p>
        <button type="submit" className="btn btn-primary" disabled={busy || (!!config?.turnstileSiteKey && !captcha)}>{busy ? <Spinner /> : t('report.submit')}</button>
      </form>
    </div>
  )
}
