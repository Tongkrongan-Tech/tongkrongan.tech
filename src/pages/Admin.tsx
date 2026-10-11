import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../lib/api'
import { usePrefs } from '../lib/prefs'
import { ADMIN_REASONS, adminToken } from '../lib/admin'
import { Spinner } from '../components/ui'

/* UI moderasi untuk maintainer: laporan terbuka, tangguhkan subdomain, blokir akun.
   Token (ADMIN_TOKEN) hanya hidup di sessionStorage tab ini. Halaman ini tidak ditautkan di navigasi dan tidak diindeks. */

type Report = { id: string; name: string; reason: string; detail: string | null; status: string; at: number }
type Info = { name: string; platform: string; type: string; value: string; status: string; created_at: number; activated_at: number | null; owner_email: string; owner_blocked: number }
type Review = { name: string; platform: string; type: string; value: string; status: string; activated_at: number | null; owner_email: string; owner_blocked: number; flagged_at: number }
type Confirm = { id: string; kind: 'suspend' | 'block' | 'restore' | 'unblock'; target: string; reason?: string }

const fmt = (ms: number) => new Date(ms).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })

/* Konfirmasi selalu menampilkan akibat nyata tindakannya. Tindakan memulihkan
   (restore, unblock) ditampilkan dengan warna tindakan aman, bukan merah. */
const CONFIRM_TEXT: Record<Confirm['kind'], string> = {
  suspend: 'Record DNS akan dihapus.',
  restore: 'Record DNS dibuat ulang dan status kembali menunggu verifikasi.',
  block: 'Semua sesi akun dicabut.',
  unblock: 'Akun bisa masuk kembali.',
}
const DESTRUCTIVE: Confirm['kind'][] = ['suspend', 'block']

/* Ringkasan data subdomain, dipakai bersama oleh kartu laporan dan antrean tinjauan. */
function Detail({ data }: { data: Info }) {
  return (
    <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
      <dt style={{ color: 'var(--muted)' }}>Status</dt><dd className="font-bold" style={{ color: data.status === 'suspended' ? 'var(--bad)' : 'var(--ink)' }}>{data.status}</dd>
      <dt style={{ color: 'var(--muted)' }}>Tujuan</dt><dd className="break-all font-semibold">{data.platform} &middot; {data.type} &middot; {data.value}</dd>
      <dt style={{ color: 'var(--muted)' }}>Pemilik</dt><dd className="break-all font-semibold">{data.owner_email}{data.owner_blocked ? ' (diblokir)' : ''}</dd>
      <dt style={{ color: 'var(--muted)' }}>Dibuat</dt><dd className="font-semibold">{fmt(data.created_at)}{data.activated_at ? `, aktif ${fmt(data.activated_at)}` : ', belum pernah aktif'}</dd>
    </dl>
  )
}

