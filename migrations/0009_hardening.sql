-- Hardening hasil audit 14 Oktober 2026 (#67, #70, #76, #77).

-- Pembatas laju: setiap baris membawa waktu kedaluwarsa agar Cron bisa membersihkannya
-- tanpa menghapus hitungan jendela lain (#67).
ALTER TABLE rate_limits ADD COLUMN expires_at INTEGER NOT NULL DEFAULT 0;

-- Jendela verifikasi yang bisa dimulai ulang: diset saat klaim dibuat, diedit, atau dipulihkan, dan di-NULL-kan
-- setelah verifikasi lolos. Hanya baris yang belum pernah aktif yang di-backfill agar baris lama yang sedang aktif
-- (atau sedang down) tidak salah dianggap "menunggu verifikasi" oleh pembersihan baru (#70).
ALTER TABLE subdomains ADD COLUMN pending_since INTEGER;
UPDATE subdomains SET pending_since = created_at WHERE pending_since IS NULL AND activated_at IS NULL;

-- Jumlah kegagalan health check berturut-turut. Membekukan DNS butuh 5 kegagalan berurutan (#77).
ALTER TABLE subdomains ADD COLUMN fail_streak INTEGER NOT NULL DEFAULT 0;

-- Kapan nama terakhir diperiksa antrean review Cron; NULL berarti belum pernah (#76).
ALTER TABLE subdomains ADD COLUMN name_checked_at INTEGER;
