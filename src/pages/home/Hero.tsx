import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePrefs } from '../../lib/prefs'
import { PLATFORMS } from '../../lib/dns'
import { NameChecker } from '../../components/NameChecker'
import { Plate } from '../../components/Plate'
import { Hang, Mark, Words } from '../../components/fx'

/* Papan nama di hero bereaksi pada nama yang diketik. Saat kolom kosong, ia mengetikkan contoh sendiri
   agar pengunjung baru langsung melihat apa yang terjadi pada alamat mereka. */
const SAMPLE = ['tokoku', 'portofolio', 'botku', 'tugas-akhir']

function HeroPlate({ name }: { name: string }) {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const byUser = name.trim().length > 0
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState(reduce ? SAMPLE[0] : '')
  const [done, setDone] = useState(!!reduce)

  useEffect(() => {
    if (reduce || byUser) return
    const word = SAMPLE[i % SAMPLE.length]
    let timer: ReturnType<typeof setTimeout>
    if (typed.length < word.length) timer = setTimeout(() => setTyped(word.slice(0, typed.length + 1)), 120)
    else if (!done) timer = setTimeout(() => setDone(true), 500)
    else timer = setTimeout(() => { setI((n) => n + 1); setTyped(''); setDone(false) }, 3000)
    return () => clearTimeout(timer)
  }, [typed, done, i, reduce, byUser])

  const rec = PLATFORMS[2]
  const shown = byUser ? name.trim() : typed
  return (
    <div className="mx-auto w-full max-w-[34rem] lg:mx-0">
      <Hang>
      <motion.div initial={{ opacity: 0, y: -60, rotate: -6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: 'spring', stiffness: 90, damping: 10, delay: 0.5 }}>
        <Plate name={shown} stamp={byUser || done ? t('status.active') : null}>
          <div className="flex items-center gap-3 text-sm">
            <span className="mono rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{rec.defaultType}</span>
            <span className="mono min-w-0 truncate" style={{ color: 'var(--board-dim)' }}>{rec.placeholder[rec.defaultType]}</span>
          </div>
        </Plate>
      </motion.div>
      </Hang>
      <p className="hint mt-5 text-center lg:text-left">{t('hero.example', { p: rec.name })}</p>
    </div>
  )
}

export function Hero() {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const [name, setName] = useState('')
  const timer = useRef<ReturnType<typeof setInterval>>(undefined)
  useEffect(() => () => clearInterval(timer.current), [])

  // Contoh nama diketik huruf demi huruf, supaya terlihat bahwa bilahnya hidup.
  function tryName(word: string) {
    clearInterval(timer.current)
    if (reduce) { setName(word); return }
    let n = 0
    setName('')
    timer.current = setInterval(() => { n += 1; setName(word.slice(0, n)); if (n >= word.length) clearInterval(timer.current) }, 60)
  }

  return (
    <section id="hero" className="border-b-[1.5px]" style={{ borderColor: 'var(--ink)' }}>
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12 lg:pb-28 lg:pt-24">
        <div className="min-w-0">
          <h1 className="text-[clamp(2.4rem,5.2vw,4.1rem)]">
            <Words text={t('hero.h1a')} /> <Mark delay={0.7}>{t('hero.h1b')}</Mark>
          </h1>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="lead mt-6 max-w-xl">{t('hero.sub')}</motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mt-9 max-w-2xl">
            <NameChecker value={name} onChange={(v) => { clearInterval(timer.current); setName(v) }} hotkey />
            <div className="mt-1 flex flex-wrap items-center gap-2 px-1">
              <span className="hint">{t('hero.try')}</span>
              {['tokoku', 'portofolio', 'botku'].map((w) => <button key={w} type="button" className="chip" onClick={() => tryName(w)}>{w}</button>)}
              <span className="hint ml-auto hidden items-center gap-2 lg:inline-flex"><span className="kbd">/</span>{t('hero.hotkey')}</span>
            </div>
          </motion.div>
        </div>
        <HeroPlate name={name} />
      </div>
    </section>
  )
}