export function Admin() {
  const { domain } = usePrefs()
  const [token, setToken] = useState<string | null>(() => adminToken.get())
  const [draft, setDraft] = useState('')
  const [reports, setReports] = useState<Report[] | null>(null)
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const [info, setInfo] = useState<Record<string, Info | 'loading' | 'missing'>>({})
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualEmail, setManualEmail] = useState('')

  useEffect(() => { document.title = 'Moderasi | Tongkrongan.tech' }, [])

  const call = useCallback(<T,>(path: string, init?: { method?: string; body?: unknown }) =>
    api<T>(path, { ...init, headers: { authorization: `Bearer ${token ?? ''}` } }), [token])

  const logout = useCallback((why = '') => { adminToken.clear(); setToken(null); setReports(null); setReviews(null); setInfo({}); setConfirm(null); setErr(why) }, [])

  const handle = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) { logout('Token salah atau sudah tidak berlaku.'); return }
    if (e instanceof ApiError && e.status === 404 && e.code === 'not_found') { setErr('Data tidak ditemukan.'); return }
    if (e instanceof ApiError && e.status === 409 && e.code === 'not_suspended') { setErr('Status subdomain berubah. Muat ulang dulu lalu periksa kembali.'); return }
    setErr(e instanceof ApiError && e.code === 'network' ? 'Tidak bisa terhubung ke server.' : 'Terjadi galat. Coba lagi.')
  }, [logout])

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true); setErr('')
    try {
      const [rep, rev] = await Promise.all([
        call<{ reports: Report[] }>('/admin/reports'),
        call<{ reviews: Review[] }>('/admin/reviews'),
      ])
      setReports(rep.reports); setReviews(rev.reviews)
    } catch (e) { handle(e) }
    setLoading(false)
  }, [token, call, handle])

  useEffect(() => { void load() }, [load])

  async function signIn(e: FormEvent) {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    adminToken.set(v); setToken(v); setDraft(''); setNotice('')
  }

  async function inspect(name: string) {
    setInfo((m) => ({ ...m, [name]: 'loading' }))
    try {
      const r = await call<{ subdomain: Info }>(`/admin/subdomains/${encodeURIComponent(name)}`)
      setInfo((m) => ({ ...m, [name]: r.subdomain }))
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setInfo((m) => ({ ...m, [name]: 'missing' }))
      else { setInfo((m) => { const { [name]: _, ...rest } = m; return rest }); handle(e) }
    }
  }

  async function run() {
    if (!confirm) return
    setBusy(true); setErr(''); setNotice('')
    const setBlocked = (value: number) =>
      setInfo((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, typeof v === 'object' && v.owner_email === confirm.target ? { ...v, owner_blocked: value } : v])))
    try {
      if (confirm.kind === 'suspend') {
        await call('/admin/suspend', { body: { name: confirm.target, reason: confirm.reason ?? 'moderasi' } })
        setNotice(`${confirm.target}.${domain} ditangguhkan dan record DNS-nya dihapus.`)
        await inspect(confirm.target)
      } else if (confirm.kind === 'restore') {
        await call('/admin/restore', { body: { name: confirm.target } })
        setNotice(`${confirm.target}.${domain} dipulihkan. Record DNS dibuat ulang dan menunggu verifikasi ulang.`)
        await inspect(confirm.target)
      } else if (confirm.kind === 'unblock') {
        await call('/admin/unblock', { body: { email: confirm.target } })
        setNotice(`Blokir atas akun ${confirm.target} dibuka. Pengguna bisa masuk kembali.`)
        setBlocked(0)
      } else {
        await call('/admin/block', { body: { email: confirm.target } })
        setNotice(`Akun ${confirm.target} diblokir dan semua sesinya dicabut.`)
        setBlocked(1)
      }
      setConfirm(null)
    } catch (e) { handle(e); setConfirm(null) }
    setBusy(false)
  }

  async function resolve(id: string) {
    setBusy(true); setErr(''); setNotice('')
    try { await call(`/admin/reports/${id}/resolve`, { method: 'POST' }); setReports((r) => r?.filter((x) => x.id !== id) ?? r); setNotice(`Laporan #${id} ditandai selesai.`) } catch (e) { handle(e) }
    setBusy(false)
  }

  /* ---------- gerbang token ---------- */
  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Moderasi</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Khusus maintainer. Masukkan ADMIN_TOKEN. Token hanya disimpan di tab ini dan hilang saat tab ditutup.</p>
        <form onSubmit={signIn} className="card mt-6 grid gap-4 p-6" style={{ boxShadow: 'var(--shadow)' }}>
          <div>
            <label htmlFor="adm-token" className="label">Token admin</label>
            <input id="adm-token" type="password" autoComplete="off" className="field" value={draft} onChange={(e) => setDraft(e.target.value)} aria-describedby="adm-err" />
            <p id="adm-err" role="alert" className="mt-1.5 text-sm font-semibold empty:hidden" style={{ color: 'var(--bad)' }}>{err}</p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>Masuk</button>
        </form>
      </div>
    )
  }

  const Action = ({ id, kind, target, reason, label, disabled }: { id: string; kind: Confirm['kind']; target: string; reason?: string; label: string; disabled?: boolean }) => {
    const open = confirm?.id === id
    if (!open) return <button type="button" className="btn !min-h-10 !px-3 !text-sm" disabled={disabled || busy} onClick={() => setConfirm({ id, kind, target, reason })}>{label}</button>
    const danger = DESTRUCTIVE.includes(kind)
    return (
      <span role="group" aria-label="Konfirmasi" className="inline-flex flex-wrap items-center gap-2 rounded-xl border-2 p-1.5 pl-3 text-sm font-semibold" style={{ borderColor: danger ? 'var(--bad)' : 'var(--ok)' }}>
        {CONFIRM_TEXT[kind]}
        <button type="button" className={`btn !min-h-9 !px-3 !text-sm ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={() => void run()}>{busy ? <Spinner /> : 'Ya, lanjut'}</button>
        <button type="button" className="btn btn-ghost !min-h-9 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }} disabled={busy} onClick={() => setConfirm(null)}>Batal</button>
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Moderasi</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>{reports ? `${reports.length} laporan terbuka` : 'Memuat laporan'}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn !min-h-10 !px-4 !text-sm" onClick={() => void load()} disabled={loading}>{loading ? <Spinner /> : 'Muat ulang'}</button>
          <button type="button" className="btn btn-ghost !min-h-10 !px-4 !text-sm" style={{ border: '2px solid var(--line)' }} onClick={() => logout()}>Keluar</button>
        </div>
      </div>

      <div aria-live="polite">
        {notice && <p role="status" className="mt-5 rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--ok)', color: 'var(--ok)' }}>{notice}</p>}
        {err && <p role="alert" className="mt-5 rounded-xl border-2 p-3 text-sm font-semibold" style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}>{err}</p>}
      </div>

      <section aria-label="Laporan terbuka" className="mt-6 grid gap-4">
        {reports && reports.length === 0 && (
          <div className="card p-8 text-center"><p className="text-lg font-bold">Tidak ada laporan terbuka.</p><p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Laporan baru akan muncul di sini.</p></div>
        )}
        {reports?.map((r) => {
          const meta = ADMIN_REASONS[r.reason] ?? { label: r.reason, severe: false }
          const i = info[r.name]
          const data = typeof i === 'object' ? i : null
          return (
            <article key={r.id} className="card p-5" style={{ boxShadow: 'var(--shadow)' }}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="rounded-md border-2 px-2 py-0.5 text-xs font-extrabold" style={{ borderColor: meta.severe ? 'var(--bad)' : 'var(--line)', color: meta.severe ? 'var(--bad)' : 'var(--ink)' }}>{meta.label}</span>
                <a href={`https://${r.name}.${domain}`} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-lg font-extrabold underline-offset-4 hover:underline" style={{ color: 'var(--ink)' }}>{r.name}.{domain}</a>
                <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--muted)' }}>#{r.id} &middot; {fmt(r.at)}</span>
              </div>
              {r.detail && <p className="mt-3 whitespace-pre-wrap break-words rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)' }}>{r.detail}</p>}

              <div className="mt-4">
                {!i && <button type="button" className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }} onClick={() => void inspect(r.name)}>Periksa subdomain dan pemilik</button>}
                {i === 'loading' && <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}><Spinner /> Memeriksa</p>}
                {i === 'missing' && <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Subdomain ini sudah tidak ada.</p>}
                {data && <Detail data={data} />}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Action id={`s-${r.id}`} kind="suspend" target={r.name} reason={r.reason} label="Tangguhkan subdomain" disabled={data?.status === 'suspended' || i === 'missing'} />
                {data?.status === 'suspended' && <Action id={`r-${r.id}`} kind="restore" target={r.name} label="Pulihkan subdomain" />}
                {data && (data.owner_blocked
                  ? <Action id={`b-${r.id}`} kind="unblock" target={data.owner_email} label="Buka blokir pemilik" />
                  : <Action id={`b-${r.id}`} kind="block" target={data.owner_email} label="Blokir pemilik" />)}
                <button type="button" className="btn btn-primary !min-h-10 !px-3 !text-sm sm:ml-auto" disabled={busy} onClick={() => void resolve(r.id)}>Tandai selesai</button>
              </div>
            </article>
          )
        })}
      </section>

      <section aria-label="Antrean tinjauan" className="card mt-10 p-5">
        <h2 className="text-lg font-extrabold">Antrean tinjauan</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Subdomain yang ditandai otomatis karena namanya menyerupai merek atau tokoh. Penanda dibuat Cron dan tidak pernah dihapus, jadi daftar bersifat kumulatif.</p>
        {reviews === null && <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>Memuat antrean</p>}
        {reviews && reviews.length === 0 && <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--muted)' }}>Antrean kosong.</p>}
        <ul className="mt-4 grid gap-3">
          {reviews?.map((rv) => {
            const i = info[rv.name]
            const data = typeof i === 'object' ? i : null
            return (
              <li key={rv.name} className="rounded-xl border-2 p-4" style={{ borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <a href={`https://${rv.name}.${domain}`} target="_blank" rel="noopener noreferrer nofollow" className="break-all font-extrabold underline-offset-4 hover:underline" style={{ color: 'var(--ink)' }}>{rv.name}.{domain}</a>
                  <span className="rounded-md border-2 px-2 py-0.5 text-xs font-extrabold" style={{ borderColor: rv.status === 'suspended' ? 'var(--bad)' : 'var(--line)', color: rv.status === 'suspended' ? 'var(--bad)' : 'var(--ink)' }}>{rv.status}</span>
                  <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--muted)' }}>ditandai {fmt(rv.flagged_at)}</span>
                </div>
                <p className="mt-2 break-all text-sm font-semibold" style={{ color: 'var(--muted)' }}>Pemilik: {rv.owner_email}{rv.owner_blocked ? ' (diblokir)' : ''}</p>
                <p className="mt-1 break-all text-sm" style={{ color: 'var(--muted)' }}>Tujuan: {rv.platform} &middot; {rv.type} &middot; {rv.value}</p>
                <div className="mt-3">
                  {!i && <button type="button" className="btn btn-ghost !min-h-10 !px-3 !text-sm" style={{ border: '2px solid var(--line)' }} onClick={() => void inspect(rv.name)}>Periksa subdomain dan pemilik</button>}
                  {i === 'loading' && <p className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--muted)' }}><Spinner /> Memeriksa</p>}
                  {i === 'missing' && <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>Subdomain ini sudah tidak ada.</p>}
                  {data && <Detail data={data} />}
                </div>
                {data && (data.status === 'suspended' || data.owner_blocked) && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {data.status === 'suspended' && <Action id={`rr-${rv.name}`} kind="restore" target={rv.name} label="Pulihkan subdomain" />}
                    {data.owner_blocked ? <Action id={`ru-${rv.name}`} kind="unblock" target={data.owner_email} label="Buka blokir pemilik" /> : null}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section aria-label="Tindakan manual" className="card mt-10 p-5">
        <h2 className="text-lg font-extrabold">Tindakan manual</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>Untuk kasus yang tidak datang dari laporan.</p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="m-name" className="label">Nama subdomain</label>
            <input id="m-name" className="field" value={manualName} onChange={(e) => setManualName(e.target.value.toLowerCase().trim())} placeholder="nama" autoComplete="off" spellCheck={false} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Action id="m-suspend" kind="suspend" target={manualName} reason="moderasi manual" label="Tangguhkan" disabled={!/^[a-z0-9-]{3,32}$/.test(manualName)} />
              <Action id="m-restore" kind="restore" target={manualName} label="Pulihkan" disabled={!/^[a-z0-9-]{3,32}$/.test(manualName)} />
            </div>
          </div>
          <div>
            <label htmlFor="m-email" className="label">Email akun</label>
            <input id="m-email" type="email" className="field" value={manualEmail} onChange={(e) => setManualEmail(e.target.value.trim())} placeholder="user@email.com" autoComplete="off" spellCheck={false} />
            <div className="mt-3 flex flex-wrap gap-2">
              <Action id="m-block" kind="block" target={manualEmail.toLowerCase()} label="Blokir akun" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(manualEmail)} />
              <Action id="m-unblock" kind="unblock" target={manualEmail.toLowerCase()} label="Buka blokir" disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(manualEmail)} />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
