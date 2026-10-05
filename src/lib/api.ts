export class ApiError extends Error {
  constructor(public status: number, public code: string, public data: Record<string, unknown> = {}) { super(code) }
}

export interface Config {
  baseDomain: string
  quota: number
  oauth: { github: boolean; google: boolean }
  turnstileSiteKey: string | null
  emailVerify: boolean
  mock: boolean
}

export async function api<T = unknown>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  let res: Response
  try {
    res = await fetch(`/api${path}`, {
      method: init?.method ?? (init?.body ? 'POST' : 'GET'),
      headers: init?.body ? { 'content-type': 'application/json' } : init?.method && init.method !== 'GET' ? { 'content-type': 'application/json' } : undefined,
      body: init?.body ? JSON.stringify(init.body) : undefined,
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'network')
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) throw new ApiError(res.status, String(data.error ?? 'server'), data)
  return data as T
}
