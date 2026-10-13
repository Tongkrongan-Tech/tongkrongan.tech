import { Suspense, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { usePrefs, THEMES, type ResolvedTheme } from '../lib/prefs'
import { useStore } from '../lib/store'
import { useRouteSeo } from '../lib/seo'
import { Icon, Spinner } from './ui'
import { ScrollBar } from './fx'

export function Logo({ className = 'h-6 sm:h-7' }: { className?: string }) {
  return (
    <Link to="/" className="inline-flex items-center no-underline" aria-label="Tongkrongan.tech">
      <img src="/logo-wordmark.png" alt="Tongkrongan.tech" width="640" height="77" className={`logo-art w-auto ${className}`} />
    </Link>
  )
}

/* Dua warna tiap tema (kertas dan aksen) untuk pratinjau kecil di pemilih. */
const SWATCH: Record<ResolvedTheme, [string, string]> = {
  light: ['#f4f7fd', '#1553e0'], dark: ['#0a0e18', '#2563eb'], kopi: ['#f9f1e4', '#ff6b3d'], mint: ['#e8f3e3', '#34c47a'], grape: ['#f0eafb', '#a98bff'], ocean: ['#061a33', '#4fd8dd'],
}

function Swatch({ id, size = 22 }: { id: ResolvedTheme; size?: number }) {
  return (
    <span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-[5px] border-[1.5px]" style={{ borderColor: 'var(--ink)' }}>
      <span style={{ width: size, height: size, background: SWATCH[id][0] }} /><span style={{ width: size, height: size, background: SWATCH[id][1] }} />
    </span>
  )
}

/* Pengaturan: bahasa dan enam tema dalam satu panel. Memilih tema membuka lingkaran dari titik klik (View Transitions);
   tanpa dukungan atau saat gerak dikurangi, berganti langsung. */
function Settings({ inline = false }: { inline?: boolean }) {
  const { theme, resolved, setTheme, lang, setLang, t } = usePrefs()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(inline)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open || inline) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open, inline])

  function pick(next: ResolvedTheme, e: React.MouseEvent<HTMLButtonElement>) {
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } }
    if (reduce || !doc.startViewTransition) { setTheme(next); return }
    const x = e.clientX || innerWidth / 2, y = e.clientY || 0
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
    const vt = doc.startViewTransition(() => flushSync(() => setTheme(next)))
    void vt.ready.then(() => document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' },
    ))
  }

  // Pola radiogroup: panah memindahkan pilihan dan fokus; hanya satu opsi masuk urutan Tab.
  function onThemeKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!d) return
    e.preventDefault()
    const next = THEMES[(THEMES.indexOf(resolved) + d + THEMES.length) % THEMES.length]
    setTheme(next)
    requestAnimationFrame(() => e.currentTarget.querySelector<HTMLElement>(`[data-theme-opt="${next}"]`)?.focus())
  }

  const head = 'px-1 pb-1.5 pt-1 text-xs font-extrabold'
  const panel = (
    <>
      <p className={head} style={{ color: 'var(--muted)' }}>{t('lang.label')}</p>
      <div role="group" aria-label={t('lang.label')} className="mb-3 grid grid-cols-2 gap-2">
        {(['id', 'en'] as const).map((l) => (
          <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className="btn btn-sm uppercase" style={{ background: lang === l ? 'var(--hl)' : 'var(--surface)', color: lang === l ? 'var(--hl-ink)' : 'var(--ink)' }}>{l}</button>
        ))}
      </div>
      <p className={head} style={{ color: 'var(--muted)' }}>{t('theme.label')}</p>
      <div role="radiogroup" aria-label={t('theme.label')} className="grid gap-0.5" onKeyDown={onThemeKey}>
        {THEMES.map((th) => {
          const on = resolved === th
          return (
            <button key={th} role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-theme-opt={th} type="button" onClick={(e) => pick(th, e)} className="relative flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 p-2 text-left text-sm font-bold hover:bg-[var(--surface-2)]" style={{ background: on ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)' }}>
              <Swatch id={th} />
              <span className="flex-1">{t(`theme.${th}`)}</span>
              {on && <motion.span layoutId={inline ? 'th-check-m' : 'th-check'} className="grid place-items-center" style={{ color: 'var(--accent-text)' }}><Icon.check size={16} /></motion.span>}
            </button>
          )
        })}
      </div>
      {theme === 'system' && <p className="hint mt-2 px-1">{t('theme.auto')}</p>}
    </>
  )
  if (inline) return <div className="card p-3">{panel}</div>
  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-outline btn-sm gap-2" aria-haspopup="true" aria-expanded={open} aria-label={`${t('theme.label')}, ${t('lang.label')}`} onClick={() => setOpen((o) => !o)}>
        <Swatch id={resolved} size={14} />
        <span className="text-xs font-extrabold uppercase" aria-hidden="true">{lang}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="card absolute right-0 top-full z-50 mt-2 w-[20rem] max-w-[calc(100vw-2rem)] p-3" style={{ borderColor: 'var(--ink)', borderWidth: 2, boxShadow: '5px 5px 0 var(--sh)' }}>
            {panel}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) => `px-3 py-2 text-sm font-semibold no-underline underline-offset-8 hover:underline ${isActive ? 'underline' : ''}`

