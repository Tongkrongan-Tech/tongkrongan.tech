import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../../lib/prefs'
import { Icon, Reveal } from '../../components/ui'
import { Count, Mark, Words } from '../../components/fx'
import { NameChecker } from '../../components/NameChecker'

/* ---------- Aturan main: pita gelap, nilai besar di kiri, penjelasan di kanan. Baris masuk bergantian dari dua sisi. ---------- */
export function Rules() {
  const { t, config } = usePrefs()
  const rows = [
    { k: 'free', big: <>{t('why.free.big')}</>, title: t('why.free.t'), d: t('why.free.d') },
    { k: 'quota', big: <Count to={config?.quota ?? 3} />, title: t('rules.quota.t'), d: t('rules.quota.d') },
    { k: 'auto', big: <>{t('status.active')}</>, title: t('why.auto.t'), d: t('why.auto.d') },
    { k: 'abuse', big: <><Count to={24} /> {t('rules.hour')}</>, title: t('rules.abuse.t'), d: t('rules.abuse.d') },
    { k: 'ads', big: <Count to={0} />, title: t('rules.ads.t'), d: t('rules.ads.d') },
  ]
  return (
    <section id="aturan" className="border-y-[1.5px]" style={{ background: 'var(--inv-bg)', color: 'var(--inv-ink)', borderColor: 'var(--ink)' }}>
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="max-w-3xl">
          <h2 className="h-section"><Words text={t('rules.h2')} /></h2>
          <Reveal><p className="mt-5 max-w-2xl text-lg leading-relaxed" style={{ opacity: 0.8 }}>{t('rules.who')}</p></Reveal>
        </div>
        <dl className="mt-14">
          {rows.map((r, i) => (
            <motion.div key={r.k} initial={{ opacity: 0, x: i % 2 ? 60 : -60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ x: 10 }} className="grid gap-2 border-t py-7 sm:grid-cols-[minmax(11rem,0.5fr)_1fr] sm:gap-10" style={{ borderColor: 'color-mix(in srgb, var(--inv-ink) 35%, transparent)' }}>
              <dt className="text-[clamp(2rem,5vw,3.4rem)] font-extrabold leading-none tracking-tight" style={{ color: 'var(--inv-accent)' }}>{r.big}</dt>
              <dd className="m-0">
                <p className="text-xl font-extrabold tracking-tight">{r.title}</p>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed" style={{ opacity: 0.8 }}>{r.d}</p>
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ---------- Istilah teknis dalam bahasa manusia: daftar definisi. Stabilo menyapu baris yang disorot. ---------- */
export function Glossary() {
  const { t } = usePrefs()
  return (
    <section id="istilah" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <div className="max-w-2xl"><h2 className="h-section"><Words text={t('gl.h2a')} /> <Mark>{t('gl.h2b')}</Mark></h2><Reveal><p className="lead mt-4">{t('gl.sub')}</p></Reveal></div>
      <dl className="mt-12" style={{ borderTop: '1.5px solid var(--ink)' }}>
        {(['domain', 'dns', 'record', 'https'] as const).map((k) => (
          <motion.div key={k} initial="rest" whileHover="hover" whileFocus="hover" tabIndex={0} className="relative isolate grid gap-2 py-6 sm:grid-cols-[14rem_1fr_16rem] sm:items-baseline sm:gap-8" style={{ borderBottom: '1px solid var(--line-2)' }}>
            <motion.span aria-hidden variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-x-0 inset-y-0 -z-10 origin-left" style={{ background: 'var(--hl)', opacity: 0.55 }} />
            <motion.dt variants={{ rest: { x: 0 }, hover: { x: 10 } }} className="px-2 text-2xl font-extrabold tracking-tight">{t(`gl.${k}.t`)}</motion.dt>
            <dd className="m-0 px-2 leading-relaxed sm:px-0">{t(`gl.${k}.d`)}</dd>
            <dd className="m-0 px-2 text-sm font-bold sm:px-0" style={{ color: 'var(--accent-text)' }}>{t(`gl.${k}.a`)}</dd>
          </motion.div>
        ))}
      </dl>
    </section>
  )
}

/* ---------- Tanya jawab: pertanyaan nyata dari cakupan produk ---------- */
export function Faq() {
  const { t } = usePrefs()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="border-t-[1.5px]" style={{ borderColor: 'var(--ink)', background: 'var(--surface-2)' }}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="lg:sticky lg:top-28 lg:self-start"><h2 className="h-section"><Words text={t('faq.h2')} /></h2><Reveal><p className="lead mt-4">{t('faq.sub')}</p></Reveal></div>
        <div style={{ borderTop: '1.5px solid var(--ink)' }}>
          {[1, 2, 3, 4, 5, 6].map((n, k) => {
            const isOpen = open === k
            return (
              <motion.div key={n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: k * 0.05, duration: 0.4 }} style={{ borderBottom: '1px solid var(--line-2)' }}>
                <h3 className="text-base">
                  <button type="button" aria-expanded={isOpen} aria-controls={`faq-${n}`} id={`faq-b-${n}`} onClick={() => setOpen(isOpen ? null : k)} className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-4 border-0 bg-transparent py-4 text-left text-lg font-extrabold tracking-tight" style={{ color: 'var(--ink)' }}>
                    {t(`faq.q${n}`)}
                    <motion.span animate={{ rotate: isOpen ? 135 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="shrink-0"><Icon.plus size={22} /></motion.span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`faq-${n}`} role="region" aria-labelledby={`faq-b-${n}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                      <p className="max-w-2xl pb-6 leading-relaxed" style={{ color: 'var(--muted)' }}>{t(`faq.a${n}`)}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Penutup ---------- */
export function Closing() {
  const { t } = usePrefs()
  const [name, setName] = useState('')
  return (
    <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <h2 className="h-section max-w-3xl"><Words text={t('close.h2')} /></h2>
      <Reveal><p className="lead mt-4 max-w-xl">{t('close.sub')}</p></Reveal>
      <Reveal delay={0.1}><div className="mt-10 max-w-2xl"><NameChecker value={name} onChange={setName} /></div></Reveal>
    </section>
  )
}
