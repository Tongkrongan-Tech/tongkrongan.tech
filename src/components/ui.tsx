import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import type { Status } from '../lib/store'

/* Ikon digambar sendiri, stroke tebal, supaya tidak terlihat seperti pustaka ikon bawaan. */
const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
export const Icon = {
  copy: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><rect x="9" y="9" width="11" height="11" rx="3" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>),
  check: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 12.5l5 5L20 6.5" /></svg>),
  x: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M6 6l12 12M18 6L6 18" /></svg>),
  menu: (p: { size?: number }) => (<svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 7h16M4 12h10M4 17h16" /></svg>),
  edit: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 20l1-4L16 5l3 3L8 19z" /></svg>),
  trash: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" /></svg>),
  flag: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M6 21V4M6 5h11l-2 4 2 4H6" /></svg>),
  back: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>),
  ext: (p: { size?: number }) => (<svg width={p.size ?? 16} height={p.size ?? 16} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" /></svg>),
  plus: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M12 5v14M5 12h14" /></svg>),
  retry: (p: { size?: number }) => (<svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></svg>),
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (<svg className="spin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}><path d="M12 3a9 9 0 1 0 9 9" /></svg>)
}

/* Muncul bertahap saat scroll. Hanya dipakai di titik yang butuh perhatian, bukan di semua elemen. */
export function Reveal({ children, delay = 0, y = 24, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  )
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const { t } = usePrefs()
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setDone(true); setFailed(false)
    } catch { setFailed(true) }
    setTimeout(() => { setDone(false); setFailed(false) }, 1800)
  }
  return (
    <button type="button" onClick={copy} aria-label={label ?? t('ui.copy')} className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? 'd' : 'c'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.15 }} className="inline-flex items-center gap-2" style={{ color: done ? 'var(--ok)' : undefined }}>
          {done ? <Icon.check /> : <Icon.copy />}
          {done ? t('ui.copied') : failed ? t('ui.copyFail') : t('ui.copy')}
        </motion.span>
      </AnimatePresence>
      <span className="sr-only" role="status">{done ? t('ui.copied') : ''}</span>
    </button>
  )
}

const STATUS_STYLE: Record<Status, string> = { pending: 'var(--warn)', verifying: 'var(--accent-text)', active: 'var(--ok)', failed: 'var(--bad)', suspended: 'var(--bad)' }

export function StatusBadge({ status }: { status: Status }) {
  const { t } = usePrefs()
  return (
    <span className="badge" style={{ color: STATUS_STYLE[status] }}>
      {status === 'verifying' && <Spinner size={14} />}
      {status === 'active' && (
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" {...P}>
          <motion.path d="M4 12.5l5 5L20 6.5" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
        </svg>
      )}
      {status === 'pending' && <span className="inline-block h-2 w-2 rounded-full bg-current pulse" />}
      {(status === 'failed' || status === 'suspended') && <Icon.x size={14} />}
      {t(`status.${status}`)}
    </span>
  )
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0" style={{ background: 'color-mix(in srgb, var(--ink) 55%, transparent)' }} onClick={onClose} />
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="card relative w-full max-w-md p-6" style={{ boxShadow: 'var(--shadow)' }} initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: 0.97 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Sparkline({ data, label }: { data: boolean[]; label: string }) {
  const w = 120, h = 32
  if (data.length < 2) return <p className="hint">{label}</p>
  const step = w / (data.length - 1)
  const pts = data.map((ok, i) => `${i * step},${ok ? 6 : h - 6}`).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke="var(--accent-text)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((ok, i) => <circle key={i} cx={i * step} cy={ok ? 6 : h - 6} r="3" fill={ok ? 'var(--ok)' : 'var(--bad)'} />)}
    </svg>
  )
}
