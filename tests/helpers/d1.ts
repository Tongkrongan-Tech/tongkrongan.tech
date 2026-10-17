import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'

// Jalankan semua migrasi ke SQLite in-memory agar schema tes sama dengan produksi.
export function testDb(): DatabaseSync {
  const dir = new URL('../../migrations/', import.meta.url)
  const db = new DatabaseSync(':memory:')
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) db.exec(readFileSync(new URL(f, dir), 'utf8'))
  return db
}

type Statement = { run(): Promise<{ meta: { changes: number } }> }

// Pembungkus minimal API D1 di atas node:sqlite untuk tes worker.
export function d1(db: DatabaseSync) {
  return {
    prepare(sql: string) {
      let args: unknown[] = []
      const api = {
        bind(...a: unknown[]) { args = a; return api },
        async first() { return (db.prepare(sql).get(...(args as never[])) ?? null) as never },
        async all() { return { results: db.prepare(sql).all(...(args as never[])) as never[] } },
        async run() { const r = db.prepare(sql).run(...(args as never[])); return { meta: { changes: Number(r.changes) } } },
      }
      return api
    },
    async batch(stmts: Statement[]) {
      const out = []
      for (const s of stmts) out.push(await s.run())
      return out
    },
  }
}
