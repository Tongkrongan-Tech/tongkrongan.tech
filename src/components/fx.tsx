import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, useVelocity } from 'framer-motion'

/* Gerak situs ini sengaja banyak (arah dari pemilik: interaktif dan penuh animasi), tetapi tiap gerak punya tugas:
   menunjukkan sesuatu terjadi pada alamatmu, memberi umpan balik, atau menegaskan motif identitas (papan nama, stabilo).
   Semuanya mati saat pengguna meminta gerak dikurangi. */

/* Ledakan potongan kertas kecil, dipakai sekali saat alamat berhasil aktif. */
const COLORS = ['#ffe066', '#1553e0', '#16140f', '#0a7a42']
export function Burst({ count = 30 }: { count?: number }) {
  const reduce = useReducedMotion()
  const [parts] = useState(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4
    const d = 80 + Math.random() * 140
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 30, r: Math.random() * 540 - 270, c: COLORS[i % COLORS.length], s: 6 + Math.random() * 6 }
  }))
  if (reduce) return null
  return (
    <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10">
      {parts.map((p, i) => (
        <motion.span key={i} className="absolute block border" style={{ width: p.s, height: p.s * 1.6, background: p.c, borderColor: 'var(--ink)', borderRadius: 1 }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 90], opacity: [1, 1, 0], rotate: p.r }}
          transition={{ duration: 1.4, ease: 'easeOut' }} />
      ))}
    </span>
  )
}

/* Cocok dengan media query; dipakai untuk memilih adegan scroll hanya di layar lebar. */
export function useMedia(query: string) {
  const [m, setM] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setM(mq.matches)
    on(); mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return m
}

/* Judul yang naik kata demi kata dari balik garis, memicu saat masuk layar. */
export function Words({ text, className = '', delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' })
  return (
    <span ref={ref} className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} aria-hidden="true" className="mr-[0.25em] inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span className="inline-block" initial={reduce ? false : { y: '110%' }} animate={inView ? { y: 0 } : {}} transition={{ duration: 0.6, delay: delay + i * 0.06, ease: [0.22, 1, 0.36, 1] }}>{w}</motion.span>
        </span>
      ))}
    </span>
  )
}

/* Stabilo yang disapukan ke teks saat masuk layar: motif identitas situs. */
export function Mark({ children, delay = 0.2 }: { children: ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.span ref={ref} className="mark" style={{ backgroundImage: 'linear-gradient(var(--hl), var(--hl))', backgroundRepeat: 'no-repeat', backgroundPosition: '0 88%', backgroundSize: reduce ? '100% 86%' : '0% 86%' }}
      animate={inView && !reduce ? { backgroundSize: '100% 86%' } : {}} transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.span>
  )
}

/* Angka yang berhitung naik saat masuk layar. */
export function Count({ to, className }: { to: number; className?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(reduce ? to : 0)
  useEffect(() => {
    if (!inView || reduce) return
    const c = animate(0, to, { duration: 1.2, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(Math.round(v)) })
    return () => c.stop()
  }, [inView, to, reduce])
  return <span ref={ref} className={className}>{n}</span>
}

/* Garis tinta di tepi atas: seberapa jauh halaman sudah dibaca. */
export function ScrollBar() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 24, restDelta: 0.001 })
  return <motion.div aria-hidden="true" className="fixed inset-x-0 top-0 z-[70] h-[4px] origin-left" style={{ scaleX, background: 'var(--accent-text)' }} />
}

/* Papan yang tergantung: berayun pelan saat diam dan miring 3D mengikuti kursor, seperti benda sungguhan. */
export function Hang({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const rx = useSpring(useMotionValue(0), { stiffness: 110, damping: 14 })
  const ry = useSpring(useMotionValue(0), { stiffness: 110, damping: 14 })
  return (
    <div className={className} style={{ perspective: 1100 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse') return
        const r = ref.current!.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * 16)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12)
      }}
      onPointerLeave={() => { rx.set(0); ry.set(0) }}>
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', transformOrigin: '50% 0%' }}>
        <motion.div ref={ref} animate={reduce ? undefined : { rotate: [-1.6, 0.4, -1.6] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} style={{ transformOrigin: '50% 0%' }}>{children}</motion.div>
      </motion.div>
    </div>
  )
}

/* Deretan contoh alamat yang bergulir. Kecepatannya ikut cepat scroll pengguna, jadi halaman terasa merespons. */
export function Ticker({ items, label }: { items: string[]; label: string }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const wrap = useRef<HTMLDivElement>(null)
  const { scrollY } = useScroll()
  const vel = useVelocity(scrollY)
  const boost = useSpring(useTransform(vel, [-1500, 0, 1500], [-5, 0, 5]), { stiffness: 80, damping: 30 })
  useAnimationFrame((_, dt) => {
    if (reduce || !wrap.current) return
    const half = wrap.current.scrollWidth / 2
    let next = x.get() - (0.06 + Math.abs(boost.get()) * 0.05) * dt * (boost.get() < 0 ? -1 : 1)
    if (next <= -half) next += half
    if (next > 0) next -= half
    x.set(next)
  })
  // Nama diulang agar satu baris selalu lebih lebar dari layar, walau yang terdaftar baru sedikit.
  const filled = Array.from({ length: Math.max(1, Math.ceil(8 / items.length)) }, () => items).flat()
  const row = filled.map((s, i) => <span key={i} className="shrink-0 px-6 text-[clamp(1.4rem,3.4vw,2.4rem)] font-extrabold tracking-tight">{s}<span aria-hidden="true" className="ml-12" style={{ color: 'var(--accent-text)' }}>/</span></span>)
  return (
    <div className="overflow-hidden border-b-[1.5px] py-5" style={{ borderColor: 'var(--ink)', background: 'var(--surface)' }} role="img" aria-label={label}>
      <motion.div ref={wrap} className="flex w-max whitespace-nowrap" style={{ x }} aria-hidden="true">{row}{row}</motion.div>
    </div>
  )
}
