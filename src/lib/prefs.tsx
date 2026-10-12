import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { dict } from './dict'
import { api, ApiError, type Config } from './api'

// Enam tema pilihan. 'system' (belum memilih) mengikuti pengaturan perangkat: terang atau gelap.
export const THEMES = ['light', 'dark', 'kopi', 'mint', 'grape', 'ocean'] as const
export type ResolvedTheme = (typeof THEMES)[number]
export type Theme = ResolvedTheme | 'system'
export type Lang = 'id' | 'en'

const read = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* diblokir */ } }

const prefersDark = () => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
const resolveTheme = (t: Theme): ResolvedTheme => (t === 'system' ? (prefersDark() ? 'dark' : 'light') : t)
const migrate = (v: string | null): Theme => ((THEMES as readonly string[]).includes(v ?? '') ? (v as Theme) : 'system')

interface Ctx {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (t: Theme) => void
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  config: Config | null
  configError: boolean
  domain: string
  te: (e: unknown) => string // pesan galat ramah dari galat API
}
const PrefCtx = createContext<Ctx>(null as never)
export const usePrefs = () => useContext(PrefCtx)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => migrate(read('tt.theme')))
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(migrate(read('tt.theme'))))
  const [config, setConfig] = useState<Config | null>(null)
  const [configError, setConfigError] = useState(false)
  useEffect(() => { api<Config>('/config').then(setConfig).catch(() => setConfigError(true)) }, [])
  const domain = config?.baseDomain ?? 'tongkrongan.tech'
  const [lang, setLangState] = useState<Lang>(() => (read('tt.lang') === 'en' ? 'en' : 'id'))

  useEffect(() => {
    const apply = () => { const r = resolveTheme(theme); setResolved(r); document.documentElement.dataset.theme = r }
    apply()
    if (theme !== 'system') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => { document.documentElement.lang = lang }, [lang])

  const setTheme = useCallback((x: Theme) => {
    const r = resolveTheme(x)
    document.documentElement.dataset.theme = r // langsung, agar transisi tema melihat hasil akhirnya
    setResolved(r); setThemeState(x); write('tt.theme', x)
  }, [])
  const setLang = useCallback((x: Lang) => { setLangState(x); write('tt.lang', x) }, [])
  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const entry = dict[key]
    let s = entry ? entry[lang === 'id' ? 0 : 1] : key
    s = s.replaceAll('{domain}', domain)
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }, [lang, domain])

  const te = useCallback((e: unknown) => {
    const code = e instanceof ApiError ? e.code : 'network'
    const reason = e instanceof ApiError ? String(e.data.reason ?? '') : ''
    if (code === 'invalid_value' && reason) return t(`val.${reason}`)
    if (code === 'invalid_name' && reason) return t(`name.err.${reason}`)
    return dict[`err.${code}`] ? t(`err.${code}`) : t('err.server')
  }, [t])

  return <PrefCtx.Provider value={{ theme, resolved, setTheme, lang, setLang, t, config, configError, domain, te }}>{children}</PrefCtx.Provider>
}
