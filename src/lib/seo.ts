import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const SITE = 'https://tongkrongan.tech'
export const HOME_TITLE = 'Tongkrongan.tech | Alamat web gratis yang pantas diingat'
// Harus sama dengan public/sitemap.xml. Halaman lain (dashboard, login, reset, 404) tidak diindeks.
export const INDEXABLE = ['/', '/claim', '/report', '/terms', '/privacy']

function upsert(selector: string, create: () => HTMLElement, set: (el: HTMLElement) => void) {
  let el = document.head.querySelector<HTMLElement>(selector)
  if (!el) { el = create(); document.head.appendChild(el) }
  set(el)
}

// Menjaga canonical, robots, dan judul tab mengikuti rute (SPA tidak memuat ulang index.html).
export function useRouteSeo() {
  const { pathname } = useLocation()
  useEffect(() => {
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
    const indexable = INDEXABLE.includes(path)
    upsert('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), (el) =>
      el.setAttribute('content', indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow'))
    upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), (el) =>
      el.setAttribute('href', indexable ? SITE + (path === '/' ? '/' : path) : SITE + '/'))
    // Halaman lain mengatur judulnya sendiri; beranda tidak, jadi kembalikan ke judul default.
    if (path === '/') document.title = HOME_TITLE
  }, [pathname])
}
