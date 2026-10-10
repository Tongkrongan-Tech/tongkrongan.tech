import type { Lang } from './prefs'

/* Isi Syarat Layanan dan Kebijakan Privasi. Setiap klaim di sini harus sesuai perilaku aplikasi yang sebenarnya
   (worker/, migrations/). Ubah teks ini bersamaan dengan perubahan perilaku, lalu perbarui LEGAL_UPDATED. */

export const LEGAL_UPDATED = '2026-10-11'
// Isi bila sudah ada alamat kontak resmi (mis. lewat Email Routing). Kosong = halaman menampilkan keterangan pengganti.
export const CONTACT_EMAIL = ''

export type Block = { h: string; p?: string[]; ul?: string[] }
export type Doc = { title: string; intro: string; blocks: Block[] }
export type DocId = 'terms' | 'privacy'

const termsId: Doc = {
  title: 'Syarat Layanan',
  intro: 'Dengan membuat akun atau mengklaim subdomain di Tongkrongan.tech, kamu menyetujui syarat ini. Kami sengaja menulisnya sesederhana mungkin.',
  blocks: [
    { h: 'Tentang layanan', p: ['Tongkrongan.tech menyediakan subdomain gratis (nama.tongkrongan.tech) yang kami arahkan ke website milikmu lewat DNS. Kami hanya mengelola DNS. Website, file, dan data pengunjungmu tetap berada di platform pilihanmu (misalnya Cloudflare, Railway, Vercel, GitHub Pages, VPS, atau hosting lain), dan kamu sendiri yang bertanggung jawab atas isinya.'] },
    { h: 'Akun', ul: [
      'Jaga kata sandimu dan akun login pihak ketiga (GitHub, Google, Discord) yang kamu pakai untuk masuk.',
      'Informasi yang kamu berikan harus benar, terutama email yang bisa dihubungi.',
      'Kamu bertanggung jawab atas semua aktivitas di akunmu.',
      'Kami dapat memblokir akun yang melanggar syarat ini.',
    ] },
    { h: 'Subdomain dan kuota', ul: [
      'Kuota awal adalah 3 subdomain per akun. Angka ini bisa berubah.',
      'Nama harus 3 sampai 32 karakter: huruf kecil, angka, dan tanda hubung.',
      'Nama yang dicadangkan sistem, atau yang menyerupai merek atau lembaga resmi, ditolak.',
      'Kami hanya membuka record A, AAAA, CNAME, dan TXT. Email (MX) dan wildcard belum didukung.',
      'Subdomain bukan hak milik. Kamu mendapat hak pakai selama mematuhi syarat ini, dan kami tidak menjamin nama tertentu akan selalu tersedia.',
      'Subdomain yang belum pernah aktif dalam 24 jam setelah dibuat dilepas otomatis.',
    ] },
    { h: 'Penggunaan yang dilarang', p: ['Kamu dilarang memakai subdomain untuk:'], ul: [
      'phishing atau penipuan;',
      'menyebarkan malware;',
      'spam;',
      'konten yang melanggar hukum yang berlaku;',
      'meniru merek, lembaga, atau orang lain;',
      'mengganggu layanan, mengakali kuota atau batas laju, atau membuat akun berganda untuk menghindari penangguhan.',
    ] },
    { h: 'Penegakan', ul: [
      'Kami memeriksa subdomain aktif secara berkala, termasuk lewat daftar ancaman (Google Safe Browsing). Subdomain yang terdeteksi ditangguhkan otomatis dan record DNS-nya dihapus.',
      'Phishing dan malware ditangguhkan, dan pelanggaran berujung penangguhan permanen.',
      'Siapa pun bisa melapor lewat halaman Laporkan. Target penanganan laporan adalah 24 jam; itu target, bukan jaminan.',
      'Subdomain yang berkali-kali gagal dalam pemeriksaan kesehatan bisa ditandai gagal.',
      'Bila ada risiko bagi pengguna lain, kami dapat bertindak lebih dulu dan menjelaskan kemudian.',
    ] },
    { h: 'Ketersediaan', p: ['Layanan diberikan apa adanya dan gratis. Kami berusaha menjaganya tetap berjalan, tetapi tidak menjamin layanan bebas gangguan atau galat, atau tersedia setiap saat. Perubahan DNS butuh waktu untuk menyebar, dan HTTPS bergantung pada platform tujuanmu.'] },
    { h: 'Batas tanggung jawab', p: ['Sejauh diizinkan hukum, pengelola tidak bertanggung jawab atas kerugian tidak langsung, kehilangan data, atau kehilangan penghasilan akibat penggunaan atau ketidaktersediaan layanan, termasuk akibat penangguhan yang dilakukan sesuai syarat ini. Kamu bertanggung jawab penuh atas website dan isi yang kamu arahkan ke subdomainmu.'] },
    { h: 'Mengakhiri penggunaan', ul: [
      'Kamu bisa menghapus subdomain kapan saja dari dasbor.',
      'Kami dapat menangguhkan atau menghapus subdomain atau akun yang melanggar syarat ini, atau bila layanan dihentikan. Bila memungkinkan kami memberi pemberitahuan yang wajar.',
    ] },
    { h: 'Perubahan syarat', p: ['Untuk perubahan besar kami memberi tahu paling lambat 30 hari sebelum berlaku, lewat situs ini atau email. Memakai layanan setelah itu berarti menerima syarat terbaru. Tanggal pembaruan tertera di atas.'] },
  ],
}