export function Layout() {
  const { t, configError } = usePrefs()
  const { user, logout } = useStore()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const firstRoute = useRef(true)
  useRouteSeo()

  useEffect(() => { setMenu(false) }, [loc.pathname])
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1))
      if (el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); return }
    }
    window.scrollTo({ top: 0 })
  }, [loc.pathname, loc.hash])
  // Pindah halaman: fokus ke <main> agar pembaca layar tahu konten berganti. Lewati muatan pertama dan jangan rebut fokus dari kolom yang sedang diisi.
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return }
    if (loc.hash) return
    const a = document.activeElement
    if (a instanceof HTMLElement && a !== document.body && a.closest('input, textarea, select, [contenteditable="true"]')) return
    mainRef.current?.focus({ preventScroll: true })
  }, [loc.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [menu])

  const links = [
    { to: '/#cara', label: t('nav.how') },
    { to: '/#platform', label: t('nav.platform') },
    { to: '/#faq', label: t('nav.faq') },
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollBar />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-[var(--hl)] focus:px-4 focus:py-2 focus:text-[var(--hl-ink)]">{t('nav.skip')}</a>

      <header className="fixed inset-x-0 top-0 z-50 border-b-[1.5px]" style={{ background: 'var(--bg)', borderColor: 'var(--ink)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="ml-6 hidden items-center lg:flex" aria-label={t('nav.main')}>
            {links.map((l) => <Link key={l.to} to={l.to} className={navCls({ isActive: false })}>{l.label}</Link>)}
            <NavLink to="/report" className={navCls}>{t('nav.report')}</NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Settings />
            {user ? (
              <>
                <Link to="/dashboard" className="btn btn-sm !hidden sm:!inline-flex">{t('nav.dashboard')}</Link>
                <Link to="/settings" className="btn btn-sm btn-ghost !hidden lg:!inline-flex">{t('nav.settings')}</Link>
                <button type="button" onClick={() => void logout()} className="btn btn-sm btn-ghost !hidden lg:!inline-flex">{t('nav.logout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-sm btn-ghost !hidden sm:!inline-flex">{t('nav.login')}</Link>
                <Link to="/claim" className="btn btn-sm btn-primary !hidden sm:!inline-flex">{t('nav.start')}</Link>
              </>
            )}
            <button type="button" className="btn btn-outline btn-sm !w-9 !px-0 lg:!hidden" aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setMenu((m) => !m)}>
              {menu ? <Icon.x size={20} /> : <Icon.menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {menu && (
          <motion.nav id="mobile-menu" aria-label={t('nav.main')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 overflow-y-auto px-5 pb-8 pt-20 lg:hidden" style={{ background: 'var(--bg)' }}>
            <ul className="grid">
              {[...links, { to: '/claim', label: t('nav.claim') }, { to: '/dashboard', label: t('nav.dashboard') }, ...(user ? [{ to: '/settings', label: t('nav.settings') }] : []), { to: '/report', label: t('nav.report') }].map((l, i) => (
                <motion.li key={l.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i + 0.04 }}>
                  <Link to={l.to} className="flex min-h-14 items-center border-b py-3 text-2xl font-extrabold tracking-tight no-underline" style={{ borderColor: 'var(--line-2)', color: 'var(--ink)' }}>{l.label}</Link>
                </motion.li>
              ))}
            </ul>
            <div className="mt-8"><Settings inline /></div>
            <div className="mt-6">
              {user ? <button type="button" onClick={() => void logout()} className="btn">{t('nav.logout')}</button> : <Link to="/login" className="btn btn-primary">{t('nav.login')}</Link>}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {configError && <p role="alert" className="fixed inset-x-0 top-[4.5rem] z-40 mx-auto w-fit max-w-[92vw] rounded-md border-2 px-4 py-2 text-center text-sm font-bold" style={{ background: 'var(--surface)', borderColor: 'var(--bad)', color: 'var(--bad)' }}>{t('config.error')}</p>}

      <main id="main" ref={mainRef} className="relative flex-1 pt-16 outline-none" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
            <Suspense fallback={<div className="grid min-h-[60vh] place-items-center" style={{ color: 'var(--accent-text)' }} role="status" aria-label={t('ui.loading')}><Spinner size={34} /></div>}>
              <Outlet />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  const { t, config, domain } = usePrefs()
  const link = 'inline-block py-1.5 text-sm font-semibold underline-offset-4 hover:underline'
  return (
    <footer className="border-t-[1.5px]" style={{ borderColor: 'var(--ink)', background: 'var(--surface-2)' }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        <div>
          <img src="/logo-full.png" alt="Tongkrongan.tech" width="720" height="428" loading="lazy" className="logo-art h-auto w-28" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{t('footer.about')}</p>
          <ul className="mt-5 grid gap-1.5 text-sm font-semibold">
            {['footer.p1', 'footer.p2', 'footer.p3'].map((k) => <li key={k} className="flex items-start gap-2"><span style={{ color: 'var(--ok)' }}><Icon.check size={16} /></span>{t(k)}</li>)}
          </ul>
        </div>
        <nav aria-label={t('footer.nav')} className="grid grid-cols-2 gap-x-6">
          <ul>
            <li><Link to="/claim" className={link}>{t('nav.claim')}</Link></li>
            <li><Link to="/dashboard" className={link}>{t('nav.dashboard')}</Link></li>
            <li><Link to="/#platform" className={link}>{t('nav.platform')}</Link></li>
            <li><Link to="/#faq" className={link}>{t('nav.faq')}</Link></li>
          </ul>
          <ul>
            <li><Link to="/report" className={link}>{t('nav.report')}</Link></li>
            <li><Link to="/terms" className={link}>{t('legal.terms')}</Link></li>
            <li><Link to="/privacy" className={link}>{t('legal.privacy')}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t" style={{ borderColor: 'var(--line-2)' }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs sm:flex-row sm:justify-between sm:px-6" style={{ color: 'var(--muted)' }}>
          <span>&copy; {new Date().getFullYear()} Tongkrongan.tech</span>
          <span>{config?.mock ? t('footer.mock') : t('footer.copy', { domain })}</span>
        </div>
      </div>
    </footer>
  )
}
