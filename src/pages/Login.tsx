import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { Spinner } from '../components/ui'
import { Turnstile } from '../components/Turnstile'

export function Login() {
  const { t, te, config } = usePrefs()
  const { login, signup } = useStore()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'
  const [mode, setMode] = useState<'in' | 'up' | 'forgot'>('in')
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({})
  const [info, setInfo] = useState(qs.get('reset') ? t('reset.done') : qs.get('verified') ? t(`login.verified.${qs.get('verified') === '1' ? 1 : 0}`) : qs.get('error') ? t('login.oauthErr') : '')
  const [busy, setBusy] = useState(false)
  const [capKey, setCapKey] = useState(0)
  const onToken = useCallback((x: string) => setCaptcha(x), [])
  useEffect(() => { document.title = `${t('nav.login')} | Tongkrongan.tech` }, [t])

  async function submit(e: FormEvent) {
    e.preventDefault()
    const next: typeof err = {}
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = t('login.err.email')
    if (mode !== 'forgot' && pw.length < 8) next.pw = t('login.err.pw')
    setErr(next); setInfo('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (mode === 'forgot') { await api('/auth/forgot', { body: { email, turnstile: captcha } }); setInfo(t('login.forgot.sent')) }
      else if (mode === 'in') { await login(email, pw, captcha); nav(from, { replace: true }) }
      else {
        const r = await signup(email, pw, captcha)
        if (r.needVerify) { setInfo(t('login.verifySent')); setMode('in') } else nav(from, { replace: true })
      }
    } catch (ex) { setErr({ form: te(ex) }) }
    // token Turnstile hanya berlaku sekali; muat ulang widget agar percobaan berikutnya tidak ditolak 'captcha'
    setCaptcha(''); setCapKey((k) => k + 1)
    setBusy(false)
  }

  const oauth = config?.oauth
  return (
    <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 md:grid-cols-2">
      <div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{mode === 'in' ? t('login.h.in') : mode === 'up' ? t('login.h.up') : t('login.forgot.h')}</h1>
        <p className="mt-4" style={{ color: 'var(--muted)' }}>{t('login.sub')}</p>
      </div>
      <motion.form onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card grid gap-5 p-6" style={{ boxShadow: 'var(--shadow)' }}>
        {info && <p role="status" className="rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>{info}</p>}
        {mode !== 'forgot' && (oauth?.github || oauth?.google) && (
          <>
            <div role="group" aria-label={t('login.oauth')} className="grid gap-3 sm:grid-cols-2">
              {oauth.google && <a href="/api/auth/google/start" className="btn">Google</a>}
              {oauth.github && <a href="/api/auth/github/start" className="btn">GitHub</a>}
            </div>
            <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>{t('login.or')}</p>
          </>
        )}
        <div>
          <label htmlFor="em" className="label">{t('login.email')}</label>
          <input id="em" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err.email} aria-describedby="em-e" />
          <p id="em-e" aria-live="polite" className="mt-1 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{err.email}</p>
        </div>
        {mode !== 'forgot' && (
          <div>
            <label htmlFor="pw" className="label">{t('login.pw')}</label>
            <div className="relative">
              <input id="pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="field !pr-20" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err.pw} aria-describedby="pw-e" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? t('login.hide') : t('login.show')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-1 text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }}>{showPw ? t('pw.hide') : t('pw.show')}</button>
            </div>
            <p id="pw-e" aria-live="polite" className="mt-1 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{err.pw}</p>
            {mode === 'in' && <button type="button" className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }} onClick={() => { setMode('forgot'); setErr({}); setInfo('') }}>{t('login.forgot')}</button>}
          </div>
        )}
        {config?.turnstileSiteKey && <Turnstile key={capKey} siteKey={config.turnstileSiteKey} onToken={onToken} />}
        <p role="alert" className="min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{err.form}</p>
        <button type="submit" className="btn btn-primary" disabled={busy || (!!config?.turnstileSiteKey && !captcha)}>{busy ? <Spinner /> : mode === 'in' ? t('login.submit.in') : mode === 'up' ? t('login.submit.up') : t('login.forgot.submit')}</button>
        <button type="button" className="cursor-pointer border-0 bg-transparent py-2 text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }} onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setErr({}); setInfo('') }}>
          {mode === 'in' ? t('login.switch.up') : mode === 'up' ? t('login.switch.in') : t('login.forgot.back')}
        </button>
      </motion.form>
    </div>
  )
}
