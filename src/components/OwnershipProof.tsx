import { usePrefs } from '../lib/prefs'
import type { Sub } from '../lib/store'
import { CopyButton } from './ui'

export function OwnershipProof({ sub }: { sub: Sub }) {
  const { t, domain } = usePrefs()
  if (!sub.ownershipToken || sub.status === 'active' || sub.status === 'suspended') return null
  const url = `https://${sub.name}.${domain}/.well-known/tongkrongan-verification.txt`
  return (
    <section className="mt-5 rounded-lg border p-4" style={{ borderColor: 'var(--line-2)' }} aria-label={t('claim.proof.h')}>
      <h3 className="font-extrabold">{t('claim.proof.h')}</h3>
      <p className="hint mt-2">{t('claim.proof.d')}</p>
      <p className="mono my-3 break-all text-sm">{url}</p>
      <p className="label">{t('claim.proof.content')}</p>
      <pre className="mono my-2 whitespace-pre-wrap break-all text-sm">{sub.ownershipToken}</pre>
      <CopyButton text={sub.ownershipToken} label={t('claim.proof.copy')} />
    </section>
  )
}
