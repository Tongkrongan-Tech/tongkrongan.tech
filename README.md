# tongkrongan.tech

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/xyyxzxx/tongkrongan.tech/actions/workflows/ci.yml/badge.svg)](https://github.com/xyyxzxx/tongkrongan.tech/actions/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Kontributor](https://img.shields.io/github/contributors/xyyxzxx/tongkrongan.tech)](CONTRIBUTORS.md)
[![Situs](https://img.shields.io/badge/situs-tongkrongan.tech-blue)](https://tongkrongan.tech)

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare%20Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

Subdomain gratis untuk pelajar, kreator, UMKM, dan developer. Pilih nama, tentukan tujuan, dan alamat aktif dalam beberapa menit. Layanan ini hanya mengelola DNS, sementara website tetap berjalan di Cloudflare, Railway, Vercel, VPS, atau hosting lain milik pengguna.

Situs: https://tongkrongan.tech

Status: dalam pengembangan aktif.

## Daftar isi

- Fitur
- Cara kerja
- Stack
- Struktur repositori
- Menjalankan di lokal
- Variabel lingkungan dan rahasia
- Perintah npm
- Dokumentasi
- Kontribusi
- Kontributor
- Keamanan
- Lisensi

## Fitur

- Pendaftaran dan masuk dengan email atau akun Google dan GitHub.
- Pemeriksaan ketersediaan nama langsung saat mengetik, disertai saran alternatif.
- Klaim subdomain nama.tongkrongan.tech dengan record A, AAAA, CNAME, atau TXT.
- Pemilihan platform lewat kartu: Cloudflare, Railway, Vercel, GitHub Pages, VPS, dan hosting lain. Wizard mengisi nilai record dan langkah penyambungan.
- Pemeriksaan DNS dan respons HTTP tujuan secara otomatis, dengan status menunggu, aktif, atau gagal beserta alasannya.
- Dasbor untuk mengubah tujuan, melihat riwayat perubahan, dan menghapus subdomain.
- Sambungan satu klik ke proyek Vercel lewat OAuth Integration.
- Pelaporan penyalahgunaan, plus moderasi melalui API admin.
- Verifikasi email dengan kode OTP dan pengaturan ulang kata sandi.
- Enam tema tampilan, antarmuka dua bahasa (Indonesia dan Inggris), dan dukungan preferensi kurangi gerakan.

## Cara kerja

Satu Worker Cloudflare menyajikan frontend dan API. Saat pengguna mengklaim nama, Worker membuat record DNS di zona tongkrongan.tech lewat API Cloudflare, lalu menyimpan statusnya di D1. Worker kemudian memeriksa jawaban DNS dan respons HTTP tujuan, dan memperbarui status subdomain. Pengunjung website tidak melewati aplikasi ini, karena DNS langsung mengarahkan mereka ke platform milik pengguna.

## Stack

- Frontend: Vite, React, TypeScript, Tailwind CSS v4, Framer Motion, React Router.
- Backend: Cloudflare Workers, D1 (SQLite), dan Cron Triggers.
- Font: Poppins, di-host sendiri lewat paket @fontsource.

## Struktur repositori

- src/ frontend: halaman, komponen, dan modul bersama untuk aturan nama serta validasi record.
- worker/ backend: router, akses DNS Cloudflare, Cron, dan integrasi Vercel.
- migrations/ skema dan perubahan database D1.
- scripts/ skrip pendukung, termasuk pemeriksa kontras warna.
- public/ aset statis dan logo.
- docs/ dokumentasi: product (PRD), engineering (keputusan teknis dan log), dan ops (panduan setup).

## Menjalankan di lokal

Prasyarat: Node.js 20 atau versi lebih baru.

```bash
git clone https://github.com/xyyxzxx/tongkrongan.tech.git
cd tongkrongan.tech
npm install
cp .dev.vars.example .dev.vars
```

Jalankan di dua terminal:

```bash
# terminal 1: migrasi database lokal, lalu Worker
npm run db:local
npm run dev:api

# terminal 2: frontend
npm run dev
```

Frontend berjalan di http://localhost:5173 dan Worker di http://127.0.0.1:8787. Permintaan ke /api otomatis diproksi ke Worker. Berkas .dev.vars.example memakai DNS_MODE=mock, sehingga pengembangan lokal tidak menyentuh Cloudflare.

## Variabel lingkungan dan rahasia

Rahasia tidak pernah masuk ke repositori. Untuk lokal, isi .dev.vars yang sudah di-gitignore. Untuk produksi, gunakan npx wrangler secret put NAMA. Daftar lengkap nama variabel ada di .env.example.

- DNS_MODE: live untuk produksi, mock untuk lokal.
- BASE_DOMAIN: domain induk, misalnya tongkrongan.tech.
- CF_API_TOKEN dan CF_ZONE_ID: akses zona DNS Cloudflare.
- ADMIN_TOKEN: token untuk API admin.
- RESEND_API_KEY dan EMAIL_FROM: email verifikasi dan reset kata sandi.
- TURNSTILE_SECRET: captcha Cloudflare Turnstile (opsional).
- GITHUB_CLIENT_ID dan GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET: login OAuth (opsional).
- VERCEL_CLIENT_ID, VERCEL_CLIENT_SECRET, VERCEL_INTEGRATION_SLUG, dan VERCEL_TOKEN_KEY: sambungan Vercel (opsional).
- SAFE_BROWSING_KEY: pemeriksaan daftar ancaman (opsional).

Langkah lengkap ada di docs/ops/SETUP.md.

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| npm run dev | Menjalankan frontend Vite di port 5173 |
| npm run dev:api | Menjalankan Worker di port 8787 |
| npm run build | Tipe check frontend dan worker, lalu build Vite |
| npm run preview | Pratinjau hasil build |
| npm run db:local | Menerapkan migrasi D1 ke database lokal |
| npm run db:remote | Menerapkan migrasi D1 ke database produksi |
| npm run deploy | Build lalu deploy ke Cloudflare |

Pemeriksa kontras dijalankan dengan node scripts/contrast.mjs. Perintah ini memastikan semua tema lulus kontras WCAG AA.

## Dokumentasi

- docs/product/PRD.md: kebutuhan produk dan ruang lingkup versi pertama.
- docs/engineering/ENGINEERING.md: keputusan teknis, struktur, status, dan log perubahan. Baca sebelum mengerjakan.
- docs/ops/SETUP.md: langkah dari kode ke layanan live.
- docs/README.md: indeks dokumentasi.

## Kontribusi

Kami menyambut kontribusi dari siapa pun. Alur kerja, penamaan cabang, format commit, dan aturan pull request ada di CONTRIBUTING.md. Standar perilaku komunitas ada di CODE_OF_CONDUCT.md.

Ringkasnya:

- Satu pull request untuk satu tujuan, jangan mencampur fitur baru dengan refactor besar.
- Cabang kerja memakai awalan feat/, fix/, docs/, atau chore/.
- Judul commit mengikuti Conventional Commits.
- Tandai pull request yang masih dikerjakan sebagai Draft.
- Sebelum mengerjakan sebuah issue, tulis komentar lebih dulu.

## Kontributor

Terima kasih untuk semua yang sudah membantu project ini. Profil kontributor ada di CONTRIBUTORS.md.

[![Kontributor](https://contrib.rocks/image?repo=xyyxzxx/tongkrongan.tech)](https://github.com/xyyxzxx/tongkrongan.tech/graphs/contributors)

## Keamanan

Jangan laporkan celah keamanan lewat issue publik. Cara melapor secara privat ada di SECURITY.md.

## Lisensi

MIT. Lihat LICENSE.
