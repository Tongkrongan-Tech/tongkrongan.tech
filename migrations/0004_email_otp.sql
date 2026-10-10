-- Kode OTP email 6 digit (disimpan sebagai hash), sekali pakai, kedaluwarsa 10 menit.
CREATE TABLE email_otps (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
