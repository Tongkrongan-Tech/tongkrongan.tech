import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore, type Sub } from '../lib/store'
import { platformById, validateValue, type RecordType } from '../lib/dns'
import { CopyButton, Dialog, Icon, Sparkline, Spinner, StatusBadge } from '../components/ui'

function EditDialog({ sub, onClose, onError }: { sub: Sub | null; onClose: () => void; onError: (m: string) => void }) {
  const { t, te, domain } = usePrefs()
  const { editSub } = useStore()
  const [type, setType] = useState<RecordType>('CNAME')
  const [value, setValue] = useState('')
  const [txtLabel, setTxtLabel] = useState('')
  const [txtValue, setTxtValue] = useState('')
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (sub) { setType(sub.type); setValue(sub.value); setTxtLabel(sub.txtLabel ?? ''); setTxtValue(sub.txtValue ?? ''); setTouched(false) } }, [sub])
  const p = sub ? platformById(sub.platform) : null
  const err = sub ? validateValue(type, value, sub.name, domain) : null
  const txtErr = (txtLabel.trim() || txtValue.trim()) && (!/^_[a-z0-9-]{1,40}$/.test(txtLabel.trim().toLowerCase()) || !txtValue.trim())
  async function save() {
    setTouched(true)
    if (!sub || err || txtErr || busy) return
    setBusy(true)
    try { await editSub(sub.name, { type, value: value.trim(), txtLabel: txtLabel.trim().toLowerCase(), txtValue: txtValue.trim() }); onClose() } catch (e) { onError(te(e)); onClose() }
    setBusy(false)
  }
  return (
    <Dialog open={!!sub} onClose={onClose} title={t('dash.edit')}>
      <h2 className="text-xl font-bold">{t('dash.edit')}: {sub?.name}</h2>
      <div className="mt-4 grid gap-4">
        <div role="radiogroup" aria-label={t('claim.type')} className="flex flex-wrap gap-2">
          {p?.types.map((ty) => (<button key={ty} type="button" role="radio" aria-checked={type === ty} onClick={() => setType(ty)} className="btn !min-h-11" style={{ background: type === ty ? 'var(--accent)' : 'var(--surface)', color: type === ty ? 'var(--accent-ink)' : 'var(--ink)' }}>{ty}</button>))}
        </div>
        <div>
          <label htmlFor="ev" className="label">{t('claim.value')}</label>
          <input id="ev" data-autofocus className="field" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} aria-invalid={touched && !!err} aria-describedby="ev-msg" />
          <p id="ev-msg" aria-live="polite" className="mt-2 min-h-6 text-sm font-medium" style={{ color: 'var(--bad)' }}>{touched && err ? t(`val.${err}`) : ''}</p>
        </div>
        <details open={!!txtLabel} className="rounded-xl border-2 p-3" style={{ borderColor: 'var(--line)' }}>
          <summary className="cursor-pointer text-sm font-bold">{t('claim.txt.h')}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="etl" className="label">{t('claim.txt.label')}</label><input id="etl" className="field" value={txtLabel} onChange={(e) => setTxtLabel(e.target.value)} placeholder="_railway-verify" autoComplete="off" spellCheck={false} /></div>
            <div><label htmlFor="etv" className="label">{t('claim.txt.value')}</label><input id="etv" className="field" value={txtValue} onChange={(e) => setTxtValue(e.target.value)} autoComplete="off" spellCheck={false} /></div>
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{touched && txtErr ? t('claim.txt.err') : ''}</p>
        </details>
      </div>
      <p className="hint mb-4">{t('dash.editNote')}</p>
      <div className="flex justify-end gap-3"><button type="button" className="btn" onClick={onClose}>{t('ui.cancel')}</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : t('dash.save')}</button></div>
    </Dialog>
  )
}

