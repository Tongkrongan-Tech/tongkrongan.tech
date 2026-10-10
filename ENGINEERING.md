# ENGINEERING.md

Catatan teknis dan log perubahan. **Setiap agent/developer wajib membaca file ini sebelum mulai, dan menambah entri di "Log Perubahan" setelah selesai.** Sumber kebutuhan: [PRD.md](PRD.md).

## Status saat ini (2026-10-05)

Aplikasi **berbasis API sungguhan**: frontend React + backend Cloudflare Worker + database D1. Mode demo sudah **dihapus**. Alur lokal (`DNS_MODE=mock`) lulus 35 pemeriksaan browser. **Jalur live belum pernah dites dengan kredensial asli** (API Cloudflare DNS, DoH, verifikasi HTTP, Cron di produksi, OAuth, Resend, Safe Browsing; verifikasi **sukses** dengan platform sungguhan): uji dengan daftar di [SETUP.md](SETUP.md) bagian 6 setelah deploy. Panduan go-live: [SETUP.md](SETUP.md).

## Cara menjalankan (lokal)

```bash
npm install
cp .dev.vars.example .dev.vars   # DNS_MODE=mock
npm run db:local                 # migrasi D1 lokal
npm run dev:api                  # Worker :8787
npm run dev                      # Vite :5173 (proxy /api ke :8787)
npm run build                    # tsc (frontend + worker) + vite build
node scripts/contrast.mjs        # kontras WCAG AA semua tema
```

## Keputusan penting

| Hal | Keputusan | Alasan |
| --- | --- | --- |
| Nama merek | **tongkrongan.tech** (pakai "k") | Dikoreksi pemilik. **PRD.md masih menulis "tongrongan"**, belum diubah. |
| Stack frontend | Vite + React 19 + TypeScript + Tailwind v4 + Framer Motion + React Router | PRD mengusulkan Next.js; Vite dipilih karena tidak butuh SSR. |
| Stack backend | Cloudflare Workers + D1 (SQLite) + Cron Triggers, tanpa framework | Semua gratis dalam satu akun; menggantikan Node + PostgreSQL + Redis di PRD. Satu Worker menyajikan `dist/` dan `/api/*`. |
| Domain induk | `BASE_DOMAIN` di wrangler.jsonc, dikirim ke frontend lewat `/api/config` | Produksi `tongkrongan.tech`; bisa diganti tanpa ubah kode. Teks UI memakai `{domain}`. |
| Bukti kepemilikan | Otomatis, tanpa berkas: DNS menjawab sesuai record **dan** situs tampil di alamat itu (HTTP status < 400). Tipe TXT cukup DNS menjawab. UI mengecek tiap 10 detik (maks 18 kali), Cron tiap 15 menit sampai 24 jam | Platform (Vercel, Cloudflare Pages, Railway) hanya menyajikan domain yang sudah ditambahkan pemilik proyek, jadi respons sukses menjadi bukti kendali; memenuhi "respons HTTP" di PRD. Berkas token sebelumnya terlalu merepotkan pengguna. Kelemahan: untuk tujuan IP/hosting biasa, server yang menjawab semua Host dianggap lolos; risiko ini ditutup oleh Safe Browsing, laporan, dan penangguhan. |
| Sesi | Cookie `tt_session` HttpOnly, SameSite=Lax, token acak di-hash SHA-256 di D1; sandi PBKDF2-SHA256 100k | Tanpa JWT. CSRF: cek Origin pada metode non-GET. |
| Font | **Poppins** (self-host via `@fontsource/poppins`, bobot 300-800) | Permintaan pemilik. Tanpa request ke Google Fonts. `--font-mono` juga dipetakan ke Poppins. **Jangan menambah font lain.** |
| Arah visual | Gaya "neo-poster": border tebal 2px, bayangan keras offset, penanda stabilo kuning pada nama subdomain | Identitas khas, bukan template SaaS. Motif identitas: nama di address bar dengan stabilo. |
| Dial antislop | ENERGY 3 / RHYTHM 3 / MOTION 2 | Persona pelajar/kreator, PRD minta "variatif, animatif, interaktif". Tiap section berkomposisi beda. |
| Palet utama | Biru `#1565f0` + navy `#151a26` + stabilo kuning, mengikuti logo | Logo dari pemilik berwarna biru dan navy. |
| Tema | 6 tema: `light` (biru), `dark`, `kopi`, `mint`, `grape`, `ocean` | PRD: terang, gelap, plus tema berwarna. Disimpan di localStorage `tt.theme`. |
| Bahasa | ID dan EN, `src/lib/dict.ts` format `[id, en]`; disimpan di `tt.lang` | PRD. Kunci hilang tampil sebagai nama kuncinya. |
| Ikon | SVG digambar sendiri di `components/ui.tsx` | Hindari tampilan pustaka ikon bawaan. Tanpa emoji. |
| Testimoni | **Sengaja tidak dibuat** | PRD menyebutnya, tetapi belum ada testimoni nyata; antislop R-18 melarang yang fiktif. |
| Statistik | Tanpa angka karangan. Angka di "Aturan main" (3, 24 jam, TXT, 0 iklan) berasal dari PRD | R-17. |
| Logo | Logo asli pemilik di `public/logo.png` (latar transparan, navy). Turunannya: `logo-wordmark.png` (tulisan Tongkrongan.tech, navbar), `logo-full.png` (footer), `logo-mark.png` (lambang), `favicon.png`. Ditampilkan **transparan tanpa kotak** (permintaan pemilik); di tema `dark` dan `ocean` kelas `.logo-art` membalik warna dengan `filter: invert(1) hue-rotate(180deg)` agar navy tetap terbaca dan biru tetap biru | Dibuat dari logo.png dengan crop + resize (Pillow). Jangan mengubah logo asli; bila logo diganti, buat ulang ketiga turunan. |

