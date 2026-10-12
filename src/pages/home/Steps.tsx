import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring } from 'framer-motion'
import { usePrefs } from '../../lib/prefs'
import { PLATFORMS } from '../../lib/dns'
import { Icon, Spinner } from '../../components/ui'
import { useMedia, Words, Burst } from '../../components/fx'
import { Plate } from '../../components/Plate'

/* Satu papan nama berubah dari ketikan sampai aktif. Di layar lebar, bagian ini menempel dan adegannya maju mengikuti scroll.
   Di layar kecil atau saat gerak dikurangi, adegannya berganti sendiri dan bisa diklik. Tujuan gerak: menunjukkan urutan nyata klaim. */
const STEP_MS = 4800
const DEMO_NAME = 'kamu'

export function Steps() {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const wide = useMedia('(min-width: 1024px)')
  const scrub = wide && !reduce
  const ref = useRef<HTMLElement>(null)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [tick, setTick] = useState(0)
  const [pi, setPi] = useState(2)
  const [typed, setTyped] = useState(reduce ? DEMO_NAME : '')
  const [checks, setChecks] = useState(reduce ? 3 : 0)
  const p = PLATFORMS[pi]

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 26 })
  useMotionValueEvent(scrollYProgress, 'change', (v) => { if (scrub) setStep(Math.max(0, Math.min(2, Math.floor(v * 3)))) })

  useEffect(() => {
    if (scrub || reduce || paused) return
    const id = setTimeout(() => { setStep((s) => (s + 1) % 3); setTick((k) => k + 1) }, STEP_MS)
    return () => clearTimeout(id)
  }, [step, tick, paused, reduce, scrub])

  // Adegan 1: nama diketik. Adegan 3: dua pengecekan berurutan. Selain itu keadaan akhir langsung tampil.
  useEffect(() => {
    if (reduce || step !== 0) { setTyped(DEMO_NAME); return }
    setTyped('')
    let i = 0
    const id = setInterval(() => { i += 1; setTyped(DEMO_NAME.slice(0, i)); if (i >= DEMO_NAME.length) clearInterval(id) }, 170)
    return () => clearInterval(id)
  }, [step, reduce])
  useEffect(() => {
    if (reduce) { setChecks(3); return }
    if (step !== 2) { setChecks(0); return }
    const ids = [setTimeout(() => setChecks(1), 600), setTimeout(() => setChecks(2), 1400), setTimeout(() => setChecks(3), 2100)]
    return () => ids.forEach(clearTimeout)
  }, [step, reduce])

  function pick(n: number) {
    if (scrub && ref.current) {
      const span = ref.current.offsetHeight - window.innerHeight
      window.scrollTo({ top: ref.current.offsetTop + span * ((n + 0.5) / 3), behavior: 'smooth' })
    }
    setStep(n); setTick((k) => k + 1)
  }

  const list = (
    <div role="tablist" aria-label={t('demo.h2')} aria-orientation="vertical" className="relative mt-8 grid gap-1 pl-5">
      <div aria-hidden className="absolute bottom-2 left-0 top-2 w-[3px]" style={{ background: 'var(--line-2)' }}>
        {scrub ? <motion.div className="h-full origin-top" style={{ scaleY: line, background: 'var(--accent-text)' }} /> : <div className="w-full transition-all duration-300" style={{ height: `${((step + 1) / 3) * 100}%`, background: 'var(--accent-text)' }} />}
      </div>
      {[0, 1, 2].map((n) => {
        const on = step === n
        return (
          <button key={n} role="tab" id={`demo-tab-${n}`} aria-selected={on} aria-controls="demo-panel" tabIndex={on ? 0 : -1} type="button" onClick={() => pick(n)}
            onKeyDown={(e) => { const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? 2 : 0; if (d) { e.preventDefault(); pick((n + d) % 3); document.getElementById(`demo-tab-${(n + d) % 3}`)?.focus() } }}
            className="cursor-pointer border-0 bg-transparent py-3 text-left" style={{ color: 'var(--ink)', opacity: on ? 1 : 0.55, transition: 'opacity .25s' }}>
            <span className="sr-only">{t('demo.step', { n: n + 1 })}: </span>
            <span className="block text-xl font-extrabold tracking-tight">{t(`demo.s${n + 1}.t`)}</span>
            <span className="mt-0.5 block text-sm" style={{ color: 'var(--muted)' }}>{t(`demo.s${n + 1}.d`)}</span>
          </button>
        )
      })}
    </div>
  )

  const stage = (
    <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${step}`} className="relative">
      {step === 2 && checks >= 3 && <Burst />}
      <Plate name={typed} stamp={step === 2 && checks >= 3 ? t('status.active') : null}>
        <AnimatePresence mode="wait" initial={false}>
          {step === 0 && <motion.p key="a" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm" style={{ color: 'var(--board-dim)' }}>{t('demo.v1')}</motion.p>}
          {step >= 1 && (
            <motion.div key="b" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-3 text-sm">
                <span className="mono rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{p.defaultType}</span>
                <span className="mono min-w-0 truncate" style={{ color: 'var(--board-dim)' }}>{p.placeholder[p.defaultType]}</span>
              </div>
              {step === 2 && (
                <ul className="mt-4 grid gap-2 text-sm font-semibold">
                  {[t('demo.c1'), t('demo.c2')].map((label, i) => (
                    <li key={label} className="flex items-center gap-2.5">
                      <span className="grid h-5 w-5 place-items-center rounded-[3px]" style={{ background: checks > i ? 'var(--ok)' : 'transparent', border: checks > i ? 'none' : '1.5px solid var(--board-dim)', color: 'var(--board)' }}>
                        {checks > i ? <Icon.check size={12} strokeWidth={3.4} /> : checks === i ? <Spinner size={11} /> : null}
                      </span>
                      <span style={{ color: checks > i ? 'var(--board-ink)' : 'var(--board-dim)' }}>{label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Plate>

      <div className="mt-8 min-h-[5.5rem]">
        {step === 1 ? (
          <div>
            <p className="mb-2 text-sm font-bold">{t('demo.v2')}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('demo.v2')}>
              {PLATFORMS.map((x, k) => <button key={x.id} type="button" aria-pressed={pi === k} onClick={() => setPi(k)} className="chip" style={{ borderColor: pi === k ? 'var(--ink)' : undefined, background: pi === k ? 'var(--hl)' : undefined, color: pi === k ? 'var(--hl-ink)' : undefined }}>{x.name}</button>)}
            </div>
            <p className="hint mt-2">{t('demo.example')} {t('demo.v2b', { p: p.name, type: p.defaultType })}</p>
          </div>
        ) : step === 2 ? <p className="hint">{t('demo.v3')}</p> : null}
      </div>
    </div>
  )

  const body = (
    <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
      <div>
        <h2 className="h-section"><Words text={t('demo.h2')} /></h2>
        <p className="lead mt-4">{t('demo.sub')}</p>
        {list}
      </div>
      {stage}
    </div>
  )

  return scrub ? (
    <section id="langkah" ref={ref} style={{ height: '300vh', borderColor: 'var(--ink)', background: 'var(--surface-2)' }} className="relative border-y-[1.5px]">
      <div className="sticky top-0 flex h-screen items-center pt-16">{body}</div>
    </section>
  ) : (
    <section id="langkah" ref={ref} className="border-y-[1.5px] py-24" style={{ borderColor: 'var(--ink)', background: 'var(--surface-2)' }}>{body}</section>
  )
}
