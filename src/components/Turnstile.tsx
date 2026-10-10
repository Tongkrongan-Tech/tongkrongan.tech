import { useEffect, useRef, useState } from 'react'
import { usePrefs } from '../lib/prefs'

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
  const { t } = usePrefs()
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let id: string | undefined
    let dead = false
    setFailed(false)
    const fail = () => { onToken(''); if (!dead) setFailed(true) }
    loadScript().then(() => {
      if (dead || !ref.current || !window.turnstile) return
      id = window.turnstile.render(ref.current, { sitekey: siteKey, callback: (tk: string) => { setFailed(false); onToken(tk) }, 'expired-callback': () => onToken(''), 'error-callback': fail })
    }).catch(fail)
    return () => { dead = true; if (id && window.turnstile) window.turnstile.remove(id) }
  }, [siteKey, onToken, attempt])
  return (
    <>
      <div ref={ref} />
      {failed && (
        <p role="alert" className="text-sm font-semibold" style={{ color: 'var(--bad)' }}>
          {t('captcha.failed')}{' '}
          <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold underline" style={{ color: 'var(--accent-text)' }} onClick={() => setAttempt((a) => a + 1)}>{t('captcha.retry')}</button>
        </p>
      )}
    </>
  )
}
