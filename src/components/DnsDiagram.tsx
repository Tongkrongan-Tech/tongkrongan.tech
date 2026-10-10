import { motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import type { RecordType } from '../lib/dns'

/* Diagram DNS vertikal: pengunjung -> DNS domain induk -> platform pengguna.
   Vertikal agar muat di kolom sempit dan HP tanpa mengecilkan teks. Panah dan record yang sedang diisi menyala,
   supaya pengguna paham apa yang sedang ia ubah. */
export function DnsDiagram({ name, type, value, platform, focus, className = '' }: { name: string; type: RecordType; value: string; platform: string; focus: 'name' | 'type' | 'value' | null; className?: string }) {
  const { t, domain } = usePrefs()
  const host = `${name || t('diagram.yourName')}.${domain}`
  const target = value.trim() || t('diagram.yourTarget')
  const glow = (on: boolean) => ({ stroke: on ? 'var(--accent-text)' : 'var(--line)', strokeWidth: on ? 4 : 2.5 })
  return (
    <figure className={`card p-4 sm:p-6 ${className}`}>
      <svg viewBox="0 0 360 410" role="img" aria-label={t('diagram.alt', { host, type, target })} className="mx-auto h-auto w-full max-w-[340px]">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1l8 4-8 4z" fill="var(--ink)" /></marker>
        </defs>
        {/* pengunjung */}
        <g>
          <rect x="100" y="6" width="160" height="52" rx="12" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2.5" />
          <text x="180" y="38" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--ink)">{t('diagram.visitor')}</text>
        </g>
        {/* DNS */}
        <motion.g animate={{ scale: focus === 'name' || focus === 'type' ? 1.02 : 1 }} style={{ transformOrigin: '180px 200px' }}>
          <rect x="24" y="112" width="312" height="176" rx="14" fill="var(--surface)" {...glow(focus === 'name' || focus === 'type')} />
          <text x="180" y="139" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--muted)">DNS {domain}</text>
          <rect x="40" y="152" width="280" height="34" rx="8" fill="var(--hl)" />
          <text x="180" y="174" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--hl-ink)">{host.length > 27 ? host.slice(0, 26) + '…' : host}</text>
          <rect x="40" y="196" width="280" height="80" rx="8" fill="var(--surface-2)" stroke={focus === 'type' || focus === 'value' ? 'var(--accent-text)' : 'transparent'} strokeWidth="3" />
          <text x="56" y="223" fontSize="14" fontWeight="700" fill="var(--accent-text)">{type}</text>
          <text x="56" y="253" fontSize="15" fontWeight="500" fill="var(--ink)">{target.length > 28 ? target.slice(0, 27) + '…' : target}</text>
        </motion.g>
        {/* platform */}
        <g>
          <rect x="90" y="344" width="180" height="56" rx="12" fill="var(--accent)" stroke={focus === 'value' ? 'var(--ink)' : 'var(--line)'} strokeWidth={focus === 'value' ? 4 : 2.5} />
          <text x="180" y="378" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--accent-ink)">{platform.length > 16 ? platform.slice(0, 15) + '…' : platform}</text>
        </g>
        {/* panah: dua jalur, aliran bergerak */}
        <line x1="180" y1="60" x2="180" y2="110" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arrow)" />
        <line x1="180" y1="290" x2="180" y2="342" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arrow)" strokeDasharray="6 6" className="flow" />
        <text x="196" y="90" fontSize="13" fontWeight="600" fill="var(--muted)">1</text>
        <text x="196" y="322" fontSize="13" fontWeight="600" fill="var(--muted)">2</text>
      </svg>
      <figcaption className="mt-4 text-center text-xs" style={{ color: 'var(--muted)' }}>{t('diagram.caption')}</figcaption>
    </figure>
  )
}
