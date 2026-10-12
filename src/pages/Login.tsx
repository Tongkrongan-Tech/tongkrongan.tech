import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { api, ApiError } from '../lib/api'
import { Brand, Icon, Spinner } from '../components/ui'
import { Plate } from '../components/Plate'
import { Hang } from '../components/fx'
import { Turnstile } from '../components/Turnstile'

const SAMPLE = ['tokoku', 'portofolio', 'botku']

/* Panel kiri: papan nama yang mengetik contoh alamat. Menunjukkan apa yang akan kamu dapat setelah masuk. */
function SidePlate() {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState(reduce ? SAMPLE[0] : '')
  useEffect(() => {
    if (reduce) return
    const w = SAMPLE[i % SAMPLE.length]
    const id = setTimeout(() => {
      if (typed.length < w.length) setTyped(w.slice(0, typed.length + 1))
      else { setI((n) => n + 1); setTyped('') }
    }, typed.length < w.length ? 130 : 2200)
    return () => clearTimeout(id)
  }, [typed, i, reduce])
  return (
    <div className="hidden flex-col justify-between border-r-[1.5px] p-10 lg:flex" style={{ borderColor: 'var(--ink)', background: 'var(--surface-2)' }}>
      <div>
        <h2 className="text-[clamp(1.8rem,3vw,2.6rem)]">{t('login.side.h')}</h2>
        <ul className="mt-6 grid gap-2.5 text-base font-semibold">
          {['login.side.b1', 'login.side.b2', 'login.side.b3'].map((k, n) => (
            <motion.li key={k} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 * n + 0.2 }} className="flex items-start gap-2.5"><span style={{ color: 'var(--ok)' }}><Icon.check size={20} /></span>{t(k)}</motion.li>
          ))}
        </ul>
      </div>
      <Hang className="mt-10"><Plate name={typed} size="md" stamp={typed.length === SAMPLE[i % SAMPLE.length].length ? t('status.active') : null} /></Hang>
    </div>
  )
}

