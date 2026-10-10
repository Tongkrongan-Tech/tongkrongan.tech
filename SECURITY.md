# Kebijakan Keamanan

## Melaporkan celah

Jangan laporkan celah keamanan lewat issue publik. Gunakan salah satu jalur privat berikut:

- GitHub private vulnerability reporting. Buka tab Security repositori ini, lalu pilih Report a vulnerability. Fitur ini perlu diaktifkan lebih dulu oleh owner.
- Email ke halo@tongkrongan.tech.

Sertakan sebanyak mungkin detail:

- Deskripsi celah dan dampaknya.
- Langkah reproduksi.
- Versi atau commit yang terdampak.
- Saran perbaikan bila ada.

## Yang kami lakukan

- Kami berusaha membalas laporan dalam dua hari kerja.
- Kami akan mengabari progres dan memberi tahu saat perbaikan dirilis.
- Kami menghargai pelaporan yang bertanggung jawab dan tidak akan menuntut pelapor yang mengikuti panduan ini.

## Cakupan

Termasuk cakupan: kebocoran data akun, bypass autentikasi atau otorisasi, pembuatan record DNS tanpa izin, dan penyalahgunaan serupa.

Di luar cakupan: serangan yang memerlukan akses fisik, rekayasa sosial, dan temuan pada layanan pihak ketiga. Temuan pada layanan pihak ketiga sebaiknya dilaporkan ke penyedia masing-masing.

## Rahasia dan token

Jangan pernah menaruh token atau kredensial di issue, pull request, atau commit. Bila token atau kredensial (misalnya token Discord atau token API Cloudflare) sampai ter-push, segera reset token lewat Developer Portal atau penyedia terkait. Menghapus commit saja tidak cukup, karena commit lama masih bisa diakses dari riwayat atau fork.
