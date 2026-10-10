import type { Env } from './lib'

type Field = { name: string; value: string; inline?: boolean }

const COLOR = { connect: 0x1565f0, claim: 0x2ecc71 }

// Kirim embed ke webhook Discord. Tidak pernah melempar galat dan tidak menahan permintaan pengguna lebih dari 3 detik.
export async function notifyDiscord(env: Env, title: string, kind: keyof typeof COLOR, fields: Field[]) {
  if (!env.DISCORD_WEBHOOK_URL) return
  try {
    const res = await fetch(env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'Mas DNS',
        allowed_mentions: { parse: [] },
        embeds: [{ title, color: COLOR[kind], fields, timestamp: new Date().toISOString() }],
      }),
      signal: AbortSignal.timeout(3000),
    })
    if (!res.ok) console.error('discord', res.status)
  } catch (e) { console.error('discord', e) }
}

// Email tidak dikirim utuh ke Discord: cukup agar admin bisa mengenali akun.
const mask = (email: string) => email.replace(/^(.{2})[^@]*(@.*)$/, '$1***$2')

export const notifyVercelConnected = (env: Env, email: string) =>
  notifyDiscord(env, 'Pengguna menghubungkan Vercel', 'connect', [{ name: 'Akun', value: mask(email), inline: true }])

export const notifyClaimActive = (env: Env, name: string, platform: string, email?: string) =>
  notifyDiscord(env, 'Domain berhasil diklaim', 'claim', [
    { name: 'Domain', value: `${name}.${env.BASE_DOMAIN}`, inline: true },
    { name: 'Platform', value: platform, inline: true },
    ...(email ? [{ name: 'Akun', value: mask(email), inline: true }] : []),
  ])
