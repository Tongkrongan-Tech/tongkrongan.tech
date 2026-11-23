# Evaluasi Scorpio Guard sebagai Detector

Status: proposal, belum diintegrasikan.

Dokumen ini membahas kemungkinan memakai [Scorpio Guard](https://scorpio-guard.fachryxyf.com/) di tongkrongan.tech. Scorpio Guard adalah library evaluasi trust lokal dari [@Fachryxyf](https://github.com/Fachryxyf), bukan layanan pemindai celah keamanan.

## Ringkasan keputusan

Scorpio Guard tidak cocok menggantikan pemindai keamanan kode, Safe Browsing, atau Turnstile. Library ini bisa dipertimbangkan sebagai lapisan tambahan untuk menilai risiko penyalahgunaan pada alur akun dan klaim, misalnya login, pendaftaran, laporan, atau pembuatan record.

Rekomendasi: jangan langsung dipakai untuk memblokir pengguna. Mulai dari pilot observasional di balik flag, dengan store D1, lalu bandingkan keputusannya dengan pembatas laju dan Turnstile yang sudah ada. Setelah data nyata cukup, baru putuskan apakah layak masuk jalur penegakan.

## Apa yang sebenarnya dilakukan library

- Menilai trust sebuah interaksi dalam lima tingkat saran: `ALLOW`, `OBSERVE`, `INCREASE_FRICTION`, `RESTRICT`, `BLOCK`.
- Menyimpan riwayat perilaku per entity, dengan decay, retensi, dan batas state.
- Menerima invariant dari host. Invariant adalah klaim host tentang alur yang mustahil, misalnya transisi state yang tidak ada.
- Tidak melakukan panggilan jaringan, tidak memblokir apa pun, dan tidak menentukan status HTTP. Semua tindakan tetap milik host.
- Bukan pengganti CAPTCHA. Bukan pemindai dependensi, bukan pemindai kode, bukan pemindai DNS, dan bukan antivirus.

## Kesesuaian teknis dengan Cloudflare Workers

| Aspek | Penilaian |
| --- | --- |
| Runtime core | Klaim proyek: core tidak memakai API Node khusus. Ini perlu diuji langsung di workerd, bukan hanya di Node. |
| Dependensi | Nol dependensi runtime. Baik untuk supply chain, tetapi tetap pin versi tepat. |
| Store | Store memori hilang saat isolate berganti. `sqlite` memakai `node:sqlite`, tidak tersedia di Workers. `kv` memakai HTTP ke KV eksternal. D1 belum punya adapter resmi. |
| D1 | Perlu adapter `StateStore` sendiri dan harus lulus conformance kit. Ini pekerjaan integrasi yang nyata, bukan satu baris konfigurasi. |
| Latency | Store deadline default 100ms. Setiap evaluasi bisa menambah satu operasi D1. Ukur p95 sebelum dan sesudah. |
| Concurrency | Evaluasi per entity diserialisasi sejak 0.3.0. Tetap perlu diuji dengan beberapa isolate dan request paralel. |
| Versi | 0.3.0 masih pre-1.0 dan belum dikalibrasi terhadap populasi nyata. Pin versi tepat, jangan memakai caret. |

## Kesesuaian dengan produk

Kandidat titik integrasi:

- `POST /api/auth/signup` dan `POST /api/auth/login`: deteksi pola percobaan akun, bukan menggantikan verifikasi email atau Turnstile.
- `POST /api/reports`: membedakan laporan wajar dari spam laporan.
- `POST /api/subdomains` dan `PATCH /api/subdomains/:name`: menilai penyalahgunaan klaim atau perubahan tujuan.
- `POST /api/events`: jangan dipakai untuk menilai trust, karena event memang anonim dan tidak punya entity yang stabil.

Entity key sebaiknya berupa hash HMAC dari user id, bukan email mentah, IP mentah, atau nama subdomain. Untuk request anonim, gunakan hash IP dengan rotasi berkala. Library tidak boleh menerima data pribadi mentah.

## Risiko yang harus diselesaikan sebelum produksi

1. **False positive.** Model belum dikalibrasi pada populasi nyata. Pengguna pelajar dan UMKM bisa terkena friksi karena pola yang sebenarnya wajar, misalnya login dari jaringan sekolah atau warung internet.
2. **Data pribadi.** Riwayat perilaku adalah data pribadi menurut UU PDP. Perlu dasar pemrosesan, masa retensi, penghapusan, dan pembaruan kebijakan privasi.
3. **Store degradation.** Kalau D1 atau KV gagal, keputusan bisa jatuh ke cold start. Ini harus terlihat di log dan tidak boleh diam-diam dianggap aman.
4. **Biaya dan latency.** Setiap evaluasi menambah query D1. Pada alur login dan klaim, ini bisa memperlambat respons yang sudah memiliki beberapa query lain.
5. **Supply chain.** Paket masih muda, dan akun npm penerbit pernah ditangguhkan sementara. Pin versi, gunakan `npm audit signatures`, dan review isi tarball sebelum upgrade.
6. **Konflik kepentingan.** Library ditulis oleh anggota komunitas yang sama. Evaluasi harus tetap objektif dan hasilnya dipublikasikan, termasuk hasil negatif.

## Rencana pilot yang disarankan

Fase 1, observasi:

- Pasang library di branch terpisah, bukan di `main`.
- Buat adapter D1 dan jalankan conformance kit.
- Jalankan evaluasi setelah autentikasi dan validasi input, bukan sebelum.
- Jangan ubah status HTTP. Catat `decision`, `trace`, `hardViolated`, `storeDegraded`, dan `durationMs`.
- Bandingkan dengan hasil rate limit, Turnstile, dan laporan manual.

Fase 2, keputusan:

- Tentukan metrik: false positive, false negative, latency p95, jumlah query D1, dan insiden.
- Hentikan pilot bila false positive melewati batas yang disepakati atau latency melewati anggaran.
- Kalau hasilnya baik, petakan `INCREASE_FRICTION` ke tantangan yang sudah ada, bukan blokir langsung.
- `RESTRICT` dan `BLOCK` tetap membutuhkan keputusan manusia atau aturan yang sudah terbukti.

## Yang tidak disarankan

- Memakai Scorpio Guard sebagai satu-satunya pertahanan login atau klaim.
- Memasangnya di `main` sebelum ada adapter D1 dan data pilot.
- Mengirim email, IP, atau nama subdomain mentah sebagai entity key.
- Mengaktifkan `BLOCK` otomatis tanpa jalur banding.
- Menghapus Turnstile, Safe Browsing, atau pembatas laju yang sudah ada.

## Referensi

- Situs: https://scorpio-guard.fachryxyf.com/
- Sumber: https://github.com/Fachryxyf/scorpio-guard
- Batas dan jaminan: https://scorpio-guard.fachryxyf.com/guarantees.html
- Integrasi: https://scorpio-guard.fachryxyf.com/usage.html
