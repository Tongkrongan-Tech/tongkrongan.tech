# Panduan Code Review

Dokumen ini menjelaskan cara meninjau pull request di tongkrongan.tech. Tujuannya bukan mencari kesalahan penulis, tetapi memastikan perubahan benar, aman, bisa diuji, dan tetap bisa dirawat oleh komunitas.

Aturan kontribusi umum ada di [CONTRIBUTING.md](../../CONTRIBUTING.md). Panduan ini melengkapi bagian review di sana.

## Peran reviewer

Reviewer bertanggung jawab untuk:

- Memastikan satu pull request hanya punya satu tujuan.
- Memeriksa perilaku, bukan hanya gaya penulisan.
- Menjalankan pemeriksaan yang relevan, atau menyatakan dengan jujur bagian yang belum diverifikasi.
- Menjelaskan temuan dengan bukti dan saran perbaikan.
- Menjaga diskusi tetap sopan sesuai [CODE_OF_CONDUCT.md](../../CODE_OF_CONDUCT.md).

Reviewer bukan penulis kedua. Jangan meminta perubahan yang hanya berdasarkan selera pribadi. Kalau sebuah temuan tidak memblokir merge, tandai sebagai non-blocking dan biarkan penulis memutuskan.

## Label temuan

Gunakan awalan berikut di komentar review:

- `[blocking]`: harus diperbaiki sebelum merge.
- `[should]`: sebaiknya diperbaiki, boleh dilanjutkan lewat issue terpisah.
- `[question]`: butuh klarifikasi, bukan tuduhan.
- `[nit]`: opsional, tidak boleh menahan pull request.

Contoh:

> `[blocking] worker/index.ts:807`: `includeSubDomains` memaksa HTTPS untuk semua subdomain pengguna. Situs VPS tanpa sertifikat valid bisa gagal dibuka. Hapus `includeSubDomains` atau pastikan semua subdomain punya TLS valid.

## Alur review

1. Baca issue dan deskripsi pull request.
2. Pastikan scope sesuai. Kalau bercampur, minta dipecah sebelum review mendalam.
3. Baca diff dari gambaran besar, lalu per file.
4. Jalankan pemeriksaan yang relevan.
5. Periksa area sensitif bila perubahan menyentuh auth, DNS, database, atau deployment.
6. Tulis ringkasan, temuan, dan keputusan.
7. Tindak lanjuti commit baru. Approval lama bisa gugur kalau perilaku berubah.

## Perintah verifikasi

Jalankan dari root repositori:

```bash
npm ci
npm test
npm run build
node scripts/contrast.mjs
npx wrangler deploy --dry-run
```

Tambahan sesuai perubahan:

```bash
npm run db:local    # bila ada migrasi
npm run dev:api     # terminal 1, untuk uji API lokal
npm run dev         # terminal 2, untuk uji UI
```

Untuk perubahan UI, uji minimal:

- Lebar 360px dan 844px, tanpa overflow horizontal.
- Enam tema.
- Navigasi keyboard: Tab, Enter, Escape, dan tombol panah pada radio atau tab.
- `prefers-reduced-motion`.
- Empty, loading, dan error state.

## Checklist per area

### Backend dan keamanan

- Apakah route baru punya autentikasi, otorisasi, pembatas laju, dan validasi input yang sesuai?
- Apakah error tidak membocorkan detail internal atau keberadaan data?
- Apakah cookie, sesi, CSRF, dan header keamanan tetap benar?
- Apakah query SQL memakai binding?
- Apakah perubahan admin tetap berada setelah pemeriksaan token?
- Apakah email, token, dan data pribadi tidak masuk log atau notifikasi publik?
- Apakah perubahan fail-open atau fail-closed dijelaskan?

### DNS dan verifikasi

- Apakah IP privat, loopback, link-local, dan rentang dokumentasi tetap ditolak?
- Apakah CNAME dicek terhadap tujuan yang mengarah kembali ke domain sendiri?
- Apakah ownership token tetap dirotasi saat record berubah?
- Apakah verifikasi lama tidak bisa mengaktifkan record baru?
- Apakah provider DNS alternatif (deSEC) ikut teruji?
- Apakah perubahan status punya jalur pemulihan yang jelas?

