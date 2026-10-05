import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { PLATFORMS, type Platform } from '../lib/dns'
import { NameChecker } from '../components/NameChecker'
import { DnsDiagram } from '../components/DnsDiagram'
import { CopyButton, Icon, Reveal, Spinner } from '../components/ui'

/* ---------- Hero: peramban kecil yang mengetik nama lalu berubah status ---------- */
const SAMPLE = ['tokoku', 'portofolio', 'botku', 'tugas-akhir']
function HeroBrowser() {
  const { t, domain } = usePrefs()
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState(reduce ? SAMPLE[0] : '')
  const [phase, setPhase] = useState<'typing' | 'verifying' | 'active'>(reduce ? 'active' : 'typing')

  useEffect(() => {
    if (reduce) return
    const word = SAMPLE[i % SAMPLE.length]
    let timer: ReturnType<typeof setTimeout>
    if (phase === 'typing') {
      if (typed.length < word.length) timer = setTimeout(() => setTyped(word.slice(0, typed.length + 1)), 110)
      else timer = setTimeout(() => setPhase('verifying'), 500)
    } else if (phase === 'verifying') timer = setTimeout(() => setPhase('active'), 1500)
    else timer = setTimeout(() => { setI((n) => n + 1); setTyped(''); setPhase('typing') }, 2600)
    return () => clearTimeout(timer)
  }, [typed, phase, i, reduce])

  return (
    <div className="relative min-w-0" aria-hidden="true">
      <motion.div className="card overflow-hidden" style={{ boxShadow: 'var(--shadow)', rotate: -1.5 }} initial={{ opacity: 0, y: 30, rotate: -4 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ type: 'spring', stiffness: 120, damping: 16, delay: 0.2 }}>
        <div className="flex items-center gap-2 border-b-2 px-4 py-3" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
          <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--line)', background: 'var(--bad)' }} />
          <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--line)', background: 'var(--hl)' }} />
          <span className="h-3 w-3 rounded-full border-2" style={{ borderColor: 'var(--line)', background: 'var(--ok)' }} />
          <div className="ml-3 flex min-h-9 min-w-0 flex-1 items-center rounded-lg border-2 px-3 text-sm font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
            <span className="truncate">https://<span className="mark">{typed}</span>{phase === 'typing' && <span className="caret" />}<span style={{ color: 'var(--muted)' }}>.{domain}</span></span>
          </div>
        </div>
        <div className="grid min-h-[260px] place-items-center p-6">
          <AnimatePresence mode="wait">
            {phase === 'typing' && (
              <motion.p key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center text-sm font-medium" style={{ color: 'var(--muted)' }}>{t('hero.mock.typing')}</motion.p>
            )}
            {phase === 'verifying' && (
              <motion.div key="v" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3" style={{ color: 'var(--accent-text)' }}>
                <Spinner size={44} /><p className="text-sm font-semibold">{t('hero.mock.verifying')}</p>
              </motion.div>
            )}
            {phase === 'active' && (
              <motion.div key="a" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-3">
                <span className="grid h-20 w-20 place-items-center rounded-full border-2" style={{ background: 'var(--accent)', borderColor: 'var(--line)', color: 'var(--accent-ink)' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M4 12.5l5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.15 }} /></svg>
                </span>
                <p className="text-lg font-bold">{t('hero.mock.active')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

function Hero() {
  const { t } = usePrefs()
  const [name, setName] = useState('')
  return (
    <section id="hero" className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:pb-28 lg:pt-20">
      <div className="min-w-0">
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          {t('hero.h1a')} <span className="mark">{t('hero.h1b')}</span><br />{t('hero.h1c')}
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="mt-6 max-w-xl text-lg" style={{ color: 'var(--muted)' }}>{t('hero.sub')}</motion.p>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="mt-9 max-w-2xl">
          <NameChecker value={name} onChange={setName} />
        </motion.div>
      </div>
      <HeroBrowser />
    </section>
  )
}

/* ---------- Demo 3 langkah: berputar otomatis, bisa diklik ---------- */
const STEP_MS = 4500
function Demo() {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduce || paused) return
    const id = setTimeout(() => { setStep((s) => (s + 1) % 3); setTick((k) => k + 1) }, STEP_MS)
    return () => clearTimeout(id)
  }, [step, tick, paused, reduce])

  const pick = (n: number) => { setStep(n); setTick((k) => k + 1) }
  return (
    <section id="demo" className="border-y-2 py-20" style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
        <div>
          <Reveal><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('demo.h2')}</h2><p className="mt-3" style={{ color: 'var(--muted)' }}>{t('demo.sub')}</p></Reveal>
          <div role="tablist" aria-label={t('demo.h2')} className="mt-8 grid gap-3">
            {[0, 1, 2].map((n) => (
              <button key={n} role="tab" id={`demo-tab-${n}`} aria-selected={step === n} aria-controls="demo-panel" tabIndex={step === n ? 0 : -1} type="button" onClick={() => pick(n)}
                onKeyDown={(e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); pick((n + 1) % 3); document.getElementById(`demo-tab-${(n + 1) % 3}`)?.focus() } if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); pick((n + 2) % 3); document.getElementById(`demo-tab-${(n + 2) % 3}`)?.focus() } }}
                className="relative cursor-pointer overflow-hidden rounded-2xl border-2 p-4 text-left transition-all" style={{ borderColor: 'var(--line)', background: step === n ? 'var(--surface)' : 'transparent', color: 'var(--ink)', boxShadow: step === n ? 'var(--shadow)' : 'none', transform: step === n ? 'translateX(8px)' : 'none' }}>
                <span className="block text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{t('demo.step', { n: n + 1 })}</span>
                <span className="block text-lg font-bold">{t(`demo.s${n + 1}.t`)}</span>
                <span className="block text-sm" style={{ color: 'var(--muted)' }}>{t(`demo.s${n + 1}.d`)}</span>
                {step === n && !reduce && !paused && <motion.span key={tick} className="absolute bottom-0 left-0 h-1.5" style={{ background: 'var(--accent)' }} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: STEP_MS / 1000, ease: 'linear' }} />}
              </button>
            ))}
          </div>
        </div>
        <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${step}`} className="card grid min-h-[340px] place-items-center p-6" style={{ boxShadow: 'var(--shadow)' }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.3 }} className="w-full">
              {step === 0 && <DemoName />}
              {step === 1 && <DemoPlatform />}
              {step === 2 && <DemoActive />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
function DemoName() {
  const { t, domain } = usePrefs()
  return (
    <div className="text-center">
      <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('demo.v1')}</p>
      <p className="mt-3 break-all text-2xl font-extrabold sm:text-4xl"><span className="mark">kamu</span><span style={{ color: 'var(--muted)' }}>.{domain}</span></p>
      <motion.p initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="badge mt-6" style={{ color: 'var(--ok)' }}><Icon.check size={14} /> {t('name.okShort')}</motion.p>
    </div>
  )
}
function DemoPlatform() {
  const { t } = usePrefs()
  const [on, setOn] = useState(2)
  return (
    <div>
      <p className="mb-4 text-center text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('demo.v2')}</p>
      <div className="flex flex-wrap justify-center gap-3">
        {PLATFORMS.map((p, k) => (
          <motion.button key={p.id} type="button" onClick={() => setOn(k)} whileHover={{ y: -3 }} whileTap={{ scale: 0.95 }} className="cursor-pointer rounded-xl border-2 px-4 py-3 font-bold" style={{ borderColor: 'var(--line)', background: on === k ? p.color : 'var(--surface)', color: on === k ? '#1b1612' : 'var(--ink)' }} aria-pressed={on === k}>{p.name}</motion.button>
        ))}
      </div>
      <p className="mt-6 text-center text-sm" style={{ color: 'var(--muted)' }}>{t('demo.v2b', { p: PLATFORMS[on].name, type: PLATFORMS[on].defaultType })}</p>
    </div>
  )
}
function DemoActive() {
  const { t } = usePrefs()
  const [done, setDone] = useState(false)
  useEffect(() => { const id = setTimeout(() => setDone(true), 1300); return () => clearTimeout(id) }, [])
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="grid h-24 w-24 place-items-center rounded-full border-2" style={{ borderColor: 'var(--line)', background: done ? 'var(--accent)' : 'var(--surface-2)', color: done ? 'var(--accent-ink)' : 'var(--accent-text)', transition: 'background 0.3s' }}>
        {done ? <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><motion.path d="M4 12.5l5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45 }} /></svg> : <Spinner size={44} />}
      </div>
      <p className="text-xl font-bold">{done ? t('hero.mock.active') : t('hero.mock.verifying')}</p>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{t('demo.v3')}</p>
    </div>
  )
}

/* ---------- Platform: geser kartu, langkah dan diagram ikut berubah ---------- */
function PlatformSection() {
  const { t } = usePrefs()
  const [sel, setSel] = useState<Platform>(PLATFORMS[2])
  const rail = useRef<HTMLDivElement>(null)
  const drag = useRef({ down: false, x: 0, left: 0, moved: false })
  const val = sel.placeholder[sel.defaultType] ?? ''

  const scrollBy = (d: number) => rail.current?.scrollBy({ left: d, behavior: 'smooth' })
  return (
    <section id="platform" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl"><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('plat.h2')}</h2><p className="mt-3" style={{ color: 'var(--muted)' }}>{t('plat.sub')}</p></div>
          <div className="flex gap-2">
            <button type="button" className="btn !px-4" onClick={() => scrollBy(-300)} aria-label={t('plat.prev')}><Icon.back /></button>
            <button type="button" className="btn !px-4" onClick={() => scrollBy(300)} aria-label={t('plat.next')}><span style={{ display: 'inline-flex', transform: 'scaleX(-1)' }}><Icon.back /></span></button>
          </div>
        </div>
      </Reveal>

      <div ref={rail} className="-mx-4 mt-8 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 pt-2 active:cursor-grabbing sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') return; drag.current = { down: true, x: e.clientX, left: rail.current!.scrollLeft, moved: false } }}
        onPointerMove={(e) => { const d = drag.current; if (!d.down) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 5) d.moved = true; rail.current!.scrollLeft = d.left - dx }}
        onPointerUp={() => { drag.current.down = false }} onPointerLeave={() => { drag.current.down = false }}
        role="radiogroup" aria-label={t('plat.h2')}>
        {PLATFORMS.map((p, k) => {
          const active = sel.id === p.id
          return (
            <motion.button key={p.id} type="button" role="radio" aria-checked={active} onClick={() => { if (!drag.current.moved) setSel(p) }}
              whileHover={{ y: -6, rotate: k % 2 ? 1 : -1 }} whileTap={{ scale: 0.97 }}
              className="relative min-h-[200px] w-[240px] shrink-0 cursor-pointer snap-start overflow-hidden border-2 p-5 text-left"
              style={{ borderColor: 'var(--line)', background: p.color, color: '#1b1612', borderRadius: [28, 14, 28, 14, 28][k], boxShadow: active ? '6px 6px 0 var(--line)' : 'none', transform: active ? 'translateY(-4px)' : undefined, height: [230, 200, 260, 220, 240][k] }}>
              <span className="text-2xl font-extrabold">{p.name}</span>
              <span className="mt-2 block text-sm font-medium">{t(`plat.${p.id}.tag`)}</span>
              <span className="absolute bottom-4 left-5 flex gap-1.5">{p.types.map((ty) => <span key={ty} className="rounded-md border-2 px-2 py-0.5 text-xs font-bold" style={{ borderColor: '#1b1612' }}>{ty}</span>)}</span>
              {active && <span className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full" style={{ background: '#1b1612', color: '#fff' }}><Icon.check size={14} /></span>}
            </motion.button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={sel.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="mt-4 grid gap-6 lg:grid-cols-2" aria-live="polite">
          <div className="card p-6">
            <h3 className="text-xl font-bold">{t('plat.stepsFor', { p: sel.name })}</h3>
            <ol className="mt-4 grid gap-4">
              {[1, 2, 3].map((n) => (
                <li key={n} className="grid grid-cols-[2rem_1fr] items-start gap-3">
                  <span className="text-lg font-extrabold" style={{ color: 'var(--accent-text)' }}>{n}</span>
                  <span>{t(`plat.${sel.id}.s${n}`)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <code className="rounded-lg border-2 px-3 py-2 text-sm font-semibold" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>{sel.defaultType} {val}</code>
              <CopyButton text={val} />
            </div>
            <p className="hint mt-2">{t('plat.example')}</p>
            {sel.docs && <a href={sel.docs} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 py-2 text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: sel.name })} <Icon.ext /></a>}
          </div>
          <DnsDiagram name="kamu" type={sel.defaultType} value={val} platform={sel.name} focus="value" />
        </motion.div>
      </AnimatePresence>
    </section>
  )
}

/* ---------- Aturan main: tipografi besar, bukan kartu seragam ---------- */
function Rules() {
  const { t } = usePrefs()
  const rows = [
    { big: '3', k: 'quota' }, { big: t('rules.proof.big'), k: 'proof' }, { big: '24 ' + t('rules.hour'), k: 'abuse' }, { big: '0', k: 'ads' },
  ]
  return (
    <section id="rules" className="border-y-2 py-20" style={{ background: 'var(--inv-bg)', color: 'var(--inv-ink)', borderColor: 'var(--line)' }}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal><h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">{t('rules.h2')}</h2></Reveal>
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {rows.map((r, k) => (
            <Reveal key={r.k} delay={k * 0.08} className={k % 2 ? 'md:mt-12' : ''}>
              <div className="grid grid-cols-[auto_1fr] items-baseline gap-5 border-t-2 pt-5" style={{ borderColor: 'color-mix(in srgb, var(--inv-ink) 40%, transparent)' }}>
                <span className="text-5xl font-extrabold sm:text-6xl" style={{ color: 'var(--inv-accent)' }}>{r.big}</span>
                <div><p className="text-xl font-bold">{t(`rules.${r.k}.t`)}</p><p className="mt-1 text-sm opacity-85">{t(`rules.${r.k}.d`)}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- FAQ: pertanyaan nyata dari cakupan produk ---------- */
function Faq() {
  const { t } = usePrefs()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.7fr_1.3fr]">
      <Reveal><h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t('faq.h2')}</h2><p className="mt-3" style={{ color: 'var(--muted)' }}>{t('faq.sub')}</p></Reveal>
      <div className="grid gap-3">
        {[1, 2, 3, 4, 5, 6].map((n, k) => {
          const isOpen = open === k
          return (
            <Reveal key={n} delay={k * 0.04}>
              <div className="card overflow-hidden" style={{ background: isOpen ? 'var(--surface)' : 'var(--bg)' }}>
                <h3>
                  <button type="button" aria-expanded={isOpen} aria-controls={`faq-${n}`} id={`faq-b-${n}`} onClick={() => setOpen(isOpen ? null : k)} className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent px-5 py-3 text-left text-base font-bold" style={{ color: 'var(--ink)' }}>
                    {t(`faq.q${n}`)}
                    <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0"><Icon.plus /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${n}`} role="region" aria-labelledby={`faq-b-${n}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                      <p className="px-5 pb-5" style={{ color: 'var(--muted)' }}>{t(`faq.a${n}`)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

function Closing() {
  const { t } = usePrefs()
  return (
    <section className="px-4 pb-20 sm:px-6">
      <Reveal>
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] border-2 p-8 sm:p-14" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderColor: 'var(--line)', boxShadow: 'var(--shadow)' }}>
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-5xl">{t('close.h2')}</h2>
          <p className="mt-4 max-w-xl font-medium">{t('close.sub')}</p>
          <Link to="/claim" className="btn mt-8" style={{ background: 'var(--surface)', color: 'var(--ink)' }}>{t('close.cta')}</Link>
        </div>
      </Reveal>
    </section>
  )
}

export function Home() {
  return (<><Hero /><Demo /><PlatformSection /><Rules /><Faq /><Closing /></>)
}
