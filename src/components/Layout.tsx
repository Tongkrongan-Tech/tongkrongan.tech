import { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrefs, THEMES, type Theme } from '../lib/prefs'
import { useStore } from '../lib/store'
import { useRouteSeo } from '../lib/seo'
import { Icon, Spinner } from './ui'

const SWATCH: Record<Theme, [string, string]> = {
  light: ['#f6f8fc', '#1565f0'], dark: ['#0f1219', '#5b9bff'], kopi: ['#fbf6ee', '#ff6b3d'], mint: ['#e6f4ea', '#3ddc84'], grape: ['#efe9fb', '#b79cff'], ocean: ['#0b2545', '#5ce1e6'],
}

export function Logo() {
  return (
    <Link to="/" className="inline-flex items-center no-underline" aria-label="Tongkrongan.tech">
      <img src="/logo-wordmark.png" alt="Tongkrongan.tech" width="640" height="77" className="logo-art h-6 w-auto sm:h-7" />
    </Link>
  )
}

// Satu tombol kecil untuk bahasa dan tema, supaya bilah atas tidak penuh.
function Settings() {
  const { theme, setTheme, lang, setLang, t } = usePrefs()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('keydown', onKey); document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [open])
  const head = 'px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-wider'
  return (
    <div ref={ref} className="relative">
      <button type="button" className="btn btn-ghost !min-h-10 !gap-2 !px-3" style={{ border: '2px solid var(--line)' }} aria-haspopup="true" aria-expanded={open} aria-label={`${t('theme.label')}, ${t('lang.label')}`} onClick={() => setOpen((o) => !o)}>
        <span className="flex overflow-hidden rounded-full border-2" style={{ borderColor: 'var(--line)' }} aria-hidden="true">
          <span className="block h-4 w-4" style={{ background: SWATCH[theme][0] }} /><span className="block h-4 w-4" style={{ background: SWATCH[theme][1] }} />
        </span>
        <span className="text-sm font-bold uppercase" aria-hidden="true">{lang}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="card fixed inset-x-3 top-[4.5rem] z-50 p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]" style={{ boxShadow: 'var(--shadow)' }}>
            <p className={head} style={{ color: 'var(--muted)' }}>{t('lang.label')}</p>
            <div role="group" aria-label={t('lang.label')} className="mb-2 flex gap-2 px-2">
              {(['id', 'en'] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className="min-h-10 flex-1 cursor-pointer rounded-lg border-2 text-sm font-bold uppercase" style={{ borderColor: 'var(--line)', background: lang === l ? 'var(--hl)' : 'transparent', color: lang === l ? 'var(--hl-ink)' : 'var(--ink)' }}>{l}</button>
              ))}
            </div>
            <p className={head} style={{ color: 'var(--muted)' }}>{t('theme.label')}</p>
            <div role="radiogroup" aria-label={t('theme.label')}>
              {THEMES.map((th) => (
                <button key={th} role="radio" aria-checked={theme === th} type="button" onClick={() => { setTheme(th); setOpen(false) }} className="flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 p-2 text-left text-sm font-semibold transition-colors hover:bg-[var(--surface-2)]" style={{ background: theme === th ? 'var(--surface-2)' : 'transparent', color: 'var(--ink)' }}>
                  <span className="flex overflow-hidden rounded-lg border-2" style={{ borderColor: 'var(--line)' }} aria-hidden="true">
                    <span className="block h-7 w-7" style={{ background: SWATCH[th][0] }} /><span className="block h-7 w-7" style={{ background: SWATCH[th][1] }} />
                  </span>
                  <span className="flex-1">{t(`theme.${th}`)}</span>
                  {theme === th && <Icon.check size={16} />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const navCls = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3 py-1.5 text-sm font-semibold no-underline transition-colors ${isActive ? 'bg-[var(--hl)] text-[var(--hl-ink)]' : 'text-[var(--ink)] hover:bg-[var(--surface-2)]'}`

export function Layout() {
  const { t, configError } = usePrefs()
  const { user, logout } = useStore()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useRouteSeo()

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
      <NavLink to="/claim" className={navCls}>{t('nav.claim')}</NavLink>
      <Link to="/#platform" className={navCls({ isActive: false })}>{t('nav.platform')}</Link>
      <Link to="/#faq" className={navCls({ isActive: false })}>{t('nav.faq')}</Link>
      {user && <NavLink to="/dashboard" className={navCls}>{t('nav.dashboard')}</NavLink>}
    </>
  )
  const mobileExtra = (
    <>
      {!user && <NavLink to="/dashboard" className={navCls}>{t('nav.dashboard')}</NavLink>}
      <NavLink to="/report" className={navCls}>{t('nav.report')}</NavLink>
    </>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--hl)] focus:px-4 focus:py-2 focus:text-[var(--hl-ink)]">{t('nav.skip')}</a>
      <header className="sticky top-0 z-40 border-b-2" style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="justify-self-start"><Logo /></div>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('nav.main')}>{links}</nav>
          <div className="ml-auto flex items-center gap-2 lg:justify-self-end">
            <Settings />
            {user ? (
              <button type="button" onClick={() => void logout()} className="btn !hidden !min-h-10 !px-4 !text-sm sm:!inline-flex">{t('nav.logout')}</button>
            ) : (
              <Link to="/login" className="btn btn-primary !hidden !min-h-10 !px-4 !text-sm sm:!inline-flex">{t('nav.login')}</Link>
            )}
            <button type="button" className="btn btn-ghost !min-h-10 !px-3 lg:!hidden" style={{ border: '2px solid var(--line)' }} aria-expanded={menu} aria-controls="mobile-menu" aria-label={menu ? t('nav.closeMenu') : t('nav.openMenu')} onClick={() => setMenu((m) => !m)}>
              {menu ? <Icon.x size={22} /> : <Icon.menu />}
            </button>
          </div>
        </div>
        <AnimatePresence>
          {menu && (
            <motion.nav id="mobile-menu" aria-label={t('nav.main')} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t-2 lg:hidden" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
              <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 [&>a]:min-h-11 [&>a]:content-center">
                {links}
                {mobileExtra}
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
            <Suspense fallback={<div className="grid min-h-[50vh] place-items-center" style={{ color: 'var(--accent-text)' }} role="status" aria-label={t('ui.loading')}><Spinner size={36} /></div>}>
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
  const col = 'mb-3 text-xs font-bold uppercase tracking-wider'
  const link = 'inline-block py-1.5 text-sm font-semibold underline-offset-4 hover:underline'
  return (
    <footer className="border-t-2" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)' }}>
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.6fr_2fr]">
          <div>
            <img src="/logo-full.png" alt="Tongkrongan.tech, subdomain gratis untuk project kamu" width="720" height="428" loading="lazy" className="logo-art h-auto w-44" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{t('footer.about')}</p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          <nav aria-label={t('footer.start')}>
            <p className={col} style={{ color: 'var(--muted)' }}>{t('footer.start')}</p>
            <ul>
              <li><Link to="/claim" className={link} style={{ color: 'var(--ink)' }}>{t('nav.claim')}</Link></li>
              <li><Link to="/dashboard" className={link} style={{ color: 'var(--ink)' }}>{t('nav.dashboard')}</Link></li>
              <li><Link to="/#platform" className={link} style={{ color: 'var(--ink)' }}>{t('nav.platform')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('footer.info')}>
            <p className={col} style={{ color: 'var(--muted)' }}>{t('footer.info')}</p>
            <ul>
              <li><Link to="/#rules" className={link} style={{ color: 'var(--ink)' }}>{t('footer.rules')}</Link></li>
              <li><Link to="/#faq" className={link} style={{ color: 'var(--ink)' }}>{t('nav.faq')}</Link></li>
              <li><Link to="/report" className={link} style={{ color: 'var(--ink)' }}>{t('nav.report')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('footer.legal')}>
            <p className={col} style={{ color: 'var(--muted)' }}>{t('footer.legal')}</p>
            <ul>
              <li><Link to="/terms" className={link} style={{ color: 'var(--ink)' }}>{t('legal.terms')}</Link></li>
              <li><Link to="/privacy" className={link} style={{ color: 'var(--ink)' }}>{t('legal.privacy')}</Link></li>
            </ul>
          </nav>
          </div>
        </div>

        <ul className="mt-10 flex flex-wrap gap-3 border-t-2 pt-6" style={{ borderColor: 'var(--line)' }}>
          {['footer.p1', 'footer.p2', 'footer.p3'].map((k) => (
            <li key={k} className="badge" style={{ color: 'var(--ink)' }}><Icon.check size={14} /> {t(k)}</li>
          ))}
        </ul>
      </div>
      <div className="border-t-2" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ color: 'var(--muted)' }}>
          <span>&copy; {new Date().getFullYear()} Tongkrongan.tech</span>
          <span>{config?.mock ? t('footer.mock') : t('footer.copy', { domain })}</span>
        </div>
      </div>
    </footer>
  )
}
