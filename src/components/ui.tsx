import { useEffect, useRef, useState, type ReactNode, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import type { Status } from '../lib/store'

/* Ikon digambar sendiri: garis tebal dengan sudut tegas, selaras sudut huruf T pada logo. Hanya yang dipakai fungsi, tanpa hiasan. */
type IP = { size?: number; strokeWidth?: number; style?: CSSProperties }
const mk = (d: ReactNode, def = 18) => (p: IP) => (
  <svg width={p.size ?? def} height={p.size ?? def} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={p.strokeWidth ?? 2.6} strokeLinecap="square" strokeLinejoin="miter" style={p.style}>{d}</svg>
)
export const Icon = {
  check: mk(<path d="M4 12.5l5 5L20 6.5" />),
  x: mk(<path d="M6 6l12 12M18 6L6 18" />),
  menu: mk(<path d="M4 7h16M4 12h10M4 17h16" />, 22),
  plus: mk(<path d="M12 5v14M5 12h14" />),
  down: mk(<path d="M6 9l6 6 6-6" />),
  back: mk(<path d="M19 12H5M11 6l-6 6 6 6" />),
  ext: mk(<path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />, 16),
  lock: mk(<><rect x="5" y="11" width="14" height="9" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>, 14),
  retry: mk(<path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" />),
  edit: mk(<path d="M4 20l1-4L16 5l3 3L8 19z" />),
  trash: mk(<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />),
  copy: mk(<><rect x="9" y="9" width="11" height="11" /><path d="M5 15V4h11" /></>),
  sun: mk(<><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>, 20),
  moon: mk(<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" />, 20),
} as const

export function Spinner({ size = 18 }: { size?: number }) {
  return (<svg className="spin" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="square"><path d="M12 3a9 9 0 1 0 9 9" /></svg>)
}

export function radioKeys(e: KeyboardEvent<HTMLElement>) {
  const options = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)'))
  const current = options.indexOf(e.target as HTMLButtonElement)
  if (current < 0) return
  const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
  if (!delta && e.key !== 'Home' && e.key !== 'End') return
  e.preventDefault()
  const next = options[e.key === 'Home' ? 0 : e.key === 'End' ? options.length - 1 : (current + delta! + options.length) % options.length]
  next.click()
  next.focus()
}

/* Muncul saat masuk layar: hanya bergeser dan memudar, tanpa blur. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  return (
    <motion.div ref={ref} className={className} initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.45, delay, ease: 'easeOut' }}>
      {children}
    </motion.div>
  )
}

/* Logo penyedia login: bentuk resmi milik penyedianya, dipakai hanya pada tombol masuk. */
export const Brand = {
  discord: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true" fill="#5865F2"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" /></svg>),
  github: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>),
  google: (p: { size?: number }) => (<svg width={p.size ?? 24} height={p.size ?? 24} viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>),
}

export function CopyButton({ text, label, className = '' }: { text: string; label?: string; className?: string }) {
  const { t } = usePrefs()
  const [done, setDone] = useState(false)
  const [failed, setFailed] = useState(false)
  async function copy() {
    try { await navigator.clipboard.writeText(text); setDone(true); setFailed(false) } catch { setFailed(true) }
    setTimeout(() => { setDone(false); setFailed(false) }, 1800)
  }
  return (
    <button type="button" onClick={copy} aria-label={label ?? t('ui.copy')} className={`btn btn-sm btn-outline ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={done ? 'd' : 'c'} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -6, opacity: 0 }} transition={{ duration: 0.12 }} className="inline-flex items-center gap-1.5" style={{ color: done ? 'var(--ok)' : undefined }}>
          {done ? <Icon.check size={15} /> : <Icon.copy size={15} />}
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
      {status === 'verifying' && <Spinner size={12} />}
      {status === 'active' && <span className="h-1.5 w-1.5 rounded-full bg-current pulse" />}
      {status === 'pending' && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {(status === 'failed' || status === 'suspended') && <Icon.x size={12} />}
      {t(`status.${status}`)}
    </span>
  )
}

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    if (!open) { dialog.close(); return }
    dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow }
  }, [open])
  return (
    <dialog ref={ref} aria-label={title} className="card fixed inset-0 m-auto max-h-[90svh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto p-6 backdrop:bg-[var(--ink)] backdrop:opacity-60" style={{ color: 'var(--ink)', borderColor: 'var(--ink)', borderWidth: 2, boxShadow: '6px 6px 0 var(--sh)' }}
      onCancel={(e) => { e.preventDefault(); onClose() }} onClick={(e) => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose() } }}>
      {children}
    </dialog>
  )
}

/* Riwayat pengecekan sebagai deretan batang: hijau lolos, merah gagal. */
export function Sparkline({ data, label }: { data: boolean[]; label: string }) {
  if (data.length < 2) return <p className="hint">{label}</p>
  return (
    <div role="img" aria-label={label} className="flex h-7 items-end gap-[3px]">
      {data.map((ok, i) => <span key={i} className="flex-1 rounded-[1px]" style={{ maxWidth: 8, height: ok ? '100%' : '45%', background: ok ? 'var(--ok)' : 'var(--bad)' }} />)}
    </div>
  )
}