## Struktur

```
src/                    frontend (lihat komentar di tiap file)
  lib/api.ts            klien fetch /api + ApiError
  lib/store.tsx         state sesi + subdomain, memanggil API
  lib/prefs.tsx         tema, bahasa, t(), te() (galat API ke teks), config server, domain
  lib/names.ts, dns.ts  aturan nama + validasi record (DIPAKAI BERSAMA frontend dan worker)
  lib/dict.ts           semua teks UI ID/EN; {domain} diisi otomatis
  components/           Layout, NameChecker, DnsDiagram, Turnstile, ui
  pages/                Home, Claim (wizard), Dashboard, Login, Report, NotFound
worker/
  index.ts              router, auth, subdomain CRUD, lapor, admin, OAuth
  dns.ts                API DNS Cloudflare, DoH, verifikasi, health check, Safe Browsing
  cron.ts               pembersihan 24 jam, verifikasi ulang, health check, penangguhan otomatis
  lib.ts                Env, util kripto, rate limit, Turnstile, email (Resend)
migrations/0001_init.sql  skema D1
wrangler.jsonc          konfigurasi Worker, D1, Cron, vars
scripts/contrast.mjs    pemeriksa kontras per tema
```

## API (semua JSON, prefiks /api)

`GET config` · `GET check?name=` · `GET auth/me` · `POST auth/signup|login|logout` · `GET auth/verify?token=` · `GET auth/github|google/start|callback` · `GET|POST subdomains` · `PATCH|DELETE subdomains/:name` · `POST subdomains/:name/verify` · `POST reports` · admin (Bearer `ADMIN_TOKEN`): `GET admin/reports`, `POST admin/reports/:id/resolve`, `POST admin/suspend`, `POST admin/block`.

Batas laju (tabel `rate_limits`): cek nama 120/menit/IP, daftar 5/jam/IP, login 10/15 menit/IP+email, perubahan DNS 20/jam/akun, lapor 5/jam/IP, verifikasi minimal 8 detik per subdomain.

## Pemetaan PRD ke kode

| Kebutuhan | Status |
| --- | --- |
| F1 daftar/login email | Selesai. Google/GitHub selesai tetapi **hanya tampil bila secret OAuth diisi**; belum dites dengan penyedia asli |
| F2 cek nama langsung + saran | Selesai (server memeriksa database) |
| F3 aturan nama + tercadang | Selesai; daftar merek hanya contoh awal; label domain induk ikut tercadang |
| F4 A/AAAA/CNAME/TXT | Selesai; satu record utama per subdomain **plus satu TXT tambahan** di `_label.nama.<domain>` (mis. verifikasi Railway) yang dibuat otomatis |
| F5 kartu platform | Selesai (Cloudflare, Railway, Vercel, GitHub Pages, VPS, hosting lain); nilai contoh harus dicek ke dokumentasi resmi platform |
| F6 status + alasan + perbaikan | Selesai: `dns`, `http`, `platform`, `down`, `suspended`; cek otomatis di UI |
| F7 HTTPS | Mengikuti platform tujuan; hanya panduan |
| F8 dasbor | Selesai |
| F9 kuota | Selesai (`QUOTA`, default 3) |
| F10 lapor + tinjau | Lapor selesai; tinjau lewat **API admin tanpa UI** |
| F11 pengingat 30/60 hari | **Belum** |
| F12 panel admin | Hanya API (suspend, block, resolve); **tanpa UI**, tanpa kelola nama tercadang |
| F13 API publik/token | **Belum** |
| Anti-abuse | Rate limit, kuota, Turnstile (opsional), Safe Browsing (opsional) ada. Batas per perangkat dan nama menyerupai merek hanya daftar statis |
| 2FA opsional | **Belum** |
| Takeover | Health check Cron menandai gagal setelah 5 cek mati berturut; **belum membekukan record** |