export function Login() {
  const { t, te, config } = usePrefs()
  const { login, signup, refresh } = useStore()
  const nav = useNavigate()
  const [qs] = useSearchParams()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard'
  const [mode, setMode] = useState<'in' | 'up' | 'forgot' | 'otp'>(qs.get('forgot') ? 'forgot' : 'in')
  const [code, setCode] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [err, setErr] = useState<{ email?: string; pw?: string; form?: string }>({})
  const [info, setInfo] = useState(qs.get('reset') ? t('reset.done') : qs.get('verified') ? t(`login.verified.${qs.get('verified') === '1' ? 1 : 0}`) : qs.get('error') ? t('login.oauthErr') : '')
  const [busy, setBusy] = useState(false)
  const [capKey, setCapKey] = useState(0)
  const [wait, setWait] = useState(0)
  const onToken = useCallback((x: string) => setCaptcha(x), [])
  useEffect(() => { document.title = `${t('nav.login')} | Tongkrongan.tech` }, [t])
  useEffect(() => { if (mode === 'otp') setWait(60) }, [mode])
  useEffect(() => {
    if (wait <= 0) return
    const id = setTimeout(() => setWait((w) => w - 1), 1000)
    return () => clearTimeout(id)
  }, [wait])

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
    try { await api('/auth/resend-otp', { body: { email } }); setInfo(t('login.otp.resent')); setWait(60) } catch (ex) { setErr({ form: te(ex) }); if (ex instanceof ApiError && ex.status === 429) setWait(60) }
  }

  const oauth = config?.oauth
  const providers = ([['discord', 'Discord', Brand.discord], ['google', 'Google', Brand.google], ['github', 'GitHub', Brand.github]] as const).filter(([id]) => oauth?.[id])
  const asks = mode === 'in' || mode === 'up'
  const heading = mode === 'in' ? t('login.h.in') : mode === 'up' ? t('login.h.up') : mode === 'otp' ? t('login.otp.h') : t('login.forgot.h')
  const link = 'cursor-pointer border-0 bg-transparent p-0 text-sm font-bold underline underline-offset-4'
  const swap = (m: typeof mode) => { setMode(m); setErr({}); setInfo('') }
  return (
    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl lg:grid-cols-2 lg:border-x-[1.5px]" style={{ borderColor: 'var(--ink)' }}>
      <SidePlate />
      <div className="px-4 py-12 sm:px-10 sm:py-16">
        <div className="mx-auto max-w-md">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <h1 className="text-3xl sm:text-4xl">{heading}</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('login.sub')}</p>
            </motion.div>
          </AnimatePresence>

          <form onSubmit={submit} noValidate className="mt-8 grid gap-4">
            {asks && (
              <div role="group" aria-label={t('login.h.in') + ' / ' + t('login.h.up')} className="relative grid grid-cols-2 rounded-lg border-[1.5px] p-1" style={{ borderColor: 'var(--ink)' }}>
                {([['in', t('nav.login')], ['up', t('login.tab.up')]] as const).map(([m, label]) => (
                  <button key={m} type="button" aria-pressed={mode === m} onClick={() => swap(m)} className="relative z-10 min-h-10 cursor-pointer border-0 bg-transparent text-sm font-extrabold" style={{ color: mode === m ? 'var(--hl-ink)' : 'var(--ink)' }}>
                    {mode === m && <motion.span layoutId="login-tab" className="absolute inset-0 -z-10 rounded-md" style={{ background: 'var(--hl)' }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    {label}
                  </button>
                ))}
              </div>
            )}
            {info && <p role="status" className="rounded-lg border-2 p-3 text-sm font-bold" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>{info}</p>}
            <div>
              <label htmlFor="em" className="label">{t('login.email')}</label>
              <input id="em" type="email" autoComplete="email" placeholder="kamu@email.com" className="field" value={email} readOnly={mode === 'otp'} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!err.email} aria-describedby="em-e" />
              <p id="em-e" aria-live="polite" className="mt-1.5 text-sm font-semibold empty:hidden" style={{ color: 'var(--bad)' }}>{err.email}</p>
            </div>
            {asks && (
              <div>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <label htmlFor="pw" className="!mb-0 label">{t('login.pw')}</label>
                  {mode === 'in' && <button type="button" className={link} style={{ color: 'var(--accent-text)' }} onClick={() => swap('forgot')}>{t('login.forgot')}</button>}
                </div>
                <div className="relative">
                  <input id="pw" type={showPw ? 'text' : 'password'} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} className="field !pr-20" value={pw} onChange={(e) => setPw(e.target.value)} aria-invalid={!!err.pw} aria-describedby="pw-e" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-pressed={showPw} aria-label={showPw ? t('login.hide') : t('login.show')} className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded border-0 bg-transparent px-2 py-1 text-xs font-extrabold hover:bg-[var(--surface-2)]" style={{ color: 'var(--accent-text)' }}>{showPw ? t('pw.hide') : t('pw.show')}</button>
                </div>
                <p id="pw-e" aria-live="polite" className="mt-1.5 text-sm font-semibold empty:hidden" style={{ color: 'var(--bad)' }}>{err.pw}</p>
              </div>
            )}
            {mode === 'otp' && (
              <div>
                <label htmlFor="otp" className="label">{t('login.otp.label')}</label>
                <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="field mono text-center text-2xl tracking-[0.5em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
                <button type="button" className={`mt-2 ${link}`} style={{ color: 'var(--accent-text)' }} disabled={wait > 0} onClick={() => void resend()}>{wait > 0 ? t('login.otp.wait', { s: wait }) : t('login.otp.resend')}</button>
              </div>
            )}
            {mode !== 'otp' && config?.turnstileSiteKey && <Turnstile key={capKey} siteKey={config.turnstileSiteKey} onToken={onToken} />}
            <div>
              <p role="alert" className="mb-3 text-sm font-bold empty:hidden" style={{ color: 'var(--bad)' }}>{err.form}</p>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={busy || (mode === 'otp' ? code.length !== 6 : !!config?.turnstileSiteKey && !captcha)}>{busy ? <Spinner /> : mode === 'in' ? t('login.submit.in') : mode === 'up' ? t('login.submit.up') : mode === 'otp' ? t('login.otp.submit') : t('login.forgot.submit')}</button>
            </div>
            {asks && providers.length > 0 && (
              <div>
                <div className="flex items-center gap-3 text-xs font-bold" style={{ color: 'var(--muted)' }} aria-hidden="true">
                  <span className="h-px flex-1" style={{ background: 'var(--line-2)' }} />{t('login.orWith')}<span className="h-px flex-1" style={{ background: 'var(--line-2)' }} />
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
                {t('legal.agreePre')} <Link to="/terms" className="font-bold underline underline-offset-4" style={{ color: 'var(--ink)' }}>{t('legal.terms')}</Link> {t('legal.and')} <Link to="/privacy" className="font-bold underline underline-offset-4" style={{ color: 'var(--ink)' }}>{t('legal.privacy')}</Link>.
              </p>
            )}
            {!asks && <button type="button" className={`justify-self-center py-1 ${link}`} style={{ color: 'var(--accent-text)' }} onClick={() => swap('in')}>{t('login.forgot.back')}</button>}
          </form>
        </div>
      </div>
    </div>
  )
}
