import { useEffect, useId, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { checkName, type NameState } from '../lib/names'
import { api } from '../lib/api'
import { usePrefs } from '../lib/prefs'
import { Spinner, Icon } from './ui'

type CheckState = NameState | { kind: 'error' }

export function useNameCheck(value: string) {
  const [state, setState] = useState<CheckState>({ kind: 'empty' })
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  useEffect(() => {
    const n = value.trim().toLowerCase()
    setSuggestions([])
    const local = checkName(n)
    if (local.kind === 'empty' || local.kind === 'invalid') { setState(local); setChecking(false); return }
    setChecking(true)
    let dead = false
    const id = setTimeout(async () => {
      try {
        const r = await api<{ state: 'ok' | 'taken' | 'invalid'; reason?: string; mine?: boolean; suggestions?: string[] }>(`/check?name=${encodeURIComponent(n)}`)
        if (dead) return
        setState(r.state === 'ok' ? { kind: 'ok' } : r.state === 'taken' ? { kind: 'taken', mine: r.mine } : { kind: 'invalid', reason: r.reason as 'reserved' })
        setSuggestions(r.suggestions ?? [])
      } catch {
        if (!dead) setState({ kind: 'error' })
      } finally { if (!dead) setChecking(false) }
    }, 350)
    return () => { dead = true; clearTimeout(id) }
  }, [value])
  return { state, checking, suggestions }
}

export function NameChecker({ value, onChange, cta = true, onPick }: { value: string; onChange: (v: string) => void; cta?: boolean; onPick?: (v: string) => void }) {
  const { t, domain } = usePrefs()
  const id = useId()
  const { state, checking, suggestions } = useNameCheck(value)
  const clean = value.trim().toLowerCase()
  const msgKey = state.kind === 'error' ? 'name.checkFail' : state.kind === 'invalid' ? `name.err.${state.reason}` : state.kind === 'taken' ? (state.mine ? 'name.mine' : 'name.taken') : state.kind === 'ok' ? 'name.ok' : 'name.hint'
  const tone = checking ? 'var(--muted)' : state.kind === 'ok' ? 'var(--ok)' : state.kind === 'empty' ? 'var(--muted)' : 'var(--bad)'

  return (
    <div>
      <label htmlFor={id} className="label">{t('name.label')}</label>
      <div className="card flex flex-col gap-0 overflow-hidden sm:flex-row sm:items-stretch" style={{ boxShadow: 'var(--shadow)' }}>
        <div className="flex min-w-0 flex-1 items-center">
          <input
            id={id} value={value} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
            placeholder={t('name.placeholder')} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40}
            aria-describedby={`${id}-msg`} aria-invalid={state.kind === 'invalid' || state.kind === 'taken' || state.kind === 'error'}
            className="h-16 min-w-0 flex-1 border-0 bg-transparent px-5 text-lg font-semibold sm:text-xl"
            style={{ color: 'var(--ink)', outlineOffset: -4 }}
          />
          <span className="hidden pr-4 text-lg font-medium sm:inline" style={{ color: 'var(--muted)' }}>.{domain}</span>
        </div>
        {cta && (
          state.kind === 'ok' && !checking ? (
            <Link to={`/claim?name=${clean}`} className="btn btn-primary !min-h-14 !rounded-none sm:!min-h-16" style={{ borderWidth: '0 0 0 0', borderLeft: '2px solid var(--line)', boxShadow: 'none' }}>
              {t('name.claim')}
            </Link>
          ) : (
            <button type="button" disabled className="btn !min-h-14 !rounded-none sm:!min-h-16" style={{ border: 0, borderLeft: '2px solid var(--line)', boxShadow: 'none', background: 'var(--surface-2)' }}>
              {t('name.claimDisabled')}
            </button>
          )
        )}
      </div>
      <div id={`${id}-msg`} aria-live="polite" className="mt-3 min-h-[3.5rem]">
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: tone }}>
          {checking ? <Spinner size={16} /> : state.kind === 'ok' ? <Icon.check size={16} /> : state.kind === 'empty' ? null : <Icon.x size={16} />}
          <span>{checking ? t('name.checking') : t(msgKey, { name: clean })}</span>
        </div>
        <AnimatePresence>
          {!checking && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-wrap items-center gap-2">
              <span className="hint">{t('name.suggest')}</span>
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => { onChange(s); onPick?.(s) }} className="cursor-pointer rounded-lg border-2 px-3 py-1 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ borderColor: 'var(--line)', background: 'var(--surface)', color: 'var(--ink)' }}>
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
