import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { Dialog, Spinner } from '../components/ui'

const providerName: Record<string, string> = { github: 'GitHub', google: 'Google', discord: 'Discord' }

export function Settings() {
  const { t, te } = usePrefs()
  const { user, ready, refresh } = useStore()
  const nav = useNavigate()
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [delOpen, setDelOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [delErr, setDelErr] = useState('')
  useEffect(() => { document.title = `${t('set.h')} | Tongkrongan.tech` }, [t])

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl">{t('dash.needLogin.h')}</h1>
        <Link to="/login" state={{ from: '/settings' }} className="btn btn-primary mt-8">{t('nav.login')}</Link>
      </div>
    )
  }
  const oauth = !!user && user.provider !== 'email'

  async function changePw(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) { setMsg({ ok: false, text: t('login.err.pw') }); return }
    setBusy(true); setMsg(null)
    try {
      await api('/account/password', { body: { current: cur, password: pw } })
      setCur(''); setPw(''); setMsg({ ok: true, text: t('set.pw.done') })
    } catch (ex) { setMsg({ ok: false, text: te(ex) }) }
    setBusy(false)
  }

  async function removeAccount() {
    setBusy(true); setDelErr('')
    try {
      await api('/account/delete', { body: oauth ? { confirm } : { password: confirm } })
      await refresh()
      nav('/', { replace: true })
    } catch (ex) { setDelErr(te(ex)) }
    setBusy(false)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(2rem,5vw,3rem)]">{t('set.h')}</h1>
      <p className="mt-2" style={{ color: 'var(--muted)' }}>{user?.email}</p>

      <section className="mt-10" aria-labelledby="set-pw">
        <h2 id="set-pw" className="text-xl">{t('set.pw.h')}</h2>
        {oauth ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--muted)' }}>{t('set.pw.oauth', { provider: providerName[user!.provider] ?? user!.provider })}</p>
        ) : (
          <form onSubmit={changePw} noValidate className="mt-4 grid gap-4">
            <div><label htmlFor="spc" className="label">{t('set.pw.current')}</label><input id="spc" type="password" autoComplete="current-password" className="field" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
            <div><label htmlFor="spn" className="label">{t('set.pw.new')}</label><input id="spn" type="password" autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
            <p role={msg?.ok ? 'status' : 'alert'} className="min-h-5 text-sm font-bold" style={{ color: msg?.ok ? 'var(--ok)' : 'var(--bad)' }}>{msg?.text}</p>
            <button type="submit" className="btn btn-primary" disabled={busy || !cur || !pw}>{busy ? <Spinner /> : t('set.pw.submit')}</button>
          </form>
        )}
      </section>

      <section className="mt-12 border-t-2 pt-8" style={{ borderColor: 'var(--line-2)' }} aria-labelledby="set-del">
        <h2 id="set-del" className="text-xl" style={{ color: 'var(--bad)' }}>{t('set.del.h')}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('set.del.d')}</p>
        <button type="button" className="btn btn-danger mt-4" onClick={() => { setConfirm(''); setDelErr(''); setDelOpen(true) }}>{t('set.del.open')}</button>
      </section>

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title={t('set.del.h')}>
        <h2 className="text-xl">{t('set.del.h')}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('set.del.d')}</p>
        <div className="mt-4">
          <label htmlFor="sdc" className="label">{oauth ? t('set.del.confirmEmail', { email: user?.email ?? '' }) : t('set.del.confirmPw')}</label>
          <input id="sdc" data-autofocus type={oauth ? 'text' : 'password'} autoComplete={oauth ? 'off' : 'current-password'} className="field" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <p role="alert" className="mt-2 min-h-5 text-sm font-bold" style={{ color: 'var(--bad)' }}>{delErr}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" className="btn" onClick={() => setDelOpen(false)}>{t('ui.cancel')}</button>
          <button type="button" className="btn btn-danger" disabled={busy || !confirm} onClick={() => void removeAccount()}>{busy ? <Spinner /> : t('set.del.yes')}</button>
        </div>
      </Dialog>
    </div>
  )
}
