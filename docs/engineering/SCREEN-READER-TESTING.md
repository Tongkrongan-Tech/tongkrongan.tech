# Panduan Uji Pembaca Layar

Panduan ini untuk menguji aksesibilitas Tongkrongan.tech dengan pembaca layar sungguhan (VoiceOver atau NVDA). Hasil otomatis (axe, Lighthouse) bukan pengganti pengujian ini.

## Kapan menguji

Uji dilakukan sekali per rilis besar, atau ketika ada perubahan pada alur daftar, klaim, atau aktivasi.

## Persiapan

1. Build produksi dan jalankan lokal:
   ```bash
   npm run build
   npm run db:local
   npx wrangler dev --port 8787 --var DNS_MODE:mock --var DISCORD_WEBHOOK_URL: --var TURNSTILE_SITEKEY: --var REQUIRE_EMAIL_VERIFY:0 --var RESEND_API_KEY:
   ```
2. Buka `http://localhost:8787` di peramban.
3. Aktifkan pembaca layar:
   - **VoiceOver (macOS):** Cmd + F5
   - **NVDA (Windows):** Ctrl + Enter

## Alur yang diuji

### 1. Daftar (Login → Buat akun)

| Langkah | Yang diperiksa | Cara memeriksa |
| --- | --- | --- |
| Buka `/login` | Fokus awal masuk akal (biasanya link "Lompat ke konten" atau elemen pertama) | Tekan Tab dari awal halaman |
| Navigasi ke tab "Daftar" | Tab terbaca dengan benar, status selected diumumkan | Arrow kiri/kanan atau Tab |
| Isi kolom email | Label kolom terbaca ("Email") | Fokus ke kolom, dengarkan label |
| Isi kolom kata sandi | Label terbaca, tombol "Lihat kata sandi" bisa diakses | Tab ke tombol, tekan Enter |
| Tekan tombol "Buat akun" | Nama tombol terbaca jelas | Fokus ke tombol |
| Galat validasi muncul | Pesan galat terbaca (aria-live) | Isi email salah, submit |

### 2. Klaim (Claim Wizard)

| Langkah | Yang diperiksa | Cara memeriksa |
| --- | --- | --- |
| Buka `/claim` | Judul halaman terbaca, progress klaim diumumkan | Buka halaman, dengarkan pembaca layar |
| Langkah 1: pilih nama | Label kolom terbaca, hint terbaca | Fokus ke kolom nama |
| Pilih platform | Grup radio terbaca, arrow keys berfungsi | Fokus ke grup, tekan Arrow |
| Langkah 2: isi record | Label "Tipe record" dan "Tujuan" terbaca | Tab ke kolom |
| Tombol "Lanjut" | Nama tombol terbaca | Fokus ke tombol |
| Fokus pindah langkah | Fokus berpindah ke judul langkah baru | Perhatikan pembaca layar setelah klik "Lanjut" |

### 3. Aktivasi (Verifikasi)

| Langkah | Yang diperiksa | Cara memeriksa |
| --- | --- | --- |
| Langkah 3: verifikasi | Tombol "Verifikasi sekarang" terbaca | Fokus ke tombol |
| Status verifikasi | Status diumumkan (pending, verifying, active, failed) | Perhatikan pembaca layar |
| Panel bukti kepemilikan | Alamat, token, dan tombol salin terbaca berurutan | Tab ke area panel |
| Tombol "Salin" | Label terbaca, status "Tersalin" diumumkan | Tekan tombol, dengarkan umpan balik |
| Sukses aktif | Pesan sukses terbaca | Setelah verifikasi berhasil |

### 4. Dasbor (Dashboard)

| Langkah | Yang diperiksa | Cara memeriksa |
| --- | --- | --- |
| Buka `/dashboard` | Judul, statistik, dan daftar subdomain terbaca | Buka halaman |
| Dialog "Ubah tujuan" | Fokus masuk dialog, Tab tidak keluar dari dialog, Escape menutup dan mengembalikan fokus | Buka dialog, tekan Tab 12 kali, Escape |
| Pencarian dan filter | Label kolom pencarian dan filter terbaca | Tab ke elemen |

## Yang harus dicatat

Untuk setiap temuan, catat:

1. **Halaman** dan **langkah** mana.
2. **Apa yang terdengar** dari pembaca layar.
3. **Apa yang seharusnya terdengar**.
4. **Peramban** dan **pembaca layar** yang dipakai (misal: Chrome + NVDA 2024.1).

## Referensi

- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [VoiceOver User Guide (macOS)](https://support.apple.com/guide/voiceover/welcome/mac)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
