# ENGINEERING.md

Catatan teknis dan log perubahan. **Setiap agent/developer wajib membaca file ini sebelum mulai, dan menambah entri di "Log Perubahan" setelah selesai.** Sumber kebutuhan: [PRD.md](../product/PRD.md).

## Status saat ini (2026-10-05)

Aplikasi **berbasis API sungguhan**: frontend React + backend Cloudflare Worker + database D1. Mode demo sudah **dihapus**. Alur lokal (`DNS_MODE=mock`) lulus 35 pemeriksaan browser. **Jalur live belum pernah dites dengan kredensial asli** (API Cloudflare DNS, DoH, verifikasi HTTP, Cron di produksi, OAuth, Resend, Safe Browsing; verifikasi **sukses** dengan platform sungguhan): uji dengan daftar di [SETUP.md](../ops/SETUP.md) bagian 6 setelah deploy. Panduan go-live: [SETUP.md](../ops/SETUP.md).

## Cara menjalankan (lokal)

```bash
npm install
cp .dev.vars.example .dev.vars   # DNS_MODE=mock
npm run db:local                 # migrasi D1 lokal
npm run dev:api                  # Worker :8787
npm run dev                      # Vite :5173 (proxy /api ke :8787)
npm test                         # seluruh tes di tests/ (butuh Node 22.6+, lihat .nvmrc)
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
| Logo | Logo asli pemilik di `docs/assets/logo.png` (di luar `public/` agar tidak ikut terkirim ke `dist`; latar transparan, navy). Turunannya: `logo-wordmark.png` (tulisan Tongkrongan.tech, navbar), `logo-full.png` (footer), `logo-mark.png` (lambang), `favicon.png`. Ditampilkan **transparan tanpa kotak** (permintaan pemilik); di tema `dark` dan `ocean` kelas `.logo-art` membalik warna dengan `filter: invert(1) hue-rotate(180deg)` agar navy tetap terbaca dan biru tetap biru | Dibuat dari logo.png dengan crop + resize (Pillow). Jangan mengubah logo asli; bila logo diganti, buat ulang ketiga turunan. |

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
docs/                   dokumentasi (product, engineering, ops)
```

## API (semua JSON, prefiks /api)

`GET config`, `GET check?name=`, `GET auth/me`, `POST auth/signup|login|logout`, `GET auth/verify?token=`, `GET auth/github|google/start|callback`, `GET|POST subdomains`, `PATCH|DELETE subdomains/:name`, `POST subdomains/:name/verify`, `POST reports`, admin (Bearer `ADMIN_TOKEN`): `GET admin/reports`, `POST admin/reports/:id/resolve`, `POST admin/suspend`, `POST admin/block`.

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

- Instruksi pemilik (2026-10-13): setiap selesai memperbaiki issue, kirim ringkasan hasil dan pengujian ke webhook Discord dari `DISCORD_WEBHOOK_URL` di `.dev.vars`. Jangan cantumkan URL rahasia di kode, log, atau commit. Sebutkan dengan jelas bila perubahan baru diuji lokal dan belum deploy.
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

### 2026-10-13, audit aksesibilitas dan performa, issue #39
- Perbaikan judul animasi, nama aksesibel kontrol, kontras tab/placeholder papan, keyboard radio, fokus wizard, pemilih tema, dan dialog native. Main mencadangkan tinggi viewport; font utama di-preload.
- Build, tes, kontras, dan browser lulus. Lighthouse accessibility 100 di lima halaman; axe 30 kombinasi halaman/tema ditambah dialog mobile bersih. Skrip audit opsional dan [hasil lengkap](AUDIT-2026-10-13.md) disimpan.
- Issue belum ditutup: LCP akhir 2,528–3,231 detik masih melewati target 2,5 detik; VoiceOver/NVDA dan produksi belum diuji. Perubahan belum deploy.

### 2026-10-13, bukti kendali situs, issue #4
- DNS cocok dan HTTP 2xx tidak lagi cukup. Verifikasi manual dan Cron wajib mendapatkan HTTP 200 dengan isi token 256-bit yang persis cocok dari `/.well-known/tongkrongan-verification.txt`. Redirect ditolak, pembacaan dibatasi 256 byte dan 8 detik per skema; token tidak dikirim dalam request.
- Migrasi `0008_ownership_token.sql` memberi token unik pada klaim lama. Klaim baru memakai token acak baru, edit record merotasi token. Klaim aktif lama tetap aktif; token baru wajib pada verifikasi berikutnya. Petunjuk ID/EN tersedia di Claim dan Dashboard, termasuk Vercel.
- Penulisan hasil verifikasi dicocokkan dengan token terkini dan status penangguhan supaya hasil HTTP lama tidak mengaktifkan tujuan yang sudah berubah. SQL API/Cron diuji dengan SQLite bawaan Node (flag `--experimental-sqlite` pada `npm test`, tanpa dependensi baru).
- Pengujian: tes regresi server wildcard, token salah, HTML, respons besar, redirect, token kosong, DNS salah; seluruh `npm test` dan build lulus. Migrasi lokal lulus. Browser/API lokal lulus untuk pembuatan, rotasi, petunjuk kedua halaman; axe tidak menemukan pelanggaran pada panel bukti. DNS lokal memakai mock, sementara tes unit menjalankan cabang live dengan fetch terkontrol.
- Belum deploy atau migrasi database produksi. Terapkan migrasi sebelum deploy Worker. Ini menggantikan keputusan lama "tanpa berkas" pada tabel historis di atas.

