import { useEffect, useRef } from 'react'

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } }
}

let loading: Promise<void> | null = null
const loadScript = () => (loading ??= new Promise<void>((res, rej) => {
  const s = document.createElement('script')
  s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
  s.async = true
  s.onload = () => res()
  s.onerror = () => { loading = null; rej(new Error('turnstile')) }
  document.head.appendChild(s)
}))

// Captcha Cloudflare Turnstile. Hanya dirender bila server mengaktifkannya (TURNSTILE_SECRET + sitekey).
export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (t: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let id: string | undefined
    let dead = false
    loadScript().then(() => {
      if (dead || !ref.current || !window.turnstile) return
      id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: onToken, 'expired-callback': () => onToken(''), 'error-callback': () => onToken('') })
    }).catch(() => onToken(''))
    return () => { dead = true; if (id && window.turnstile) window.turnstile.remove(id) }
  }, [siteKey, onToken])
  return <div ref={ref} />
}
