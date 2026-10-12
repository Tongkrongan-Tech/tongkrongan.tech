import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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

  const token = qs.get('token')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setErr(t('login.err.pw')); return }
    setBusy(true); setErr('')
    try {
      await api('/auth/reset', { body: { token, password: pw } })
      nav('/login?reset=1', { replace: true })
    } catch (ex) { setErr(te(ex)) }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-4xl">{t('reset.h')}</h1>
      {!token ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-8 grid gap-4 border-l-[3px] pl-5" style={{ borderColor: 'var(--bad)' }}>
          <p role="alert" className="font-bold" style={{ color: 'var(--bad)' }}>{t('reset.notoken')}</p>
          <Link to="/login?forgot=1" className="btn btn-primary no-underline">{t('reset.notoken.link')}</Link>
        </motion.div>
      ) : (
        <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} noValidate className="mt-8 grid gap-5">
          <div>
            <label htmlFor="npw" className="label">{t('login.pw')}</label>
            <div className="relative">
              <input id="npw" type={show ? 'text' : 'password'} autoComplete="new-password" className="field !pr-20" value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} aria-label={show ? t('login.hide') : t('login.show')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-sm font-bold underline" style={{ color: 'var(--accent-text)' }}>{show ? t('pw.hide') : t('pw.show')}</button>
            </div>
          </div>
          <p role="alert" className="min-h-5 text-sm font-bold" style={{ color: 'var(--bad)' }}>{err}</p>
          <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? <Spinner /> : t('reset.submit')}</button>
        </motion.form>
      )}
    </div>
  )
}
