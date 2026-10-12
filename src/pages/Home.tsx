import { useEffect, useState } from 'react'
import { usePrefs } from '../lib/prefs'
import { api } from '../lib/api'
import { Ticker } from '../components/fx'
import { Hero } from './home/Hero'
import { Journey } from './home/Journey'
import { Steps } from './home/Steps'
import { Platforms } from './home/Platforms'
import { Rules, Glossary, Faq, Closing } from './home/Rest'

/* Ticker hanya berisi subdomain yang benar-benar terdaftar dan aktif, diambil dari server.
   Bila server belum menyediakan daftarnya atau daftarnya kosong, ticker tidak ditampilkan; tidak ada nama karangan. */
function useRegistered() {
  const [names, setNames] = useState<string[]>([])
  useEffect(() => {
    let dead = false
    api<{ names: string[] }>('/public/subdomains').then((r) => { if (!dead && Array.isArray(r.names)) setNames(r.names.filter((n) => /^[a-z0-9-]{3,32}$/.test(n))) }).catch(() => {})
    return () => { dead = true }
  }, [])
  return names
}

/* Urutan mengikuti pertanyaan orang awam: apa ini, bagaimana jalannya, di mana websiteku, apa aturannya, apa artinya istilah itu. */
export function Home() {
  const { t, domain } = usePrefs()
  const names = useRegistered()
  return (
    <>
      <Hero />
      {names.length > 0 && <Ticker items={names.map((n) => `${n}.${domain}`)} label={t('ticker.label')} />}
      <Journey /><Steps /><Platforms /><Rules /><Glossary /><Faq /><Closing />
    </>
  )
}
