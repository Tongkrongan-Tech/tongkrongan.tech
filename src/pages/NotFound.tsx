import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { usePrefs } from '../lib/prefs'
import { Hang } from '../components/fx'

export function NotFound() {
  const { t } = usePrefs()
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <Hang>
        <motion.div initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100, damping: 9 }} className="plate mx-auto max-w-xs px-6 py-8">
          {['left-2 top-2', 'right-2 top-2', 'left-2 bottom-2', 'right-2 bottom-2'].map((p) => <span key={p} className={`screw ${p}`} />)}
          <p className="text-[5rem] font-extrabold leading-none tracking-tight">{[...'404'].map((c, i) => <span key={i} className="tile tile-new" style={{ animationDelay: `${0.3 + i * 0.15}s` }}>{c}</span>)}</p>
        </motion.div>
      </Hang>
      <h1 className="mt-10 text-3xl">{t('nf.h')}</h1>
      <p className="lead mt-2">{t('nf.d')} {t('nf.hint')}</p>
      <Link to="/" className="btn btn-primary mt-8">{t('nf.cta')}</Link>
    </div>
  )
}