### 2026-10-05, build awal (agent: Claude Sonnet 5.5)
- Membaca PRD; memuat skill: using-superpowers, ui-ux-pro-max (hasil generator brutalism/mono **ditolak**, tidak cocok dengan Poppins dan PRD; hanya aturan UX dipakai), antislop (filter + Delivery Gate), karpathy-guidelines.
- Membuat proyek Vite + React + TS + Tailwind v4 + Framer Motion; Poppins self-host.
- Membangun: Home (hero interaktif, demo 3 langkah otomatis, kartu platform geser + diagram DNS, aturan main, FAQ, penutup), wizard klaim 4 langkah, dasbor (loading/empty/error, edit/hapus dengan dialog, riwayat, sparkline), login demo, lapor, 404.
- 6 tema, i18n ID/EN, reduced-motion, navigasi keyboard.
- Perbaikan: urutan tag provider di main.tsx; header meluber di 360px (bahasa dipindah ke menu mobile, wordmark mengecil); grid hero melebar di mobile (`min-w-0`); animasi diagram memakai CSS agar patuh reduced-motion.
- Koreksi pemilik: ejaan **tongkrongan** diganti di `src/`, `index.html`, `package.json`.
- Logo pemilik biru/navy: palet `light` dan `dark` diubah ke biru; palet oranye lama jadi tema `kopi`.

### 2026-10-05, pemasangan logo (agent: Claude Sonnet 5.5)
- Membuat folder `public/`; pemilik menaruh `logo.png` (1254x1254, RGBA; kini di `docs/assets/`).
- Membuat `logo-wordmark.png`, `logo-full.png`, `logo-mark.png`, `favicon.png`; navbar menonjolkan tulisan Tongkrongan.tech, footer memakai logo penuh, keduanya tanpa kotak (transparan); favicon diganti dari data-URI ke `/favicon.png`.
- Tema gelap memakai filter CSS `.logo-art` (lihat tabel keputusan).

### 2026-10-05, backend operasional (agent: Claude Sonnet 5.5)
- Mode demo dihapus. Dibangun Worker (router, auth PBKDF2 + sesi cookie, CSRF Origin, rate limit D1, subdomain CRUD, lapor, API admin, OAuth GitHub/Google, Turnstile, Resend, Cron), skema D1 `migrations/0001_init.sql`, `wrangler.jsonc`, `.dev.vars.example`.
- Domain induk dari `BASE_DOMAIN` (kini `tongkrongan.tech`); teks UI memakai `{domain}`; `names.ts`/`dns.ts` dipakai bersama.
- Verifikasi kepemilikan diganti dari kotak centang TXT ke berkas token HTTP + cek DNS via DoH.
- Frontend: `api.ts`, store berbasis API, NameChecker memanggil `/api/check`, Claim membuat record saat langkah 3, Dashboard/Login/Report memakai API, komponen Turnstile, pesan galat API ramah (`te()`).
- Perbaikan: pelindung CSRF menolak permintaan lewat proxy dev (Host/Origin tidak sama), diatasi `changeOrigin` + header origin di vite.config.ts.
- Dokumen baru: [SETUP.md](../ops/SETUP.md).

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
- Verifikasi: `npm run build` lulus (tsc frontend + worker + vite); `node scripts/contrast.mjs` lulus AA; uji lokal mode mock, buat subdomain `platform: "github"` tipe CNAME sukses, `github` + tipe `A` ditolak, platform tak dikenal ditolak.

### 2026-10-11, rapikan repositori komunitas (agent: opencode)
- Menambah berkas komunitas: CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, LICENSE (MIT), dan .env.example; .gitignore menutup .env.
- Menambah .github: template issue (bug, permintaan fitur, pertanyaan), template PR, CODEOWNERS, workflow CI (build + pemeriksa kontras), dan Dependabot.
- Memindahkan dokumentasi ke `docs/`: `docs/product/PRD.md`, `docs/engineering/ENGINEERING.md` (berkas ini), dan `docs/ops/SETUP.md`; tautan antar-dokumen disesuaikan.

### 2026-10-11, notifikasi Discord (agent: Claude Sonnet 5.5)

- Branch `feat/discord-notifikasi`. Webhook Discord (bot tampil sebagai **Mas DNS**) mengirim embed ke channel saat: (1) pengguna menyelesaikan OAuth Vercel (`GET /api/vercel/callback`), (2) subdomain **pertama kali** berstatus `active`, baik lewat `POST /api/subdomains/:name/verify` maupun Cron. Berlaku untuk semua platform, karena semuanya lewat dua jalur aktivasi itu; pesan memuat nama platform. Tidak dikirim ulang bila domain turun lalu aktif lagi (dicek lewat `activated_at`).
- Berkas baru `worker/notify.ts` (`notifyDiscord`, `notifyVercelConnected`, `notifyClaimActive`). Tanpa `DISCORD_WEBHOOK_URL` tidak ada request keluar. Batas waktu 3 detik, galat hanya dicatat ke log sehingga permintaan pengguna tidak ikut gagal. Mention Discord dimatikan (`allowed_mentions`). Email disamarkan (`bu***@mail.com`); dari Cron pesan tanpa baris akun.
- Variabel baru `DISCORD_WEBHOOK_URL` (secret, bukan `vars`): lokal di `.dev.vars` (di-gitignore), produksi lewat `npx wrangler secret put DISCORD_WEBHOOK_URL`. Contohnya ditambahkan di `.dev.vars.example`. **URL webhook tidak boleh masuk commit.** Bila bocor, hapus webhook di Discord dan buat baru; menghapus commit tidak cukup.
- Tes baru `tests/notify.test.ts` (4 tes: tanpa URL tidak mengirim, domain lengkap dan email tersamarkan, email utuh tidak bocor, galat Discord tidak melempar).

