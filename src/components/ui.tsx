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

/* Logo penyedia login: bentuk resmi (isi penuh), bukan ikon stroke. Warna merek hanya dipakai di Discord dan Google. */
export const Brand = {
  discord: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true" fill="#5865F2"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" /></svg>),
  github: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>),
  google: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>),
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
