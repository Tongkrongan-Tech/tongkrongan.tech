import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../../lib/prefs'
import { PLATFORMS, type Platform } from '../../lib/dns'
import { DnsDiagram } from '../../components/DnsDiagram'
import { CopyButton, Icon, Reveal } from '../../components/ui'
import { Words } from '../../components/fx'

/* Daftar di kiri, rincian di kanan: pilih platform, lalu langkah, record, dan diagram ikut berubah.
   Platform ditulis sebagai teks; logo mereka milik mereka dan tidak ditiru. */
export function Platforms() {
  const { t } = usePrefs()
  const [sel, setSel] = useState<Platform>(PLATFORMS[2])
  const val = sel.placeholder[sel.defaultType] ?? ''

  return (
    <section id="platform" className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="max-w-2xl"><h2 className="h-section"><Words text={t('plat.h2')} /></h2><p className="lead mt-4">{t('plat.sub')}</p></Reveal>

      <div className="mt-12 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <div role="radiogroup" aria-label={t('plat.h2')} className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-0 lg:border-t-[1.5px]" style={{ borderColor: 'var(--ink)' }}>
          {PLATFORMS.map((p) => {
            const on = sel.id === p.id
            return (
              <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setSel(p)} className="relative isolate flex cursor-pointer items-center justify-between gap-3 rounded-lg border-[1.5px] p-3.5 text-left lg:rounded-none lg:border-0 lg:border-b-[1.5px] lg:px-1 lg:py-4"
                style={{ borderColor: on ? 'var(--ink)' : 'var(--line-2)', color: on ? 'var(--hl-ink)' : 'var(--ink)' }}>
                {on && <motion.span layoutId="plat-hl" aria-hidden className="absolute inset-0 -z-10 rounded-[inherit]" style={{ background: 'var(--hl)' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                <span>
                  <span className="block text-base font-extrabold tracking-tight">{p.name}</span>
                  <span className="mt-0.5 hidden text-xs leading-snug sm:block" style={{ color: on ? 'var(--hl-ink)' : 'var(--muted)' }}>{t(`plat.${p.id}.tag`)}</span>
                </span>
                <span className="mono shrink-0 text-[0.7rem] font-semibold" style={{ opacity: 0.75 }}>{p.types.join(' ')}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={sel.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]" aria-live="polite">
            <div className="card flex flex-col p-6 sm:p-8">
              <h3 className="text-2xl">{t('plat.stepsFor', { p: sel.name })}</h3>
              <ol className="mt-6 grid gap-5">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="grid grid-cols-[1.75rem_1fr] gap-3">
                    <span aria-hidden className="text-2xl font-extrabold leading-none" style={{ color: 'var(--accent-text)' }}>{n}</span>
                    <span className="leading-relaxed">{t(`plat.${sel.id}.s${n}`)}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-8">
                <p className="mb-2 text-sm font-bold">{t('plat.record')}</p>
                <div className="flex items-center gap-2 rounded-lg border p-2 pl-3" style={{ borderColor: 'var(--line-2)', background: 'var(--surface-2)' }}>
                  <span className="mono shrink-0 rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{sel.defaultType}</span>
                  <code className="min-w-0 flex-1 break-all text-sm font-medium">{val}</code>
                  <CopyButton text={val} />
                </div>
                <p className="hint mt-2">{t('plat.example')}</p>
              </div>
              {sel.docs && <a href={sel.docs} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 self-start py-1 text-sm font-bold underline underline-offset-4" style={{ color: 'var(--accent-text)' }}>{t('plat.docs', { p: sel.name })} <Icon.ext /></a>}
            </div>
            <DnsDiagram name="kamu" type={sel.defaultType} value={val} platform={sel.name} focus="value" className="self-start" />
          </motion.div>
        </AnimatePresence>
      </div>

      <Reveal>
        <div className="mt-10 border-l-[3px] pl-5" style={{ borderColor: 'var(--hl)' }}>
          <p className="font-extrabold">{t('plat.unsure')}</p>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{t('plat.unsure.d')}</p>
        </div>
      </Reveal>
    </section>
  )
}