export function Dashboard() {
  const { t, te, lang, domain } = usePrefs()
  const { user, ready, loading, loadError, subs, quota, refresh, verifySub, deleteSub } = useStore()
  const [edit, setEdit] = useState<Sub | null>(null)
  const [del, setDel] = useState<Sub | null>(null)
  const [hist, setHist] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => { document.title = `${t('nav.dashboard')} | Tongkrongan.tech` }, [t])

  async function reverify(s: Sub) {
    setBusy(s.name); setActionError('')
    try { await verifySub(s.name) } catch (e) { setActionError(te(e)) }
    setBusy(null)
  }
  async function remove() {
    if (!del) return
    const name = del.name
    setDel(null); setActionError('')
    try { await deleteSub(name) } catch (e) { setActionError(te(e)) }
  }

  const fmt = (n: number) => new Date(n).toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })

  if (ready && !user && !loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold">{t('dash.needLogin.h')}</h1>
        <p className="mt-3" style={{ color: 'var(--muted)' }}>{t('dash.needLogin.d')}</p>
        <Link to="/login" state={{ from: '/dashboard' }} className="btn btn-primary mt-8">{t('nav.login')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('nav.dashboard')}</h1>
          <p className="mt-2" style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
        <div className="flex items-center gap-4">
          <div aria-label={t('dash.quota', { n: subs.length, q: quota })} role="img" className="flex items-center gap-1.5">
            {Array.from({ length: quota }).map((_, i) => (<span key={i} className="h-5 w-5 rounded-md border-2" style={{ borderColor: 'var(--line)', background: i < subs.length ? 'var(--accent)' : 'transparent' }} />))}
            <span className="ml-2 text-sm font-semibold">{t('dash.quota', { n: subs.length, q: quota })}</span>
          </div>
          {subs.length >= quota ? <button type="button" className="btn" disabled>{t('dash.new')}</button> : <Link to="/claim" className="btn btn-primary"><Icon.plus /> {t('dash.new')}</Link>}
        </div>
      </div>

      {actionError && <p role="alert" className="mt-6 rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t('dash.actionFail')}: {actionError}</p>}

      <div className="mt-10" aria-live="polite">
        {loadError ? (
          <div role="alert" className="card p-8 text-center" style={{ borderColor: 'var(--bad)' }}>
            <h2 className="text-xl font-bold" style={{ color: 'var(--bad)' }}>{t('dash.error.h')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--muted)' }}>{t('dash.error.d')}</p>
            <button type="button" className="btn mt-6" onClick={() => void refresh()}><Icon.retry /> {t('dash.error.reset')}</button>
          </div>
        ) : !ready || loading ? (
          <div className="grid gap-5 md:grid-cols-2" aria-busy="true"><span className="sr-only">{t('ui.loading')}</span>{[0, 1].map((i) => (<div key={i} className="card p-6"><div className="skeleton h-7 w-2/3" /><div className="skeleton mt-4 h-5 w-1/3" /><div className="skeleton mt-6 h-10 w-full" /></div>))}</div>
        ) : subs.length === 0 ? (
          <div className="card grid place-items-center p-12 text-center" style={{ borderStyle: 'dashed' }}>
            <p className="text-5xl font-extrabold" style={{ color: 'var(--accent-text)' }} aria-hidden="true">.{domain.split('.').slice(-1)[0]}</p>
            <h2 className="mt-4 text-2xl font-bold">{t('dash.empty.h')}</h2>
            <p className="mt-2 max-w-md" style={{ color: 'var(--muted)' }}>{t('dash.empty.d')}</p>
            <Link to="/claim" className="btn btn-primary mt-6">{t('dash.empty.cta')}</Link>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            <AnimatePresence>
              {subs.map((s, k) => {
                const address = `${s.name}.${domain}`
                return (
                  <motion.article key={s.name} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: k * 0.06 }} whileHover={{ y: -3 }} className="card p-5" style={{ boxShadow: 'var(--shadow)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="min-w-0 break-all text-xl font-extrabold"><span className="mark">{s.name}</span><span style={{ color: 'var(--muted)' }}>.{domain}</span></h2>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-2 break-all text-sm" style={{ color: 'var(--muted)' }}>{platformById(s.platform).name} · {s.type} {s.value}</p>
                    {(s.status === 'failed' || s.status === 'suspended') && s.failReason && <p role="alert" className="mt-3 rounded-lg border-2 p-3 text-sm font-medium" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t(`val.${s.failReason}`, { host: `${s.name}.${domain}`, p: platformById(s.platform).name })}</p>}
                    <div className="mt-4"><p className="mb-1 text-xs font-semibold" style={{ color: 'var(--muted)' }}>{t('dash.uptime')}</p><Sparkline data={s.checks} label={t('dash.uptimeEmpty')} /></div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <CopyButton text={`https://${address}`} label={`${t('ui.copy')} ${address}`} />
                      {s.status !== 'active' && s.status !== 'suspended' && <button type="button" className="btn !min-h-10 !px-3 !text-sm" disabled={busy === s.name} onClick={() => reverify(s)}>{busy === s.name ? <Spinner size={14} /> : <Icon.retry size={14} />} {t('claim.verify')}</button>}
                      {s.status !== 'suspended' && <button type="button" className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }} onClick={() => setEdit(s)}><Icon.edit size={14} /> {t('dash.edit')}</button>}
                      <button type="button" className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }} aria-expanded={hist === s.name} onClick={() => setHist(hist === s.name ? null : s.name)}>{t('dash.history')}</button>
                      {s.status !== 'suspended' && <button type="button" className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--bad)', color: 'var(--bad)' }} onClick={() => setDel(s)} aria-label={`${t('dash.delete')} ${address}`}><Icon.trash size={14} /> {t('dash.delete')}</button>}
                    </div>
                    <AnimatePresence initial={false}>
                      {hist === s.name && (
                        <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 grid gap-2 overflow-hidden border-t-2 pt-3 text-sm" style={{ borderColor: 'var(--line)' }}>
                          {s.history.map((h, i) => (<li key={i} className="flex flex-wrap justify-between gap-2"><span className="font-semibold">{t(h.key)}{h.detail ? `: ${h.detail}` : ''}</span><span style={{ color: 'var(--muted)' }}>{fmt(h.at)}</span></li>))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <EditDialog sub={edit} onClose={() => setEdit(null)} onError={setActionError} />
      <Dialog open={!!del} onClose={() => setDel(null)} title={t('dash.delete')}>
        <h2 className="text-xl font-bold">{t('dash.delete.h', { name: del?.name ?? '' })}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('dash.delete.d')}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" data-autofocus className="btn" onClick={() => setDel(null)}>{t('ui.cancel')}</button>
          <button type="button" className="btn btn-danger" onClick={remove}>{t('dash.delete.yes')}</button>
        </div>
      </Dialog>
    </div>
  )
}
