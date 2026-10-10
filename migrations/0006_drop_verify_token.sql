-- Verifikasi akun kini memakai kode OTP email (tabel email_otps). Kolom verify_token tidak lagi dipakai.
ALTER TABLE users DROP COLUMN verify_token;
ALTER TABLE subdomains DROP COLUMN verify_token;
