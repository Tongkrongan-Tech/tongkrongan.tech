import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore, type Sub } from '../lib/store'
import { platformById, validateValue, type RecordType } from '../lib/dns'
import { CopyButton, Dialog, Icon, Sparkline, Spinner, StatusBadge, radioKeys } from '../components/ui'
import { Count } from '../components/fx'
import { Csat } from '../components/Csat'
import { OwnershipProof } from '../components/OwnershipProof'

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
      <h2 className="text-xl">{t('dash.edit')}: <span className="mark">{sub?.name}</span></h2>
      <div className="mt-4 grid gap-4">
        <div role="radiogroup" aria-label={t('claim.type')} className="flex flex-wrap gap-2" onKeyDown={radioKeys}>
          {p?.types.map((ty) => (<button key={ty} type="button" role="radio" aria-checked={type === ty} tabIndex={type === ty ? 0 : -1} onClick={() => setType(ty)} className="btn btn-sm mono" style={{ background: type === ty ? 'var(--hl)' : 'var(--surface)', color: type === ty ? 'var(--hl-ink)' : 'var(--ink)' }}>{ty}</button>))}
        </div>
        <div>
          <label htmlFor="ev" className="label">{t('claim.value')}</label>
          <input id="ev" data-autofocus className="field mono" value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} aria-invalid={touched && !!err} aria-describedby="ev-msg" />
          <p id="ev-msg" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{touched && err ? t(`val.${err}`) : ''}</p>
        </div>
        <details open={!!txtLabel} className="rounded-lg border p-3" style={{ borderColor: 'var(--line-2)' }}>
          <summary className="cursor-pointer text-sm font-extrabold">{t('claim.txt.h')}</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="etl" className="label">{t('claim.txt.label')}</label><input id="etl" className="field mono" value={txtLabel} onChange={(e) => setTxtLabel(e.target.value)} placeholder="_railway-verify" autoComplete="off" spellCheck={false} /></div>
            <div><label htmlFor="etv" className="label">{t('claim.txt.value')}</label><input id="etv" className="field mono" value={txtValue} onChange={(e) => setTxtValue(e.target.value)} autoComplete="off" spellCheck={false} /></div>
          </div>
          <p aria-live="polite" className="mt-2 min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{touched && txtErr ? t('claim.txt.err') : ''}</p>
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
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState<'all' | 'active' | 'waiting' | 'failed' | 'suspended'>('all')
  const [sort, setSort] = useState<'new' | 'old' | 'name'>('new')
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = subs.filter((s) => (!needle || s.name.includes(needle)) && (statusF === 'all' || (statusF === 'waiting' ? s.status === 'pending' || s.status === 'verifying' : s.status === statusF)))
    return list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'old' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt)
  }, [subs, q, statusF, sort])

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
  const active = subs.filter((s) => s.status === 'active').length
  const waiting = subs.filter((s) => s.status === 'pending' || s.status === 'verifying').length

  if (ready && !user && !loadError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
        <h1 className="text-3xl">{t('dash.needLogin.h')}</h1>
        <p className="lead mt-3">{t('dash.needLogin.d')}</p>
        <Link to="/login" state={{ from: '/dashboard' }} className="btn btn-primary mt-8">{t('nav.login')}</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[clamp(2rem,5vw,3.4rem)]">{t('dash.hello')}</h1>
          <p className="mt-2" style={{ color: 'var(--muted)' }}>{user?.email}</p>
        </div>
        {subs.length >= quota ? <button type="button" className="btn" disabled>{t('dash.new')}</button> : <Link to="/claim" className="btn btn-primary"><Icon.plus /> {t('dash.new')}</Link>}
      </div>

      <dl className="mt-10 grid grid-cols-3 border-y-[1.5px]" style={{ borderColor: 'var(--ink)' }}>
        {[{ k: 'active', n: active }, { k: 'pending', n: waiting }, { k: 'left', n: Math.max(0, quota - subs.length) }].map((x, i) => (
          <motion.div key={x.k} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i }} className="px-2 py-5 sm:px-6" style={{ borderLeft: i ? '1px solid var(--line-2)' : 'none' }}>
            <dt className="text-xs font-bold sm:text-sm" style={{ color: 'var(--muted)' }}>{t(`dash.stat.${x.k}`)}</dt>
            <dd className="m-0 mt-1 text-4xl font-extrabold tracking-tight sm:text-5xl"><Count to={x.n} /></dd>
          </motion.div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2" role="img" aria-label={t('dash.quota', { n: subs.length, q: quota })}>
        {Array.from({ length: quota }).map((_, i) => (
          <motion.span key={i} initial={false} animate={{ background: i < subs.length ? 'var(--accent)' : 'transparent', scale: i < subs.length ? 1 : 0.9 }} transition={{ type: 'spring', stiffness: 300, damping: 18, delay: i * 0.08 }} className="h-4 w-8 rounded-[3px] border-[1.5px]" style={{ borderColor: 'var(--ink)' }} />
        ))}
        <span className="ml-2 text-sm font-bold">{t('dash.quota', { n: subs.length, q: quota })}</span>
      </div>

      {actionError && <p role="alert" className="mt-6 rounded-lg border-2 p-3 text-sm font-bold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t('dash.actionFail')}: {actionError}</p>}

      <div className="mt-10" aria-live="polite">
        {loadError ? (
          <div role="alert" className="card p-8 text-center" style={{ borderColor: 'var(--bad)' }}>
            <h2 className="text-xl" style={{ color: 'var(--bad)' }}>{t('dash.error.h')}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm" style={{ color: 'var(--muted)' }}>{t('dash.error.d')}</p>
            <button type="button" className="btn mt-6" onClick={() => void refresh()}><Icon.retry /> {t('dash.error.reset')}</button>
          </div>
        ) : !ready || loading ? (
          <div className="grid gap-5 md:grid-cols-2" aria-busy="true"><span className="sr-only">{t('ui.loading')}</span>{[0, 1].map((i) => (<div key={i} className="card p-6"><div className="skeleton h-7 w-2/3" /><div className="skeleton mt-4 h-5 w-1/3" /><div className="skeleton mt-6 h-10 w-full" /></div>))}</div>
        ) : subs.length === 0 ? (
          <div className="grid place-items-center rounded-[14px] border-2 border-dashed p-12 text-center" style={{ borderColor: 'var(--line-2)' }}>
            <motion.p animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="text-6xl font-extrabold tracking-tight" style={{ color: 'var(--accent-text)' }} aria-hidden="true">.{domain.split('.').slice(-1)[0]}</motion.p>
            <h2 className="mt-4 text-2xl">{t('dash.empty.h')}</h2>
            <p className="mt-2 max-w-md" style={{ color: 'var(--muted)' }}>{t('dash.empty.d')}</p>
            <Link to="/claim" className="btn btn-primary mt-6">{t('dash.empty.cta')}</Link>
          </div>
        ) : (
          <>
          {subs.length > 1 && (
            <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
              <div><label htmlFor="ds" className="sr-only">{t('dash.search')}</label><input id="ds" type="search" className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('dash.search')} autoComplete="off" spellCheck={false} /></div>
              <div><label htmlFor="df" className="sr-only">{t('dash.filter')}</label>
                <select id="df" className="field" value={statusF} onChange={(e) => setStatusF(e.target.value as typeof statusF)}>
                  <option value="all">{t('dash.filter.all')}</option><option value="active">{t('status.active')}</option><option value="waiting">{t('dash.filter.waiting')}</option><option value="failed">{t('status.failed')}</option><option value="suspended">{t('status.suspended')}</option>
                </select></div>
              <div><label htmlFor="do" className="sr-only">{t('dash.sort')}</label>
                <select id="do" className="field" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                  <option value="new">{t('dash.sort.new')}</option><option value="old">{t('dash.sort.old')}</option><option value="name">{t('dash.sort.name')}</option>
                </select></div>
              <p className="hint sm:col-span-3" role="status">{t('dash.shown', { n: shown.length, total: subs.length })}</p>
            </div>
          )}
          {shown.length === 0 && <p className="card p-6 text-center font-semibold" style={{ color: 'var(--muted)' }}>{t('dash.noMatch')}</p>}
          <div className="grid gap-5 md:grid-cols-2">
            <AnimatePresence>
              {shown.map((s, k) => {
                const address = `${s.name}.${domain}`
                return (
                  <motion.article key={s.name} layout initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, rotate: -2 }} transition={{ delay: k * 0.07, type: 'spring', stiffness: 260, damping: 24 }} whileHover={{ y: -4 }} className="card p-5" style={{ borderColor: 'var(--ink)', borderWidth: 1.5, boxShadow: '4px 4px 0 var(--sh)' }}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h2 className="min-w-0 break-all text-xl"><span className="mark">{s.name}</span><span style={{ color: 'var(--muted)' }}>.{domain}</span></h2>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                      <span className="font-bold" style={{ color: 'var(--ink)' }}>{platformById(s.platform).name}</span>
                      <span className="mono rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{s.type}</span>
                      <span className="mono break-all">{s.value}</span>
                    </p>
                    {(s.status === 'failed' || s.status === 'suspended') && s.failReason && <p role="alert" className="mt-3 rounded-lg border-2 p-3 text-sm font-medium" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t(`val.${s.failReason}`, { host: `${s.name}.${domain}`, p: platformById(s.platform).name })}</p>}
                    {s.status === 'active' && !s.rated && Date.now() - s.createdAt < 14 * 86_400_000 && <Csat name={s.name} />}
                    <OwnershipProof sub={s} />
                    <div className="mt-4"><p className="mb-1 text-xs font-bold" style={{ color: 'var(--muted)' }}>{t('dash.uptime')}</p><Sparkline data={s.checks} label={t('dash.uptimeEmpty')} /></div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <CopyButton text={`https://${address}`} label={`${t('ui.copy')} ${address}`} />
                      {s.status === 'active' && <a href={`https://${address}`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">{t('dash.visit')} <Icon.ext size={14} /></a>}
                      {s.status !== 'active' && s.status !== 'suspended' && <button type="button" className="btn btn-sm" disabled={busy === s.name} onClick={() => reverify(s)}>{busy === s.name ? <Spinner size={14} /> : <Icon.retry size={14} />} {t('claim.verify')}</button>}
                      {s.status !== 'suspended' && <button type="button" className="btn btn-sm btn-outline" onClick={() => setEdit(s)}><Icon.edit size={14} /> {t('dash.edit')}</button>}
                      <button type="button" className="btn btn-sm btn-outline" aria-expanded={hist === s.name} onClick={() => setHist(hist === s.name ? null : s.name)}>{t('dash.history')}</button>
                      {s.status !== 'suspended' && <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => setDel(s)} aria-label={`${t('dash.delete')} ${address}`}><Icon.trash size={14} /> {t('dash.delete')}</button>}
                    </div>
                    <AnimatePresence initial={false}>
                      {hist === s.name && (
                        <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-4 grid gap-2 overflow-hidden border-t pt-3 text-sm" style={{ borderColor: 'var(--line-2)' }}>
                          {s.history.map((h, i) => (<motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className="flex flex-wrap justify-between gap-2"><span className="font-bold">{t(h.key)}{h.detail ? `: ${h.detail}` : ''}</span><span style={{ color: 'var(--muted)' }}>{fmt(h.at)}</span></motion.li>))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </AnimatePresence>
          </div>
          </>
        )}
      </div>

      <EditDialog sub={edit} onClose={() => setEdit(null)} onError={setActionError} />
      <Dialog open={!!del} onClose={() => setDel(null)} title={t('dash.delete')}>
        <h2 className="text-xl">{t('dash.delete.h', { name: del?.name ?? '' })}</h2>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('dash.delete.d')}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" data-autofocus className="btn" onClick={() => setDel(null)}>{t('ui.cancel')}</button>
          <button type="button" className="btn btn-danger" onClick={remove}>{t('dash.delete.yes')}</button>
        </div>
      </Dialog>
    </div>
  )
}
