// Alat audit opsional; lihat docs/engineering/AUDIT-2026-10-13.md.
import { createRequire } from 'node:module'
import { writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
const require = createRequire(process.env.AUDIT_NODE_MODULES ? `${process.env.AUDIT_NODE_MODULES}/audit.cjs` : import.meta.url)
const { chromium } = require('playwright')
const { default: AxeBuilder } = require('@axe-core/playwright')
const base = process.env.AUDIT_URL || 'http://localhost:8787'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Audit hanya untuk server lokal')
const browser = await chromium.launch({ executablePath: process.env.AUDIT_CHROME, args: ['--no-sandbox'] })
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
const page = await context.newPage()
const errors = [], audits = []
page.on('pageerror', e => errors.push(e.message))
const sub = { name: 'audit-proof', platform: 'hosting', type: 'CNAME', value: 'example.org', status: 'pending', ownershipToken: 'a'.repeat(64), createdAt: Date.now(), owned: false, history: [], checks: [] }
await page.route('**/api/**', async route => {
  const path = new URL(route.request().url()).pathname
  const body = path === '/api/config' ? { baseDomain: 'example.test', quota: 3, oauth: {}, turnstileSiteKey: null, emailVerify: false, mock: true }
    : path === '/api/auth/me' ? { user: { email: 'audit@example.test', provider: 'email' } }
    : path === '/api/subdomains' ? { subdomains: [sub], quota: 3 }
    : path === '/api/check' ? { state: 'ok' }
    : path === '/api/public/subdomains' ? { names: [] } : { ok: true }
  await route.fulfill({ json: body })
})
try {
  for (const theme of ['light', 'dark', 'kopi', 'mint', 'grape', 'ocean']) {
    await page.goto(base)
    await page.evaluate(theme => localStorage.setItem('tt.theme', theme), theme)
    for (const path of ['/', '/claim', '/dashboard', '/login', '/report']) {
      await page.goto(base + path)
      await page.waitForTimeout(600)
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      audits.push({ theme, path, violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) })
    }
  }
  await page.goto(base + '/dashboard')
  const edit = page.getByRole('button', { name: 'Ubah tujuan', exact: true })
  await edit.press('Enter')
  await page.locator('#ev').fill('changed.example.org')
  assert.equal(await page.evaluate(() => document.activeElement?.id), 'ev')
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    assert.ok(await page.evaluate(() => !!document.activeElement?.closest('dialog') || document.activeElement === document.body))
  }
  await page.keyboard.press('Escape')
  await page.getByRole('dialog').waitFor({ state: 'hidden' })
  assert.ok(await edit.evaluate(el => el === document.activeElement))
  await page.getByRole('button', { name: 'ID, Tema, Bahasa', exact: true }).click()
  const themes = page.getByRole('radiogroup', { name: 'Tema' })
  await themes.getByRole('radio', { checked: true }).focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(50)
  assert.ok(await themes.getByRole('radio', { checked: true }).evaluate(el => el === document.activeElement))
  await page.keyboard.press('Escape')
  await page.goto(base + '/report')
  await page.getByRole('radio').first().focus()
  await page.keyboard.press('ArrowRight')
  assert.equal(await page.getByRole('radio').nth(1).getAttribute('aria-checked'), 'true')
  for (const viewport of [{ width: 360, height: 800 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const path of ['/', '/claim?name=audit-proof', '/dashboard', '/login', '/report']) {
      await page.goto(base + path)
      await page.waitForTimeout(500)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path} overflow ${viewport.width}`)
    }
  }
  await page.setViewportSize({ width: 360, height: 800 })
  await page.goto(base + '/dashboard')
  await page.getByRole('button', { name: 'Ubah tujuan', exact: true }).click()
  await page.screenshot({ path: '/tmp/tongkrongan-dialog.png' })
  const dialogAudit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  audits.push({ path: 'dialog mobile', violations: dialogAudit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) })
  const report = { audits, errors, keyboard: 'PASS: dialog focus/Escape, theme arrows, report arrows', responsive: 'PASS: 360x800, 844x390' }
  await writeFile('/tmp/tongkrongan-accessibility.json', JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ ...report, audits: audits.filter(a => a.violations.length) }, null, 2))
  assert.equal(audits.filter(a => a.violations.length).length, 0)
  assert.deepEqual(errors, [])
} finally { await browser.close() }
