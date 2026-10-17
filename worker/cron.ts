import { deleteRecord, flaggedBySafeBrowsing, healthCheck, hostOf, verifyRecord } from './dns.ts'
import { fetchPageText, scanAbuse } from './abuse.ts'
import { classifyName } from '../src/lib/reserved.ts'
import type { Env } from './lib.ts'
import { notifyClaimActive } from './notify.ts'
import { getConnection, removeProjectDomain, verifyProjectDomain } from './vercel.ts'
import type { RecordType } from '../src/lib/dns'

type Row = { name: string; user_id: string; platform: string; vercel_project: string | null; type: RecordType; value: string; ownership_token: string | null; cf_record_id: string | null; txt_record_id: string | null; status: string; created_at: number; activated_at: number | null }
const DAY = 864e5

async function hist(env: Env, name: string, key: string, detail?: string) {
  await env.DB.prepare('INSERT INTO history (name, key, detail, at) VALUES (?, ?, ?, ?)').bind(name, key, detail ?? null, Date.now()).run()
}

// Dijalankan oleh Cron Trigger (lihat wrangler.jsonc). Tiap tahap dibatasi agar muat di satu eksekusi.
export async function runCron(env: Env) {
  const now = Date.now()

  // 0. Bersihkan data kedaluwarsa: sesi, token reset sandi, kode OTP, dan hitungan pembatas laju.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM password_resets WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM email_otps WHERE expires_at < ?').bind(now),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(now),
  ])

  // 0b. Akun yang mendaftar tetapi tidak pernah diverifikasi tidak boleh menggantung: sesi (bila ada),
  // OTP, dan token resetnya dicabut, lalu akunnya dihapus setelah 7 hari (#68).
  const unverifiedCutoff = now - 7 * DAY
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE verified = 0)'),
    env.DB.prepare('DELETE FROM password_resets WHERE user_id IN (SELECT id FROM users WHERE verified = 0 AND created_at < ?)').bind(unverifiedCutoff),
    env.DB.prepare('DELETE FROM email_otps WHERE user_id IN (SELECT id FROM users WHERE verified = 0 AND created_at < ?)').bind(unverifiedCutoff),
    env.DB.prepare('DELETE FROM users WHERE verified = 0 AND created_at < ?').bind(unverifiedCutoff),
  ])

  // 1. Subdomain yang belum pernah aktif dan lewat 24 jam (dihitung dari jendela verifikasi terakhir) dilepas.
  // Record DNS, sambungan domain Vercel, checks, csat, dan riwayatnya ikut dibersihkan (#70, #77).
  const stale = await env.DB.prepare("SELECT * FROM subdomains WHERE activated_at IS NULL AND status IN ('pending','failed','verifying') AND COALESCE(pending_since, created_at) < ? LIMIT 50").bind(now - DAY).all<Row>()
  for (const s of stale.results) {
    try {
      await deleteRecord(env, s.cf_record_id)
      await deleteRecord(env, s.txt_record_id)
      if (s.platform === 'vercel' && s.vercel_project) {
        const conn = await getConnection(env, s.user_id).catch(() => null)
        if (conn) await removeProjectDomain(conn, s.vercel_project, hostOf(env, s.name)).catch(() => {})
      }
      await env.DB.batch([
        env.DB.prepare('DELETE FROM history WHERE name = ?').bind(s.name),
        env.DB.prepare('DELETE FROM checks WHERE name = ?').bind(s.name),
        env.DB.prepare('DELETE FROM csat WHERE name = ?').bind(s.name),
        env.DB.prepare('DELETE FROM subdomains WHERE name = ?').bind(s.name),
      ])
    } catch (e) { console.error('cleanup', s.name, e) }
  }

  // 2. Coba verifikasi ulang yang masih menunggu. Jendela 24 jam dihitung dari pending_since agar
  // subdomain yang diedit ikut dicek ulang, bukan hanya klaim baru (#70).
  const waiting = await env.DB.prepare("SELECT * FROM subdomains WHERE status IN ('pending','failed') AND COALESCE(pending_since, created_at) >= ? ORDER BY last_check_at LIMIT 20").bind(now - DAY).all<Row>()
  for (const s of waiting.results) {
    // Vercel hanya mengecek TXT saat diminta, jadi dorong verifikasinya lagi sekarang setelah DNS menyebar.
    if (s.platform === 'vercel' && s.vercel_project) {
      const conn = await getConnection(env, s.user_id).catch(() => null)
      if (conn) await verifyProjectDomain(conn, s.vercel_project, `${s.name}.${env.BASE_DOMAIN}`).catch(() => {})
    }
    const r = await verifyRecord(env, s)
    await env.DB.prepare('UPDATE subdomains SET last_check_at = ? WHERE name = ?').bind(now, s.name).run()
    if (r.ok) {
      const activated = await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL, activated_at = COALESCE(activated_at, ?), fail_streak = 0, pending_since = NULL WHERE name = ? AND ownership_token = ? AND status IN ('pending','failed')").bind(now, s.name, s.ownership_token).run()
      if (!activated.meta.changes) continue
      await hist(env, s.name, 'h.active')
      if (!s.activated_at) await notifyClaimActive(env, s.name, s.platform)
    }
  }

  // 2b. Subdomain yang pernah aktif lalu diedit tetapi tak kunjung lolos verifikasi dalam 24 jam:
  // bekukan DNS-nya. Baris tetap ada agar pemilik bisa memverifikasi ulang dari dasbor (#70).
  const expired = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE activated_at IS NOT NULL AND status IN ('pending','failed') AND cf_record_id IS NOT NULL AND pending_since IS NOT NULL AND pending_since < ? LIMIT 50").bind(now - DAY).all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
  for (const s of expired.results) {
    try {
      if (s.cf_record_id) await deleteRecord(env, s.cf_record_id)
      if (s.txt_record_id) await deleteRecord(env, s.txt_record_id)
    } catch (err) {
      console.error('gagal membekukan dns (verifikasi kedaluwarsa)', s.name, err)
      continue
    }
    await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = 'unverified', fail_streak = 0, pending_since = NULL, cf_record_id = NULL, txt_record_id = NULL WHERE name = ? AND status IN ('pending','failed')").bind(s.name).run()
    await hist(env, s.name, 'h.failed', 'unverified')
  }

  // 3. Health check subdomain aktif, dan subdomain gagal (down) supaya bisa pulih sendiri.
  // Kegagalan dihitung berurutan lewat fail_streak: 3 kali berturut-turut = down, 5 kali = beku (takeover) (#77).
  const active = await env.DB.prepare("SELECT name, status, cf_record_id, txt_record_id, fail_streak FROM subdomains WHERE status = 'active' OR (status = 'failed' AND fail_reason = 'down') ORDER BY RANDOM() LIMIT 50").all<{ name: string; status: string; cf_record_id: string | null; txt_record_id: string | null; fail_streak: number }>()
  for (const { name, status, cf_record_id, txt_record_id, fail_streak } of active.results) {
    const ok = await healthCheck(env, name)
    await env.DB.prepare('INSERT INTO checks (name, ok, at) VALUES (?, ?, ?)').bind(name, ok ? 1 : 0, now).run()
    await env.DB.prepare('DELETE FROM checks WHERE name = ? AND id NOT IN (SELECT id FROM checks WHERE name = ? ORDER BY id DESC LIMIT 30)').bind(name, name).run()
    if (ok) {
      if (status === 'failed') {
        await env.DB.prepare("UPDATE subdomains SET status = 'active', fail_reason = NULL, fail_streak = 0 WHERE name = ? AND status = 'failed'").bind(name).run()
        await hist(env, name, 'h.active')
      } else {
        await env.DB.prepare('UPDATE subdomains SET fail_streak = 0 WHERE name = ? AND fail_streak != 0').bind(name).run()
      }
      continue
    }
    const streak = fail_streak + 1
    if (streak >= 5) {
      // Bekukan DNS: hapus record dulu, dan hanya tandai dibekukan bila penghapusan berhasil. Bila gagal, dicoba lagi
      // di putaran berikutnya (status tetap) agar tidak ada record yatim yang idnya sudah hilang dari database.
      try {
        if (cf_record_id) await deleteRecord(env, cf_record_id)
        if (txt_record_id) await deleteRecord(env, txt_record_id)
      } catch (err) {
        console.error('gagal membekukan dns saat takeover', name, err)
        await env.DB.prepare('UPDATE subdomains SET fail_streak = ? WHERE name = ?').bind(streak, name).run()
        continue
      }
      await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = 'takeover', fail_streak = 0, cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(name).run()
      await hist(env, name, 'h.failed', 'takeover')
    } else if (status === 'active' && streak >= 3) {
      await env.DB.prepare("UPDATE subdomains SET status = 'failed', fail_reason = 'down', fail_streak = ? WHERE name = ? AND status = 'active'").bind(streak, name).run()
      await hist(env, name, 'h.failed', 'down')
    } else {
      await env.DB.prepare('UPDATE subdomains SET fail_streak = ? WHERE name = ?').bind(streak, name).run()
    }
  }

  // 4. Daftar ancaman: tangguhkan otomatis bila terdeteksi. Acak supaya semua subdomain kebagian dipindai.
  // Status pending/failed ikut dipindai karena recordnya sudah tayang sebelum bukti kepemilikan lolos (#69).
  const all = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE status IN ('active','pending','failed') AND cf_record_id IS NOT NULL ORDER BY RANDOM() LIMIT 400").all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
  const flagged = await flaggedBySafeBrowsing(env, all.results.map((x) => x.name))
  for (const s of all.results.filter((x) => flagged.has(x.name))) {
    await deleteRecord(env, s.cf_record_id)
    await deleteRecord(env, s.txt_record_id)
    await env.DB.prepare("UPDATE subdomains SET status = 'suspended', fail_reason = 'suspended', cf_record_id = NULL, txt_record_id = NULL WHERE name = ?").bind(s.name).run()
    await hist(env, s.name, 'h.suspended', 'safe-browsing')
  }

  // 5. Pindai isi situs untuk judi online, penipuan, dan konten terlarang. Status pending/failed ikut dipindai (#69).
  // Ambang 2 kecocokan agar tidak salah suspensi hanya karena satu kata. Sampling acak per putaran.
  const scan = await env.DB.prepare("SELECT name, cf_record_id, txt_record_id FROM subdomains WHERE status IN ('active','pending','failed') AND cf_record_id IS NOT NULL ORDER BY RANDOM() LIMIT 20").all<{ name: string; cf_record_id: string | null; txt_record_id: string | null }>()
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

  // 5b. Event funnel anonim disimpan 90 hari saja.
  await env.DB.prepare('DELETE FROM funnel_events WHERE at < ?').bind(Date.now() - 90 * 86_400_000).run()

  // 6. Tandai nama yang menyerupai merek atau tokoh untuk review manusia (tidak ditolak otomatis).
  // Penanda per-baris `name_checked_at` menggantikan LIMIT 200 tanpa urutan agar semua nama kebagian (#76).
  const reviewCandidates = await env.DB.prepare("SELECT name FROM subdomains WHERE status IN ('active','pending','failed') AND name_checked_at IS NULL ORDER BY created_at LIMIT 200").all<{ name: string }>()
  for (const { name } of reviewCandidates.results) {
    // Klaim dulu supaya tidak diperiksa dua kali bila putaran berikutnya berjalan bersamaan.
    await env.DB.prepare('UPDATE subdomains SET name_checked_at = ? WHERE name = ? AND name_checked_at IS NULL').bind(now, name).run()
    if (!classifyName(name).review) continue
    const already = await env.DB.prepare("SELECT 1 FROM history WHERE name = ? AND key = 'h.needsReview'").bind(name).first()
    if (!already) await hist(env, name, 'h.needsReview')
  }
}
