CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  pw_hash TEXT,
  pw_salt TEXT,
  provider TEXT NOT NULL DEFAULT 'email',
  verified INTEGER NOT NULL DEFAULT 1,
  verify_token TEXT,
  blocked INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Satu subdomain hanya bisa dimiliki satu akun (PRIMARY KEY pada name).
CREATE TABLE subdomains (
  name TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | verifying | active | failed | suspended
  fail_reason TEXT,
  verify_token TEXT NOT NULL,
  cf_record_id TEXT,
  last_check_at INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  activated_at INTEGER
);
CREATE INDEX idx_sub_user ON subdomains(user_id);
CREATE INDEX idx_sub_status ON subdomains(status);

CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  detail TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX idx_history_name ON history(name, at);

CREATE TABLE checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ok INTEGER NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX idx_checks_name ON checks(name, at);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  reason TEXT NOT NULL,
  detail TEXT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | resolved
  at INTEGER NOT NULL
);

-- Pembatas laju sederhana (per kunci per jendela waktu).
CREATE TABLE rate_limits (
  k TEXT NOT NULL,
  w INTEGER NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (k, w)
);