const termsEn: Doc = {
  title: 'Terms of Service',
  intro: 'By creating an account or claiming a subdomain on Tongkrongan.tech, you agree to these terms. We keep them as simple as we can.',
  blocks: [
    { h: 'About the service', p: ['Tongkrongan.tech provides free subdomains (name.tongkrongan.tech) that we point to your website through DNS. We only manage DNS. Your website, files, and visitor data stay on the platform you choose (for example Cloudflare, Railway, Vercel, GitHub Pages, a VPS, or other hosting), and you are responsible for their content.'] },
    { h: 'Accounts', ul: [
      'Keep your password and any third-party account (GitHub, Google, Discord) you use to log in safe.',
      'The information you give must be accurate, especially a reachable email address.',
      'You are responsible for everything that happens under your account.',
      'We may block accounts that break these terms.',
    ] },
    { h: 'Subdomains and quota', ul: [
      'The starting quota is 3 subdomains per account. This number may change.',
      'Names must be 3 to 32 characters: lowercase letters, digits, and hyphens.',
      'Names reserved by the system, or that resemble brands or official institutions, are rejected.',
      'We only open A, AAAA, CNAME, and TXT records. Email (MX) and wildcards are not supported yet.',
      'A subdomain is not property. You get a right to use it while you follow these terms, and we do not guarantee that any particular name will stay available.',
      'A subdomain that has never become active within 24 hours of creation is released automatically.',
    ] },
    { h: 'Prohibited use', p: ['You may not use a subdomain for:'], ul: [
      'phishing or fraud;',
      'distributing malware;',
      'spam;',
      'content that breaks applicable law;',
      'impersonating a brand, institution, or person;',
      'disrupting the service, evading quotas or rate limits, or creating multiple accounts to avoid suspension.',
    ] },
    { h: 'Enforcement', ul: [
      'We check active subdomains regularly, including against threat lists (Google Safe Browsing). A subdomain that is flagged is suspended automatically and its DNS records are removed.',
      'Phishing and malware are suspended, and violations lead to permanent suspension.',
      'Anyone can report a subdomain through the Report page. We aim to handle reports within 24 hours; that is a target, not a guarantee.',
      'A subdomain that repeatedly fails health checks may be marked as failed.',
      'When other users are at risk, we may act first and explain afterwards.',
    ] },
    { h: 'Availability', p: ['The service is provided as is, and free of charge. We try to keep it running, but we do not guarantee that it is free of interruptions or errors, or available at all times. DNS changes take time to propagate, and HTTPS depends on your destination platform.'] },
    { h: 'Limitation of liability', p: ['To the extent the law allows, the operators are not liable for indirect loss, data loss, or lost income resulting from use or unavailability of the service, including suspensions made under these terms. You are fully responsible for the website and content you point your subdomain to.'] },
    { h: 'Ending use', ul: [
      'You can delete a subdomain at any time from the dashboard.',
      'We may suspend or remove subdomains or accounts that break these terms, or if the service is discontinued. Where possible we will give reasonable notice.',
    ] },
    { h: 'Changes to these terms', p: ['For major changes we give at least 30 days notice before they take effect, on this site or by email. Using the service after that means you accept the updated terms. The update date is shown above.'] },
  ],
}