### 2026-10-11, perbaikan SEO dan banner og:image (agent: Claude Sonnet 5.5)
- Banner buatan pemilik (PNG 1734x907, 1,35 MB) diubah ke JPEG 1200x630 kualitas 85 menjadi `public/og-banner.jpg` (150 KB, turun sekitar 89%). JPEG dipilih karena WhatsApp, Facebook, dan X tidak andal membaca WebP; batas aman pratinjau sekitar 300 KB. Berkas PNG asli tidak disimpan di repo.
- `index.html`: judul dan deskripsi diperketat (judul 53, deskripsi 128 karakter), `robots`, `theme-color`, `canonical`, Open Graph lengkap (`og:image` mutlak + lebar, tinggi, alt, `og:locale` id_ID dengan alternatif en_US), Twitter Card `summary_large_image`, dan JSON-LD `WebSite` + `Organization`. Tanpa `FAQPage` karena isi FAQ dwibahasa dan bisa berubah.
- `public/robots.txt` (blokir `/api/`, tautkan sitemap) dan `public/sitemap.xml` (`/`, `/claim`, `/report`). Halaman privat sengaja **tidak** di-Disallow di robots.txt: bila diblokir, crawler tidak bisa membaca `noindex`-nya.
- `src/lib/seo.ts` (`useRouteSeo`, dipasang di `Layout`): meta `robots` dan `canonical` mengikuti rute; selain `/`, `/claim`, `/report` (dashboard, login, reset, 404) menjadi `noindex, nofollow`. Memperbaiki judul tab yang tertinggal saat kembali ke beranda dari halaman lain. Daftar `INDEXABLE` harus sama dengan sitemap.
- `tests/seo.test.ts` (4 tes): og:image mutlak dan di bawah 300 KB, panjang judul/deskripsi, konsistensi canonical/robots/sitemap/INDEXABLE, JSON-LD valid. Uji: 18/18 lulus, build lulus (Node 24).
- Catatan: tag di `index.html` memakai domain `https://tongkrongan.tech` yang ditulis langsung; ubah bila `BASE_DOMAIN` produksi berganti. Teks di banner campur Indonesia (judul) dan Inggris (chip platform). Titik kecil di bawah huruf "a" pada "tongkronganmu" di banner adalah artefak generator gambar. Belum dilakukan: uji pratinjau di debugger Facebook/X/WhatsApp dan kirim sitemap ke Google Search Console (butuh domain live).

### 2026-10-11, kartu platform jadi sticky note (agent: Claude Sonnet 5.5)
- `PlatformSection` di `src/pages/Home.tsx`: kartu sekarang berukuran seragam (230x220), sudut hampir persegi (radius 4), miring tipis berbeda tiap kartu (`NOTE_TILT`), selotip putih transparan di atas, dan sudut bawah terlipat. Yang dipilih menegak dan terangkat dengan bayangan keras 7px; kartu lain bayangan 3px. Hover menegakkan kartu.
- Chip tipe record dipindah dari `absolute` ke `mt-auto` di kolom flex, sehingga selalu sejajar di dasar kartu. Badge centang dipindah ke sudut luar kartu agar nama panjang ("GitHub Pages") tidak terpecah dua baris.
- Hanya tampilan; data `PLATFORMS`, perilaku pilih/geser, dan aksesibilitas (`role=radio`) tidak berubah. Rel geser diberi ruang atas/bawah agar kemiringan dan selotip tidak terpotong. Uji: build, 18 tes, dan kontras AA lulus; dicek visual di browser.

### 2026-10-11, bagian "Dari ide ke alamat aktif" dirombak (agent: Claude Sonnet 5.5)
- `Demo` di `src/pages/Home.tsx`: panel kanan sekarang satu jendela peramban yang menetap (`DemoBar`), address bar mengetik nama `kamu` di langkah 1. Isinya per langkah: (1) nama besar + badge Tersedia; (2) pilihan platform + tabel record Tipe/Nama/Nilai yang berganti mengikuti platform (nilai contoh dari `PLATFORMS`, diberi keterangan "Nilai contoh"); (3) dua cek yang tercentang berurutan ("DNS menjawab sesuai record", "Situs tampil di alamat itu"), lalu stempel "Subdomain aktif". Dua cek itu sama dengan aturan verifikasi sebenarnya (DNS + situs menjawab).
- Daftar langkah di kiri: nomor besar dalam kotak, langkah yang sudah lewat tercentang (kuning), yang aktif biru dengan bayangan; tidak lagi bergeser 8px (yang membuat sejajarnya miring). Label "Langkah n" dipindah ke teks `sr-only`.
- Kunci kamus baru: `demo.col.type/name/value`, `demo.example`, `demo.c1`, `demo.c2` (ID + EN). Tombol tab, kontrol keyboard, jeda saat hover/fokus, dan `prefers-reduced-motion` dipertahankan (animasi mengetik dan centang dilewati bila reduce motion).
- Uji: build, 18 tes, dan kontras AA lulus; dicek visual tiga langkah di tema terang dan gelap. Catatan uji: di tab otomatis yang tidak aktif, animasi framer-motion tertahan sehingga transisi terlihat lambat; ini bukan galat kode.

### 2026-10-11, bagian "Aturan main" dirapikan (agent: Claude Sonnet 5.5)
- `Rules` di `src/pages/Home.tsx`: angka besar tidak lagi berdampingan dengan teks (lebar angka berbeda-beda: "3", "Otomatis", "24 jam", "0" membuat teks mulai dari posisi berbeda, dan "Otomatis" menghimpit penjelasan jadi kolom sempit). Kini tiap blok bertumpuk dengan susunan sama: angka, judul, penjelasan (maks `max-w-md`).
- Stagger `md:mt-12` pada kolom kanan dihapus; dua kolom dan dua baris sejajar (diukur: x=124/700, lebar 528, baris di y yang sama). Teks dan angka dari kamus tidak diubah, angka tetap dari PRD (3, 24 jam, 0 iklan).

### 2026-10-11, footer disusun ulang (agent: Claude Sonnet 5.5)
- `Footer` di `src/components/Layout.tsx`: sebelumnya kolom kiri berat (logo besar, paragraf, tiga janji tampil seperti teks biasa) dan kolom kanan hanya satu baris tautan melayang di pojok dengan ruang kosong di bawahnya. Kini: merek (logo `w-44` + deskripsi) di kiri, dua kolom tautan bertajuk di kanan ("Mulai": Klaim nama, Dasbor, Platform; "Info": Aturan main, Tanya jawab, Laporkan), tiga janji menjadi chip bercentang di bawah garis, dan baris bawah dua sisi (© tahun berjalan kiri, teks domain/mode pengembangan kanan).
- Tautan hanya ke halaman situs sendiri. **Repo GitHub berstatus privat**, jadi sengaja tidak ditautkan (pengunjung akan mendapat 404); tambahkan tautan Kontribusi/Keamanan/Lisensi setelah repo dipublikasikan. Kunci kamus baru: `footer.start`, `footer.info`, `footer.rules`; `footer.nav` tidak lagi dipakai.
- Tautan `/#platform` dan `/#rules` memakai penggulir hash yang sudah ada di `Layout`. Dua kolom tautan tetap berdampingan di layar HP. Uji: build lulus; dicek visual di desktop dan iframe 390 px (footer tidak menambah luapan horizontal).

