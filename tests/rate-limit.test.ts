import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { rateLimit, ratePeek } from '../worker/lib.ts'

function tableWithCurrentSchema(db: DatabaseSync) {
  // Bentuk tabel setelah migrasi 0009: ada kolom expires_at.
  db.exec(`CREATE TABLE rate_limits (k TEXT NOT NULL, w INTEGER NOT NULL, n INTEGER NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (k, w))`)
}

test('pembersihan rate limit tidak menghapus jendela lain (#67)', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    tableWithCurrentSchema(db)
    // Kuncian login 15 menit sudah di ambang batas.
    const w900 = Math.floor(Date.now() / 1000 / 900)
    db.prepare("INSERT INTO rate_limits (k, w, n, expires_at) VALUES ('lock:korban@mail.com', ?, 10, ?)").run(w900, Date.now() + 900_000)
    const env = { DB: { prepare: (sql: string) => d1wrap(db, sql) } } as never

    // Satu request tanpa login ke jendela 60 detik.
    assert.equal(await rateLimit(env, 'chk:203.0.113.7', 120, 60), true)

    assert.equal(await ratePeek(env, 'lock:korban@mail.com', 900), 10, 'kuncian 15 menit tidak boleh terhapus oleh request jendela 60 detik')
    assert.equal(await ratePeek(env, 'chk:203.0.113.7', 60), 1)
  } finally { db.close() }
})

test('hitungan jendela yang sama tetap akumulatif dan menulis expires_at (#67)', async () => {
  const db = new DatabaseSync(':memory:')
  try {
    tableWithCurrentSchema(db)
    const env = { DB: { prepare: (sql: string) => d1wrap(db, sql) } } as never
    for (let i = 0; i < 3; i++) await rateLimit(env, 'pub:1.2.3.4', 60, 60)
    assert.equal(await ratePeek(env, 'pub:1.2.3.4', 60), 3)
    assert.equal(await rateLimit(env, 'pub:1.2.3.4', 60, 60), true)
    const row = db.prepare("SELECT expires_at FROM rate_limits WHERE k = 'pub:1.2.3.4'").get() as { expires_at: number }
    assert.ok(Number(row.expires_at) > Date.now() + 60_000, 'expires_at dipakai Cron untuk membersihkan')
  } finally { db.close() }
})

test('Cron membersihkan rate_limits kedaluwarsa (#67)', () => {
  const src = readFileSync(new URL('../worker/cron.ts', import.meta.url), 'utf8')
  const sql = src.match(/DELETE FROM rate_limits WHERE [^'`]+/)?.[0]
  assert.ok(sql, 'Cron harus membersihkan rate_limits')
  const db = new DatabaseSync(':memory:')
  try {
    tableWithCurrentSchema(db)
    db.prepare("INSERT INTO rate_limits VALUES ('lama', 1, 5, ?)").run(Date.now() - 1000)
    db.prepare("INSERT INTO rate_limits VALUES ('baru', 1, 5, ?)").run(Date.now() + 60_000)
    db.prepare(sql).run(Date.now())
    assert.equal((db.prepare('SELECT COUNT(*) AS n FROM rate_limits').get() as { n: number }).n, 1)
  } finally { db.close() }
})

// Pembungkus D1 minimal untuk tes: cukup untuk prepare().bind().first()/run().
function d1wrap(db: DatabaseSync, sql: string) {
  let args: unknown[] = []
  const api = {
    bind(...a: unknown[]) { args = a; return api },
    async first() { return (db.prepare(sql).get(...(args as never[])) ?? null) as unknown },
    async all() { return { results: db.prepare(sql).all(...(args as never[])) } },
    async run() { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } } },
  }
  return api
}
