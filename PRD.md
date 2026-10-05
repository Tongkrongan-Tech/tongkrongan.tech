# PRD — tongrongan.tech: Subdomain Gratis untuk Semua Orang

Oct 5, 2026 · @Abdul Aziz

## Ringkasan Eksekutif

tongrongan.tech adalah layanan subdomain gratis: siapa pun yang punya website tetapi belum punya domain bisa mengklaim alamat seperti `namaku.tongrongan.tech` dan menyambungkannya ke hosting mana pun dalam hitungan menit.

- **Masalah:** membeli domain butuh biaya tahunan, kartu pembayaran, dan pengetahuan DNS. Banyak pelajar, kreator, dan UMKM berhenti di titik ini.
- **Solusi:** pengguna memilih nama, memasukkan tujuan (CNAME atau IP), dan subdomain aktif dengan HTTPS otomatis.
- **Kompatibel dengan:** Cloudflare, Railway, Vercel, VPS, dan hosting server biasa; tidak terikat satu penyedia.
- **Harga:** gratis untuk semua orang, tanpa kartu kredit.
- **Pengalaman:** antarmuka variatif, animatif, dan interaktif, supaya proses teknis terasa ringan dan menyenangkan, bukan menakutkan.

Sasaran utama PRD ini: menetapkan apa yang dibangun di versi 1 (MVP), bagaimana cara kerjanya, dan bagaimana kualitasnya diukur.

## Latar Belakang, Tujuan, dan Metrik Sukses

Hambatan terbesar bagi pemilik website pemula adalah alamat yang tampak profesional: subdomain bawaan hosting (misalnya `app-123.up.railway.app`) sulit diingat dan tidak bisa dibawa pindah platform. Domain sendiri memecahkan itu, tetapi butuh biaya dan konfigurasi.

**Tujuan produk**

1. Memberi alamat web yang pendek, mudah diingat, dan portabel secara gratis.
2. Memangkas proses dari mendaftar sampai subdomain aktif menjadi kurang dari 3 menit.
3. Bekerja di platform apa pun tanpa pengguna perlu paham DNS.
4. Menjaga kualitas dan reputasi domain dengan kontrol penyalahgunaan sejak hari pertama.

**Metrik sukses (target 6 bulan setelah peluncuran, perlu divalidasi)**

| Metrik | Target | Cara ukur |
| --- | --- | --- |
| Waktu dari daftar sampai subdomain aktif | di bawah 3 menit (median) | event analytics di wizard |
| Tingkat keberhasilan klaim | di atas 85% pengguna yang memulai wizard | funnel wizard |
| Subdomain aktif (merespons HTTP 200) | 5.000 | health check harian |
| Laporan penyalahgunaan yang ditangani | di bawah 24 jam | log moderasi |
| Skor kepuasan pengguna (CSAT) | 4,5 dari 5 | survei singkat setelah klaim |

## Target Pengguna dan Persona

Layanan ini ditujukan untuk siapa saja yang punya website tetapi belum punya domain. Empat persona utama:

| Persona | Kebutuhan | Platform yang biasa dipakai |
| --- | --- | --- |
| Pelajar dan mahasiswa | alamat untuk portofolio dan tugas akhir tanpa biaya | Vercel, GitHub Pages |
| Developer pemula dan hobiis | alamat rapi untuk proyek sampingan dan demo | Railway, Vercel, VPS murah |
| UMKM dan kreator | alamat yang mudah diingat untuk toko atau profil bisnis | hosting server biasa, VPS |
| Developer berpengalaman | subdomain cepat untuk staging, bot, dan API | Cloudflare, VPS, Railway |

**Prinsip desain:** pengguna tidak perlu tahu apa itu CNAME sebelum mulai. Istilah teknis dijelaskan lewat panduan interaktif di setiap langkah, dan pengguna mahir bisa melewati panduan dan langsung mengisi record.

## Ruang Lingkup

Versi 1 fokus pada satu hal: klaim subdomain gratis yang andal dan mudah disambungkan.

**Termasuk (in-scope)**

- Pendaftaran akun dan login (email dan OAuth).
- Pencarian dan klaim subdomain `nama.tongrongan.tech`.
- Record DNS yang didukung: A, AAAA, CNAME, TXT.
- Panduan sambungan per platform: Cloudflare, Railway, Vercel, VPS, hosting server.
- Verifikasi otomatis dan status real-time.
- HTTPS otomatis.
- Dashboard untuk mengelola subdomain.
- Pelaporan penyalahgunaan dan moderasi dasar.

