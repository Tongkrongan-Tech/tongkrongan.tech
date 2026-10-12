import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { useStore } from '../lib/store'
import { api } from '../lib/api'
import { genericTxtInvalid } from '../lib/txt'
import { PLATFORMS, platformById, validateValue, type PlatformId, type RecordType } from '../lib/dns'
import { checkName } from '../lib/names'
import { NameChecker, useNameCheck } from '../components/NameChecker'
import { DnsDiagram } from '../components/DnsDiagram'
import { Plate } from '../components/Plate'
import { Burst } from '../components/fx'
import { Icon, Spinner, StatusBadge } from '../components/ui'

const STEPS = ['name', 'platform', 'record', 'verify'] as const

// Nama TXT bawaan per platform yang butuh verifikasi TXT selain Vercel.
const TXT_LABEL_DEFAULT: Partial<Record<PlatformId, string>> = { railway: '_railway-verify' }

export function Claim() {
  const { t, te, domain, config } = usePrefs()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user, ready, subs, quota, createSub, editSub, verifySub, connectVercel } = useStore()

  const initial = (params.get('name') ?? '').toLowerCase()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initial)
  const [platform, setPlatform] = useState<PlatformId>('vercel')
  const [type, setType] = useState<RecordType>('CNAME')
  const [values, setValues] = useState<Partial<Record<RecordType, string>>>({})
  const value = values[type] ?? ''
  const setValue = (v: string, ty: RecordType = type) => setValues((m) => ({ ...m, [ty]: v }))
  const [touched, setTouched] = useState(false)
  // Hubungkan Vercel otomatis (OAuth). 'unknown' sampai status dicek.
  const [vConn, setVConn] = useState<'unknown' | 'no' | 'yes'>('unknown')
  const [vProjects, setVProjects] = useState<{ id: string; name: string }[]>([])
  const [vProject, setVProject] = useState('')
  const vAuto = platform === 'vercel' && !!config?.vercelConnect && !!user
  const [focus, setFocus] = useState<'name' | 'type' | 'value' | null>(null)
  const [guide, setGuide] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [txtValue, setTxtValue] = useState('')
  const [txtLabel, setTxtLabel] = useState<string | null>(null) // null = pakai bawaan platform
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
  // TXT verifikasi platform lain (mis. Railway): nama diawali garis bawah, nilai bebas. Aturan sama dengan backend (validateRecordInput).
  const genericTxt = platform !== 'vercel' && !!p.needsTxt
  const genLabel = (txtLabel ?? TXT_LABEL_DEFAULT[platform] ?? '').trim().toLowerCase()
  const genValue = genericTxt ? txtValue.trim() : ''
  const genErr = genericTxt && genericTxtInvalid(genLabel, genValue, txtLabel !== null)
  const txtInput = platform === 'vercel' ? { txtLabel: vercelTxt ? '_vercel' : '', txtValue: vercelTxt } : { txtLabel: genValue ? genLabel : '', txtValue: genValue }

  useEffect(() => { document.title = `${t('claim.title')} | Tongkrongan.tech` }, [t])
  // Lanjutkan subdomain milik sendiri yang belum aktif (mis. setelah muat ulang halaman).
  useEffect(() => {
    if (!ready || !mine || mine.status === 'active' || step !== 0 || !initial) return
    setPlatform(mine.platform); setType(mine.type); setValues({ [mine.type]: mine.value }); setTxtValue(mine.txtLabel ? mine.txtValue ?? '' : ''); setTxtLabel(mine.txtLabel && mine.txtLabel !== '_vercel' ? mine.txtLabel : null); setStep(3)
  }, [ready, mine, step, initial])

  async function next() {
    setError('')
    if (step === 0 && !user) { nav('/login', { state: { from: `/claim?name=${clean}` } }); return }
    if (step === 2) {
      setTouched(true)
      if (valErr || txtErr || genErr) return
      setBusy(true)
      const input = { platform, type, value: value.trim(), ...txtInput }
      try {
        if (mine) await editSub(clean, input)
        else await createSub({ name: clean, ...input })
      } catch (e) { setError(te(e)); setBusy(false); return }
      setBusy(false)
    }
    if (step === 2) { setTries(0); setPolling(true) }
    setStep((s) => Math.min(3, s + 1))
  }

  async function loadVercel() {
    try {
      const st = await api<{ connected: boolean }>('/vercel/status')
      if (!st.connected) { setVConn('no'); return false }
      const r = await api<{ projects: { id: string; name: string }[] }>('/vercel/projects')
      setVProjects(r.projects); setVProject((p) => p || r.projects[0]?.id || ''); setVConn('yes')
      return true
    } catch { setVConn('no'); return false }
  }
  useEffect(() => { if (step === 2 && vAuto && vConn === 'unknown') void loadVercel() }, [step, vAuto, vConn])

  function openVercel() {
    window.open('/api/vercel/start', '_blank', 'width=560,height=760')
    let n = 0
    const id = setInterval(async () => { if ((await loadVercel()) || ++n > 72) clearInterval(id) }, 2500)
  }

  async function autoVercel() {
    setBusy(true); setError('')
    try { await connectVercel(clean, vProject) } catch (e) { setError(te(e)); setBusy(false); return }
    setBusy(false); setTries(0); setPolling(true); setStep(3)
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
  const shownType = step === 3 ? cur?.type ?? type : type
  const shownValue = step === 3 ? cur?.value ?? value : value

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-[clamp(2rem,5vw,3.4rem)]">{t('claim.h1')}</h1>
      <p className="lead mt-3">{t('claim.sub')}</p>

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label={t('claim.progress')}>
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? 'step' : undefined}>
            <div className="h-[5px]" style={{ background: i <= step ? 'var(--ink)' : 'var(--line-2)', transition: 'background .3s' }} />
            <span className="mt-2 hidden text-sm font-extrabold sm:block" style={{ color: i === step ? 'var(--ink)' : 'var(--muted)' }}>{i + 1}. {t(`claim.step.${s}`)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-sm font-bold sm:hidden" style={{ color: 'var(--muted)' }}>{t('claim.stepOf', { n: step + 1, total: 4 })}: {t(`claim.step.${STEPS[step]}`)}</p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="max-w-2xl">
                  <h2 className="mb-5 text-2xl">{t('claim.s0.h')}</h2>
                  <NameChecker value={name} onChange={setName} cta={false} showLabel />
                  {quotaFull && <p role="alert" className="mt-4 rounded-lg border-2 p-4 text-sm font-bold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t('claim.quota', { n: quota })} <Link to="/dashboard" style={{ color: 'var(--ink)' }}>{t('nav.dashboard')}</Link></p>}
                  {ready && !user && nameOk && <p className="hint mt-2">{t('claim.needLogin')}</p>}
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-2xl">{t('claim.s1.h')}</h2>
                  <div className="mt-6 border-t-[1.5px]" style={{ borderColor: 'var(--ink)' }} role="radiogroup" aria-label={t('claim.s1.h')}>
                    {PLATFORMS.map((x) => {
                      const on = platform === x.id
                      return (
                        <button key={x.id} type="button" role="radio" aria-checked={on} onClick={() => { if (x.id !== platform) { setTxtValue(''); setTxtLabel(null) } setPlatform(x.id); setType(x.defaultType); setValues({}) }}
                          className="flex w-full cursor-pointer items-center justify-between gap-4 border-0 border-b px-3 py-4 text-left" style={{ borderColor: 'var(--line-2)', background: on ? 'var(--hl)' : 'transparent', color: on ? 'var(--hl-ink)' : 'var(--ink)' }}>
                          <span>
                            <span className="block text-lg font-extrabold tracking-tight">{x.name}</span>
                            <span className="block text-sm" style={{ color: on ? 'var(--hl-ink)' : 'var(--muted)' }}>{t(`plat.${x.id}.tag`)}</span>
                          </span>
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-[4px] border-2" style={{ borderColor: on ? 'var(--ink)' : 'var(--line-2)', background: on ? 'var(--ink)' : 'transparent', color: 'var(--hl)' }}>{on && <Icon.check size={14} strokeWidth={3.4} />}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-2xl">{t('claim.s2.h', { p: p.name })}</h2>
                  {vAuto && !mine && (
                    <div className="mt-5 rounded-lg border-2 p-4" style={{ borderColor: 'var(--ink)', background: 'var(--surface)' }}>
                      <p className="text-sm font-extrabold">{t('claim.vauto.h')}</p>
                      <p className="hint mt-1">{t('claim.vauto.hint')}</p>
                      {vConn === 'yes' ? (
                        <div className="mt-3 grid gap-3">
                          <label htmlFor="vproj" className="label">{t('claim.vauto.project')}</label>
                          {vProjects.length ? (
                            <select id="vproj" className="field" value={vProject} onChange={(e) => setVProject(e.target.value)}>
                              {vProjects.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            </select>
                          ) : <p className="hint">{t('claim.vauto.none')}</p>}
                          <button type="button" className="btn btn-primary" disabled={busy || !vProject} onClick={() => void autoVercel()}>{busy ? <Spinner /> : t('claim.vauto.go', { host })}</button>
                        </div>
                      ) : (
                        <button type="button" className="btn btn-primary mt-3" disabled={vConn === 'unknown'} onClick={openVercel}>{t('claim.vauto.connect')}</button>
                      )}
                      <p role="alert" className="mt-2 min-h-5 text-sm font-bold" style={{ color: 'var(--bad)' }}>{error}</p>
                      <p className="hint mt-1">{t('claim.vauto.or')}</p>
                    </div>
                  )}
                  <div className="mt-5 grid gap-6">
                    <div>
                      <span id="rtype-l" className="label">{t('claim.type')}</span>
                      <div role="radiogroup" aria-labelledby="rtype-l" className="flex flex-wrap gap-2" onFocus={() => setFocus('type')}>
                        {p.types.map((ty) => (
                          <button key={ty} type="button" role="radio" aria-checked={type === ty} onClick={() => setType(ty)} className="btn btn-sm mono" style={{ background: type === ty ? 'var(--hl)' : 'var(--surface)', color: type === ty ? 'var(--hl-ink)' : 'var(--ink)' }}>{ty}</button>
                        ))}
                      </div>
                      <p className="hint mt-2">{t(`type.${type}`)}</p>
                    </div>
                    <div>
                      <label htmlFor="rvalue" className="label">{t('claim.value')}</label>
                      <input id="rvalue" className="field mono" value={value} onChange={(e) => setValue(e.target.value)} onFocus={() => setFocus('value')} onBlur={() => { setTouched(true); setFocus(null) }} placeholder={p.placeholder[type] ?? ''} autoComplete="off" spellCheck={false} aria-invalid={touched && !!valErr} aria-describedby="rvalue-msg" />
                      <div id="rvalue-msg" aria-live="polite" className="mt-2 min-h-6 text-sm font-semibold">
                        {touched && valErr ? <p style={{ color: 'var(--bad)' }}>{t(`val.${valErr}`)}</p> : !valErr ? <p style={{ color: 'var(--ok)' }} className="inline-flex items-center gap-1"><Icon.check size={14} /> {t('val.ok')}</p> : null}
                      </div>
                      {p.placeholder[type] && <button type="button" className="mt-1 cursor-pointer border-0 bg-transparent p-0 py-2 text-sm font-bold underline" style={{ color: 'var(--accent-text)' }} onClick={() => setValue(p.placeholder[type]!)}>{t('claim.useExample')}</button>}
                    </div>
                    {platform === 'vercel' && (
                      <details open={!!txtValue} className="rounded-lg border p-4" style={{ borderColor: 'var(--line-2)' }}>
                        <summary className="cursor-pointer text-sm font-extrabold">{t('claim.vtxt.h')}</summary>
                        <p className="hint mt-2">{t('claim.vtxt.hint', { domain })}</p>
                        <label htmlFor="vtx" className="label mt-3">{t('claim.txt.value')}</label>
                        <input id="vtx" className="field mono" value={txtValue} onChange={(e) => setTxtValue(e.target.value)} placeholder={`vc-domain-verify=${clean || 'nama'}.${domain},xxxxxxxx`} autoComplete="off" spellCheck={false} aria-invalid={touched && txtErr} />
                        <p aria-live="polite" className="mt-1 min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{touched && txtErr ? t('claim.vtxt.err', { domain }) : ''}</p>
                      </details>
                    )}
                    {genericTxt && (
                      <details open className="rounded-lg border p-4" style={{ borderColor: 'var(--line-2)' }}>
                        <summary className="cursor-pointer text-sm font-extrabold">{t('claim.txt.h')}</summary>
                        <p className="hint mt-2">{t('claim.txt.hint')}</p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.6fr]">
                          <div>
                            <label htmlFor="gtl" className="label">{t('claim.txt.label')}</label>
                            <input id="gtl" className="field mono" value={txtLabel ?? TXT_LABEL_DEFAULT[platform] ?? ''} onChange={(e) => setTxtLabel(e.target.value)} placeholder="_railway-verify" autoComplete="off" spellCheck={false} aria-invalid={touched && genErr} aria-describedby="gtx-e" />
                          </div>
                          <div>
                            <label htmlFor="gtv" className="label">{t('claim.txt.value')}</label>
                            <input id="gtv" className="field mono" value={txtValue} onChange={(e) => setTxtValue(e.target.value)} placeholder={p.placeholder.TXT ?? ''} autoComplete="off" spellCheck={false} aria-invalid={touched && genErr} aria-describedby="gtx-e" />
                          </div>
                        </div>
                        <p id="gtx-e" aria-live="polite" className="mt-1 min-h-5 text-sm font-semibold" style={{ color: 'var(--bad)' }}>{touched && genErr ? t('claim.txt.err') : ''}</p>
                      </details>
                    )}
                    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                      <input type="checkbox" checked={!guide} onChange={(e) => setGuide(!e.target.checked)} className="h-5 w-5 accent-[var(--accent)]" />
                      {t('claim.skipGuide')}
                    </label>
                  </div>
                  {guide && (
                    <motion.ol initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 grid gap-3 border-l-[3px] pl-5 text-sm" style={{ borderColor: 'var(--hl)' }}>
                      {[1, 2, 3].map((n) => (<li key={n} className="grid grid-cols-[1.5rem_1fr] gap-2"><b style={{ color: 'var(--accent-text)' }}>{n}</b><span>{t(`plat.${p.id}.s${n}`)}</span></li>))}
                      {p.docs && <li><a href={p.docs} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 font-bold underline" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: p.name })} <Icon.ext /></a></li>}
                    </motion.ol>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="relative">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl">{t('claim.s3.h')}</h2>
                    <StatusBadge status={status} />
                  </div>
                  <p className="mt-2 break-all font-bold">{host} <span className="mono text-sm font-medium" style={{ color: 'var(--muted)' }}>({cur?.type ?? type} {cur?.value ?? value})</span></p>
                  <p className="hint mt-1">{t('claim.created', { type: cur?.type ?? type })}</p>

                  {rawStatus !== 'active' && cur && (
                    <div className="mt-5 border-l-[3px] pl-5" style={{ borderColor: 'var(--hl)' }}>
                      <p className="font-extrabold">{t('claim.lastStep', { p: p.name })}</p>
                      <p className="hint mt-1">{t('claim.lastStepD', vars)}</p>
                      <ol className="mt-3 grid gap-2 text-sm">
                        {[1, 2, 3].map((n) => (<li key={n} className="grid grid-cols-[1.5rem_1fr] gap-2"><b style={{ color: 'var(--accent-text)' }}>{n}</b><span>{t(`plat.${p.id}.s${n}`)}</span></li>))}
                      </ol>
                      {p.docs && <a href={p.docs} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold underline" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: p.name })} <Icon.ext /></a>}
                    </div>
                  )}

                  <div aria-live="polite" className="mt-5">
                    {error && <p role="alert" className="mb-3 rounded-lg border-2 p-3 text-sm font-bold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{error}</p>}
                    {polling && rawStatus !== 'active' && rawStatus !== 'suspended' && (
                      <p className="rounded-lg border p-3 text-sm font-medium" style={{ borderColor: 'var(--line-2)' }}>
                        <span className="inline-flex items-center gap-2 font-bold"><Spinner size={14} /> {t('claim.polling', { n: Math.min(tries + 1, MAX_TRIES), max: MAX_TRIES })}</span>
                        {failKey && cur?.status === 'failed' && <span className="mt-1 block" style={{ color: 'var(--muted)' }}>{t('claim.pollingNow')} {t(failKey, vars)}</span>}
                      </p>
                    )}
                    {!polling && status === 'failed' && failKey && (
                      <motion.div role="alert" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border-2 p-4" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>
                        <p className="font-extrabold">{t('claim.failed')}</p>
                        <p className="mt-1 text-sm font-medium">{t(failKey, vars)}</p>
                      </motion.div>
                    )}
                    {status === 'active' && (
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-lg border-2 p-4" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>
                        <Burst />
                        <p className="font-extrabold">{t('claim.celebrate')}</p>
                        <p className="mt-1 text-sm font-medium">{t('claim.successHint')}</p>
                      </motion.div>
                    )}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    {status === 'active' ? (
                      <>
                        <a href={`https://${host}`} target="_blank" rel="noreferrer" className="btn btn-primary">{t('claim.visit')} <Icon.ext /></a>
                        <Link to="/dashboard" className="btn">{t('claim.toDashboard')}</Link>
                      </>
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
              )}
            </motion.div>
          </AnimatePresence>

          {step < 3 && (
            <div className="mt-10">
              {error && step === 2 && <p role="alert" className="mb-4 max-w-xl rounded-lg border-2 p-3 text-sm font-bold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{error}</p>}
              <div className="flex flex-wrap gap-3">
                {step > 0 && <button type="button" className="btn" onClick={() => { setError(''); setStep((s) => s - 1) }}><Icon.back /> {t('claim.back')}</button>}
                <button type="button" className="btn btn-primary" onClick={next} disabled={!canNext || busy}>
                  {busy ? <><Spinner /> {t('claim.saving')}</> : step === 2 ? t('claim.saveRecord') : t('claim.next')}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start" aria-label={t('claim.live')}>
          <p className="label">{t('claim.live')}</p>
          <Plate name={clean} size="md" stamp={step === 3 && status === 'active' ? t('status.active') : null}>
            {step >= 2 && shownValue && (
              <div className="flex items-center gap-3 text-sm">
                <span className="mono rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{shownType}</span>
                <span className="mono min-w-0 truncate" style={{ color: 'var(--board-dim)' }}>{shownValue}</span>
              </div>
            )}
          </Plate>
          {step >= 1 && <div className="mt-8"><DnsDiagram name={clean} type={shownType} value={shownValue} platform={p.name} focus={step === 3 ? null : focus} /></div>}
        </aside>
      </div>
    </div>
  )
}