## Pengujian

- `npm run build` bersih (tsc frontend + worker, vite build). `node scripts/contrast.mjs` lulus AA di 6 tema.
- API (curl, mode mock): config, cek nama, signup/login/logout, sandi salah, rate limit, buat/verifikasi/hapus subdomain, kuota, IP privat ditolak, CSRF (Origin asing ditolak), admin tanpa/dengan token, lapor.
- Browser (Playwright + Chromium lokal, skrip tidak disimpan di repo), 35 pemeriksaan lulus: font Poppins, domain dari server, cek nama (tersedia/dipakai+saran/tercadang/domain induk), alur klaim dari tamu (login, daftar, validasi record, buat record, token+URL berkas, verifikasi gagal lalu sukses), sesi bertahan setelah muat ulang, dasbor (edit, nilai tak valid ditolak, Escape, riwayat server, hapus lalu nama bebas lagi), lapor (validasi, terkirim, subdomain tak ada), keluar, 6 tema, EN, tanpa overflow horizontal di 360px untuk 5 halaman. Satu pesan 404 di konsol adalah respons yang diharapkan (lapor subdomain tak ada).
- Build produksi dilayani Worker: `/` 200, `/claim` (SPA fallback) 200, aset 200, `/api/nope` 404 JSON.
- **Belum diuji**: semua jalur `DNS_MODE=live` (Cloudflare API, DoH, HTTP), Cron di produksi, OAuth, Resend, Turnstile, Safe Browsing; Firefox/Safari; pembaca layar; Lighthouse/performa 4G.

## Aturan untuk agent berikutnya

- Semua warna lewat token CSS (`var(--...)`), jangan hex di komponen (kecuali teks `#1b1612` di atas kartu platform pastel).
- Setiap teks baru masuk `dict.ts` dengan dua bahasa. Dilarang tanda pisah panjang (em dash) di teks UI.
- Tiap kontrol harus punya perilaku nyata atau dihapus; navbar hanya memuat halaman yang ada.
- Tema baru: tambah blok `[data-theme]` di index.css (termasuk `--inv-*`), daftarkan di `THEMES`, `SWATCH`, dict, lalu jalankan `contrast.mjs`.
- Jangan membuat logo/avatar/testimoni/statistik tanpa data nyata dari pemilik.
- Validasi nama/record hidup di `src/lib/names.ts` dan `dns.ts` dan dipakai frontend + worker: ubah di satu tempat saja.
- Rahasia (token Cloudflare, secret OAuth, dll) hanya lewat `wrangler secret put` atau `.dev.vars` (di-gitignore). Jangan di kode atau chat.
- Setiap perubahan skema: tambah file baru di `migrations/` (jangan ubah yang sudah dipakai), lalu `npm run db:local` / `db:remote`.
- `DNS_MODE=mock` hanya untuk lokal; produksi wajib `live`.
- Jangan ubah font dari Poppins.

## Log Perubahan

### 2026-10-05, build awal (agent: Claude Sonnet 5.5)
- Membaca PRD; memuat skill: using-superpowers, ui-ux-pro-max (hasil generator brutalism/mono **ditolak**, tidak cocok dengan Poppins dan PRD; hanya aturan UX dipakai), antislop (filter + Delivery Gate), karpathy-guidelines.
- Membuat proyek Vite + React + TS + Tailwind v4 + Framer Motion; Poppins self-host.
- Membangun: Home (hero interaktif, demo 3 langkah otomatis, kartu platform geser + diagram DNS, aturan main, FAQ, penutup), wizard klaim 4 langkah, dasbor (loading/empty/error, edit/hapus dengan dialog, riwayat, sparkline), login demo, lapor, 404.
- 6 tema, i18n ID/EN, reduced-motion, navigasi keyboard.
- Perbaikan: urutan tag provider di main.tsx; header meluber di 360px (bahasa dipindah ke menu mobile, wordmark mengecil); grid hero melebar di mobile (`min-w-0`); animasi diagram memakai CSS agar patuh reduced-motion.
- Koreksi pemilik: ejaan **tongkrongan** diganti di `src/`, `index.html`, `package.json`.
- Logo pemilik biru/navy: palet `light` dan `dark` diubah ke biru; palet oranye lama jadi tema `kopi`.