**Tidak termasuk (out-of-scope) di versi 1**

- Hosting website atau penyimpanan file pengguna; kami hanya mengelola DNS.
- Layanan email di subdomain (record MX tidak dibuka dulu).
- Domain kustom berbayar dan penjualan domain.
- Aplikasi mobile native; web responsif sudah cukup.
- Wildcard subdomain (`*.nama.tongrongan.tech`).

## User Journey

&#91;embedded content: user journey · 7 langkah, 1 keputusan\]

Pencarian nama terbuka tanpa login; akun baru diminta saat klaim. Jika verifikasi DNS gagal, sistem menjelaskan penyebabnya dan pengguna mengulang dari langkah isi record.

## Kebutuhan Fungsional

Prioritas: **P0** wajib untuk peluncuran, **P1** menyusul segera, **P2** nanti.

| Kode | Kebutuhan | Prioritas |
| --- | --- | --- |
| F1 | Pengguna mendaftar dan login dengan email atau akun Google/GitHub | P0 |
| F2 | Pencarian ketersediaan nama subdomain secara langsung saat mengetik, dengan saran nama alternatif | P0 |
| F3 | Aturan nama: 3 sampai 32 karakter, huruf kecil, angka, dan tanda hubung; daftar nama tercadang (misalnya `www`, `mail`, `admin`) ditolak | P0 |
| F4 | Klaim subdomain dengan memilih tipe tujuan: CNAME (domain platform), A/AAAA (IP VPS), atau TXT (verifikasi) | P0 |
| F5 | Pemilihan platform lewat kartu (Cloudflare, Railway, Vercel, VPS, hosting lain) yang mengisi nilai record dan petunjuknya otomatis | P0 |
| F6 | Pengecekan propagasi DNS otomatis dengan status: menunggu, memverifikasi, aktif, gagal, disertai alasan dan cara memperbaiki | P0 |
| F7 | HTTPS otomatis untuk subdomain, mengikuti kemampuan platform tujuan | P0 |
| F8 | Dashboard: daftar subdomain, edit tujuan, hapus, dan lihat riwayat perubahan | P0 |
| F9 | Batas kuota awal: 3 subdomain per akun (angka bisa diubah) | P0 |
| F10 | Pelaporan penyalahgunaan dari publik dan peninjauan oleh admin | P0 |
| F11 | Pengingat email jika subdomain tidak aktif 30 hari; dilepas setelah 60 hari tanpa respons | P1 |
| F12 | Panel admin: tangguhkan subdomain, blokir akun, kelola daftar nama tercadang | P1 |
| F13 | API publik dan token pribadi untuk otomatisasi dari CI | P2 |

**Aturan bisnis penting**

- Satu subdomain hanya bisa dimiliki satu akun pada satu waktu.
- Pengguna wajib membuktikan kendali atas tujuan lewat verifikasi (record TXT atau respons HTTP) sebelum status menjadi aktif, agar tidak ada yang mengklaim dan membajak tujuan milik orang lain.
- Subdomain yang ditangguhkan karena pelanggaran tidak bisa diklaim ulang oleh akun yang sama.

## Integrasi Platform

Subdomain bisa disambungkan dari mana saja karena tongrongan.tech hanya mengelola DNS; pengguna cukup memilih platform dan wizard mengisi nilai record. Petunjuk dan nilai di bawah adalah rancangan awal dan wajib diverifikasi ke dokumentasi resmi masing-masing platform sebelum rilis, karena bisa berubah.

| Platform | Jenis record | Catatan alur |
| --- | --- | --- |
| Cloudflare | CNAME atau A/AAAA | pengguna menambahkan subdomain di proyek Cloudflare (Pages/Workers) atau memakai tunnel; mode proxy tidak dipaksakan |
| Railway | CNAME + TXT verifikasi | Railway memberi target CNAME dan nilai TXT untuk custom domain; wizard menyediakan keduanya |
| Vercel | CNAME (atau A) + TXT bila diminta | pengguna menambahkan domain di proyek Vercel, lalu menyalin target yang diberikan |
| VPS | A (IPv4), AAAA (IPv6) | pengguna memasukkan IP server; wizard menyarankan cara memasang HTTPS (misalnya Caddy atau Certbot) |
| Hosting server biasa | A atau CNAME | pengguna memasukkan IP atau hostname dari panel hosting |

**Prinsip integrasi**

