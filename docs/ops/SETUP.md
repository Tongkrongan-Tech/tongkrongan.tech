# SETUP.md: dari kode ke operasional (semua gratis, kecuali domain)

Panduan ini membawa proyek dari komputer lokal ke layanan hidup di Cloudflare. Domain produksi: `tongkrongan.tech`.

Cek halaman harga Cloudflare sebelum mulai; batas gratis bisa berubah, terutama **jumlah record DNS per zona**.

## 0. Konsep singkat

- Satu Worker menyajikan frontend (`dist/`) dan API (`/api/*`), database D1 (SQLite), dan Cron tiap 15 menit.
- Worker membuat/mengubah/menghapus record DNS di **zona Cloudflare** domain induk lewat API Cloudflare.
- Domain induk (`BASE_DOMAIN`) harus **zona aktif di Cloudflare**. Subdomain pengguna menjadi `nama.<BASE_DOMAIN>`.
- Aplikasi web sendiri bisa tinggal di alamat `*.workers.dev` gratis, jadi tidak perlu memakai apex domain.

## 1. Domain induk masuk Cloudflare

1. Daftar di https://dash.cloudflare.com (gratis), klik **Add a domain**, masukkan `tongkrongan.tech`, pilih paket **Free**.
2. Cloudflare memberi 2 nameserver. Ganti nameserver `tongkrongan.tech` di registrar kamu ke dua nameserver itu.
3. Tunggu status zona **Active** (menit sampai beberapa jam).
4. Catat **Zone ID**: halaman Overview zona, kolom kanan bawah.

> Peringatan: record yang **sudah ada** di zona itu tidak disentuh, tetapi jika pengguna mengklaim nama yang sama dengan record lama (mis. `blog`), pembuatan record gagal dengan galat `dns_provider`. Untuk uji, pakai zona yang bersih.

## 2. Token API Cloudflare (hak akses minimal)

My Profile, **API Tokens**, **Create Token**, **Custom token**:
- Permissions: **Zone, DNS, Edit**
- Zone Resources: **Include, Specific zone, tongkrongan.tech**

Simpan token (hanya tampil sekali). **Jangan kirim token lewat chat atau commit ke git.**

## 3. Siapkan proyek di komputer

```bash
npm install
npx wrangler login            # buka browser, izinkan akses
npx wrangler d1 create tongkrongan
```

Salin `database_id` dari keluaran perintah terakhir ke [wrangler.jsonc](../../wrangler.jsonc) (ganti `GANTI-DENGAN-ID-DARI-wrangler-d1-create`).

Cek juga `vars` di wrangler.jsonc: `BASE_DOMAIN` = domain induk, `QUOTA` = kuota per akun, `DNS_MODE` harus `live` untuk produksi.

## 4. Database dan rahasia

```bash
npm run db:remote                       # membuat tabel di D1 produksi
npx wrangler secret put CF_API_TOKEN    # tempel token dari langkah 2
npx wrangler secret put CF_ZONE_ID      # tempel Zone ID dari langkah 1
npx wrangler secret put ADMIN_TOKEN     # string acak panjang buatanmu (untuk API admin)
npx wrangler secret put REPORT_HASH_KEY # opsional: kunci HMAC untuk menyamarkan IP pelapor di daftar laporan
```

## 5. Deploy

```bash
npm run deploy
```

Pertama kali, Cloudflare meminta kamu mendaftarkan nama **workers.dev** akun (satu kali, nama bebas pilihanmu): buka https://dash.cloudflare.com, Workers & Pages, lalu ikuti onboarding, kemudian ulangi `npm run deploy`.

Wrangler mencetak alamat seperti `https://tongkrongan.<akun>.workers.dev`. Buka alamat itu.

## 6. Uji setelah deploy (wajib, ini jalur yang belum pernah dites dengan kredensial asli)

1. Daftar akun, klaim nama bebas, mis. `uji1`, platform **VPS**, tipe **A**, isi IP publik server uji milikmu.
2. Di dashboard Cloudflare, tab DNS: harus muncul record `uji1.tongkrongan.tech` bertipe A, komentar `managed by tongkrongan`.
3. Pilih platform **Vercel**, tipe **CNAME**, isi target dari proyek Vercel-mu, lalu tambahkan alamat tadi di Vercel (Settings, Domains). Halaman klaim mengecek otomatis tiap 10 detik; status harus berubah jadi **Aktif** tanpa menekan tombol.
4. Coba gagal: sebelum menambahkan domain di platform, pesan harus menjelaskan sebabnya (`DNS` belum menjawab, atau `platform` belum menyajikan situsmu).
5. Hapus subdomain dari dasbor: record di Cloudflare harus ikut hilang.
6. Lihat log Cron: `npx wrangler tail` lalu tunggu 15 menit, atau Cloudflare dashboard, Workers, tongkrongan, Logs.