const privacyId: Doc = {
  title: 'Kebijakan Privasi',
  intro: 'Kami menyimpan data sesedikit mungkin. Halaman ini menjelaskan data apa yang kami simpan, untuk apa, dan pihak mana saja yang terlibat.',
  blocks: [
    { h: 'Data yang kami simpan', ul: [
      'Akun: email, cara masuk (email, GitHub, Google, atau Discord), dan waktu pembuatan. Untuk akun dengan kata sandi, yang disimpan hanya hasil hash PBKDF2 dengan salt; kata sandi aslinya tidak pernah disimpan.',
      'Subdomain: nama, platform, tipe dan nilai record (alamat tujuan), status, waktu, serta riwayat dan hasil pemeriksaan (30 terakhir per subdomain).',
      'Sesi: token masuk disimpan sebagai hash dan berlaku 30 hari.',
      'Kode sementara: kode OTP email (hash, berlaku 10 menit) dan token reset kata sandi (hash, berlaku 1 jam).',
      'Laporan penyalahgunaan: nama subdomain, alasan, keterangan opsional (maksimal 600 karakter), dan sidik IP yang di-hash sebagian, bukan IP asli.',
      'Batas laju: untuk mencegah penyalahgunaan, alamat IP atau email dipakai sebagai kunci penghitung sementara di database. Hitungan lama dihapus otomatis dalam hitungan jam.',
      'Hubungan Vercel (opsional): bila kamu menghubungkan Vercel, token aksesnya disimpan terenkripsi (AES-GCM) dan bisa kamu putus kapan saja.',
    ] },
    { h: 'Yang tidak kami lakukan', ul: [
      'Tidak ada iklan, pelacak iklan, atau analitik pihak ketiga di situs ini.',
      'Kami tidak menjual data penggunamu.',
      'Kami tidak menyisipkan apa pun ke website yang kamu arahkan. Pengunjung langsung menuju platformmu tanpa melewati aplikasi kami.',
    ] },
    { h: 'Untuk apa data dipakai', ul: [
      'Menjalankan akun dan subdomainmu, termasuk memverifikasi bahwa DNS dan situsmu benar-benar tersambung.',
      'Mencegah penyalahgunaan dan menangani laporan.',
      'Mengirim email yang kamu butuhkan, seperti kode verifikasi dan tautan reset kata sandi. Kami tidak mengirim email promosi.',
      'Memberi tahu tim pengelola tentang aktivitas penting (lihat bagian pihak ketiga).',
    ] },
    { h: 'Pihak ketiga', ul: [
      'Cloudflare menjalankan situs, database, dan DNS kami. Cloudflare Turnstile menilai apakah pengunjung manusia, dan menerima token serta alamat IP-mu saat kamu masuk, mendaftar, atau melapor.',
      'Penyedia email (Resend), bila verifikasi email aktif, hanya dipakai untuk mengirim kode dan tautan ke emailmu.',
      'GitHub, Google, atau Discord: bila kamu masuk dengan salah satunya, kami menerima email terverifikasimu dan hanya itu yang kami simpan.',
      'Google Safe Browsing: nama subdomain aktif diperiksa terhadap daftar ancaman.',
      'Vercel: bila kamu memakai tombol hubungkan Vercel, kami memanggil API Vercel atas namamu untuk menambahkan domain ke proyekmu.',
      'Discord (notifikasi internal): saat pengguna menghubungkan Vercel atau subdomain pertama kali aktif, tim pengelola menerima pesan berisi nama subdomain, platform, dan email yang disamarkan sebagian.',
    ] },
    { h: 'Data yang bersifat publik', p: ['Record DNS subdomainmu (nama dan alamat tujuan) bersifat publik karena begitulah DNS bekerja; siapa pun dapat melihatnya. Jangan menaruh informasi rahasia di nilai record, terutama TXT.'] },
    { h: 'Cookie dan penyimpanan lokal', ul: [
      'tt_session: cookie sesi (HttpOnly) agar kamu tetap masuk. Dibutuhkan untuk fitur akun.',
      'tt_oauth: cookie sementara (10 menit) saat masuk lewat GitHub, Google, atau Discord.',
      'Tema dan bahasa pilihanmu disimpan di perangkatmu saja dan tidak dikirim ke kami.',
    ] },
    { h: 'Berapa lama data disimpan', ul: [
      'Akun dan subdomain disimpan selama akunmu ada.',
      'Menghapus subdomain dari dasbor menghapus record DNS-nya beserta riwayat dan hasil pemeriksaannya. Subdomain yang ditangguhkan tidak bisa dihapus sendiri.',
      'Subdomain yang belum pernah aktif dalam 24 jam dihapus otomatis.',
      'Laporan penyalahgunaan disimpan selama dibutuhkan untuk menjaga keamanan layanan.',
    ] },
    { h: 'Hakmu', p: ['Kamu bisa melihat dan menghapus subdomainmu sendiri di dasbor, dan memutus hubungan Vercel kapan saja. Kamu juga berhak meminta akses, koreksi, atau penghapusan akun dan datamu. Saat ini penghapusan akun dilakukan atas permintaan lewat kontak di bawah; fitur hapus akun mandiri belum tersedia. Kami berupaya memperlakukan data pribadi sesuai UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.'] },
    { h: 'Keamanan', p: ['Kata sandi di-hash, token sesi dan kode disimpan sebagai hash, token Vercel dienkripsi, semua lalu lintas memakai HTTPS, dan ada batas laju serta CAPTCHA. Tidak ada sistem yang sepenuhnya aman. Bila terjadi kebocoran yang berdampak padamu, kami berkomitmen memberi tahu.'] },
    { h: 'Perubahan kebijakan', p: ['Untuk perubahan besar kami memberi tahu paling lambat 30 hari sebelum berlaku, lewat situs ini atau email. Tanggal pembaruan tertera di atas.'] },
  ],
}