1. Wizard menanyakan satu hal: "Website kamu ada di mana?" lalu menampilkan hanya langkah yang relevan.
2. Nilai record dapat disalin dengan satu klik, disertai tautan ke dokumentasi platform terkait.
3. Sistem mendeteksi kesalahan umum (CNAME di nama yang salah, IP tidak valid, record bentrok) dan menjelaskan perbaikannya dalam bahasa sederhana.
4. Penerbitan HTTPS bergantung pada platform tujuan; untuk VPS, pengguna diberi panduan sendiri.

## Spesifikasi UI/UX: Variatif, Animatif, Interaktif

Seluruh tampilan harus terasa hidup, tetapi tetap cepat dan bisa dipakai semua orang. Tiga kata kunci diterjemahkan menjadi aturan yang bisa diuji:

| Pilar | Wujud di produk | Contoh |
| --- | --- | --- |
| Variatif | beberapa tema visual (terang, gelap, dan 2 sampai 3 tema berwarna) yang dipilih pengguna; ilustrasi dan palet berbeda per halaman; kartu platform dengan identitas visual masing-masing | pengguna memilih tema di pojok kanan atas dan pilihan tersimpan |
| Animatif | transisi halus antarhalaman, animasi muncul bertahap saat scroll, mikro-animasi pada tombol dan status, animasi status DNS (menunggu, memverifikasi, aktif) | tanda centang animasi saat subdomain aktif |
| Interaktif | pencarian nama dengan umpan balik langsung, wizard multilangkah, pratinjau alamat yang berubah saat mengetik, diagram DNS interaktif yang menyorot record yang sedang diisi | menggeser kartu platform dan melihat langkahnya berubah |

**Halaman utama**

- Hero dengan kolom pencarian besar: pengunjung mengetik nama dan langsung melihat tersedia atau tidak, tanpa login.
- Demo animasi 3 langkah (pilih nama, pilih platform, aktif) yang berputar otomatis dan bisa diklik.
- Bagian kartu platform, testimoni, dan FAQ yang membuka dengan animasi.

**Wizard klaim:** satu langkah per layar, indikator progres, tombol salin dengan umpan balik visual, dan pesan galat yang ramah dengan saran perbaikan.

**Dashboard:** kartu subdomain dengan lencana status berwarna, grafik singkat ketersediaan, dan aksi cepat (edit, salin, hapus) dengan konfirmasi.

**Batas kualitas (wajib)**

- Hormati pengaturan sistem "kurangi gerakan" (`prefers-reduced-motion`): animasi dimatikan atau disederhanakan.
- Animasi berjalan mulus (target 60 fps) dan tidak menunda interaksi; halaman utama memuat konten utama dalam 2,5 detik pada jaringan 4G.
- Kontras warna memenuhi WCAG 2.1 AA di semua tema, dan seluruh fitur bisa dipakai dengan keyboard.
- Responsif dari layar ponsel 360 px sampai desktop lebar.
- Antarmuka tersedia dalam Bahasa Indonesia dan Inggris.

## Arsitektur Teknis dan Stack

&#91;embedded content: arsitektur · 6 komponen\]

API backend menulis record ke zona tongrongan.tech lewat API Cloudflare DNS dan menyimpan status di database. Worker memeriksa propagasi DNS dan respons HTTP tujuan, lalu memperbarui status. Pengunjung website tidak melewati aplikasi kami: DNS langsung mengarahkan mereka ke platform milik pengguna.

**Usulan stack (dapat diganti saat desain teknis)**

| Lapisan | Usulan | Alasan |
| --- | --- | --- |
| Frontend | Next.js (React), Tailwind CSS, Framer Motion | animasi dan interaksi kaya dengan performa baik |
| Backend | Node.js (TypeScript) | satu bahasa dengan frontend |
| Database | PostgreSQL | relasi akun, subdomain, dan riwayat |
| Antrean dan worker | Redis + job worker | verifikasi DNS berkala dan pengingat email |
| DNS | Cloudflare DNS API | zona domain, propagasi cepat, API stabil |
| Email transaksional | layanan email (misalnya Resend atau Postmark) | verifikasi akun dan pengingat |
| Pemantauan | pelacak galat dan uptime monitor | menjaga ketersediaan |

## Non-Fungsional, Keamanan, dan Anti-Abuse

Layanan subdomain gratis adalah sasaran empuk untuk phishing dan malware. Jika reputasi `tongrongan.tech` rusak, semua pengguna ikut terdampak (diblokir browser dan penyaring email), jadi kontrol penyalahgunaan masuk P0.

