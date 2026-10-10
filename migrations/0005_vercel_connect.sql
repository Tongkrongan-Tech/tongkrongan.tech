-- Sambungan akun Vercel per pengguna (token terenkripsi AES-GCM) dan proyek Vercel per subdomain.
CREATE TABLE vercel_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token_enc TEXT NOT NULL,
  team_id TEXT,
  created_at INTEGER NOT NULL
);
ALTER TABLE subdomains ADD COLUMN vercel_project TEXT;
