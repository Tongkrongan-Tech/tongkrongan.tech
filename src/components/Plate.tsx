import type { ReactNode } from 'react'
import { usePrefs } from '../lib/prefs'

/* Papan nama: motif identitas situs. Alamat tampil di papan dan huruf yang baru muncul berbalik, seperti papan jadwal terminal.
   Dipakai di hero dan adegan scroll agar pengguna melihat satu benda yang sama berubah dari ketikan sampai aktif.
   Tinggi papan selalu tetap: nama maksimal dua baris, ukuran hurufnya menyesuaikan panjang nama dengan satuan cqw
   (lebar papan), tempat dua baris selalu disediakan, dan domain punya baris sendiri. Jadi tata letak di sekitarnya tidak bergeser. */
const TILE = 1 // lebar satu ubin huruf dalam em, termasuk jarak
export function Plate({ name, stamp, children, size = 'lg', className = '' }: { name: string; stamp?: string | null; children?: ReactNode; size?: 'md' | 'lg'; className?: string }) {
  const { t, domain } = usePrefs()
  const shown = name || ''
  const base = size === 'lg' ? 'clamp(1.7rem, 5.2vw, 3.1rem)' : 'clamp(1.2rem, 3.6vw, 1.9rem)'
  const len = Math.max(shown.length, 4)
  const lines = len > 10 ? 2 : 1
  const perLine = Math.ceil(len / lines)
  const nameSize = `min(${base}, calc(88cqw / ${(perLine * TILE).toFixed(2)}))`
  const domSize = `min(calc(${base} * 0.9), calc(88cqw / ${((domain.length + 1) * 0.6).toFixed(1)}))`
  return (
    <div className={`plate px-5 pb-5 pt-6 sm:px-7 sm:pb-6 sm:pt-7 ${className}`}>
      {['left-2 top-2', 'right-2 top-2', 'left-2 bottom-2', 'right-2 bottom-2'].map((p) => <span key={p} className={`screw ${p}`} />)}
      <p className="text-xs font-semibold" style={{ color: 'var(--board-dim)' }}>{t('plate.label')}</p>
      <div className="mt-2" style={{ containerType: 'inline-size' }} aria-label={`${shown || t('name.placeholder')}.${domain}`} role="text">
        <p className="m-0 flex items-center break-all font-extrabold leading-[1.4] tracking-tight" style={{ fontSize: nameSize, minHeight: `calc(2.8 * ${base})` }} aria-hidden="true">
          <span>
            {shown ? [...shown].map((ch, i) => <span key={`${i}-${ch}`} className="tile tile-new">{ch}</span>) : <span style={{ color: 'var(--board-dim)', opacity: 0.55 }}>{t('name.placeholder')}</span>}
          </span>
        </p>
        <p className="m-0 mt-1 whitespace-nowrap font-extrabold leading-[1.2] tracking-tight" style={{ fontSize: domSize, color: 'var(--board-dim)' }} aria-hidden="true">.{domain}</p>
      </div>
      {children && <div className="mt-4 border-t pt-3" style={{ borderColor: 'rgba(246,243,236,.18)' }}>{children}</div>}
      {stamp && (
        <span key={stamp} className="stamp absolute -right-3 -top-4 rounded-[3px] border-[3px] px-3 py-1 text-base font-extrabold sm:text-lg" style={{ borderColor: 'var(--hl)', color: 'var(--hl)', background: 'var(--board)' }}>{stamp}</span>
      )}
    </div>
  )
}
