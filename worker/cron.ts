import { deleteRecord, flaggedBySafeBrowsing, healthCheck, verifyRecord } from './dns'
import type { Env } from './lib'
import { getConnection, verifyProjectDomain } from './vercel'
import type { RecordType } from '../src/lib/dns'

type Row = { name: string; user_id: string; platform: string; vercel_project: string | null; type: RecordType; value: string; cf_record_id: string | null; txt_record_id: string | null; status: string; created_at: number; activated_at: number | null }
const DAY = 864e5

async function hist(env: Env, name: string, key: string, detail?: string) {
  await env.DB.prepare('INSERT INTO history (name, key, detail, at) VALUES (?, ?, ?, ?)').bind(name, key, detail ?? null, Date.now()).run()
}

// Dijalankan oleh Cron Trigger (lihat wrangler.jsonc). Tiap tahap dibatasi agar muat di satu eksekusi.
export async function runCron(env: Env) {
  const now = Date.now()

  // 1. Subdomain yang belum pernah aktif dan lewat 24 jam dilepas (mencegah record menggantung).
  const stale = await env.DB.prepare("SELECT * FROM subdomains WHERE activated_at IS NULL AND status IN ('pending','failed','verifying') AND created_at < ? LIMIT 50").bind(now - DAY).all<Row>()
  for (const s of stale.results) {
    try {
      await deleteRecord(env, s.cf_record_id)
      await deleteRecord(env, s.txt_record_id)
      await env.DB.batch([
        env.DB.prepare('DELETE FROM history WHERE name = ?').bind(s.name),
        env.DB.prepare('DELETE FROM subdomains WHERE name = ?').bind(s.name),
      ])
    } catch (e) { console.error('cleanup', s.name, e) }
  }

  // 2. Coba verifikasi ulang yang masih menunggu.
  const waiting = await env.DB.prepare("SELECT * FROM subdomains WHERE status IN ('pending','failed') AND created_at >= ? ORDER BY last_check_at LIMIT 20").bind(now - DAY).all<Row>()
  for (const s of waiting.results) {
    // Vercel hanya mengecek TXT saat diminta, jadi dorong verifikasinya lagi sekarang setelah DNS menyebar.
    if (s.platform === 'vercel' && s.vercel_project) {
      const conn = await getConnection(env, s.user_id).catch(() => null)
      if (conn) await verifyProjectDomain(conn, s.vercel_project, `${s.name}.${env.BASE_DOMAIN}`).catch(() => {})
    }
    const r = await verifyRecord(env, s)
    await env.DB.prepare('UPDATE subdomains SET last_check_at = ? WHERE name = ?').bind(now, s.name).run()
    if (r.ok) {
      await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL, activated_at = COALESCE(activated_at, ?) WHERE name = ?").bind(now, s.name).run()
      await hist(env, s.name, 'h.active')
    }
  }

  // 3. Health check subdomain aktif, simpan hasilnya, tandai gagal bila 5 cek terakhir mati (deteksi takeover).
  const active = await env.DB.prepare("SELECT name FROM subdomains WHERE status = 'active' ORDER BY RANDOM() LIMIT 50").all<{ name: string }>()
  for (const { name } of active.results) {
    const ok = await healthCheck(env, name)
    await env.DB.prepare('INSERT INTO checks (name, ok, at) VALUES (?, ?, ?)').bind(name, ok ? 1 : 0, now).run()
    await env.DB.prepare('DELETE FROM checks WHERE name = ? AND id NOT IN (SELECT id FROM checks WHERE name = ? ORDER BY id DESC LIMIT 30)').bind(name, name).run()
    if (!ok) {
      const last = await env.DB.prepare('SELECT ok FROM checks WHERE name = ? ORDER BY id DESC LIMIT 5').bind(name).all<{ ok: number }>()
      if (last.results.length === 5 && last.results.every((x) => !x.ok)) {
        await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = 'down' WHERE name = ?").bind(name).run()
        await hist(env, name, 'h.failed', 'down')
      }
    }
  }

  // 4. Daftar ancaman: tangguhkan otomatis bila terdeteksi.
  const all = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE status = 'active' LIMIT 400").all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
  const flagged = await flaggedBySafeBrowsing(env, all.results.map((x) => x.name))
  for (const s of all.results.filter((x) => flagged.has(x.name))) {
    await deleteRecord(env, s.cf_record_id)
    await deleteRecord(env, s.txt_record_id)
    await env.DB.prepare("UPDATE subdomains SET status = 'suspended', fail_reason = 'suspended', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(s.name).run()
    await hist(env, s.name, 'h.suspended', 'safe-browsing')
  }
}