**Anti-abuse**

- Verifikasi email dan batas pendaftaran per IP dan per perangkat.
- Kuota subdomain per akun (awal: 3) dan batas laju perubahan DNS.
- Daftar nama tercadang dan nama yang menyerupai merek atau lembaga resmi ditolak.
- Tombol "Laporkan" di setiap subdomain dan alamat kontak abuse yang jelas; target penanganan di bawah 24 jam.
- Pemeriksaan berkala terhadap daftar ancaman (misalnya Google Safe Browsing) dan penangguhan otomatis bila terdeteksi.
- Syarat layanan yang melarang phishing, malware, spam, dan konten ilegal; pelanggaran berujung penangguhan permanen.

**Keamanan**

- Seluruh lalu lintas lewat HTTPS; sesi aman (cookie `HttpOnly`, `Secure`) dan perlindungan CSRF.
- Autentikasi dua langkah opsional untuk akun.
- Pengendalian kepemilikan: hanya pemilik yang bisa mengubah record; semua perubahan tercatat (audit log).
- Mitigasi subdomain takeover: tujuan yang sudah tidak ada (misalnya proyek Railway atau Vercel dihapus) terdeteksi lewat health check dan record dibekukan.
- DNSSEC dan kredensial API DNS disimpan sebagai rahasia terenkripsi dengan token berhak akses minimal.

**Non-fungsional**

| Aspek | Target |
| --- | --- |
| Ketersediaan resolusi DNS | 99,9% atau lebih (didukung penyedia DNS global) |
| Ketersediaan dashboard | 99,5% |
| Waktu perubahan record sampai terpublikasi | di bawah 60 detik di sisi kami |
| Privasi | data pribadi minimal; kepatuhan terhadap UU Pelindungan Data Pribadi Indonesia |

## Model Bisnis dan Keberlanjutan

Layanan inti gratis selamanya. Biaya utama sangat kecil (domain tahunan, infrastruktur DNS, server aplikasi, email transaksional), tetapi moderasi menuntut waktu manusia, sehingga keberlanjutan harus direncanakan sejak awal.

**Sumber pendanaan yang dipertimbangkan (perlu diputuskan)**

- Donasi dan sponsor komunitas, dengan halaman pendukung yang transparan.
- Paket opsional berbayar di masa depan (misalnya kuota lebih besar atau dukungan prioritas) tanpa mengurangi layanan gratis.
- Kemitraan dengan platform hosting yang ingin jadi pilihan di wizard, tanpa mengubah netralitas petunjuk.

**Komitmen ke pengguna**

- Tidak ada iklan yang disisipkan ke website pengguna.
- Tidak ada penjualan data pengguna.
- Pemberitahuan minimal 30 hari sebelum perubahan kebijakan besar.

## Roadmap, Risiko, dan Pertanyaan Terbuka

&#91;embedded content: roadmap · 4 fase, 3 gerbang\]

Fase belum diberi tanggal karena tim dan sumber daya belum ditetapkan; setiap gerbang harus lulus sebelum fase berikutnya dimulai.

**Risiko utama**

| Risiko | Dampak | Mitigasi |
| --- | --- | --- |
| Phishing dan malware lewat subdomain gratis | domain masuk daftar hitam, semua pengguna terdampak | kontrol anti-abuse sebagai P0, pemantauan, penangguhan cepat |
| Subdomain takeover | pihak lain mengambil alih tujuan yang sudah dihapus | health check dan pembekuan record |
| Cookie dan reputasi dibagi antar-subdomain | satu situs buruk memengaruhi situs lain | ajukan tongrongan.tech ke Public Suffix List |
| Beban moderasi melebihi kapasitas | respons laporan lambat | kuota, otomasi, bantuan komunitas |
| Animasi berat memperlambat ponsel murah | pengguna target kesulitan memakai layanan | anggaran performa dan mode kurangi gerakan |

**Pertanyaan terbuka**

- Poin 6 pada brief awal masih kosong; apa yang ingin ditambahkan?
- Apakah tongrongan.tech sudah dimiliki dan zona DNS-nya sudah dikelola di Cloudflare?
- Apakah kuota awal 3 subdomain per akun sudah sesuai?
- Perlukah verifikasi tambahan (misalnya nomor telepon) untuk menekan penyalahgunaan?
- Sumber pendanaan mana yang dipilih: donasi, paket opsional, atau kemitraan?
- Apakah record MX (email di subdomain) akan dibuka di masa depan?
