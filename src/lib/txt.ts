// Aturan TXT verifikasi platform selain Vercel (mis. Railway). Harus sama dengan validateRecordInput di worker/index.ts:
// nama diawali garis bawah (huruf kecil, angka, tanda hubung, maks 40), nilai wajib diisi dan maks 255 karakter.
export const TXT_LABEL_RE = /^_[a-z0-9-]{1,40}$/

// TXT bersifat opsional: kolom yang tidak disentuh dan kosong tidak dianggap salah.
// Salah bila ada nilai (atau nama yang sengaja diubah) tetapi tidak memenuhi aturan.
export function genericTxtInvalid(label: string, value: string, labelEdited: boolean): boolean {
  const l = label.trim().toLowerCase()
  const v = value.trim()
  if (!v && !(labelEdited && l)) return false
  return !TXT_LABEL_RE.test(l) || !v || v.length > 255
}
