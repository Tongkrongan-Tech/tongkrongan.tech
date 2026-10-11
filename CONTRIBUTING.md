# Panduan Kontribusi

Terima kasih sudah meluangkan waktu untuk project ini. Repositori ini adalah ruang komunitas, dan kami menjaga aturan tetap sederhana supaya mudah diikuti siapa pun. Semua kontribusi bersifat sukarela, tanpa tenggat yang mengikat.

## Peran

- Owner: memegang pengaturan repositori, akses, dan keputusan akhir.
- Maintainer: meninjau dan menggabungkan pull request, serta mengelola issue.
- Contributor: mengirim pull request dari fork atau cabang, dan ikut meninjau.

## Cara berkontribusi

- Laporkan bug lewat issue.
- Usulkan fitur lewat issue.
- Perbaiki bug atau tambah fitur lewat pull request.
- Perbaiki dokumentasi.

Cari label good first issue untuk tugas yang cocok bagi kontributor baru.

## Alur kontribusi

1. Buka atau temukan issue yang relevan, lalu tulis komentar bahwa kamu mengerjakannya agar tidak terjadi pekerjaan ganda.
2. Fork repositori, lalu buat cabang kerja.
3. Kerjakan perubahan. Jaga satu pull request untuk satu tujuan.
4. Jalankan pemeriksaan di lokal sebelum mengirim, lihat bagian Pemeriksaan sebelum mengirim.
5. Buka pull request ke main dan isi template.
6. Tanggapi komentar review. Reviewer memberi persetujuan akhir.

## Penamaan cabang

- feat/nama-fitur
- fix/nama-bug
- docs/...
- chore/...

Contoh: feat/lapor-abuse, fix/kuota-salah-hitung.

## Pesan commit

Kami memakai Conventional Commits:

- feat: fitur baru
- fix: perbaikan bug
- docs: dokumentasi
- refactor: perubahan kode tanpa mengubah perilaku
- chore: pekerjaan pemeliharaan

Tulis judul dalam kalimat perintah yang singkat, misalnya "fix: tolak IP privat pada record A".

## Pull request

- Satu pull request untuk satu tujuan. Jangan mencampur fitur baru dengan refactor besar.
- Judul mengikuti format commit di atas.
- Isi bagian di template: apa yang berubah, alasannya, cara menguji, dan tangkapan layar bila ada perubahan tampilan.
- Tandai draft selama masih dikerjakan.
- Setiap pull request ditinjau minimal satu reviewer selain penulisnya, dengan target review dua sampai tiga hari. Bila lewat batas itu, penulis boleh mengingatkan di channel Discord komunitas.
- Penulis bertanggung jawab menyelesaikan komentar review.

## Issue

- Gunakan template yang tersedia: laporan bug, permintaan fitur, atau pertanyaan.
- Label yang dipakai: bug, enhancement, good first issue, help wanted, dan wontfix.
- Tulis komentar sebelum mulai mengerjakan sebuah issue.
- Pelacakan progres ada di GitHub Projects dengan papan Backlog, In Progress, Review, dan Done.

## Struktur kode

- worker/ kode backend Cloudflare Worker.
- src/ kode frontend.
- migrations/ perubahan skema D1.

Tambahkan fitur di tempat yang sesuai agar konflik merge tetap kecil. Jangan menaruh rahasia di kode atau commit.

## Pemeriksaan sebelum mengirim

Gunakan Node versi `.nvmrc` atau lebih baru; tes membutuhkan Node 22.6 ke atas.

```bash
npm ci
npm test
npm run build
node scripts/contrast.mjs
```

Pastikan semuanya lulus. CI menjalankan pemeriksaan yang sama pada setiap pull request.

## Melaporkan masalah keamanan

Jangan buka issue publik untuk celah keamanan. Ikuti langkah di SECURITY.md.

## Kode etik

Dengan berpartisipasi, kamu setuju mematuhi CODE_OF_CONDUCT.md.
