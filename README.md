# tongkrongan.tech

Subdomain gratis untuk pelajar, kreator, UMKM, dan developer: pilih nama, isi tujuan, aktif dalam hitungan menit. Kami hanya mengelola DNS; website tetap tinggal di Cloudflare, Railway, Vercel, VPS, atau hosting lain.

- Kebutuhan produk: [PRD.md](PRD.md)
- **Baca dulu sebelum mengerjakan apa pun:** [ENGINEERING.md](ENGINEERING.md) (keputusan, struktur, status, log perubahan)
- Dari kode ke layanan hidup: [SETUP.md](SETUP.md)

## Stack

Vite + React + TypeScript + Tailwind v4 + Framer Motion (frontend) · Cloudflare Workers + D1 + Cron (backend) · font Poppins.

## Mulai cepat (lokal)

```bash
npm install
cp .dev.vars.example .dev.vars   # DNS_MODE=mock, tidak menyentuh Cloudflare
npm run db:local
npm run dev:api                  # terminal 1: Worker :8787
npm run dev                      # terminal 2: Vite :5173
```

Rahasia (token Cloudflare, secret OAuth, dll) **tidak pernah** masuk repo: pakai `.dev.vars` (lokal, di-gitignore) atau `npx wrangler secret put NAMA`.
