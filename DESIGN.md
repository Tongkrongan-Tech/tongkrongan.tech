# DESIGN.md: arah visual frontend Tongkrongan.tech

Catatan jujur: arah ini ditulis agen, bukan pemilik produk. Ganti kapan saja dengan arah milikmu; selama itu belum ada, ini yang dipatuhi.

Design Read: situs layanan subdomain gratis untuk orang awam (pelajar, UMKM, kreator, developer pemula), bahasa visual hangat dan komunal, dial ENERGY 2 / RHYTHM 3 / MOTION 3.

Arahan pemilik yang menang atas bawaan filter (R-37): (1) enam tema dipertahankan seperti sebelumnya (Biru Tongkrongan, Malam, Kopi Susu, Matcha, Ungu Senja, Laut Dalam) dan dipertajam; (2) animasi dan interaksi harus banyak. Karena itu MOTION 3, tetapi tiap gerak tetap ditulis tugasnya di bawah.

## Identitas

Tongkrongan berarti tempat nongkrong. Logonya huruf T hitam tebal dengan awan biru. Metafora produknya: alamat web adalah papan nama di depan rumah. Motif identitas yang diulang di seluruh situs: **papan nama** (alamat tampil di papan dengan huruf yang berbalik satu per satu) dan **stabilo kuning** di nama yang dipilih pengguna.

## Keputusan dan alasannya (R-31)

| Keputusan | Alasan satu baris |
| --- | --- |
| Palet: tinta hangat, kertas hangat, satu biru merek, satu kuning stabilo | Biru dan hitam datang dari logo; kuning hanya untuk menyorot nama pengguna, jadi satu-satunya aksen. Tanpa gradien dan tanpa ungu. |
| Font Plus Jakarta Sans | Dirancang Tokotype di Indonesia; bobot tebalnya geometris seperti wordmark logo. |
| Mono IBM Plex Mono hanya untuk nilai record | IP dan CNAME harus bisa dibedakan huruf O dan angka 0, l dan 1. Alamat dan judul tidak memakai mono. |
| Tanpa pustaka ikon | Ikon seperlunya digambar sendiri dengan sudut tegas, selaras sudut huruf T pada logo. Dekorasi ikon dibuang. |
| Tanpa logo platform | Logo Vercel, Cloudflare, dan lainnya adalah milik mereka; tidak ditiru. Platform ditulis sebagai teks. |
| Sudut berbeda per peran: tombol 8px, kartu 14px, papan nama 4px | Papan kayu bersudut tajam, kontrol bersudut sedang; tidak ada elemen kapsul semua. |
| Bayangan hanya pada papan nama, dialog, dan menu | Itu satu-satunya yang memang terangkat dari halaman. |
| Gerak: papan berbalik dan berayun, judul naik per kata, stabilo disapu, sinar DNS, adegan scroll, ticker yang ikut kecepatan scroll, hitung naik, akordeon, transisi tema melingkar | Tiap gerak menjelaskan sesuatu (apa yang terjadi pada alamatmu), memberi umpan balik, atau menegaskan motif papan nama dan stabilo. Tidak dipakai: kursor-cahaya, magnet, kaca, glow, aurora, gradien. Semua mati saat prefers-reduced-motion. |
| Enam tema, bawaan mengikuti terang atau gelap perangkat | Permintaan pemilik. Tiap tema hanya punya kertas, tinta, satu aksen, dan stabilo kuning; kontras AA diuji untuk keenamnya oleh scripts/contrast.mjs. |
| Urutan halaman: hero, perjalanan alamat, adegan scroll satu papan, pilih platform, aturan main, istilah, tanya jawab, penutup | Mengikuti pertanyaan orang awam: apa ini, bagaimana jalannya, di mana websiteku, apa aturannya, apa artinya istilah itu. |
