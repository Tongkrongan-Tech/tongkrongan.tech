## Apa yang berubah

Jelaskan perubahan pada pull request ini.

## Alasan

Jelaskan mengapa perubahan ini perlu.

## Cara menguji

1.
2.

## Tangkapan layar

Bila ada perubahan tampilan, tempel tangkapan layar sebelum dan sesudah.

## Daftar periksa

- [ ] Satu pull request untuk satu tujuan
- [ ] Judul mengikuti Conventional Commits (feat, fix, docs, refactor, chore)
- [ ] `npm test` lulus
- [ ] `npm run build` lulus
- [ ] `node scripts/contrast.mjs` lulus bila ada perubahan warna atau tema
- [ ] Perubahan UI dicek di 360px, keyboard, dan tema yang relevan
- [ ] Migrasi baru diuji dengan `npm run db:local` bila ada perubahan skema
- [ ] Dokumentasi diperbarui bila perilaku, konfigurasi, atau retensi data berubah
- [ ] Tidak ada rahasia atau token di dalam perubahan
- [ ] Perubahan sensitif (auth, cookie, DNS, admin, cron) dijelaskan dampaknya