const privacyEn: Doc = {
  title: 'Privacy Policy',
  intro: 'We keep as little data as possible. This page explains what we store, what for, and who else is involved.',
  blocks: [
    { h: 'Data we store', ul: [
      'Account: email, how you log in (email, GitHub, Google, or Discord), and the creation time. For password accounts we only store a salted PBKDF2 hash; your actual password is never stored.',
      'Subdomains: name, platform, record type and value (the destination), status, timestamps, plus history and check results (the latest 30 per subdomain).',
      'Sessions: the login token is stored as a hash and is valid for 30 days.',
      'Temporary codes: the email OTP code (hashed, valid 10 minutes) and the password reset token (hashed, valid 1 hour).',
      'Abuse reports: the subdomain name, reason, an optional note (up to 600 characters), and a truncated hash of the IP address, not the IP itself.',
      'Rate limiting: to prevent abuse, an IP address or email is used as the key of a temporary counter in the database. Old counters are deleted automatically within hours.',
      'Vercel connection (optional): if you connect Vercel, its access token is stored encrypted (AES-GCM) and you can disconnect at any time.',
    ] },
    { h: 'What we do not do', ul: [
      'There are no ads, ad trackers, or third-party analytics on this site.',
      'We do not sell your data.',
      'We do not inject anything into the website you point to. Visitors go straight to your platform without passing through our application.',
    ] },
    { h: 'What the data is used for', ul: [
      'Running your account and subdomains, including verifying that your DNS and site are really connected.',
      'Preventing abuse and handling reports.',
      'Sending the emails you need, such as verification codes and password reset links. We do not send marketing email.',
      'Letting the operators know about important activity (see the third parties section).',
    ] },
    { h: 'Third parties', ul: [
      'Cloudflare runs our site, database, and DNS. Cloudflare Turnstile checks that a visitor is human, and receives a token and your IP address when you log in, sign up, or report.',
      'The email provider (Resend), when email verification is enabled, is only used to send codes and links to your email.',
      'GitHub, Google, or Discord: if you log in with one of them, we receive your verified email and that is all we store.',
      'Google Safe Browsing: the names of active subdomains are checked against threat lists.',
      'Vercel: if you use the connect Vercel button, we call the Vercel API on your behalf to add a domain to your project.',
      'Discord (internal notifications): when a user connects Vercel or a subdomain becomes active for the first time, the operators receive a message with the subdomain name, the platform, and a partially masked email.',
    ] },
    { h: 'Public data', p: ['Your subdomain DNS records (name and destination) are public because that is how DNS works; anyone can look them up. Do not put secrets in record values, especially TXT.'] },
    { h: 'Cookies and local storage', ul: [
      'tt_session: the session cookie (HttpOnly) that keeps you logged in. Required for account features.',
      'tt_oauth: a temporary cookie (10 minutes) while logging in with GitHub, Google, or Discord.',
      'Your theme and language choices are stored only on your device and are not sent to us.',
    ] },
    { h: 'How long we keep data', ul: [
      'Your account and subdomains are kept as long as your account exists.',
      'Deleting a subdomain from the dashboard removes its DNS records together with its history and check results. A suspended subdomain cannot be deleted by the owner.',
      'A subdomain that has never become active within 24 hours is deleted automatically.',
      'Abuse reports are kept for as long as needed to keep the service safe.',
    ] },
    { h: 'Your rights', p: ['You can view and delete your own subdomains from the dashboard, and disconnect Vercel at any time. You may also ask for access, correction, or deletion of your account and data. For now account deletion is handled on request through the contact below; a self-service delete account feature is not available yet. We aim to handle personal data in line with Indonesian Law No. 27 of 2022 on Personal Data Protection.'] },
    { h: 'Security', p: ['Passwords are hashed, session tokens and codes are stored as hashes, Vercel tokens are encrypted, all traffic uses HTTPS, and there are rate limits and CAPTCHA. No system is completely secure. If a breach affects you, we commit to telling you.'] },
    { h: 'Changes to this policy', p: ['For major changes we give at least 30 days notice before they take effect, on this site or by email. The update date is shown above.'] },
  ],
}

export const LEGAL: Record<DocId, Record<Lang, Doc>> = {
  terms: { id: termsId, en: termsEn },
  privacy: { id: privacyId, en: privacyEn },
}
