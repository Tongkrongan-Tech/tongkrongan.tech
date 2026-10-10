import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { PLATFORMS, platformById, validateValue, type PlatformId, type RecordType } from '../lib/dns'
import { checkName } from '../lib/names'
import { NameChecker, useNameCheck } from '../components/NameChecker'
import { DnsDiagram } from '../components/DnsDiagram'
import { Icon, Spinner, StatusBadge } from '../components/ui'

const STEPS = ['name', 'platform', 'record', 'verify'] as const

export function Claim() {
  const { t, te, domain } = usePrefs()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user, ready, subs, quota, createSub, editSub, verifySub } = useStore()

  const initial = (params.get('name') ?? '').toLowerCase()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial)
  const [platform, setPlatform] = useState<PlatformId>('vercel')
  const [type, setType] = useState<RecordType>('CNAME')
  const [values, setValues] = useState<Partial<Record<RecordType, string>>>({})
  const value = values[type] ?? ''
  const setValue = (v: string, ty: RecordType = type) => setValues((m) => ({ ...m, [ty]: v }))
  const [touched, setTouched] = useState(false)
  const [focus, setFocus] = useState<'name' | 'type' | 'value' | null>(null)
  const [guide, setGuide] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [txtValue, setTxtValue] = useState('')
  const [tries, setTries] = useState(0)
  const [polling, setPolling] = useState(true)

  const clean = name.trim().toLowerCase()
  const p = platformById(platform)
  const { state: nameState, checking } = useNameCheck(clean)
  const nameOk = nameState.kind === 'ok' && !checking
  const valErr = validateValue(type, value, clean, domain)
  const mine = subs.find((s) => s.name === clean)
  const quotaFull = subs.length >= quota && !mine
  const host = `${clean}.${domain}`
  // TXT verifikasi Vercel (opsional): dibuat di _vercel.<domain>, nilainya harus untuk subdomain ini
  const vercelTxt = platform === 'vercel' ? txtValue.trim() : ''
  const txtErr = !!vercelTxt && !new RegExp(`^vc-domain-verify=${(clean + '.' + domain).replace(/\./g, '\\.')},[a-z0-9]{8,64}$`, 'i').test(vercelTxt)

  useEffect(() => { document.title = `${t('claim.title')} | Tongkrongan.tech` }, [t])
  // Lanjutkan subdomain milik sendiri yang belum aktif (mis. setelah muat ulang halaman).
  useEffect(() => {
    if (!ready || !mine || mine.status === 'active' || step !== 0 || !initial) return
    setPlatform(mine.platform); setType(mine.type); setValues({ [mine.type]: mine.value }); setTxtValue(mine.txtLabel === '_vercel' ? mine.txtValue ?? '' : ''); setStep(3)
  }, [ready, mine, step, initial])

  async function next() {
    setError('')
    if (step === 0 && !user) { nav('/login', { state: { from: `/claim?name=${clean}` } }); return }
    if (step === 2) {
      setTouched(true)
      if (valErr || txtErr) return
      setBusy(true)
      const input = { platform, type, value: value.trim(), txtLabel: vercelTxt ? '_vercel' : '', txtValue: vercelTxt }
      try {
        if (mine) await editSub(clean, input)
        else await createSub({ name: clean, ...input })
      } catch (e) { setError(te(e)); setBusy(false); return }
      setBusy(false)
    }
    if (step === 2) { setTries(0); setPolling(true) }
    setStep((s) => Math.min(3, s + 1))
  }

  async function runVerify() {
    setBusy(true); setError('')
    try { await verifySub(clean) } catch (e) { setError(te(e)) }
    setBusy(false)
  }

  const cur = subs.find((s) => s.name === clean)
  const rawStatus = cur?.status ?? 'pending'
  const MAX_TRIES = 18
  const status = polling && rawStatus !== 'active' && rawStatus !== 'suspended' ? 'verifying' : rawStatus

  // Cek otomatis tiap 10 detik (pertama 3 detik setelah record dibuat), maksimal 3 menit.
  useEffect(() => {
    if (step !== 3 || !cur || !polling || rawStatus === 'active' || rawStatus === 'suspended') return
    if (tries >= MAX_TRIES) { setPolling(false); return }
    const id = setTimeout(async () => {
      try { await verifySub(clean) } catch { /* too_fast atau jaringan: coba lagi di putaran berikut */ }
      setTries((n) => n + 1)
    }, tries === 0 ? 3000 : 10000)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, polling, tries, rawStatus, cur?.name])
  const canNext = step === 0 ? nameOk && !quotaFull && checkName(clean).kind === 'ok' : true
  const failKey = cur?.failReason ? `val.${cur.failReason}` : ''
  const vars = { host, p: p.name }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">{t('claim.h1')}</h1>

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label={t('claim.progress')}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <div className="h-2.5 overflow-hidden rounded-full border-2" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <motion.div className="h-full" style={{ background: 'var(--accent)' }} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
            </div>
            <span className="mt-1.5 hidden text-xs font-semibold sm:block" style={{ color: i === step ? 'var(--ink)' : 'var(--muted)' }}>{i + 1}. {t(`claim.step.${s}`)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm font-semibold sm:hidden" style={{ color: 'var(--muted)' }}>{t('claim.stepOf', { n: step + 1, total: 4 })}: {t(`claim.step.${STEPS[step]}`)}</p>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }} className="mt-8">
          {step === 0 && (
            <div className="max-w-2xl">
              <h2 className="mb-5 text-2xl font-bold">{t('claim.s0.h')}</h2>
              <NameChecker value={name} onChange={setName} cta={false} />
              {quotaFull && <p role="alert" className="card mt-4 p-4 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{t('claim.quota', { n: quota })} <Link to="/dashboard" style={{ color: 'var(--ink)' }}>{t('nav.dashboard')}</Link></p>}
              {ready && !user && nameOk && <p className="hint mt-2">{t('claim.needLogin')}</p>}
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold">{t('claim.s1.h')}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={t('claim.s1.h')}>
                {PLATFORMS.map((x, k) => (
                  <motion.button key={x.id} type="button" role="radio" aria-checked={platform === x.id} onClick={() => { setPlatform(x.id); setType(x.defaultType); setValues({}) }} whileHover={{ y: -5 }} whileTap={{ scale: 0.96 }} className="min-h-[130px] cursor-pointer border-2 p-4 text-left" style={{ borderColor: 'var(--line)', background: x.color, color: '#1b1612', borderRadius: k % 2 ? 14 : 26, boxShadow: platform === x.id ? '5px 5px 0 var(--line)' : 'none', outline: platform === x.id ? '3px solid var(--line)' : undefined, outlineOffset: 2 }}>
                    <span className="block text-xl font-extrabold">{x.name}</span>
                    <span className="mt-1 block text-xs font-medium">{t(`plat.${x.id}.tag`)}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div>
                <h2 className="text-2xl font-bold">{t('claim.s2.h', { p: p.name })}</h2>
                <div className="mt-5 grid gap-5">
                  <div>
                    <label htmlFor="rtype" className="label">{t('claim.type')}</label>
                    <div id="rtype" role="radiogroup" aria-label={t('claim.type')} className="flex flex-wrap gap-2" onFocus={() => setFocus('type')}>
                      {p.types.map((ty) => (
                        <button key={ty} type="button" role="radio" aria-checked={type === ty} onClick={() => setType(ty)} className="btn !min-h-11" style={{ background: type === ty ? 'var(--accent)' : 'var(--surface)', color: type === ty ? 'var(--accent-ink)' : 'var(--ink)' }}>{ty}</button>
                      ))}
                    </div>
                    <p className="hint mt-2">{t(`type.${type}`)}</p>
                  </div>
                  <div>
                    <label htmlFor="rvalue" className="label">{t('claim.value')}</label>
                    <input id="rvalue" className="field" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => setFocus('value')} onBlur={() => { setTouched(true); setFocus(null) }} placeholder={p.placeholder[type] ?? ''} autoComplete="off" spellCheck={false} aria-invalid={touched && !!valErr} aria-describedby="rvalue-msg" />
                    <div id="rvalue-msg" aria-live="polite" className="mt-2 min-h-6 text-sm font-medium">
                      {touched && valErr ? (
                        <p style={{ color: 'var(--bad)' }}>{t(`val.${valErr}`)}</p>
                      ) : !valErr ? (
                        <p style={{ color: 'var(--ok)' }} className="inline-flex items-center gap-1"><Icon.check size={14} /> {t('val.ok')}</p>
                      ) : null}
                    </div>
                    {p.placeholder[type] && <button type="button" className="mt-1 cursor-pointer border-0 bg-transparent p-0 py-2 text-sm font-semibold underline" style={{ color: 'var(--accent-text)' }} onClick={() => setValue(p.placeholder[type]!)}>{t('claim.useExample')}</button>}
                  </div>
                  {platform === 'vercel' && (
                    <details open={!!txtValue} className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--line)' }}>
                      <summary className="cursor-pointer text-sm font-bold">{t('claim.vtxt.h')}</summary>
                      <p className="hint mt-2">{t('claim.vtxt.hint', { domain })}</p>
                      <label htmlFor="vtx" className="label mt-3">{t('claim.txt.value')}</label>
                      <input id="vtx" className="field" value={txtValue} onChange={(e) => setTxtValue(e.target.value)} placeholder={`vc-domain-verify=${clean || 'nama'}.${domain},xxxxxxxx`} autoComplete="off" spellCheck={false} aria-invalid={touched && txtErr} />
                      <p aria-live="polite" className="mt-1 min-h-5 text-sm font-medium" style={{ color: 'var(--bad)' }}>{touched && txtErr ? t('claim.vtxt.err', { domain }) : ''}</p>
                    </details>
                  )}
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
                    <input type="checkbox" checked={!guide} onChange={(e) => setGuide(!e.target.checked)} className="h-5 w-5 accent-[var(--accent-text)]" />
                    {t('claim.skipGuide')}
                  </label>
                </div>
                {guide && (
                  <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mt-6 grid gap-3 p-5 text-sm">
                    {[1, 2, 3].map((n) => (<li key={n} className="grid grid-cols-[1.5rem_1fr] gap-2"><b style={{ color: 'var(--accent-text)' }}>{n}</b><span>{t(`plat.${p.id}.s${n}`)}</span></li>))}
                    {p.docs && <li><a href={p.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-semibold" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: p.name })} <Icon.ext /></a></li>}
                  </motion.ol>
                )}
              </div>
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="label">{t('claim.preview')}</p>
                <p className="card mb-4 break-all p-4 text-lg font-bold" aria-live="polite">https://<span className="mark">{clean}</span>.{domain}</p>
                <DnsDiagram name={clean} type={type} value={value} platform={p.name} focus={focus} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="card p-6" style={{ boxShadow: 'var(--shadow)' }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold">{t('claim.s3.h')}</h2>
                  <StatusBadge status={status} />
                </div>
                <p className="mt-2 break-all font-semibold">{host} <span style={{ color: 'var(--muted)' }}>({cur?.type ?? type} {cur?.value ?? value})</span></p>
                <p className="hint mt-1">{t('claim.created', { type: cur?.type ?? type })}</p>

                {rawStatus !== 'active' && cur && (
                  <div className="mt-5 rounded-xl border-2 p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
                    <p className="font-bold">{t('claim.lastStep', { p: p.name })}</p>
                    <p className="hint mt-1">{t('claim.lastStepD', vars)}</p>
                    <ol className="mt-3 grid gap-2 text-sm">
                      {[1, 2, 3].map((n) => (<li key={n} className="grid grid-cols-[1.5rem_1fr] gap-2"><b style={{ color: 'var(--accent-text)' }}>{n}</b><span>{t(`plat.${p.id}.s${n}`)}</span></li>))}
                    </ol>
                    {p.docs && <a href={p.docs} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: p.name })} <Icon.ext /></a>}
                  </div>
                )}

                <div aria-live="polite" className="mt-5">
                  {error && <p role="alert" className="mb-3 rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{error}</p>}
                  {polling && rawStatus !== 'active' && rawStatus !== 'suspended' && (
                    <p className="rounded-xl border-2 p-3 text-sm font-medium" style={{ borderColor: 'var(--line)' }}>
                      <span className="inline-flex items-center gap-2 font-semibold"><Spinner size={14} /> {t('claim.polling', { n: Math.min(tries + 1, MAX_TRIES), max: MAX_TRIES })}</span>
                      {failKey && cur?.status === 'failed' && <span className="mt-1 block" style={{ color: 'var(--muted)' }}>{t('claim.pollingNow')} {t(failKey, vars)}</span>}
                    </p>
                  )}
                  {!polling && status === 'failed' && failKey && (
                    <motion.div role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>
                      <p className="font-bold">{t('claim.failed')}</p>
                      <p className="mt-1 text-sm font-medium">{t(failKey, vars)}</p>
                    </motion.div>
                  )}
                  {status === 'active' && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>
                      <p className="font-bold">{t('claim.success')}</p>
                      <p className="mt-1 text-sm font-medium">{t('claim.successHint')}</p>
                    </motion.div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  {status === 'active' ? (
                    <Link to="/dashboard" className="btn btn-primary">{t('claim.toDashboard')}</Link>
                  ) : (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => { setPolling(false); void runVerify() }} disabled={busy || !cur}>
                        {busy ? <><Spinner /> {t('claim.verifying')}</> : status === 'failed' ? <><Icon.retry /> {t('claim.retry')}</> : t('claim.verify')}
                      </button>
                      <button type="button" className="btn" onClick={() => { setPolling(false); setStep(2) }}>{t('claim.editRecord')}</button>
                    </>
                  )}
                </div>
                {status !== 'active' && <p className="hint mt-4">{t('claim.autoCheck')}</p>}
              </div>
              <DnsDiagram name={clean} type={cur?.type ?? type} value={cur?.value ?? value} platform={p.name} focus={null} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 3 && (
        <div className="mt-10">
          {error && step === 2 && <p role="alert" className="mb-4 max-w-xl rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{error}</p>}
          <div className="flex flex-wrap gap-3">
            {step > 0 && <button type="button" className="btn" onClick={() => { setError(''); setStep((s) => s - 1) }}><Icon.back /> {t('claim.back')}</button>}
            <button type="button" className="btn btn-primary" onClick={next} disabled={!canNext || busy}>
              {busy ? <><Spinner /> {t('claim.saving')}</> : step === 2 ? t('claim.saveRecord') : t('claim.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
