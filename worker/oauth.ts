// Discord mengirim email apa adanya, termasuk yang belum diverifikasi. Hanya email terverifikasi yang boleh
// dipakai mencocokkan atau membuat akun; kalau tidak, orang bisa mengambil alih akun dengan email milik orang lain.
export function discordVerifiedEmail(u: { email?: string | null; verified?: boolean } | null | undefined): string | null {
  if (!u || u.verified !== true) return null
  const email = typeof u.email === 'string' ? u.email.trim() : ''
  return email || null
}
