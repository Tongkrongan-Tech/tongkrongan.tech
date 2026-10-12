import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { usePrefs } from '../../lib/prefs'
import { PLATFORMS } from '../../lib/dns'
import { DnsDiagram } from '../../components/DnsDiagram'
import { Reveal } from '../../components/ui'
import { Mark, Words } from '../../components/fx'
import { Icon } from '../../components/ui'

/* Penjelasan untuk orang awam: alamat, papan petunjuk, rumah. Tiga keterangan di bawah diagram menyorot bagian yang sama.
   Tombol "pindahkan rumah" memperlihatkan nilai jual utama: alamat tidak berubah, hanya tujuannya. */
const ROWS = [
  { focus: 'visitor', a: 'how.a1', d: 'how.n1.d' },
  { focus: 'name', a: 'how.a2', d: 'how.n2.d' },
  { focus: 'value', a: 'how.a3', d: 'how.n3.d' },
] as const

export function Journey() {
  const { t } = usePrefs()
  const reduce = useReducedMotion()
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  const [pi, setPi] = useState(2)
  const [moved, setMoved] = useState(0)
  const p = PLATFORMS[pi]

  useEffect(() => {
    if (reduce || hold) return
    const id = setTimeout(() => setActive((a) => (a + 1) % ROWS.length), 3600)
    return () => clearTimeout(id)
  }, [active, hold, reduce])

  const go = (i: number) => { setPi(i); setActive(2); setMoved((m) => m + 1) }

  return (
    <section id="cara" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="max-w-3xl">
        <h2 className="h-section"><Words text={t('how.h2a')} /> <Mark>{t('how.h2b')}</Mark></h2>
        <p className="lead mt-5 max-w-2xl">{t('how.sub')}</p>
      </Reveal>

      <div className="mt-12" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)} onFocusCapture={() => setHold(true)} onBlurCapture={() => setHold(false)}>
        <DnsDiagram row name="kamu" type={p.defaultType} value={p.placeholder[p.defaultType] ?? ''} platform={p.name} focus={ROWS[active].focus} />

        <ul className="mt-6 grid gap-x-8 gap-y-5 md:grid-cols-3" aria-label={t('how.h2a')}>
          {ROWS.map((r, k) => (
            <li key={r.a}>
              <button type="button" aria-pressed={active === k} onClick={() => setActive(k)} onMouseEnter={() => setActive(k)} className="relative block w-full cursor-pointer border-0 border-t-[3px] bg-transparent pt-3 text-left" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>
                {active === k && <motion.span layoutId="jr-line" aria-hidden className="absolute -top-[3px] left-0 right-0 h-[3px]" style={{ background: 'var(--accent-text)' }} transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className="block text-lg font-extrabold tracking-tight">{t(r.a)}</span>
                <span className="mt-1 block text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{t(r.d)}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t pt-8" style={{ borderColor: 'var(--line-2)' }}>
          <button type="button" onClick={() => go((pi + 1) % PLATFORMS.length)} className="btn btn-primary"><Icon.retry size={16} /> {t('how.move')}</button>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('how.pick')}>
            {PLATFORMS.map((x, i) => (
              <button key={x.id} type="button" aria-pressed={pi === i} onClick={() => go(i)} className="chip" style={{ borderColor: pi === i ? 'var(--ink)' : undefined, background: pi === i ? 'var(--hl)' : undefined, color: pi === i ? 'var(--hl-ink)' : undefined }}>{x.name}</button>
            ))}
          </div>
        </div>
        <motion.p key={moved} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-sm font-semibold" aria-live="polite">{moved ? t('how.moveD') : t('how.pick')}</motion.p>
      </div>
    </section>
  )
}
