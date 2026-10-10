import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { usePrefs } from '../lib/prefs'
import { api } from '../lib/api'
import { Spinner } from '../components/ui'

export function ResetPassword() {
  const { t, te } = usePrefs()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { document.title = `${t('reset.h')} | Tongkrongan.tech` }, [t])

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setErr(t('login.err.pw')); return }
    setBusy(true); setErr('')
    try {
      await api('/auth/reset', { body: { token: qs.get('token') ?? '', password: pw } })
      nav('/login?reset=1', { replace: true })
    } catch (ex) { setErr(te(ex)) }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-20">
      <h1 className="text-4xl font-extrabold leading-tight tracking-tight">{t('reset.h')}</h1>
      <form onSubmit={submit} noValidate className="card mt-8 grid gap-5 p-6" style={{ boxShadow: 'var(--shadow)' }}>
        <div>
          <label htmlFor="npw" className="label">{t('login.pw')}</label>
          <div className="relative">
            <input id="npw" type={show ? 'text' : 'password'} autoComplete="new-password" className="field !pr-20" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? t('login.hide') : t('login.show')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }}>{show ? t('pw.hide') : t('pw.show')}</button>
          </div>
        </div>
        <p role="alert" className="min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{err}</p>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <Spinner /> : t('reset.submit')}</button>
      </form>
    </div>
  )
}
