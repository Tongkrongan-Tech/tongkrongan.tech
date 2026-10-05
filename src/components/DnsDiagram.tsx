import { motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import type { RecordType } from '../lib/dns'

/* Diagram DNS: pengunjung -> DNS domain induk -> platform pengguna.
   Panah dan record yang sedang diisi menyala, supaya pengguna paham apa yang sedang ia ubah. */
export function DnsDiagram({ name, type, value, platform, focus }: { name: string; type: RecordType; value: string; platform: string; focus: 'name' | 'type' | 'value' | null }) {
  const { t, domain } = usePrefs()
  const host = `${name || t('diagram.yourName')}.${domain}`
  const target = value.trim() || t('diagram.yourTarget')
  const glow = (on: boolean) => ({ stroke: on ? 'var(--accent-text)' : 'var(--line)', strokeWidth: on ? 4 : 2.5 })
  return (
    <figure className="card p-4 sm:p-6">
      <svg viewBox="0 0 560 250" role="img" aria-label={t('diagram.alt', { host, type, target })} className="h-auto w-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1l8 4-8 4z" fill="var(--ink)" /></marker>
        </defs>
        {/* pengunjung */}
        <g>
          <rect x="10" y="95" width="120" height="60" rx="12" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2.5" />
          <text x="70" y="130" textAnchor="middle" fontSize="14" fontWeight="600" fill="var(--ink)">{t('diagram.visitor')}</text>
        </g>
        {/* DNS */}
        <motion.g animate={{ scale: focus === 'name' || focus === 'type' ? 1.02 : 1 }} style={{ transformOrigin: '280px 125px' }}>
          <rect x="190" y="50" width="180" height="150" rx="14" fill="var(--surface)" {...glow(focus === 'name' || focus === 'type')} />
          <text x="280" y="76" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--muted)">DNS {domain}</text>
          <rect x="204" y="90" width="152" height="30" rx="8" fill="var(--hl)" />
          <text x="280" y="110" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--hl-ink)">{host.length > 22 ? host.slice(0, 21) + '…' : host}</text>
          <rect x="204" y="130" width="152" height="56" rx="8" fill="var(--surface-2)" stroke={focus === 'type' || focus === 'value' ? 'var(--accent-text)' : 'transparent'} strokeWidth="3" />
          <text x="214" y="152" fontSize="13" fontWeight="700" fill="var(--accent-text)">{type}</text>
          <text x="214" y="174" fontSize="12" fontWeight="500" fill="var(--ink)">{target.length > 20 ? target.slice(0, 19) + '…' : target}</text>
        </motion.g>
        {/* platform */}
        <g>
          <rect x="430" y="95" width="120" height="60" rx="12" fill="var(--accent)" stroke={focus === 'value' ? 'var(--ink)' : 'var(--line)'} strokeWidth={focus === 'value' ? 4 : 2.5} />
          <text x="490" y="130" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--accent-ink)">{platform}</text>
        </g>
        {/* panah: dua jalur, aliran bergerak */}
        <line x1="132" y1="125" x2="188" y2="125" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arrow)" />
        <line x1="372" y1="125" x2="428" y2="125" stroke="var(--ink)" strokeWidth="2.5" markerEnd="url(#arrow)" strokeDasharray="6 6" className="flow" />
        <text x="160" y="116" textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--muted)">1</text>
        <text x="400" y="116" textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--muted)">2</text>
        <text x="280" y="228" textAnchor="middle" fontSize="12" fontWeight="500" fill="var(--muted)">{t('diagram.caption')}</text>
      </svg>
    </figure>
  )
}
