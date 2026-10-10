import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usePrefs } from '../lib/prefs'
import { CONTACT_EMAIL, LEGAL, LEGAL_UPDATED, type DocId } from '../lib/legal'

// Satu komponen untuk Syarat Layanan dan Kebijakan Privasi; isi dan terjemahannya ada di src/lib/legal.ts.
export function Legal({ doc }: { doc: DocId }) {
  const { t, lang } = usePrefs()
  const d = LEGAL[doc][lang]
  const other: DocId = doc === 'terms' ? 'privacy' : 'terms'
  const date = new Date(`${LEGAL_UPDATED}T00:00:00`).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  useEffect(() => { document.title = `${d.title} | Tongkrongan.tech` }, [d.title])
  const count = d.blocks.length + 1 // + bagian Kontak
  const ids = Array.from({ length: count }, (_, i) => `bagian-${i + 1}`)
  const heads = [...d.blocks.map((b) => b.h), t('legal.contact.h')]

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>{t('legal.updated', { date })}</p>
        <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl"><span className="mark">{d.title}</span></h1>
        <p className="mt-5 text-lg leading-relaxed" style={{ color: 'var(--muted)' }}>{d.intro}</p>
      </header>

      <nav aria-label={t('legal.toc')} className="card mt-8 p-5">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{t('legal.toc')}</p>
        <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {heads.map((h, i) => (
            <li key={ids[i]} className="flex items-baseline gap-2 text-sm font-semibold">
              <span style={{ color: 'var(--accent-text)' }}>{i + 1}.</span>
              <Link to={{ hash: `#${ids[i]}` }} className="py-1 underline-offset-4 hover:underline" style={{ color: 'var(--ink)' }}>{h}</Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-12 grid gap-12">
        {d.blocks.map((b, i) => (
          <section key={ids[i]} id={ids[i]} className="scroll-mt-24">
            <Heading n={i + 1}>{b.h}</Heading>
            {b.p?.map((x) => <p key={x} className="mt-4 leading-relaxed">{x}</p>)}
            {b.ul && (
              <ul className="mt-4 grid list-disc gap-2.5 pl-5 leading-relaxed marker:text-[var(--accent-text)]">
                {b.ul.map((x) => <li key={x}>{x}</li>)}
              </ul>
            )}
          </section>
        ))}
        <section id={ids[count - 1]} className="scroll-mt-24">
          <Heading n={count}>{t('legal.contact.h')}</Heading>
          {CONTACT_EMAIL ? (
            <p className="mt-4 leading-relaxed">{t('legal.contact.email')} <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--accent-text)' }}>{CONTACT_EMAIL}</a></p>
          ) : (
            <p className="mt-4 leading-relaxed">{t('legal.contact.none')} <Link to="/report" className="font-semibold underline underline-offset-4" style={{ color: 'var(--accent-text)' }}>{t('legal.contact.report')}</Link></p>
          )}
        </section>
      </div>

      <p className="mt-14 border-t-2 pt-6 text-sm font-semibold" style={{ borderColor: 'var(--line)' }}>
        {t('legal.also')}{' '}
        <Link to={`/${other}`} className="underline underline-offset-4" style={{ color: 'var(--accent-text)' }}>{LEGAL[other][lang].title}</Link>
      </p>
    </article>
  )
}

function Heading({ n, children }: { n: number; children: string }) {
  return (
    <h2 className="flex items-center gap-3 text-xl font-extrabold sm:text-2xl">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2 text-base" style={{ borderColor: 'var(--line)', background: 'var(--surface-2)', color: 'var(--accent-text)' }}>{n}</span>
      {children}
    </h2>
  )
}