### 2026-10-05, pemasangan logo (agent: Claude Sonnet 5.5)
- Membuat folder `public/`; pemilik menaruh `logo.png` (1254x1254, RGBA).
- Membuat `logo-wordmark.png`, `logo-full.png`, `logo-mark.png`, `favicon.png`; navbar menonjolkan tulisan Tongkrongan.tech, footer memakai logo penuh, keduanya tanpa kotak (transparan); favicon diganti dari data-URI ke `/favicon.png`.
- Tema gelap memakai filter CSS `.logo-art` (lihat tabel keputusan).

### 2026-10-05, backend operasional (agent: Claude Sonnet 5.5)
- Mode demo dihapus. Dibangun Worker (router, auth PBKDF2 + sesi cookie, CSRF Origin, rate limit D1, subdomain CRUD, lapor, API admin, OAuth GitHub/Google, Turnstile, Resend, Cron), skema D1 `migrations/0001_init.sql`, `wrangler.jsonc`, `.dev.vars.example`.
- Domain induk dari `BASE_DOMAIN` (kini `tongkrongan.tech`); teks UI memakai `{domain}`; `names.ts`/`dns.ts` dipakai bersama.
- Verifikasi kepemilikan diganti dari kotak centang TXT ke berkas token HTTP + cek DNS via DoH.
- Frontend: `api.ts`, store berbasis API, NameChecker memanggil `/api/check`, Claim membuat record saat langkah 3, Dashboard/Login/Report memakai API, komponen Turnstile, pesan galat API ramah (`te()`).
- Perbaikan: pelindung CSRF menolak permintaan lewat proxy dev (Host/Origin tidak sama), diatasi `changeOrigin` + header origin di vite.config.ts.
- Dokumen baru: [SETUP.md](SETUP.md).

### 2026-10-05, provisioning Cloudflare (agent: Claude Sonnet 5.5)
- Login wrangler oleh pemilik; dibuat D1 `tongkrongan` (id di wrangler.jsonc), migrasi 0001 diterapkan di produksi, secret `ADMIN_TOKEN` acak diunggah (salinan lokal di `.admin-token`, gitignored).
- Deploy berhasil di https://tongkrongan.aaziz6970.workers.dev (subdomain workers.dev akun: aaziz6970). `CF_API_TOKEN` dan `CF_ZONE_ID` kemudian diisi pemilik; dua secret sampah (nama berisi nilai token, salah tempel) dihapus.
- Uji live (workers.dev): daftar, buat subdomain (record dibuat di Cloudflare), verifikasi (DNS terbaca via DoH; gagal `token` karena IP uji tak punya berkas), hapus, nama bebas lagi. Jalur sukses verifikasi HTTP dengan situs asli, Cron, OAuth, Resend, Turnstile, Safe Browsing **belum** diuji live.
- Custom domain `floworks.my.id` dipasang lewat `routes` + `workers_dev: true` (workers.dev tetap hidup sebagai cadangan). Aplikasi: https://floworks.my.id

### 2026-10-05, Turnstile aktif (agent: Claude Sonnet 5.5)
- Secret `TURNSTILE_SECRET` diisi pemilik; site key `0x4AAAAAAFOTMKmv3k5iVvji` (publik) ada di `vars` wrangler.jsonc. Widget tampil di login, daftar, lapor; tombol terkunci sampai lolos.
- Perbaikan: captcha dan tombol OAuth sekarang aktif hanya bila **pasangan kunci lengkap** (sebelumnya secret saja sudah memblokir semua form tanpa widget). GitHub login belum aktif (secret belum ada; pemilik tak bisa verifikasi akun GitHub).
- Belum diuji otomatis: klik widget sampai lolos lalu daftar (bot detection); uji manual oleh pemilik.

