import { deleteRecord, flaggedBySafeBrowsing, healthCheck, hostOf, verifyRecord } from './dns'
import { fetchPageText, scanAbuse } from './abuse'
import { classifyName } from '../src/lib/reserved'
import type { Env } from './lib'
import { notifyClaimActive } from './notify'
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

  // 0. Bersihkan data kedaluwarsa: sesi, token reset sandi, dan kode OTP.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM email_otps WHERE expires_at < ?').bind(now),
  ])

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
      if (!s.activated_at) await notifyClaimActive(env, s.name, s.platform)
    }
  }

  // 3. Health check subdomain aktif, dan subdomain gagal (down) supaya bisa pulih sendiri.
  const active = await env.DB.prepare("SELECT name, status, cf_record_id, txt_record_id FROM subdomains WHERE status = 'active' OR (status = 'failed' AND fail_reason IN ('down', 'takeover')) ORDER BY RANDOM() LIMIT 50").all<{ name: string; status: string; cf_record_id: string | null; txt_record_id: string | null }>()
  for (const { name, status, cf_record_id, txt_record_id } of active.results) {
    const ok = await healthCheck(env, name)
    await env.DB.prepare('INSERT INTO checks (name, ok, at) VALUES (?, ?, ?)').bind(name, ok ? 1 : 0, now).run()
    await env.DB.prepare('DELETE FROM checks WHERE name = ? AND id NOT IN (SELECT id FROM checks WHERE name = ? ORDER BY id DESC LIMIT 30)').bind(name, name).run()
    if (ok) {
      if (status === 'failed') {
        await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL WHERE name = ? AND status = 'failed'").bind(name).run()
        await hist(env, name, 'h.active')
      }
    } else {
      const last = await env.DB.prepare('SELECT ok FROM checks WHERE name = ? ORDER BY id DESC LIMIT 5').bind(name).all<{ ok: number }>()
      if (last.results.length === 5 && last.results.every((x) => !x.ok)) {
        try {
          if (cf_record_id) await deleteRecord(env, cf_record_id)
          if (txt_record_id) await deleteRecord(env, txt_record_id)
        } catch (err) {
          console.error('failed deleting dns on takeover', name, err)
        }
        await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = 'takeover', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(name).run()
        await hist(env, name, 'h.failed', 'takeover')
      }
    }
  }

  // 4. Daftar ancaman: tangguhkan otomatis bila terdeteksi. Acak supaya semua subdomain kebagian dipindai.
  const all = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE status = 'active' ORDER BY RANDOM() LIMIT 400").all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
  const flagged = await flaggedBySafeBrowsing(env, all.results.map((x) => x.name))
  for (const s of all.results.filter((x) => flagged.has(x.name))) {
    await deleteRecord(env, s.cf_record_id)
    await deleteRecord(env, s.txt_record_id)
    await env.DB.prepare("UPDATE subdomains SET status = 'suspended', fail_reason = 'suspended', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(s.name).run()
    await hist(env, s.name, 'h.suspended', 'safe-browsing')
  }

  // 5. Pindai isi situs subdomain aktif untuk judi online, penipuan, dan konten terlarang.
  // Ambang 2 kecocokan agar tidak salah suspensi hanya karena satu kata. Sampling acak per putaran.
  const scan = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE status = 'active' ORDER BY RANDOM() LIMIT 20").all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
  for (const s of scan.results) {
    const text = await fetchPageText(`https://${hostOf(env, s.name)}/`)
    if (!text) continue
    const hits = scanAbuse(text)
    if (hits.length >= 2) {
      await deleteRecord(env, s.cf_record_id)
      await deleteRecord(env, s.txt_record_id)
      await env.DB.prepare("UPDATE subdomains SET status = 'suspended', fail_reason = 'suspended', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(s.name).run()
      await hist(env, s.name, 'h.suspended', `abuse:${hits.slice(0, 3).join(',')}`)
    }
  }

  // 6. Tandai nama yang menyerupai merek atau tokoh untuk review manusia (tidak ditolak otomatis).
  const reviewCandidates = await env.DB.prepare("SELECT name FROM subdomains WHERE status IN ('active','pending','failed') LIMIT 200").all<{ name: string }>()
  for (const { name } of reviewCandidates.results) {
    if (!classifyName(name).review) continue
    const already = await env.DB.prepare("SELECT 1 FROM history WHERE name = ? AND key = 'h.needsReview'").bind(name).first()
    if (!already) await hist(env, name, 'h.needsReview')
  }
}
