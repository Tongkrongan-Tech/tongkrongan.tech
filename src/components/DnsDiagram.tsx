import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import type { RecordType } from '../lib/dns'

/* Perjalanan sebuah alamat: pengunjung, papan petunjuk (DNS), lalu tempat websitemu.
   Sinar bergerak di jalur supaya arah permintaan terlihat. Bagian yang sedang diisi pengguna diberi garis tebal.
   `row` menyusun mendatar di layar lebar; tanpa itu selalu menurun, cocok untuk kolom sempit. */
type Focus = 'visitor' | 'name' | 'type' | 'value' | null

export function DnsDiagram({ name, type, value, platform, focus, row = false, className = '' }: { name: string; type: RecordType; value: string; platform: string; focus: Focus; row?: boolean; className?: string }) {
  const { t, domain } = usePrefs()
  const host = `${name || t('diagram.yourName')}.${domain}`
  const target = value.trim() || t('diagram.yourTarget')

  const beam = (n: number) => (
    <div className={`flex items-center justify-center ${row ? 'h-10 lg:h-auto lg:w-16 lg:shrink-0' : 'h-10'}`} aria-hidden="true">
      <div className={`relative flex items-center justify-center ${row ? 'h-full lg:h-auto lg:w-full' : 'h-full'}`}>
        <span className={`beam beam-v ${row ? 'lg:hidden' : ''}`} />
        {row && <span className="beam beam-h hidden lg:block" />}
        <span className="absolute grid h-5 w-5 place-items-center rounded-[3px] border text-[0.65rem] font-extrabold" style={{ background: 'var(--surface)', borderColor: 'var(--line-2)', color: 'var(--muted)' }}>{n}</span>
      </div>
    </div>
  )
  const node = (on: boolean, grow: string, label: string, children: ReactNode) => (
    <div className={`rounded-[10px] border p-4 transition-colors ${grow}`} style={{ background: 'var(--surface)', borderColor: on ? 'var(--accent-text)' : 'var(--line-2)', borderWidth: on ? 2.5 : 1 }}>
      <p className="text-xs font-bold" style={{ color: on ? 'var(--accent-text)' : 'var(--muted)' }}>{label}</p>
      {children}
    </div>
  )

  return (
    <figure className={`card p-4 sm:p-6 ${className}`}>
      <div className={row ? 'flex flex-col items-stretch lg:flex-row lg:items-center' : 'flex flex-col items-stretch'}>
        {node(focus === 'visitor', row ? 'lg:flex-1' : '', t('diagram.visitor'), <p className="mt-1 break-all text-base font-extrabold tracking-tight">{host}</p>)}
        {beam(1)}
        {node(focus === 'name' || focus === 'type', row ? 'lg:flex-[1.3]' : '', `DNS ${domain}`, (
          <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-x-3 rounded-md px-3 py-2.5" style={{ background: 'var(--surface-2)', outline: focus === 'type' || focus === 'value' ? '2px solid var(--accent-text)' : 'none' }}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={type} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="mono rounded-[3px] px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--hl)', color: 'var(--hl-ink)' }}>{type}</motion.span>
            </AnimatePresence>
            <span className="mono min-w-0 truncate text-sm font-medium" title={target}>{target}</span>
          </div>
        ))}
        {beam(2)}
        {node(focus === 'value', row ? 'lg:flex-1' : '', t('diagram.platform'), (
          <AnimatePresence mode="wait" initial={false}>
            <motion.p key={platform} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="mt-1 truncate text-base font-extrabold tracking-tight">{platform}</motion.p>
          </AnimatePresence>
        ))}
      </div>
      <p className="sr-only">{t('diagram.alt', { host, type, target })}</p>
      <figcaption className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>{t('diagram.caption')}</figcaption>
    </figure>
  )
}
