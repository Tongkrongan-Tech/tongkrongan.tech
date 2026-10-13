import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import type { PlatformId, RecordType } from './dns'

export type Status = 'pending' | 'verifying' | 'active' | 'failed' | 'suspended'
export interface Sub {
  name: string
  platform: PlatformId
  type: RecordType
  value: string
  status: Status
  failReason?: string
  txtLabel?: string
  txtValue?: string
  createdAt: number
  owned: boolean
  rated?: boolean
  history: { at: number; key: string; detail?: string }[]
  checks: boolean[]
}
export interface User { email: string; provider: string }
export interface SubInput { name: string; platform: PlatformId; type: RecordType; value: string; txtLabel?: string; txtValue?: string }

interface Ctx {
  user: User | null
  subs: Sub[]
  quota: number
  ready: boolean // sesi sudah dicek
  loading: boolean // daftar subdomain sedang dimuat
  loadError: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string, turnstile?: string) => Promise<void>
  signup: (email: string, password: string, turnstile?: string) => Promise<{ needVerify: boolean }>
  logout: () => Promise<void>
  createSub: (i: SubInput) => Promise<Sub>
  editSub: (name: string, i: Partial<SubInput>) => Promise<Sub>
  verifySub: (name: string) => Promise<Sub>
  connectVercel: (name: string, project: string) => Promise<Sub>
  deleteSub: (name: string) => Promise<void>
}
const StoreCtx = createContext<Ctx>(null as never)
export const useStore = () => useContext(StoreCtx)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [subs, setSubs] = useState<Sub[]>([])
  const [quota, setQuota] = useState(3)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true); setLoadError(false)
    try {
      const me = await api<{ user: User | null }>('/auth/me')
      setUser(me.user)
      if (me.user) {
        const r = await api<{ subdomains: Sub[]; quota: number }>('/subdomains')
        setSubs(r.subdomains); setQuota(r.quota)
      } else setSubs([])
    } catch (e) {
      if (!(e instanceof ApiError) || e.status !== 401) setLoadError(true)
    } finally { setLoading(false); setReady(true) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  const put = (s: Sub) => setSubs((p) => (p.some((x) => x.name === s.name) ? p.map((x) => (x.name === s.name ? s : x)) : [...p, s]))

  const value = useMemo<Ctx>(() => ({
    user, subs, quota, ready, loading, loadError, refresh,
    login: async (email, password, turnstile) => { await api('/auth/login', { body: { email, password, turnstile } }); await refresh() },
    signup: async (email, password, turnstile) => {
      const r = await api<{ needVerify?: boolean }>('/auth/signup', { body: { email, password, turnstile } })
      if (!r.needVerify) await refresh()
      return { needVerify: !!r.needVerify }
    },
    logout: async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); setSubs([]) },
    createSub: async (i) => { const r = await api<{ subdomain: Sub }>('/subdomains', { body: i }); put(r.subdomain); return r.subdomain },
    editSub: async (name, i) => { const r = await api<{ subdomain: Sub }>(`/subdomains/${name}`, { method: 'PATCH', body: i }); put(r.subdomain); return r.subdomain },
    connectVercel: async (name, project) => { const r = await api<{ subdomain: Sub }>('/vercel/connect', { body: { name, project } }); put(r.subdomain); return r.subdomain },
    verifySub: async (name) => { const r = await api<{ subdomain: Sub }>(`/subdomains/${name}/verify`, { method: 'POST' }); put(r.subdomain); return r.subdomain },
    deleteSub: async (name) => { await api(`/subdomains/${name}`, { method: 'DELETE' }); setSubs((p) => p.filter((x) => x.name !== name)) },
  }), [user, subs, quota, ready, loading, loadError, refresh])
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}
