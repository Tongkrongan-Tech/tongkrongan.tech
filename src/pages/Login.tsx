import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { api, ApiError } from '../lib/api'
import { Brand, Spinner } from '../components/ui'
import { Turnstile } from '../components/Turnstile'

export function Login() {
  const { t, te, config, domain } = usePrefs()
  const { login, signup, refresh } = useStore()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'
  const [mode, setMode] = useState<'in' | 'up' | 'forgot' | 'otp'>('in')
  const [code, setCode] = useState('')
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
    if (mode !== 'forgot' && mode !== 'otp' && pw.length < 8) next.pw = t('login.err.pw')
    setErr(next); setInfo('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (mode === 'otp') { await api('/auth/verify-otp', { body: { email, code: code.trim() } }); await refresh(); nav(from, { replace: true }); return }
      else if (mode === 'forgot') { await api('/auth/forgot', { body: { email, turnstile: captcha } }); setInfo(t('login.forgot.sent')) }
      else if (mode === 'in') { await login(email, pw, captcha); nav(from, { replace: true }) }
      else {
        const r = await signup(email, pw, captcha)
        if (r.needVerify) { setInfo(t('login.otp.sent')); setCode(''); setMode('otp') } else nav(from, { replace: true })
      }
    } catch (ex) {
      if (mode === 'in' && ex instanceof ApiError && ex.code === 'unverified') { setInfo(t('login.otp.sent')); setCode(''); setMode('otp') }
      else setErr({ form: te(ex) })
    }
    // token Turnstile hanya berlaku sekali; muat ulang widget agar percobaan berikutnya tidak ditolak 'captcha'
    setCaptcha(''); setCapKey((k) => k + 1)
    setBusy(false)
  }

  async function resend() {
    setErr({}); setInfo('')
    try { await api('/auth/resend-otp', { body: { email } }); setInfo(t('login.otp.resent')) } catch (ex) { setErr({ form: te(ex) }) }
  }

  const oauth = config?.oauth
  const providers = ([['discord', 'Discord', Brand.discord], ['google', 'Google', Brand.google], ['github', 'GitHub', Brand.github]] as const).filter(([id]) => oauth?.[id])
  const asks = mode === 'in' || mode === 'up'
  const heading = mode === 'in' ? t('login.h.in') : mode === 'up' ? t('login.h.up') : mode === 'otp' ? t('login.otp.h') : t('login.forgot.h')
  const link = 'cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold underline-offset-4 hover:underline'
  const swap = (m: typeof mode) => { setMode(m); setErr({}); setInfo('') }
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="text-center">
        <p aria-hidden="true" className="inline-flex max-w-full items-center truncate rounded-lg border-2 px-3 py-1.5 text-sm font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
          https://<span className="mark">kamu</span><span style={{ color: 'var(--muted)' }}>.{domain}</span>
        </p>
        <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{heading}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--muted)' }}>{t('login.sub')}</p>
      </div>

      <motion.form onSubmit={submit} noValidate initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card mt-8 grid gap-4 p-6 sm:p-7" style={{ boxShadow: 'var(--shadow)' }}>
        {asks && (
          <div role="group" aria-label={t('login.h.in') + ' / ' + t('login.h.up')} className="grid grid-cols-2 gap-1 rounded-xl border-2 p-1" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
            {([['in', t('nav.login')], ['up', t('login.tab.up')]] as const).map(([m, label]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => swap(m)} className="min-h-10 cursor-pointer rounded-lg border-0 text-sm font-bold transition-colors" style={{ background: mode === m ? 'var(--hl)' : 'transparent', color: mode === m ? 'var(--hl-ink)' : 'var(--ink)' }}>{label}</button>
            ))}
          </div>
        )}
        {info && <p role="status" className="rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>{info}</p>}
        <div>
          <label htmlFor="em" className="label">{t('login.email')}</label>
          <input id="em" type="email" autoComplete="email" placeholder="kamu@email.com" className="field" value={email} readOnly={mode === 'otp'} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err.email} aria-describedby="em-e" />
          <p id="em-e" aria-live="polite" className="mt-1.5 text-sm font-medium empty:hidden" style={{ color: 'var(--bad)' }}>{err.email}</p>
        </div>
        {asks && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <label htmlFor="pw" className="!mb-0 label">{t('login.pw')}</label>
              {mode === 'in' && <button type="button" className={link} style={{ color: 'var(--accent-text)' }} onClick={() => swap('forgot')}>{t('login.forgot')}</button>}
            </div>
            <div className="relative">
              <input id="pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="field !pr-20" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err.pw} aria-describedby="pw-e" />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? t('login.hide') : t('login.show')} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md border-0 px-2 py-1 text-xs font-bold hover:bg-[var(--surface-2)]" style={{ background: 'transparent', color: 'var(--accent-text)' }}>{showPw ? t('pw.hide') : t('pw.show')}</button>
            </div>
            <p id="pw-e" aria-live="polite" className="mt-1.5 text-sm font-medium empty:hidden" style={{ color: 'var(--bad)' }}>{err.pw}</p>
          </div>
        )}
        {mode === 'otp' && (
          <div>
            <label htmlFor="otp" className="label">{t('login.otp.label')}</label>
            <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            <button type="button" className={`mt-2 ${link}`} style={{ color: 'var(--accent-text)' }} onClick={() => void resend()}>{t('login.otp.resend')}</button>
          </div>
        )}
        {mode !== 'otp' && config?.turnstileSiteKey && <Turnstile key={capKey} siteKey={config.turnstileSiteKey} onToken={onToken} />}
        <div>
          <p role="alert" className="mb-3 text-sm font-semibold empty:hidden" style={{ color: 'var(--bad)' }}>{err.form}</p>
          <button type="submit" className="btn btn-primary w-full" disabled={busy || (mode === 'otp' ? code.length !== 6 : !!config?.turnstileSiteKey && !captcha)}>{busy ? <Spinner /> : mode === 'in' ? t('login.submit.in') : mode === 'up' ? t('login.submit.up') : mode === 'otp' ? t('login.otp.submit') : t('login.forgot.submit')}</button>
        </div>
        {asks && providers.length > 0 && (
          <div>
            <div className="flex items-center gap-3 text-xs font-semibold" style={{ color: 'var(--muted)' }} aria-hidden="true">
              <span className="h-0.5 flex-1 rounded-full opacity-20" style={{ background: 'var(--line)' }} />{t('login.orWith')}<span className="h-0.5 flex-1 rounded-full opacity-20" style={{ background: 'var(--line)' }} />
            </div>
            <div role="group" aria-label={t('login.oauth')} className="mt-3 grid gap-3" style={{ gridTemplateColumns: `repeat(${providers.length}, minmax(0, 1fr))` }}>
              {providers.map(([id, name, Logo]) => (
                <a key={id} href={`/api/auth/${id}/start`} className="btn !px-0" aria-label={t('login.with', { p: name })} title={t('login.with', { p: name })}><Logo size={22} /></a>
              ))}
            </div>
          </div>
        )}
        {asks && (
          <p className="text-center text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            {t('legal.agreePre')} <Link to="/terms" className="font-semibold underline underline-offset-4" style={{ color: 'var(--ink)' }}>{t('legal.terms')}</Link> {t('legal.and')} <Link to="/privacy" className="font-semibold underline underline-offset-4" style={{ color: 'var(--ink)' }}>{t('legal.privacy')}</Link>.
          </p>
        )}
        {!asks && <button type="button" className={`justify-self-center py-1 ${link}`} style={{ color: 'var(--accent-text)' }} onClick={() => swap('in')}>{t('login.forgot.back')}</button>}
      </motion.form>
    </div>
  )
}
