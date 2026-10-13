// Alat audit opsional; lihat docs/engineering/AUDIT-2026-10-13.md.
import { createRequire } from 'node:module'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(process.env.AUDIT_NODE_MODULES ? `${process.env.AUDIT_NODE_MODULES}/audit.cjs` : import.meta.url)
const { default: lighthouse } = await import(require.resolve('lighthouse'))
const { launch } = await import(require.resolve('chrome-launcher'))
const base = process.env.AUDIT_URL || 'http://localhost:8787'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Audit hanya untuk server lokal')
const output = process.env.AUDIT_OUTPUT || '/tmp/tongkrongan-lighthouse'
await mkdir(output, { recursive: true })
const chrome = await launch({ chromePath: process.env.AUDIT_CHROME, chromeFlags: ['--headless', '--no-sandbox'] })
const summary = []
try {
  for (const path of ['/', '/claim', '/dashboard', '/login', '/report']) {
    const result = await lighthouse(base + path, { port: chrome.port, output: ['json', 'html'], onlyCategories: ['performance', 'accessibility'], logLevel: 'error' })
    const name = path === '/' ? 'home' : path.slice(1)
    await writeFile(`${output}/${name}.json`, result.report[0])
    await writeFile(`${output}/${name}.html`, result.report[1])
    const { categories, audits, configSettings } = result.lhr
    const row = { path, performance: Math.round(categories.performance.score * 100), accessibility: Math.round(categories.accessibility.score * 100), lcpMs: Math.round(audits['largest-contentful-paint'].numericValue), cls: audits['cumulative-layout-shift'].numericValue, throttling: configSettings.throttling }
    summary.push(row)
    console.log(JSON.stringify(row))
  }
  await writeFile(`${output}/summary.json`, JSON.stringify(summary, null, 2))
} finally { await chrome.kill() }