### 2026-10-11, kartu langkah platform dan diagram DNS dirapikan (agent: Claude Sonnet 5.5)
- Kartu "Langkah untuk {platform}" di `PlatformSection` (`src/pages/Home.tsx`): angka langkah menjadi kotak bernomor yang menempel ke teksnya (sebelumnya kolom 2rem membuat jarak jauh), nilai record digabung dalam satu baris (`chip tipe` berwarna platform + nilai + tombol Salin) di kotak bergaris, dan tautan dokumentasi didorong ke dasar kartu (`mt-auto`) agar sejajar dengan kartu diagram yang sama tinggi.
- `src/components/DnsDiagram.tsx` (dipakai juga di wizard `/claim`) diubah menjadi **vertikal** (viewBox 360x410: Pengunjung, panah 1, kotak DNS, panah putus-putus 2, Platform). Alasan: di kartu setinggi ini versi horizontal mengecilkan teks dan menyisakan ruang kosong di atas/bawah; di kolom samping wizard dan di HP vertikal tetap besar. `cname.vercel-dns.com` yang menabrak tepi kotak teratasi (kotak 280 px). Keterangan kaki dipindah dari `<text>` SVG ke `<figcaption>` HTML agar membungkus baris. Batas pemotongan: host maks 27 karakter, target maks 28, nama platform maks 16, lalu `…` (diukur dengan `getBBox`: 232 px dari batas 264 px untuk huruf realistis). Prop `className` opsional; SVG dibatasi `max-w-[340px]` dan dipusatkan.
- Uji: build, 18 tes, dan kontras AA lulus; dicek visual untuk Vercel dan GitHub Pages. Nilai terpanjang dari `PLATFORMS` (`server.hostingku.example`, 24 karakter) diukur muat. Nama subdomain panjang di wizard (hingga 32 karakter) dipotong dengan `…`; belum dicek visual karena butuh API lokal.

### 2026-10-11, navbar disederhanakan (agent: Claude Sonnet 5.5)
- Masalah: bilah atas memuat logo, lima tautan, toggle bahasa, tombol Tema, dan Masuk sekaligus, sehingga terasa penuh. Merapikan gaya saja tidak cukup, jadi isinya dikurangi.
- `src/components/Layout.tsx`: tautan utama tinggal tiga (Klaim nama, Platform, Tanya jawab); **Dasbor hanya tampil saat login** (tanpa login halamannya hanya meminta masuk), **Laporkan** cukup di footer. Di menu HP, Dasbor (bila belum login) dan Laporkan tetap ada lewat `mobileExtra`.
- `ThemePicker` + `LangToggle` digabung menjadi komponen `Settings`: satu tombol (swatch tema + kode bahasa) yang membuka panel berisi pilihan Bahasa (ID/EN) dan Tema. Panel tetap terbuka setelah ganti bahasa, menutup setelah pilih tema. Di layar kecil panel selebar layar (`fixed inset-x-3`); sebelumnya (saat masih menempel ke kanan tombol) panel terpotong di kiri layar HP; di `sm` ke atas ia menempel ke tombol, lebar 22 rem agar nama tema terpanjang satu baris.
- Di `lg` ke atas header memakai grid tiga kolom `1fr auto 1fr` (logo kiri, menu tengah, pengaturan kanan) sehingga menu tepat di tengah layar (diukur selisih 0 px); di bawah `lg` tetap flex dengan menu di dalam tombol hamburger. Grid ini aman karena sisi kanan hanya dua tombol; bila isi sisi kanan atau tautan ditambah banyak, cek lagi di lebar 1024 px.
- Tautan aktif berupa chip stabilo kuning (`--hl`), bukan garis bawah; "Masuk" satu-satunya blok biru. Tombol pengaturan dan Masuk sama-sama 40 px. Aksesibilitas: label tombol "Tema, Bahasa", `aria-pressed` pada bahasa, `role=radio` pada tema, Esc menutup panel.
- Uji: build, 18 tes, kontras AA lulus; dicek visual desktop, tema gelap, dan iframe 390 px. Tautan hash (Platform, Tanya jawab) tetap tidak pernah tampil aktif karena `NavLink` tidak membaca hash (perilaku lama).

### 2026-10-11, halaman login dirapikan (agent: Claude Sonnet 5.5)
- `src/pages/Login.tsx`: dua kolom yang tidak seimbang (judul melayang di kiri, kartu di kanan) diganti satu kartu di tengah (`max-w-md`). Di atasnya motif identitas: address bar `https://kamu.{domain}` dengan stabilo (dekoratif, `aria-hidden`), lalu judul dan keterangan.
- Masuk dan Daftar menjadi tab segmented (tombol `aria-pressed`, aktif kuning) menggantikan tautan teks "Belum punya akun? Daftar". "Lupa kata sandi?" dipindah ke baris label kata sandi (sejajar kanan). Tombol Lihat/Sembunyi menjadi pil kecil di dalam kolom. Tombol kirim selebar kartu. Mode lupa kata sandi dan OTP tidak memakai tab; tombol "Kembali ke masuk" di bawah.
- Jarak antar bidang sebelumnya tidak rata karena tempat pesan galat selalu memakan ruang (`min-h-5`). Kini pesan galat hanya ada saat terisi (`empty:hidden`), region `aria-live` dan `role=alert` tetap ada di DOM. Logika form (validasi, Turnstile, OTP, lupa sandi, redirect `from`) tidak berubah. Kunci baru `login.tab.up`; `login.switch.up/in` tidak lagi dipakai.
- Uji: build, 18 tes, kontras AA lulus; dicek visual desktop, galat validasi, tab Daftar, mode lupa kata sandi, dan iframe 390 px (tanpa luapan). Belum dicek: tombol Google/GitHub (tidak aktif di lokal karena OAuth belum dikonfigurasi), widget Turnstile, dan alur OTP dengan server nyata.

