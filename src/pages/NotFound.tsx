import { Link } from 'react-router-dom'
import { usePrefs } from '../lib/prefs'

export function NotFound() {
  const { t } = usePrefs()
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-7xl font-extrabold" style={{ color: 'var(--accent-text)' }}>404</p>
      <h1 className="mt-4 text-3xl font-extrabold">{t('nf.h')}</h1>
      <p className="mt-2" style={{ color: 'var(--muted)' }}>{t('nf.d')}</p>
      <Link to="/" className="btn btn-primary mt-8">{t('nf.cta')}</Link>
    </div>
  )
}