### 2026-10-05, verifikasi otomatis + TXT otomatis (agent: Claude Sonnet 5.5)
- Berkas `/.well-known/tongkrongan.txt` dihapus dari alur. Verifikasi: DNS (DoH) + situs menjawab status < 400. Alasan gagal: `dns`, `http`, `platform` (DNS benar tapi platform belum menyajikan domain).
- Migrasi `0002_extra_txt.sql`: kolom `txt_label`, `txt_value`, `txt_record_id`. API menerima `txtLabel`/`txtValue` (label wajib `_xxx`, hanya di bawah nama sendiri); dibuat, diubah, dan dihapus bersama record utama (juga saat suspend dan cleanup Cron).
- Wizard: kolom TXT (terbuka otomatis untuk Railway), langkah terakhir menampilkan cara menambah domain di platform, cek otomatis tiap 10 detik; tombol Ubah record selalu ada.
- Uji live (floworks.my.id): CNAME + TXT dibuat di Cloudflare, verifikasi mengembalikan `platform` (Vercel belum diberi domain), hapus menghapus keduanya (dikonfirmasi di NS resmi `lex.ns.cloudflare.com`; resolver publik masih menampilkan cache ~5 menit). Akun uji sementara di D1 produksi sudah dihapus.
- Uji lokal 36 pemeriksaan lulus, termasuk aktif otomatis tanpa klik.

### 2026-10-05, repositori GitHub (agent: Claude Sonnet 5.5)
- Repo privat https://github.com/xyyxzxx/tongkrongan.tech (branch `main`; dibuat di akun azizuzezo, lalu ditransfer ke xyyxzxx). Rahasia tidak ikut (`.dev.vars`, `.admin-token`, `.wrangler` di-gitignore; sudah dipindai sebelum commit). Tambah README.md.
- Domain `tongkrongan.tech` sudah dibeli; `BASE_DOMAIN` dan route custom domain di wrangler.jsonc, serta SETUP.md, diubah ke `tongkrongan.tech`. Pemilik perlu: tambah zona ke Cloudflare, perbarui secret `CF_API_TOKEN` + `CF_ZONE_ID` untuk zona baru, lalu `npm run deploy`.

### 2026-10-10, penambahan platform GitHub Pages (agent: Udin)

- Menambah platform `github` di `src/lib/dns.ts`: tipe `CNAME` saja, tujuan `username.github.io`, `needsTxt: false`, dokumentasi resmi GitHub Pages. Ditempatkan setelah `vercel` (kelompok static hosting, sebelum `vps`/`hosting`).
- Karena semua platform didorong dari satu array `PLATFORMS` dan `worker/index.ts` membaca array yang sama, **backend tidak diubah**. `POST /api/subdomains` menerima `platform: "github"` otomatis; tipe di luar daftar platform (`A` untuk github) ditolak `bad_input`.
- Teks `plat.github.tag` dan `plat.github.s1..s3` ditambahkan di `dict.ts` (ID + EN). `hero.sub` dan `faq.a2` disesuaikan karena menyebut daftar platform secara eksplisit.
- Penyesuaian tampilan mengikuti jumlah entri: array variasi `borderRadius`/`height` di `Home.tsx` dari 5 ke 6 entri (nilai lama dipertahankan, 1 entri baru disisipkan pada index github), dan grid kartu wizard di `Claim.tsx` dari `lg:grid-cols-5` ke `lg:grid-cols-3` agar 6 kartu menjadi 3+3, bukan 5+1.
- Verifikasi: `npm run build` lulus (tsc frontend + worker + vite); `node scripts/contrast.mjs` lulus AA; uji lokal mode mock — buat subdomain `platform: "github"` tipe CNAME sukses, `github` + tipe `A` ditolak, platform tak dikenal ditolak.

### Backlog yang disarankan
1. og:image dari logo (logo sudah terpasang di navbar, footer, favicon).
2. Perbarui PRD.md ke ejaan "tongkrongan".
3. Uji semua jalur live setelah deploy pertama (SETUP.md bagian 6); perbaiki apa yang gagal.
4. Halaman Syarat Layanan dan Privasi (belum ada, jadi tidak ditautkan); wajib sebelum publik memakai.
5. UI admin, F11 (pengingat email), F13 (token API), 2FA, pembekuan record saat takeover terdeteksi, batas per perangkat.
6. Alamat kontak abuse resmi (Email Routing) lalu tampilkan di halaman lapor.
7. Audit Lighthouse dan uji pembaca layar.
