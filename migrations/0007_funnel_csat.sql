-- Event funnel wizard (anonim): hanya id sesi acak per tab, tanpa akun, email, atau IP. Dihapus otomatis setelah 90 hari.
CREATE TABLE funnel_events (
  sid TEXT NOT NULL,
  ev TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_funnel_at ON funnel_events(at);

-- Skor kepuasan 1-5 per subdomain yang sudah aktif. Tanpa data pribadi; satu jawaban per subdomain.
CREATE TABLE csat (
  name TEXT NOT NULL,
  sub_created INTEGER NOT NULL,
  score INTEGER NOT NULL,
  at INTEGER NOT NULL,
  PRIMARY KEY (name, sub_created)
);