## 7. Opsional (semuanya gratis)

| Fitur | Cara |
| --- | --- |
| **Login GitHub** | GitHub, Settings, Developer settings, OAuth Apps, New. Callback: `https://<alamat-app>/api/auth/github/callback`. Lalu `wrangler secret put GITHUB_CLIENT_ID` dan `GITHUB_CLIENT_SECRET`. Tombolnya muncul otomatis. |
| **Login Google** | Google Cloud Console, APIs & Services, Credentials, OAuth client (Web). Redirect URI: `https://<alamat-app>/api/auth/google/callback`. Secret: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. |
| **Login Discord** | https://discord.com/developers/applications, New Application, tab OAuth2. Tambahkan Redirect: `https://<alamat-app>/api/auth/discord/callback` (harus persis sama, termasuk `https`). Salin Client ID dan Client Secret (Reset Secret), lalu `wrangler secret put DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET`. Aplikasi meminta scope `identify email`; hanya email yang **terverifikasi di Discord** yang diterima. Ini berbeda dari `DISCORD_WEBHOOK_URL` (notifikasi ke channel). Tombol muncul otomatis. |
| **Captcha Turnstile** | Cloudflare, Turnstile, Add widget. Secret: `TURNSTILE_SECRET`; tambahkan var `TURNSTILE_SITEKEY` di wrangler.jsonc. Aktif di daftar, login, lapor. |
| **Verifikasi email** | Akun Resend (gratis), verifikasi domain pengirim lewat record DNS, lalu secret `RESEND_API_KEY`, var `EMAIL_FROM` (mis. `Tongkrongan <halo@tongkrongan.tech>`) dan `REQUIRE_EMAIL_VERIFY=1`. |
| **Safe Browsing** | Google Cloud, aktifkan Safe Browsing API, buat API key, secret `SAFE_BROWSING_KEY`. Cron menangguhkan subdomain yang terdeteksi. Periksa syarat penggunaan (umumnya non-komersial). |
| **Email abuse** | Cloudflare, Email Routing, buat alamat `abuse@<domain>` yang diteruskan ke emailmu. |
| **Pemantauan** | Sentry dan UptimeRobot/Better Stack, akun gratis. |

## 8. Moderasi: halaman /admin dan API admin

Cara paling mudah: buka `https://<alamat-app>/admin`, masukkan `ADMIN_TOKEN`, lalu kelola laporan terbuka (periksa subdomain dan pemilik, tangguhkan, blokir pemilik, tandai selesai) atau pakai panel "Tindakan manual". Token hanya disimpan di tab itu (sessionStorage) dan hilang saat tab ditutup; halaman tidak ditautkan di navigasi dan tidak diindeks mesin pencari. Penangguhan menghapus record DNS dan tidak bisa dibatalkan dari UI.

Di balik halaman itu, API admin yang sama bisa dipanggil langsung (tanpa UI):

Semua dengan header `Authorization: Bearer <ADMIN_TOKEN>`:

```bash
H="Authorization: Bearer $ADMIN_TOKEN"; A=https://<alamat-app>
curl -H "$H" $A/api/admin/reports                                   # laporan terbuka
curl -H "$H" -X POST -H content-type:application/json -d '{"name":"nama","reason":"phishing"}' $A/api/admin/suspend
curl -H "$H" -X POST $A/api/admin/reports/ID/resolve                # tandai selesai
curl -H "$H" -X POST -H content-type:application/json -d '{"email":"x@y.z"}' $A/api/admin/block
```

`suspend` menghapus record DNS dan mengunci nama (pemilik tidak bisa menghapus atau mengklaim ulang).

## 9. Catatan domain tongkrongan.tech

- Ajukan `tongkrongan.tech` ke Public Suffix List (syarat umur domain berlaku), sesuai PRD.

## 10. Pengembangan lokal

```bash
cp .dev.vars.example .dev.vars   # DNS_MODE=mock, tidak menyentuh Cloudflare
npm run db:local
npm run dev:api                  # terminal 1: Worker + D1 lokal di :8787
npm run dev                      # terminal 2: Vite di :5173 (proxy /api ke :8787)
```

Di mode `mock`, verifikasi selalu lolos kecuali nilai record mengandung kata `fail` (untuk menguji tampilan galat).
