import { useEffect, useId, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion'
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
        const r = await api<{ state: 'ok' | 'taken' | 'invalid'; reason?: string; mine?: boolean; review?: boolean; suggestions?: string[] }>(`/check?name=${encodeURIComponent(n)}`)
        if (dead) return
        setState(r.state === 'ok' ? { kind: 'ok', review: r.review ?? (local.kind === 'ok' && local.review) } : r.state === 'taken' ? { kind: 'taken', mine: r.mine } : { kind: 'invalid', reason: r.reason as 'reserved' })
        setSuggestions(r.suggestions ?? [])
      } catch {
        if (!dead) setState({ kind: 'error' })
      } finally { if (!dead) setChecking(false) }
    }, 350)
    return () => { dead = true; clearTimeout(id) }
  }, [value])
  return { state, checking, suggestions }
}

/* Bilah alamat: nama yang diketik langsung dicek. Cincin gradien berputar saat fokus; kotak bergetar halus bila nama ditolak. */
export function NameChecker({ value, onChange, cta = true, onPick, showLabel = false, hotkey = false }: { value: string; onChange: (v: string) => void; cta?: boolean; onPick?: (v: string) => void; showLabel?: boolean; hotkey?: boolean }) {
  const { t, domain } = usePrefs()
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const shake = useAnimationControls()
  const { state, checking, suggestions } = useNameCheck(value)
  const clean = value.trim().toLowerCase()
  const msgKey = state.kind === 'error' ? 'name.checkFail' : state.kind === 'invalid' ? `name.err.${state.reason}` : state.kind === 'taken' ? (state.mine ? 'name.mine' : 'name.taken') : state.kind === 'ok' ? 'name.ok' : 'name.hint'
  const tone = checking ? 'var(--muted)' : state.kind === 'ok' ? 'var(--ok)' : state.kind === 'empty' ? 'var(--muted)' : 'var(--bad)'
  const sig = checking ? 'wait' : state.kind === 'invalid' ? `invalid-${state.reason}` : state.kind
  const ok = state.kind === 'ok' && !checking

  // Getar sekali saat status berubah menjadi ditolak (bukan setiap ketukan).
  useEffect(() => {
    if (sig === 'taken' || sig === 'invalid-reserved' || sig === 'invalid-brand' || sig === 'invalid-profanity' || sig === 'invalid-chars') void shake.start({ x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.4 } })
  }, [sig, shake])

  // Tekan "/" di mana saja untuk langsung mengetik nama.
  useEffect(() => {
    if (!hotkey) return
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [contenteditable="true"]')) return
      e.preventDefault(); inputRef.current?.focus()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [hotkey])

  const glyph = checking ? <Spinner size={20} />
    : ok ? <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }} className="grid h-6 w-6 place-items-center rounded-[4px]" style={{ background: 'var(--ok)', color: 'var(--bg)' }}><Icon.check size={14} strokeWidth={3.2} /></motion.span>
    : state.kind === 'empty' ? <Icon.lock size={18} />
    : <motion.span key={sig} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 16 }} className="grid h-6 w-6 place-items-center rounded-[4px]" style={{ background: 'var(--bad)', color: 'var(--bg)' }}><Icon.x size={14} strokeWidth={3.2} /></motion.span>

  return (
    <div>
      <label htmlFor={id} className={showLabel ? 'label' : 'sr-only'}>{t('name.label')}</label>
      <motion.div animate={shake} className="namebar">
        <div className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
          <div className="flex min-h-[3.5rem] min-w-0 flex-1 cursor-text items-center gap-3 px-3 sm:min-h-[3.75rem] sm:px-4" onClick={() => inputRef.current?.focus()}>
            <span className="grid h-6 w-6 shrink-0 place-items-center" style={{ color: tone }} aria-hidden="true">{glyph}</span>
            <div className="flex min-w-0 items-baseline overflow-hidden text-[1.05rem] font-extrabold tracking-tight sm:text-[1.15rem]">
              <span className="inline-grid max-w-full">
                <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-0.5">{value || t('name.placeholder')}</span>
                <input
                  ref={inputRef} id={id} value={value} onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder={t('name.placeholder')} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40} inputMode="url"
                  aria-describedby={`${id}-msg`} aria-invalid={state.kind === 'invalid' || state.kind === 'taken' || state.kind === 'error'}
                  className="col-start-1 row-start-1 w-0 min-w-full border-0 bg-transparent px-0.5 py-0"
                  style={{ font: 'inherit', letterSpacing: 'inherit', color: 'var(--ink)', caretColor: 'var(--accent-text)' }}
                />
              </span>
              <span className="shrink-0" style={{ color: 'var(--muted)' }}>.{domain}</span>
            </div>
          </div>
          {cta && (
            ok ? (
              <Link to={`/claim?name=${clean}`} className="btn btn-primary btn-lg w-full sm:w-auto sm:!px-5">{t('name.claim')}</Link>
            ) : (
              <button type="button" disabled className="btn btn-lg w-full sm:w-auto sm:!px-5" style={{ background: 'var(--surface-2)' }}>{t('name.claimDisabled')}</button>
            )
          )}
        </div>
      </motion.div>
      <div id={`${id}-msg`} aria-live="polite" className="mt-3 min-h-[3.25rem] px-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={checking ? 'c' : msgKey} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-2 text-sm font-medium" style={{ color: tone }}>
            <span>{checking ? t('name.checking') : t(msgKey, { name: clean })}</span>
          </motion.div>
        </AnimatePresence>
        {ok && state.kind === 'ok' && state.review && <p className="hint mt-1">{t('name.review')}</p>}
        <AnimatePresence>
          {!checking && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-2 flex flex-wrap items-center gap-2">
              <span className="hint">{t('name.suggest')}</span>
              {suggestions.map((s, i) => (
                <motion.button key={s} type="button" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} onClick={() => { onChange(s); onPick?.(s); inputRef.current?.focus() }} className="chip">
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