### Cron dan operasional

- Berapa query D1 dan fetch keluar per putaran?
- Apakah pekerjaan muat dalam batas subrequest dan waktu Workers?
- Apakah setiap tahap punya `try/catch` agar satu error tidak menghentikan sisanya?
- Apakah operasi idempoten dan aman bila dua putaran berjalan berdekatan?
- Apakah timeout dipasang untuk setiap layanan eksternal?
- Apakah data yang dihapus juga dibersihkan dari tabel terkait?

### Frontend dan aksesibilitas

- Apakah teks baru ada di `src/lib/dict.ts` untuk bahasa Indonesia dan Inggris?
- Apakah tombol dan tautan punya perilaku nyata, bukan kontrol mati?
- Apakah target sentuh minimal 44px?
- Apakah fokus terlihat di semua tema dan dalam forced-colors?
- Apakah dialog bisa ditutup dengan Escape dan fokus kembali ke pemicu?
- Apakah gambar punya `alt` dan dimensi?
- Apakah state kosong, memuat, dan galat tetap ada?
- Apakah gerakan menghormati `prefers-reduced-motion`?

### Migrasi dan data

- Apakah migrasi dibuat sebagai file baru di `migrations/`, bukan mengubah file lama?
- Apakah migrasi aman untuk data yang sudah ada?
- Apakah kolom baru punya default atau backfill?
- Apakah index dibutuhkan untuk query baru?
- Apakah rollback atau mitigasi dijelaskan?

### Dokumentasi dan konfigurasi

- Apakah `README.md`, `docs/engineering/ENGINEERING.md`, dan `docs/ops/SETUP.md` masih sesuai?
- Apakah variabel baru tercatat di `.env.example` dan `.dev.vars.example`?
- Apakah secret tetap lewat `wrangler secret put`, bukan `vars`?
- Apakah perubahan perilaku pengguna memerlukan pembaruan `src/lib/legal.ts`?
- Apakah perintah baru bisa dijalankan kontributor baru?

## Kriteria approval

Approve hanya bila:

- CI lulus.
- Pemeriksaan lokal yang relevan sudah dijalankan.
- Area berisiko sudah diperiksa, bukan hanya area yang mudah.
- Tidak ada `[blocking]` yang tersisa.
- Dokumentasi dan tes ikut diperbarui bila perilaku berubah.
- Kamu bisa menjelaskan apa yang sudah diverifikasi dan apa yang belum.

Jangan menulis "LGTM" tanpa keterangan. Tulis apa yang kamu periksa, misalnya:

> Sudah dicek: `npm test` 96/96, build lulus, alur klaim di mode mock, dan tidak ada perubahan cookie. Jalur live DNS belum diuji.

## Menangani temuan keamanan

- Jangan membahas detail eksploitasi di issue publik bila temuan masih terbuka dan bisa disalahgunakan.
- Gunakan private vulnerability reporting atau hubungi maintainer sesuai [SECURITY.md](../../SECURITY.md).
- Untuk perbaikan yang sensitif, minta review tambahan dari maintainer lain.
- Setelah perbaikan, tambahkan tes regresi dan catat dampaknya di changelog atau issue.

## Hal yang tidak perlu dilakukan

- Jangan memblokir pull request karena format yang tidak diatur proyek.
- Jangan meminta refactor besar yang tidak berhubungan dengan tujuan pull request.
- Jangan mengapprove hanya karena CI hijau.
- Jangan menganggap perubahan dokumentasi otomatis aman; cek apakah isinya sesuai kode.
- Jangan menyalin review orang lain tanpa memeriksa sendiri.

## Target waktu

Sesuai [CONTRIBUTING.md](../../CONTRIBUTING.md), target review adalah dua sampai tiga hari. Kalau kamu tidak bisa memenuhi target itu, tinggalkan komentar agar penulis tahu dan bisa meminta reviewer lain.
