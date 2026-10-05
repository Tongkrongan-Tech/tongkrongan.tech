import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs, THEMES, type Theme } from '../lib/prefs'
import { useStore } from '../lib/store'
import { Icon } from './ui'

const SWATCH: Record<Theme, [string, string]> = {
  light: ['#f6f8fc', '#1565f0'], dark: ['#0f1219', '#5b9bff'], kopi: ['#fbf6ee', '#ff6b3d'], mint: ['#e6f4ea', '#3ddc84'], grape: ['#efe9fb', '#b79cff'], ocean: ['#0b2545', '#5ce1e6'],
}

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center no-underline" aria-label="Tongkrongan.tech">
      <img src="/logo-wordmark.png" alt="Tongkrongan.tech" width="640" height="83" className="logo-art h-6 w-auto sm:h-7" />
    </Link>
  )
}

function ThemePicker() {
  const { theme, setTheme, t } = usePrefs()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-ghost !min-h-11 !px-3" style={{ border: '2px solid var(--line)' }} aria-haspopup="true" aria-expanded={open} aria-label={t('theme.label')} onClick={() => setOpen((o) => !o)}>
        <span className="flex overflow-hidden rounded-full border-2" style={{ borderColor: 'var(--line)' }} aria-hidden="true">
          <span className="block h-4 w-4" style={{ background: SWATCH[theme][0] }} /><span className="block h-4 w-4" style={{ background: SWATCH[theme][1] }} />
        </span>
        <span className="hidden text-sm sm:inline">{t('theme.label')}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="radiogroup" aria-label={t('theme.label')} initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="card absolute right-0 top-full z-50 mt-2 w-60 p-2" style={{ boxShadow: 'var(--shadow)' }}>
            {THEMES.map((th) => (
              <button key={th} role="radio" aria-checked={theme === th} type="button" onClick={() => { setTheme(th); setOpen(false) }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 p-2 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]" style={{ background: theme === th ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)' }}>
                <span className="flex overflow-hidden rounded-lg border-2" style={{ borderColor: 'var(--line)' }} aria-hidden="true">
                  <span className="block h-7 w-7" style={{ background: SWATCH[th][0] }} /><span className="block h-7 w-7" style={{ background: SWATCH[th][1] }} />
                </span>
                <span className="flex-1">{t(`theme.${th}`)}</span>
                {theme === th && <Icon.check size={16} />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function LangToggle() {
  const { lang, setLang, t } = usePrefs()
  return (
    <div role="group" aria-label={t('lang.label')} className="flex overflow-hidden rounded-xl border-2" style={{ borderColor: 'var(--line)' }}>
      {(['id', 'en'] as const).map((l) => (
        <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className="min-h-11 min-w-11 cursor-pointer border-0 px-2 text-sm font-bold uppercase" style={{ background: lang === l ? 'var(--accent)' : 'transparent', color: lang === l ? 'var(--accent-ink)' : 'var(--ink)' }}>
          {l}
        </button>
      ))}
    </div>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-2 text-sm font-semibold no-underline transition-colors hover:bg-[var(--surface-2)] ${isActive ? 'underline decoration-[3px] underline-offset-8' : ''}`

export function Layout() {
  const { t, configError } = usePrefs()
  const { user, logout } = useStore()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()

  useEffect(() => { setMenu(false) }, [loc.pathname])
  useEffect(() => {
    if (loc.hash) {
      const el = document.getElementById(loc.hash.slice(1))
      if (el) { setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60); return }
    }
    window.scrollTo({ top: 0 })
  }, [loc.pathname, loc.hash])
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu])

  const links = (
    <>
      <NavLink to="/claim" className={navCls} style={{ color: 'var(--ink)' }}>{t('nav.claim')}</NavLink>
      <Link to="/#platform" className={navCls({ isActive: false })} style={{ color: 'var(--ink)' }}>{t('nav.platform')}</Link>
      <Link to="/#faq" className={navCls({ isActive: false })} style={{ color: 'var(--ink)' }}>{t('nav.faq')}</Link>
      <NavLink to="/dashboard" className={navCls} style={{ color: 'var(--ink)' }}>{t('nav.dashboard')}</NavLink>
      <NavLink to="/report" className={navCls} style={{ color: 'var(--ink)' }}>{t('nav.report')}</NavLink>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--hl)] focus:px-4 focus:py-2 focus:text-[var(--hl-ink)]">{t('nav.skip')}</a>
      <header className="sticky top-0 z-40 border-b-2" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <Logo />
          <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label={t('nav.main')}>{links}</nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block"><LangToggle /></div>
            <ThemePicker />
            {user ? (
              <button type="button" onClick={() => void logout()} className="btn !hidden !min-h-11 !px-4 !text-sm sm:!inline-flex">{t('nav.logout')}</button>
            ) : (
              <Link to="/login" className="btn btn-primary !hidden !min-h-11 !px-4 !text-sm sm:!inline-flex">{t('nav.login')}</Link>
            )}
            <button type="button" className="btn btn-ghost !min-h-11 !px-3 lg:!hidden" style={{ border: '2px solid var(--line)' }} aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setMenu((m) => !m)}>
              {menu ? <Icon.x size={22} /> : <Icon.menu />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.nav id="mobile-menu" aria-label={t('nav.main')} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t-2 lg:hidden" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
              <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 [&>a]:min-h-11 [&>a]:content-center">
                {links}
                <div className="mt-2 sm:hidden"><LangToggle /></div>
                {user ? (
                  <button type="button" onClick={() => void logout()} className="btn mt-2">{t('nav.logout')}</button>
                ) : (
                  <Link to="/login" className="btn btn-primary mt-2">{t('nav.login')}</Link>
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>
      {configError && <p role="alert" className="px-4 py-3 text-center text-sm font-semibold" style={{ background: 'var(--bad)', color: 'var(--bg)' }}>{t('config.error')}</p>}
      <main id="main" className="flex-1" tabIndex={-1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  )
}

function Footer() {
  const { t, config, domain } = usePrefs()
  return (
    <footer className="border-t-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          <img src="/logo-full.png" alt="Tongkrongan.tech, subdomain gratis untuk project kamu" width="720" height="468" loading="lazy" className="logo-art h-auto w-56" />
          <p className="mt-4 max-w-md text-sm" style={{ color: 'var(--muted)' }}>{t('footer.about')}</p>
          <ul className="mt-5 grid gap-1 text-sm font-medium" style={{ color: 'var(--ink)' }}>
            <li>{t('footer.p1')}</li><li>{t('footer.p2')}</li><li>{t('footer.p3')}</li>
          </ul>
        </div>
        <nav aria-label={t('footer.nav')} className="flex flex-wrap content-start gap-x-6 gap-y-2 text-sm font-semibold">
          <Link to="/claim" className="py-2" style={{ color: 'var(--ink)' }}>{t('nav.claim')}</Link>
          <Link to="/dashboard" className="py-2" style={{ color: 'var(--ink)' }}>{t('nav.dashboard')}</Link>
          <Link to="/report" className="py-2" style={{ color: 'var(--ink)' }}>{t('nav.report')}</Link>
          <Link to="/#faq" className="py-2" style={{ color: 'var(--ink)' }}>{t('nav.faq')}</Link>
        </nav>
      </div>
      <div className="border-t-2 py-4 text-center text-xs" style={{ borderColor: 'var(--line)', color: 'var(--muted)' }}>{config?.mock ? t('footer.mock') : t('footer.copy', { domain })}</div>
    </footer>
  )
}
