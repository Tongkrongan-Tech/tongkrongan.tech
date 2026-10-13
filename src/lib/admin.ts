// Konstanta UI admin. Alasan laporan harus sama dengan REPORT_REASONS di src/lib/report.ts (dijaga tests/admin.test.ts).
export const ADMIN_REASONS: Record<string, { label: string; severe: boolean }> = {
  phishing: { label: 'Phishing', severe: true },
  malware: { label: 'Malware', severe: true },
  spam: { label: 'Spam', severe: false },
  illegal: { label: 'Konten ilegal', severe: true },
  impersonation: { label: 'Meniru pihak lain', severe: false },
  other: { label: 'Lainnya', severe: false },
}

export const ADMIN_TOKEN_KEY = 'tt.adminToken'

// Token admin hanya disimpan di sessionStorage (hilang saat tab ditutup), tidak pernah di kode, URL, atau localStorage.
export const adminToken = {
  get(): string | null { try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) } catch { return null } },
  set(v: string) { try { sessionStorage.setItem(ADMIN_TOKEN_KEY, v) } catch { /* abaikan */ } },
  clear() { try { sessionStorage.removeItem(ADMIN_TOKEN_KEY) } catch { /* abaikan */ } },
}