### 2026-10-11, login dengan Discord (agent: Claude Sonnet 5.5)
- Penyedia ketiga setelah GitHub dan Google. `worker/index.ts`: `oauthStart`/`oauthCallback` dirapikan memakai tipe `OAuthProvider` dan `oauthCreds`; alur Discord: `https://discord.com/oauth2/authorize` (scope `identify email`) lalu `POST https://discord.com/api/oauth2/token` lalu `GET https://discord.com/api/users/@me`. Rute `/api/auth/discord/{start,callback}`; `/api/config` kini memuat `oauth.discord`. Variabel baru `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET` (secret; berbeda dari `DISCORD_WEBHOOK_URL` untuk notifikasi).
- Keamanan: `worker/oauth.ts` `discordVerifiedEmail` hanya menerima email yang `verified: true` di Discord. Discord mengirim email yang belum diverifikasi juga; tanpa pemeriksaan ini orang bisa mengambil alih akun yang terdaftar dengan email orang lain, karena akun dicocokkan lewat email. State anti-CSRF memakai cookie `tt_oauth` seperti penyedia lain; kolom `users.provider` bebas nilai, jadi tanpa migrasi.
- `src/pages/Login.tsx`: login sosial berupa **deretan tombol ikon** di bawah tombol Masuk (Discord, Google, GitHub), dengan pemisah "atau lanjut dengan" (kunci `login.orWith`). Hanya penyedia yang dikonfigurasi yang tampil; kolom dibagi rata sesuai jumlahnya. Tiap tombol berlabel aksesibel dan tooltip "Lanjut dengan {p}" (`login.with`). Logo digambar di `Brand` (`src/components/ui.tsx`): bentuk resmi isi penuh, warna merek hanya pada Discord (#5865F2) dan Google; GitHub memakai `currentColor` agar terbaca di semua tema. Dicek visual di tema terang dan gelap. Langkah penyiapan di `docs/ops/SETUP.md`, contoh di `.dev.vars.example`.
- Uji: `tests/oauth.test.ts` (3 tes: terverifikasi diterima, belum terverifikasi/tanpa email/kosong ditolak); 21/21 tes lulus, build lulus. Diuji di Worker lokal dengan kredensial palsu: `/start` mengalihkan ke Discord dengan scope dan cookie state yang benar, callback dengan state salah ditolak (`?error=state`), provider tak dikenal 404, tombol tampil. **Belum diuji:** pertukaran token dan pembacaan profil dengan aplikasi Discord sungguhan (butuh Client ID/Secret asli dan redirect terdaftar). Catatan: di `wrangler dev` lokal `redirect_uri` terbentuk dari host route (`tongkrongan.tech`), bukan `localhost`; uji alur penuh di produksi atau pada domain yang terdaftar di portal Discord.

### 2026-10-11, halaman Syarat Layanan dan Kebijakan Privasi (agent: Claude Sonnet 5.5)
- Rute baru `/terms` dan `/privacy` memakai satu komponen `src/pages/Legal.tsx`; isi dua bahasa (ID/EN) ada di `src/lib/legal.ts` (`LEGAL`, `LEGAL_UPDATED`, `CONTACT_EMAIL`). Halaman punya tanggal pembaruan, daftar isi bertaut ke bagian, dan tautan silang. Tertaut dari footer (kolom ketiga "Legal" di samping "Mulai" dan "Info"; di HP kolom itu turun ke baris kedua) dan dari catatan persetujuan di bawah form login ("Dengan melanjutkan, kamu menyetujui..."). Masuk `sitemap.xml` dan `INDEXABLE` (`src/lib/seo.ts`).
- **Isi mengikuti perilaku aplikasi yang sebenarnya** (dibaca dari `worker/` dan `migrations/`): data yang disimpan (email, hash PBKDF2, hash token sesi 30 hari, OTP 10 menit, token reset 1 jam, laporan dengan sidik IP terpotong, kunci batas laju sementara, token Vercel terenkripsi AES-GCM), pihak ketiga (Cloudflare termasuk Turnstile, Resend, GitHub/Google/Discord, Google Safe Browsing, Vercel, dan notifikasi internal ke Discord berisi email tersamarkan), kuota 3, tipe record A/AAAA/CNAME/TXT, pelepasan otomatis 24 jam, penangguhan lewat Safe Browsing, dan komitmen PRD (tanpa iklan, tanpa jual data, pemberitahuan 30 hari). **Bila perilaku berubah (data baru, penyedia baru, retensi), ubah `legal.ts` dan `LEGAL_UPDATED` bersamaan.**
- **Perlu keputusan pemilik sebelum dipublikasikan:** (1) `CONTACT_EMAIL` masih kosong, jadi bagian Kontak menampilkan keterangan pengganti; permintaan penghapusan akun saat ini tidak punya kanal selain itu (belum ada fitur hapus akun mandiri, dan alamat kontak/abuse resmi masih di backlog). (2) Hukum yang berlaku, yurisdiksi, dan identitas badan pengelola sengaja **tidak** ditulis karena itu keputusan hukum pemilik. (3) Teks ini draf yang jujur terhadap kode, **bukan nasihat hukum**; sebaiknya ditinjau orang yang berwenang sebelum layanan dibuka untuk umum.
- Uji: `tests/legal.test.ts` (versi ID dan EN setara, tiap bagian berisi, janji 30 hari ada di keduanya, tanggal ISO); 27/27 tes, build, dan kontras AA lulus. Dicek visual di browser: halaman, daftar isi, versi Inggris, footer. Scroll halus dari daftar isi tidak bisa diuji di tab otomatis yang tersembunyi (hasilnya sama seperti `scrollIntoView` smooth di mana pun di tab itu), jadi dicek lewat perubahan hash.

### 2026-10-11, issue #34, #35, dan #36 (agent: Claude Sonnet 5.5)
- **#34 font subset Latin:** `src/index.css` mengimpor `@fontsource/poppins/latin-300.css` sampai `latin-800.css`. Sebelum itu dipastikan tidak ada karakter di `src/` dan `index.html` di luar rentang subset Latin. Hasil build: `dist/assets` 1332 KB menjadi 696 KB, berkas font 36 menjadi 12, tanpa aset Devanagari/Cyrillic/Greek/Vietnamese. Catatan: karena `unicode-range`, browser memang tidak mengunduh subset yang tidak dipakai, jadi pengurangan nyata terutama di ukuran deploy, bukan di waktu muat pengguna.
- **#35 code-split rute:** `src/main.tsx` memuat Claim, Dashboard, Login, ResetPassword, Report, Legal, dan NotFound lewat `React.lazy`; Home tetap eager karena halaman pertama. `Layout` membungkus `<Outlet />` dengan `Suspense` (spinner `ui.loading`) sehingga header dan footer tidak berkedip. JS awal 521 KB menjadi 466 KB (index 383,6 KB + chunk bersama `prefs` 82,5 KB; gzip sekitar 147 KB); sisanya, sekitar 58 KB, dimuat saat halamannya dibuka. Penghematannya sedang saja karena bobot terbesar halaman utama adalah React, router, dan framer-motion, yang tidak terpecah per rute; memisahkannya (mis. `manualChunks`) membantu cache tetapi tidak mengecilkan muatan awal.
- **#36 TXT Railway di wizard klaim:** `src/pages/Claim.tsx` menampilkan kolom TXT (nama dan nilai) untuk platform non-Vercel yang `needsTxt`. Nama bawaan per platform di `TXT_LABEL_DEFAULT` (`railway: _railway-verify`), placeholder dari `PLATFORMS`. TXT opsional; bila terisi, aturannya sama dengan backend (`validateRecordInput`): nama diawali garis bawah, huruf kecil/angka/tanda hubung maks 40, nilai wajib dan maks 255. Aturan ada di `src/lib/txt.ts` (`genericTxtInvalid`) agar bisa dites. Isian TXT direset saat platform berganti, dan dipulihkan saat melanjutkan subdomain yang belum aktif. Jalur Vercel tidak berubah.
- Uji: `tests/txt.test.ts` (5 tes); 32/32 tes, build, kontras AA lulus. Diuji di browser dengan akun dan data uji lokal (mock): nama TXT salah ditolak dengan pesan, nama valid membuat subdomain dengan `txtLabel=_railway-verify` dan `txtValue` tersimpan; data uji dihapus setelahnya. Belum diuji: Railway sungguhan (verifikasi `platform` dengan layanan Railway asli).

### 2026-10-11, UI admin untuk moderasi, issue #40 (agent: Claude Sonnet 5.5)
- Halaman baru `/admin` (`src/pages/Admin.tsx`, lazy-load). Gerbang token: `ADMIN_TOKEN` dimasukkan lewat formulir dan disimpan **hanya di `sessionStorage`** (`src/lib/admin.ts`), tidak di kode, URL, atau `localStorage`; dikirim sebagai `Authorization: Bearer`. Token salah (401) mengosongkan sesi dan menampilkan pesan. Halaman tidak ditautkan di navigasi atau footer, tidak masuk sitemap, dan otomatis `noindex` (bukan bagian `INDEXABLE`).
- Fitur: daftar laporan terbuka (alasan berwarna, nama subdomain bertaut, detail laporan tampil sebagai teks biasa, bukan HTML), "Periksa subdomain dan pemilik" (status, tujuan, email pemilik, waktu), **Tangguhkan** dan **Blokir pemilik** dengan konfirmasi sebaris (bukan `window.confirm`), **Tandai selesai**, dan panel **Tindakan manual** (tangguhkan lewat nama, blokir lewat email) untuk kasus di luar laporan. Teks UI berbahasa Indonesia saja, tanpa kamus dwibahasa, karena ini alat internal maintainer.
- Backend: satu rute baru `GET /api/admin/subdomains/:name` di `admin()` (`worker/index.ts`), berada sesudah pemeriksaan token, mengembalikan data subdomain dan `owner_email`/`owner_blocked`. Tanpa rute ini, memblokir pelaku butuh mencari email pemilik di luar UI. `src/lib/api.ts` kini menerima `headers` opsional. **Catatan merge:** PR #29/#30 juga mengubah `worker/index.ts`; rute ini berdiri sendiri di dalam `admin()` jadi seharusnya mudah digabung.
- Uji: `tests/admin.test.ts` (alasan UI sama dengan `REASONS` backend, rute info ada sesudah pemeriksaan token, halaman tidak ditautkan dan tidak di sitemap); 35/35 tes, build, kontras AA lulus. Diuji di browser dan Worker lokal dengan akun/subdomain/laporan uji (dihapus sesudahnya): token salah ditolak, daftar, periksa, batal konfirmasi, tangguhkan (status `suspended`), blokir pemilik, tandai selesai, keluar (token hilang dari sesi); tanpa token semua endpoint admin 401.
- **Belum dari issue #40:** daftar subdomain yang ditandai `h.needsReview` untuk ditinjau manusia. Entri riwayat itu dibuat backend di PR #31 (belum di-merge) dan belum ada endpoint untuk mendaftarkannya; tambahkan setelah #31 masuk. Juga belum ada "buka blokir" atau "pulihkan subdomain" (API-nya pun belum ada).

### 2026-10-11, CI menjalankan tes dan syarat Node diseragamkan, issue #57 (agent: Udin)
- `.github/workflows/ci.yml`: `node-version: 20` diganti `node-version-file: .nvmrc`, dan langkah `jalankan npm test` disisipkan sebelum `npm run build`. Sebelumnya 41 tes di `tests/` tidak pernah dijalankan CI, jadi regresi bisa lolos ke `main` tanpa terdeteksi.
- Berkas baru `.nvmrc` (isi `22`) sebagai satu sumber versi Node untuk CI dan kontributor. `package.json` mendapat `engines: { "node": ">=22.6" }`, karena `npm test` memakai `--experimental-strip-types` yang baru tersedia di Node 22.6; npm memberi peringatan bila dipakai versi lebih lama. Kecocokan ini dibuktikan dengan `npx -y node@20 --experimental-strip-types` yang membalas `node: bad option: --experimental-strip-types`.
- Dokumen disesuaikan agar tidak saling bertentangan: `README.md` prasyarat dari "Node.js 20" menjadi "Node.js 22.6" dan tabel perintah npm kini memuat `npm test`; `CONTRIBUTING.md` menambah `npm test` ke daftar pemeriksaan sebelum mengirim.
- Uji di lokal (Node 22.23.1): `npm test` 41/41 lulus, `npm run build` lulus, `node scripts/contrast.mjs` lulus. **Belum diuji:** jalannya workflow itu sendiri di GitHub Actions; kegagalan pertamanya setelah PR digabung justru akan terbaca dari halaman Actions.

### 2026-10-11, teks riwayat h.needsReview, issue #33 (agent: Udin)
- `src/lib/dict.ts` mendapat kunci `h.needsReview` ("Menunggu tinjauan manual" / "Awaiting manual review"). Tanpa kunci ini dasbor menampilkan nama kunci mentah kepada pengguna: `worker/cron.ts` menulis riwayat itu untuk nama yang menyerupai merek, sementara `src/pages/Dashboard.tsx` merendernya lewat `t(h.key)`.
- Tes baru `tests/dict.test.ts` menutup kebocoran serupa: (1) setiap literal `h.*` yang dipakai di `worker/` dan `src/` wajib punya entri di dict, (2) tiap kunci riwayat harus berisi teks ID dan EN yang tidak kosong. Pemecahan nilai memakai pemindai tanda kutip agar nilai yang memuat koma (mis. `hero.sub`) tetap dihitung dua bagian, bukan salah baca.
- Uji: sebelum diperbaiki tes gagal tepat pada `kunci riwayat tanpa terjemahan: h.needsReview`; sesudahnya 43/43 tes, `npm run build`, dan kontras AA lulus.

### 2026-10-11, kotak pengecek nama dirapikan (agent: Claude Sonnet 5.5)
- `src/components/NameChecker.tsx` (dipakai di beranda dan wizard klaim): sebelumnya input memakai garis fokus global (`:focus-visible`), jadi saat aktif muncul kotak biru kedua di dalam kotak gabungan, dan nama terpisah jauh dari `.tongkrongan.tech`. Kini satu kontrol: lebar input mengikuti isi (trik grid dengan cermin teks tak terlihat, input `w-0 min-w-full`), sehingga nama menempel pada akhiran seperti di bilah alamat, dan nama yang diketik tersorot stabilo (`--hl`; tinggi band dibatasi lewat `background-clip: content-box`; pakai `backgroundColor`, bukan singkatan `background`, agar clip tidak ter-reset).
- Indikator fokus pindah ke seluruh kotak (`.namebox:focus-within` di `src/index.css`: terangkat 2 px dan bayangan keras menjadi `--accent-text`). Garis fokus input dimatikan lewat `.namebox input:focus-visible`, karena aturan global tak berlapis mengalahkan utilitas Tailwind. Ada cadangan `outline` untuk `forced-colors` dan transisi dimatikan untuk `prefers-reduced-motion`.
- Tombol klaim di HP bertumpuk dengan batas atas, dari `sm` ke atas di kanan dengan batas kiri. Dicek di desktop, HP 390 px, tema gelap, dan wizard klaim (tanpa tombol). Pengetikan dengan mouse dan keyboard sungguhan belum bisa diuji di alat otomatis; coba sendiri, terutama Tab ke kotak itu.

### 2026-10-11, unblock, pulihkan, dan antrean tinjauan admin, issue #40 (agent: Udin)
- Backend (`worker/index.ts`, fungsi `admin()`): tiga rute baru, semuanya sesudah pemeriksaan token. `POST /api/admin/unblock` mengembalikan `users.blocked = 0` tanpa menyentuh baris pengguna; sesi sengaja tidak dipulihkan karena sudah dihapus saat memblokir, cukup masuk lagi. `POST /api/admin/restore` membuat ulang record utama dan TXT dari nilai yang masih tersimpan (karena suspend menghapus record dan mengosongkan `cf_record_id`), lalu mengembalikan status ke `pending` dengan `last_check_at = 0` agar diverifikasi ulang lewat jalur biasa, dan menulis riwayat `h.restored`. `GET /api/admin/reviews` mengembalikan subdomain yang punya penanda `h.needsReview`, lengkap dengan pemilik, tujuan, dan waktu penandaan, dibatasi 200 baris.
- **Restore memulai ulang jendela 24 jam untuk yang belum pernah aktif** (`created_at` di-set ulang bila `activated_at` NULL). Tanpa ini, menangguhkan subdomain lama menyembunyikannya dari aturan pelepasan Cron (`activated_at IS NULL AND status IN ('pending','failed','verifying') AND created_at < 24 jam`), dan begitu dipulihkan statusnya kembali `pending` sehingga putaran Cron berikutnya (tiap 15 menit) akan **menghapus baris beserta riwayatnya**. Akibat sampingan: kolom "Dibuat" untuk kasus itu menampilkan waktu pemulihan, bukan klaim awal. Perilaku serupa (edit tujuan pada subdomain lama yang belum pernah aktif) sudah ada sebelumnya dan tidak diubah di sini.
- Frontend (`src/pages/Admin.tsx`): tombol "Pulihkan subdomain" muncul bila status `suspended`, dan "Buka blokir" menggantikan "Blokir pemilik" bila pemilik terblokir. Kedua tindakan pemulihan memakai konfirmasi bertanda hijau, bukan merah, karena hasilnya memulihkan. Bagian baru "Antrean tinjauan" menampilkan nama, status, pemilik, tujuan, waktu ditandai, serta tombol "Periksa" yang memakai panel yang sama dengan kartu laporan; komponen `Detail` diekstrak agar tidak duplikat. Tindakan manual juga mendapat tombol Pulihkan dan Buka blokir.
- `src/lib/dict.ts` mendapat kunci `h.restored`, karena riwayat itu dirender dasbor lewat `t(h.key)`.
- Ruang lingkup: daftar tinjauan saja. Tombol "tandai sudah ditinjau" sengaja tidak dibuat (penanda `h.needsReview` tidak pernah dihapus, jadi daftar bersifat kumulatif) — kandidat langkah lanjut.
- Uji: `tests/admin.test.ts` bertambah 4 tes (rute baru sesudah pemeriksaan token; restore membuat ulang record utama dan TXT, tidak menghapus record, memulai ulang jendela 24 jam, dan kunci riwayatnya ada di dict; unblock tidak menghapus baris pengguna; antrean menyaring `h.needsReview` dan menyertakan pemilik). 45/45 tes, build, dan kontras AA lulus. **Belum diuji:** jalur live dengan Cloudflare API sungguhan (pembuatan ulang record) dan tampilan di browser dengan data moderasi nyata.

### Backlog yang disarankan
1. Ganti banner ke versi tanpa artefak titik pada "tongkronganmu", lalu uji pratinjau tautan di WhatsApp dan debugger Facebook.
2. Perbarui PRD.md ke ejaan "tongkrongan".
3. Uji semua jalur live setelah deploy pertama (SETUP.md bagian 6); perbaiki apa yang gagal.
4. ~~Halaman Syarat Layanan dan Privasi~~ sudah ada (draf); tinggal isi `CONTACT_EMAIL` dan tinjauan hukum sebelum publik memakai.
5. UI admin, F11 (pengingat email), F13 (token API), 2FA, pembekuan record saat takeover terdeteksi, batas per perangkat.
6. Alamat kontak abuse resmi (Email Routing) lalu tampilkan di halaman lapor.
7. Audit Lighthouse dan uji pembaca layar.

## Reset kata sandi dan tampil/sembunyi sandi
- Tabel `password_resets` (migrasi 0003), endpoint `POST /api/auth/forgot` (selalu menjawab ok agar email tidak bisa ditebak) dan `POST /api/auth/reset` (token sekali pakai, berlaku 1 jam, semua sesi akun dihapus). Halaman `/reset`, mode "lupa sandi" di halaman login, tombol Lihat/Sembunyi di kolom sandi.
- Butuh `RESEND_API_KEY` dan `EMAIL_FROM`. Bila belum diset, `/forgot` menjawab 503 `email_off`.

## TXT verifikasi Vercel di domain induk
- Vercel meminta TXT `_vercel.<domain induk>` bila nama subdomain pernah dipakai di akun Vercel lain. Di form klaim (platform Vercel) ada isian opsional; server membuat TXT itu di `_vercel.tongkrongan.tech` (`txtHost` di worker/dns.ts) memakai kolom `txt_label='_vercel'`, `txt_value`, `txt_record_id` yang sudah ada, sehingga hapus/suspend/edit ikut membersihkannya.
- Keamanan: nilai wajib `vc-domain-verify=<nama>.<domain>,<kode>` untuk subdomain milik pengguna itu sendiri (divalidasi di server), jadi tidak bisa dipakai untuk membuktikan nama orang lain.

## Verifikasi email dengan OTP
- Email diaktifkan lewat Resend (`RESEND_API_KEY` secret, `EMAIL_FROM` var, domain terverifikasi) dan `REQUIRE_EMAIL_VERIFY=1`.
- Daftar baru mengirim kode 6 digit (tabel `email_otps`, migrasi 0004, hash sha256, berlaku 10 menit, maksimal 5 salah, jeda kirim ulang 60 detik) lalu halaman login beralih ke mode `otp`. Login akun yang belum terverifikasi ikut mengirim kode. Endpoint: `POST /api/auth/verify-otp` (sukses = langsung masuk) dan `POST /api/auth/resend-otp`. Tautan lama `GET /api/auth/verify` masih ada tetapi tidak lagi dikirim.

## Hubungkan Vercel sekali klik (OAuth Integration)
- Kode: `worker/vercel.ts` + rute `/api/vercel/*` di worker/index.ts, panel di langkah 2 wizard klaim (platform Vercel). Hanya tampil bila `VERCEL_CLIENT_ID`, `VERCEL_CLIENT_SECRET`, `VERCEL_INTEGRATION_SLUG`, `VERCEL_TOKEN_KEY` ada (`config.vercelConnect`).
- Alur: `/api/vercel/start` (state cookie) -> halaman install Integration Vercel -> `/api/vercel/callback` menukar code jadi token (disimpan terenkripsi AES-GCM di `vercel_connections`) -> pengguna pilih proyek -> `POST /api/vercel/connect` menambah `nama.<domain>` ke proyek lewat API Vercel, mengambil CNAME (`/v6/domains/{d}/config`) dan TXT `_vercel` dari jawaban Vercel, lalu membuat DNS lewat jalur `createSubdomain` yang sama dengan klaim manual. TXT hanya diterima bila untuk subdomain itu dan di `_vercel.<domain>`.
- Verifikasi memicu `POST .../verify` ke Vercel; menghapus subdomain ikut melepas domain dari proyek (best effort). Kolom `subdomains.vercel_project` (migrasi 0005).
- Redirect URL Integration: `https://<BASE_DOMAIN>/api/vercel/callback`. Scope: Projects (Read/Write), Domains (Read/Write).

## Adapter DNS deSEC (percobaan)
- `DNS_PROVIDER=desec` + secret `DESEC_TOKEN` memindahkan operasi record dari Cloudflare ke deSEC (`worker/desec.ts`, dipanggil dari `worker/dns.ts`). Default tetap Cloudflare. Id record disimpan sebagai JSON `{s,t,v}` karena deSEC memakai RRset (banyak nilai per nama+tipe), TTL 3600 (minimum akun gratis).
- Uji tanpa jaringan: `npm test` (server deSEC tiruan di memori; menguji create/update/delete, penggabungan banyak TXT di `_vercel`, idempoten, retry 429). Belum diuji ke deSEC sungguhan.
- Catatan: custom domain Worker butuh zona di Cloudflare, jadi percobaan deSEC dijalankan sebagai deployment terpisah (workers.dev, D1 sendiri).
- Deployment uji deSEC (Worker `tongkrongan-desec` dan D1 `tongkrongan-desec`) sudah dihapus total; `wrangler.desec.jsonc` dihapus. Adapter di kode tetap ada.
