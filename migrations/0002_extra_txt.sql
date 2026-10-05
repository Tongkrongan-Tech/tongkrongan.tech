-- Satu record TXT tambahan per subdomain (mis. verifikasi Railway di _railway-verify.nama).
ALTER TABLE subdomains ADD COLUMN txt_label TEXT;
ALTER TABLE subdomains ADD COLUMN txt_value TEXT;
ALTER TABLE subdomains ADD COLUMN txt_record_id TEXT;
